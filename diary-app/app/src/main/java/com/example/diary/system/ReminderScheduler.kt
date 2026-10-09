package com.example.diary.system

import android.app.AlarmManager
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.getSystemService
import com.example.diary.data.PlanEntry
import com.example.diary.receiver.ReminderReceiver

/**
 * 本地通知调度:基于 AlarmManager。设备重启后请用 BOOT_COMPLETED 重新排。
 *
 * Android 12+ 对精确闹钟(SCHEDULE_EXACT_ALARM)需要特殊权限。
 * 这里用 setAndAllowWhileIdle(),允许 ~ 分钟级偏差,免去 SCHEDULE_EXACT_ALARM 申请。
 */
class ReminderScheduler(private val app: Application) {

    fun ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = app.getSystemService<NotificationManager>() ?: return
            val channel = NotificationChannel(
                CHANNEL_ID,
                "计划提醒",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "App 内计划截止时提醒"
            }
            nm.createNotificationChannel(channel)
        }
    }

    fun schedule(plan: PlanEntry) {
        if (plan.reminderAt <= System.currentTimeMillis()) return
        ensureChannel()
        val am = app.getSystemService<AlarmManager>() ?: return
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, plan.reminderAt, pendingIntent(plan))
    }

    fun cancel(planId: Long) {
        val am = app.getSystemService<AlarmManager>() ?: return
        val intent = Intent(app, ReminderReceiver::class.java).apply {
            action = ReminderReceiver.ACTION_SHOW
            putExtra(ReminderReceiver.EXTRA_PLAN_ID, planId)
        }
        val pi = PendingIntent.getBroadcast(
            app,
            planId.toInt(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pi != null) {
            am.cancel(pi)
            pi.cancel()
        }
    }

    private fun pendingIntent(plan: PlanEntry): PendingIntent {
        val intent = Intent(app, ReminderReceiver::class.java).apply {
            action = ACTION_SHOW
            putExtra(EXTRA_PLAN_ID, plan.id)
        }
        return PendingIntent.getBroadcast(
            app,
            plan.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        const val CHANNEL_ID = "plan_reminder"
        const val ACTION_SHOW = "com.example.diary.action.PLAN_REMINDER_SHOW"
        const val EXTRA_PLAN_ID = "extra_plan_id"

        /** 暴露给 Receiver 用 */
        fun buildNotification(context: Context, planId: Long, title: String, content: String): android.app.Notification {
            return NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(content)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
                .build()
        }
    }
}