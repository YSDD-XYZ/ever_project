package com.example.diary.ui.plan

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.diary.data.CalendarLinkDao
import com.example.diary.data.PlanEntry
import com.example.diary.data.PlanRepository
import com.example.diary.system.CalendarSync
import com.example.diary.system.ReminderScheduler
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

class PlanEditorViewModel(
    private val repo: PlanRepository,
    private val calendarSync: CalendarSync,
    private val reminder: ReminderScheduler,
    private val linkDao: CalendarLinkDao
) : ViewModel() {

    private val _saved = MutableSharedFlow<Boolean>(extraBufferCapacity = 1)
    val saved = _saved.asSharedFlow()

    private val _toast = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val toast = _toast.asSharedFlow()

    /**
     * 保存计划:返回 id。保存后会自动排提醒。
     * 返回 -1 表示标题和正文都为空。
     */
    suspend fun save(entry: PlanEntry, tagNames: List<String>): Long {
        if (entry.title.isBlank() && entry.content.isBlank()) return -1L
        val id = repo.save(entry, tagNames)
        val saved = repo.getById(id) ?: return -1L
        if (saved.entry.reminderAt > System.currentTimeMillis()) {
            reminder.schedule(saved.entry)
        }
        _saved.tryEmit(true)
        return id
    }

    suspend fun delete(id: Long) {
        // 取消提醒 + 取消日历关联
        reminder.cancel(id)
        calendarSync.removeEvent(id, linkDao)
        repo.delete(id)
    }

    /** 把当前计划同步到手机日历。返回 CalendarLink 或 null(权限/账号问题)。 */
    suspend fun addToCalendar(plan: PlanEntry): Boolean {
        if (plan.id <= 0) return false
        val link = calendarSync.insertEvent(plan, linkDao)
        return if (link != null) {
            _toast.tryEmit("CALENDAR_ADDED")
            true
        } else {
            _toast.tryEmit("CALENDAR_NO_ACCOUNT")
            false
        }
    }

    suspend fun removeFromCalendar(planId: Long) {
        calendarSync.removeEvent(planId, linkDao)
        _toast.tryEmit("CALENDAR_REMOVED")
    }

    suspend fun getLink(planId: Long) = linkDao.getByPlan(planId)

    companion object {
        fun factory(
            repo: PlanRepository,
            calendarSync: CalendarSync,
            reminder: ReminderScheduler,
            linkDao: CalendarLinkDao
        ) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                PlanEditorViewModel(repo, calendarSync, reminder, linkDao) as T
        }
    }
}