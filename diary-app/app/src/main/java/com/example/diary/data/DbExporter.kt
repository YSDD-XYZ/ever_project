package com.example.diary.data

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 导出 Room 数据库文件,便于跨设备迁移。
 *
 * 走 SAF(Storage Access Framework):用户选择目标位置 → 我们把 diary.db 拷贝过去。
 * 不需要 WRITE_EXTERNAL_STORAGE 权限(Android 13+ 友好)。
 *
 * 目标 Uri 可以来自:
 *   1. ActivityResultContracts.CreateDocument("application/octet-stream")—— 用户主动选位置
 *   2. MediaStore.Downloads —— Downloads/diary-backup-yyyyMMdd-HHmm.db(可选路径)
 */
class DbExporter(private val context: Context) {

    /**
     * 把当前 diary.db 写入给定的 Uri。
     * 返回写入字节数。
     */
    suspend fun exportTo(target: Uri): Long = withContext(Dispatchers.IO) {
        val src = dbFile()
        require(src.exists()) { "本地数据库不存在: ${src.absolutePath}" }
        val out = context.contentResolver.openOutputStream(target, "w")
            ?: throw IllegalStateException("无法打开目标 Uri 的输出流: $target")
        out.use { sink ->
            FileInputStream(src).use { srcStream ->
                srcStream.copyTo(sink, DEFAULT_BUFFER_SIZE)
            }
        }
        src.length()
    }

    /**
     * 把数据库直接拷贝到 Downloads/diary-backup-时间戳.db。
     * 走 MediaStore,免 WRITE_EXTERNAL_STORAGE 权限。
     */
    suspend fun exportToDownloads(): String = withContext(Dispatchers.IO) {
        val src = dbFile()
        require(src.exists()) { "本地数据库不存在: ${src.absolutePath}" }

        val stamp = SimpleDateFormat("yyyyMMdd-HHmm", Locale.US).format(Date())
        val filename = "diary-backup-$stamp.db"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, filename)
                put(MediaStore.Downloads.MIME_TYPE, "application/octet-stream")
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val resolver = context.contentResolver
            val collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI
            val itemUri = resolver.insert(collection, values)
                ?: throw IllegalStateException("无法在 Downloads 创建备份文件")
            resolver.openOutputStream(itemUri, "w")?.use { out ->
                FileInputStream(src).use { it.copyTo(out, DEFAULT_BUFFER_SIZE) }
            } ?: throw IllegalStateException("无法打开输出流")
            values.clear()
            values.put(MediaStore.Downloads.IS_PENDING, 0)
            resolver.update(itemUri, values, null, null)
            "$filename"
        } else {
            // Android 9 及以下:写入公共 Downloads 目录(需 WRITE_EXTERNAL_STORAGE,这里用 cache 替代)
            val out = File(
                context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS),
                filename
            )
            FileInputStream(src).use { it.copyTo(out.outputStream(), DEFAULT_BUFFER_SIZE) }
            out.absolutePath
        }
    }

    /**
     * 给定路径(比如另一个 App 的 file://),返回能 Intent 出去的 Uri。
     * 用于"分享"导出文件。
     */
    fun shareUriForBackup(backupFile: File): Uri {
        return FileProvider.getUriForFile(
            context,
            context.packageName + ".fileprovider",
            backupFile
        )
    }

    /** Room 实际落盘的文件路径 */
    private fun dbFile(): File {
        // databases/diary.db
        return context.getDatabasePath("diary.db")
    }

    companion object {
        /** FileProvider 声明需要的 authority,见 AndroidManifest + res/xml/file_paths.xml */
        const val FILE_PROVIDER_SUFFIX = ".fileprovider"
    }
}