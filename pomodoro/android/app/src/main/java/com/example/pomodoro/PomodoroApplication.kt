package com.example.pomodoro

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

/**
 * 番茄专注 App 入口
 *
 * - 创建前台 Service 通知 Channel
 * - 持有全局 State（专注 / 休息 状态）
 */
class PomodoroApplication : Application() {

    lateinit var state: PomodoroState
        internal set

    override fun onCreate() {
        super.onCreate()
        state = PomodoroState(this)
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val focusChannel = NotificationChannel(
                CHANNEL_FOCUS,
                "专注计时",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "正在专注时显示" }
            val breakChannel = NotificationChannel(
                CHANNEL_BREAK,
                "休息计时",
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "休息中显示" }
            nm.createNotificationChannel(focusChannel)
            nm.createNotificationChannel(breakChannel)
        }
    }

    companion object {
        const val CHANNEL_FOCUS = "pomodoro_focus"
        const val CHANNEL_BREAK = "pomodoro_break"
    }
}
