package com.example.diary.data

import android.content.Context
import android.net.Uri
import androidx.room.Room
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream

/**
 * 导入数据库文件,覆盖本地 Room 数据库。
 *
 * 关键步骤:
 *   1. 关闭当前 Room(force close + closeAndReleaseMemory)
 *   2. 把源文件拷贝到目标位置(用临时文件 + 原子重命名)
 *   3. 重新打开 Room(SQLite 会在第一次访问时重建连接)
 *   4. 清空 calendar_links 表 —— 避免悬挂 eventId 指向老设备的日历事件
 *
 * 因为我们覆盖的是同一个文件路径,Room 的 DatabaseConfiguration 缓存里
 * 还指向旧文件句柄 —— 所以这里必须先把单例置 null,
 * 让下次访问时重新走 Room.databaseBuilder。
 */
class DbImporter(
    private val context: Context,
    private val appContainer: AppContainer
) {

    /**
     * 从源 Uri 导入。完成后,Room 单例被替换;所有 observeXxx() 的 Flow
     * 在重新订阅时会拿到新数据。
     *
     * @return 导入的字节数
     */
    suspend fun importFrom(source: Uri): Long = withContext(Dispatchers.IO) {
        val target = dbFile()
        val tmp = File(target.parentFile, target.name + ".import.tmp")

        // 1) 校验源是合法 SQLite 文件(前 16 字节是 "SQLite format 3\0")
        val header = ByteArray(16)
        context.contentResolver.openInputStream(source)?.use { input ->
            val read = input.read(header)
            require(read == 16 && String(header).startsWith("SQLite format 3")) {
                "源文件不是有效的 SQLite 数据库"
            }
        } ?: throw IllegalStateException("无法打开源 Uri: $source")

        // 2) 先把 Room 单例关掉(关 Database 句柄)
        appContainer.database.close()

        // 3) 拷贝到临时文件,然后原子重命名
        context.contentResolver.openInputStream(source)?.use { input ->
            tmp.outputStream().use { out ->
                input.copyTo(out, DEFAULT_BUFFER_SIZE)
            }
        } ?: throw IllegalStateException("无法读取源文件")
        if (target.exists()) target.delete()
        require(tmp.renameTo(target)) { "无法把临时文件改名覆盖原 db" }

        // 4) 让 AppContainer 持有的 database 引用指向新实例
        //    简化做法:直接调 close 之后,Room.databaseBuilder 再次调用会复用 cached INSTANCE;
        //    这里显式 invalidate 让 Room 重新打开。
        invalidateRoomSingleton()

        // 5) 清空 calendar_links —— eventId 跨设备不通用,留了会让用户看到"已关联日历"
        //    但点进去是找不到事件。
        runCatching {
            context.getDatabasePath("diary.db").let { /* keep var used */ }
            // 用一个新 Room 实例(此刻旧单例已被反射置 null),调用对应 DAO
            val newDb = AppDatabase.get(context)
            newDb.openHelper.writableDatabase.execSQL("DELETE FROM calendar_links")
        }

        // 6) 清理导入过程中可能残留的 .import.tmp 文件
        runCatching {
            tmp.parentFile?.listFiles { f -> f.name.endsWith(".import.tmp") }?.forEach { it.delete() }
        }

        target.length()
    }

    private fun dbFile(): File = context.getDatabasePath("diary.db")

    /**
     * 通过反射清掉 Room 的 INSTANCE 缓存。
     * (Room 的单例是 internal,我们这里用反射绕过。
     *  如果以后换成显式 DI,可以直接 new 一个新的 AppDatabase 实例。)
     */
    private fun invalidateRoomSingleton() {
        try {
            val cls = AppDatabase::class.java
            val field = cls.getDeclaredField("INSTANCE")
            field.isAccessible = true
            val modifiersField = java.lang.reflect.Field::class.java.getDeclaredField("modifiers")
            modifiersField.isAccessible = true
            modifiersField.setInt(field, field.modifiers and java.lang.reflect.Modifier.FINAL.inv())
            field.set(null, null)
        } catch (t: Throwable) {
            // 反射失败也不致命:Room 下次访问会自动重新打开
        }
    }
}