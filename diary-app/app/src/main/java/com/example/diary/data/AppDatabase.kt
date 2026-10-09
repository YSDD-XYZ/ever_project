package com.example.diary.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

@Database(
    entities = [
        DiaryEntry::class,
        PlanEntry::class,
        CalendarLink::class,
        Tag::class,
        DiaryTagXref::class,
        PlanTagXref::class
    ],
    version = 3,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun diaryDao(): DiaryDao
    abstract fun planDao(): PlanDao
    abstract fun calendarLinkDao(): CalendarLinkDao
    abstract fun tagDao(): TagDao
    abstract fun diaryTagDao(): DiaryTagDao
    abstract fun planTagDao(): PlanTagDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun get(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "diary.db"
                )
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3)
                    .build()
                    .also { INSTANCE = it }
            }
        }

        /** v1 → v2:加 plan_entries 和 calendar_links */
        private val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `plan_entries` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `title` TEXT NOT NULL,
                        `content` TEXT NOT NULL,
                        `tags` TEXT NOT NULL,
                        `due_at` INTEGER NOT NULL,
                        `reminder_at` INTEGER NOT NULL,
                        `status` INTEGER NOT NULL,
                        `priority` INTEGER NOT NULL,
                        `created_at` INTEGER NOT NULL,
                        `updated_at` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `calendar_links` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `plan_id` INTEGER NOT NULL,
                        `calendar_id` INTEGER NOT NULL,
                        `event_id` INTEGER NOT NULL,
                        `linked_at` INTEGER NOT NULL,
                        FOREIGN KEY(`plan_id`) REFERENCES `plan_entries`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_calendar_links_plan_id` ON `calendar_links` (`plan_id`)")
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_calendar_links_event_id` ON `calendar_links` (`event_id`)")
            }
        }

        /**
         * v2 → v3:把 diary.tags / plan_entries.tags 的字符串拆出来,进 tags 表 + 关联表。
         *
         * 拆解规则:
         *   - 按 ',' 或 '，' 分隔
         *   - 忽略空白段
         *   - 同名 tag 去重(唯一索引自动保证)
         *   - 关联表写 (entry_id, tag_id)
         */
        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // 1) 新表
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `tags` (
                        `id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        `name` TEXT NOT NULL,
                        `created_at` INTEGER NOT NULL
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_tags_name` ON `tags` (`name`)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `diary_tags` (
                        `diary_id` INTEGER NOT NULL,
                        `tag_id` INTEGER NOT NULL,
                        PRIMARY KEY(`diary_id`, `tag_id`),
                        FOREIGN KEY(`diary_id`) REFERENCES `diary`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
                        FOREIGN KEY(`tag_id`) REFERENCES `tags`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_diary_tags_tag_id` ON `diary_tags` (`tag_id`)")

                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `plan_tags` (
                        `plan_id` INTEGER NOT NULL,
                        `tag_id` INTEGER NOT NULL,
                        PRIMARY KEY(`plan_id`, `tag_id`),
                        FOREIGN KEY(`plan_id`) REFERENCES `plan_entries`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
                        FOREIGN KEY(`tag_id`) REFERENCES `tags`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE
                    )
                    """.trimIndent()
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_plan_tags_tag_id` ON `plan_tags` (`tag_id`)")

                // 2) 把日记的 tags 字段拆开
                migrateTagColumn(db, tableName = "diary", idColumn = "id", tagsColumn = "tags", xrefTable = "diary_tags", xrefIdColumn = "diary_id")
                migrateTagColumn(db, tableName = "plan_entries", idColumn = "id", tagsColumn = "tags", xrefTable = "plan_tags", xrefIdColumn = "plan_id")

                // 3) 注:不删除老 tags 字符串字段,先留着供旧逻辑回退;
                //    后续 Repository 全部改用关联表后,可以再写一次 v3 → v4 的迁移 DROP COLUMN。
            }

            /**
             * 通用:扫 tableName 里所有行的 tags 字段,按 ,/， 拆分,
             * 插入到 tags 表(IGNORE 撞唯一),再写 xref。
             */
            private fun migrateTagColumn(
                db: SupportSQLiteDatabase,
                tableName: String,
                idColumn: String,
                tagsColumn: String,
                xrefTable: String,
                xrefIdColumn: String
            ) {
                db.beginTransaction()
                try {
                    db.query("SELECT `$idColumn`, `$tagsColumn` FROM `$tableName`").use { c ->
                        val idCol = c.getColumnIndexOrThrow(idColumn)
                        val tagCol = c.getColumnIndexOrThrow(tagsColumn)
                        val cache = HashMap<String, Long>()
                        while (c.moveToNext()) {
                            val rowId = c.getLong(idCol)
                            val raw = c.getString(tagCol) ?: continue
                            val tokens = raw.split(',', '，')
                                .map { it.trim() }
                                .filter { it.isNotEmpty() }
                            for (name in tokens) {
                                val tagId = cache.getOrPut(name) {
                                    db.execSQL(
                                        "INSERT OR IGNORE INTO `tags`(`name`, `created_at`) VALUES (?, ?)",
                                        arrayOf(name, System.currentTimeMillis())
                                    )
                                    db.query("SELECT `id` FROM `tags` WHERE `name` = ? LIMIT 1", arrayOf(name)).use { tc ->
                                        if (tc.moveToFirst()) tc.getLong(0) else -1L
                                    }
                                }
                                if (tagId > 0) {
                                    db.execSQL(
                                        "INSERT OR IGNORE INTO `$xrefTable`(`$xrefIdColumn`, `tag_id`) VALUES (?, ?)",
                                        arrayOf(rowId, tagId)
                                    )
                                }
                            }
                        }
                    }
                    db.setTransactionSuccessful()
                } finally {
                    db.endTransaction()
                }
            }
        }
    }
}