package com.example.diary.receiver

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.getSystemService
import com.example.diary.DiaryApplication
import com.example.diary.system.ReminderScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ReminderReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val planId = intent.getLongExtra(EXTRA_PLAN_ID, -1L)
        if (planId <= 0) return

        // BOOT_COMPLETED:设备重启后重新排所有提醒
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val pending = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val app = context.applicationContext as DiaryApplication
                    val scheduler = app.container.reminderScheduler
                    val all = app.container.planRepository.getAllOnce()
                    all.forEach { scheduler.schedule(it) }
                } finally {
                    pending.finish()
                }
            }
            return
        }

        // 触发计划提醒通知
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as DiaryApplication
                val plan = app.container.planRepository.getById(planId)?.entry ?: return@launch
                            val nm = context.getSystemService<NotificationManager>() ?: return@launch
                            val notification = ReminderScheduler.buildNotification(
                                context,
                                planId = plan.id,
                                title = plan.title,
                                content = if (plan.content.isBlank()) "计划到期了" else plan.content
                            )
                            nm.notify(planId.toInt(), notification)
            } finally {
                pending.finish()
            }
        }
    }

    companion object {
        const val ACTION_SHOW = "com.example.diary.action.PLAN_REMINDER_SHOW"
        const val EXTRA_PLAN_ID = "extra_plan_id"
    }
}