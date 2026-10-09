package com.example.diary.system

import android.app.Application
import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.provider.CalendarContract
import com.example.diary.data.CalendarLink
import com.example.diary.data.CalendarLinkDao
import com.example.diary.data.PlanEntry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * 负责把 PlanEntry 同步到系统 Calendar Provider。
 *
 * 权限:需要 READ_CALENDAR + WRITE_CALENDAR(运行时权限,UI 层申请)。
 *
 * 选择日历:取系统默认日历(账户下的 primary);
 *          未来可以扩展为弹出选择器,这里保持简单。
 */
class CalendarSync(private val app: Application) {

    /**
     * 把计划作为日历事件插入。
     * 成功返回 (calendarId, eventId),失败抛出(UI 层捕获并提示)。
     */
    suspend fun insertEvent(plan: PlanEntry, linkDao: CalendarLinkDao): CalendarLink? =
        withContext(Dispatchers.IO) {
            val calendarId = pickDefaultCalendarId() ?: return@withContext null

            val resolver: ContentResolver = app.contentResolver
            val values = ContentValues().apply {
                put(CalendarContract.Events.DTSTART, plan.dueAt.takeIf { it > 0 } ?: System.currentTimeMillis())
                put(CalendarContract.Events.DTEND, plan.dueAt.takeIf { it > 0 } ?: System.currentTimeMillis() + 60 * 60 * 1000L)
                put(CalendarContract.Events.TITLE, plan.title)
                put(CalendarContract.Events.DESCRIPTION, buildDescription(plan))
                put(CalendarContract.Events.CALENDAR_ID, calendarId)
                put(CalendarContract.Events.EVENT_TIMEZONE, java.util.TimeZone.getDefault().id)
                if (plan.dueAt > 0) {
                    put(CalendarContract.Events.HAS_ALARM, 1)
                }
            }
            val uri = resolver.insert(CalendarContract.Events.CONTENT_URI, values)
                ?: return@withContext null
            val eventId = ContentUris.parseId(uri)

            // 同步插入默认提醒(如果计划有截止时间)
            if (plan.dueAt > 0) {
                val reminder = ContentValues().apply {
                    put(CalendarContract.Reminders.MINUTES, 10)
                    put(CalendarContract.Reminders.EVENT_ID, eventId)
                    put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT)
                }
                resolver.insert(CalendarContract.Reminders.CONTENT_URI, reminder)
            }

            CalendarLink(
                planId = plan.id,
                calendarId = calendarId,
                eventId = eventId,
                linkedAt = System.currentTimeMillis()
            ).also { linkDao.insert(it) }
        }

    /** 从系统日历删除已关联的事件,并清掉本地 link */
    suspend fun removeEvent(planId: Long, linkDao: CalendarLinkDao) =
        withContext(Dispatchers.IO) {
            val link = linkDao.getByPlan(planId) ?: return@withContext
            val uri = ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, link.eventId)
            app.contentResolver.delete(uri, null, null)
            linkDao.deleteByPlan(planId)
        }

    private fun pickDefaultCalendarId(): Long? {
        val projection = arrayOf(
            CalendarContract.Calendars._ID,
            CalendarContract.Calendars.IS_PRIMARY
        )
        val selection = "${CalendarContract.Calendars.VISIBLE} = 1"
        app.contentResolver.query(
            CalendarContract.Calendars.CONTENT_URI, projection, selection, null, null
        )?.use { c ->
            var firstId: Long? = null
            val idCol = c.getColumnIndexOrThrow(CalendarContract.Calendars._ID)
            val primaryCol = c.getColumnIndex(CalendarContract.Calendars.IS_PRIMARY)
            while (c.moveToNext()) {
                val id = c.getLong(idCol)
                val isPrimary = primaryCol >= 0 && c.getInt(primaryCol) == 1
                if (isPrimary) return id
                if (firstId == null) firstId = id
            }
            return firstId
        }
        return null
    }

    private fun buildDescription(plan: PlanEntry): String {
        val tags = if (plan.tags.isBlank()) "" else "\n标签:${plan.tags}"
        val note = if (plan.content.isBlank()) "" else "\n备注:${plan.content}"
        return "来自\"小日记\"App 的计划$note$tags"
    }

    companion object {
        /** 给上层 Activity 用于运行时权限请求 */
        const val PERMISSION_READ = "android.permission.READ_CALENDAR"
        const val PERMISSION_WRITE = "android.permission.WRITE_CALENDAR"
    }
}

/** 给 Activity 调用入口的便捷包装 */
fun Context.systemCalendarSync(): CalendarSync =
    (applicationContext as com.example.diary.DiaryApplication).container.calendarSync