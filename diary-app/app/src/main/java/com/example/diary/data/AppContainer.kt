package com.example.diary.data

import com.example.diary.security.PasswordManager
import com.example.diary.system.CalendarSync
import com.example.diary.system.ReminderScheduler

interface AppContainer {
    val database: AppDatabase
    val diaryRepository: DiaryRepository
    val planRepository: PlanRepository
    val tagRepository: TagRepository
    val passwordManager: PasswordManager
    val calendarSync: CalendarSync
    val reminderScheduler: ReminderScheduler
    val dbExporter: DbExporter
    val dbImporter: DbImporter
}

class DefaultAppContainer(
    private val app: android.app.Application
) : AppContainer {
    override val database: AppDatabase = AppDatabase.get(app)
    override val diaryRepository: DiaryRepository = DiaryRepository(
        database.diaryDao(), database.tagDao(), database.diaryTagDao()
    )
    override val planRepository: PlanRepository = PlanRepository(
        database.planDao(), database.tagDao(), database.planTagDao()
    )
    override val tagRepository: TagRepository = TagRepository(database.tagDao())
    override val passwordManager: PasswordManager = PasswordManager(app)
    override val calendarSync: CalendarSync = CalendarSync(app)
    override val reminderScheduler: ReminderScheduler = ReminderScheduler(app)
    override val dbExporter: DbExporter = DbExporter(app)
    override val dbImporter: DbImporter = DbImporter(app, this)
}