package com.example.pomodoro

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.CountDownTimer
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.pomodoro.ui.TimerActivity

/**
 * TimerService —— 前台 Service 倒计时
 *
 * 状态机：
 *   IDLE → FOCUS → (COMPLETE | ABORT) → BREAK → (COMPLETE | ABORT) → IDLE
 *
 * 通过 broadcast 把进度同步给 UI Activity（避免 Activity 持 Service 引用）
 */
class TimerService : Service() {

    private var mode = MODE_IDLE
    private var timer: CountDownTimer? = null
    private var startElapsedMs = 0L
    private var plannedSeconds = 0

    inner class LocalBinder : android.os.Binder() {
        val service: TimerService get() = this@TimerService
    }

    private val binder = LocalBinder()
    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service onCreate")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_FOCUS -> {
                val minutes = intent.getIntExtra(EXTRA_MINUTES, 25)
                startFocus(minutes)
            }
            ACTION_START_BREAK -> {
                val minutes = intent.getIntExtra(EXTRA_MINUTES, 5)
                startBreak(minutes)
            }
            ACTION_ABORT -> abort()
            else -> Log.w(TAG, "未知 action: ${intent?.action}")
        }
        return START_NOT_STICKY
    }

    private fun startFocus(minutes: Int) {
        if (mode != MODE_IDLE) {
            Log.w(TAG, "已在运行 mode=$mode，忽略 startFocus")
            return
        }
        mode = MODE_FOCUS
        plannedSeconds = minutes * 60
        startElapsedMs = System.currentTimeMillis()

        EventReporter.reportStart(applicationContext, minutes)

        startForeground(NOTIF_ID_FOCUS, buildFocusNotification(minutes * 60))

        timer = object : CountDownTimer(minutes * 60 * 1000L, 1000L) {
            override fun onTick(msLeft: Long) {
                val secLeft = (msLeft / 1000).toInt()
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                nm.notify(NOTIF_ID_FOCUS, buildFocusNotification(secLeft))
                sendProgress(MODE_FOCUS, secLeft)
            }
            override fun onFinish() {
                onFocusComplete()
            }
        }.start()
        sendProgress(MODE_FOCUS, minutes * 60)
    }

    private fun startBreak(minutes: Int) {
        mode = MODE_BREAK
        plannedSeconds = minutes * 60
        startElapsedMs = System.currentTimeMillis()

        EventReporter.reportBreakStart(applicationContext, minutes)
        startForeground(NOTIF_ID_BREAK, buildBreakNotification(minutes * 60))

        timer = object : CountDownTimer(minutes * 60 * 1000L, 1000L) {
            override fun onTick(msLeft: Long) {
                val secLeft = (msLeft / 1000).toInt()
                val nm = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
                nm.notify(NOTIF_ID_BREAK, buildBreakNotification(secLeft))
                sendProgress(MODE_BREAK, secLeft)
            }
            override fun onFinish() {
                onBreakComplete()
            }
        }.start()
    }

    private fun abort() {
        val elapsedSec = ((System.currentTimeMillis() - startElapsedMs) / 1000).toInt()
        timer?.cancel()
        timer = null
        when (mode) {
            MODE_FOCUS -> {
                val actualMin = (elapsedSec / 60).coerceAtLeast(0)
                EventReporter.reportAbort(applicationContext, actualMin)
            }
            MODE_BREAK -> {
                // 中断休息不写日记
            }
            else -> {}
        }
        reset()
    }

    private fun onFocusComplete() {
        val actualMin = (plannedSeconds / 60).coerceAtLeast(1)
        val app = applicationContext as PomodoroApplication
        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
        app.state.rolloverIfNeeded(today)
        app.state.todayCount += 1
        app.state.todayMinutes += actualMin
        EventReporter.reportComplete(applicationContext, actualMin, plannedSeconds / 60)

        // 历史记录
        val entry = """{"type":"focus","plannedMin":${plannedSeconds / 60},"actualMin":$actualMin,"timestamp":${System.currentTimeMillis()}}"""
        app.state.appendHistory(entry)

        sendProgress(MODE_IDLE, 0)
        // 切到休息
        startBreak(app.state.breakMinutes)
    }

    private fun onBreakComplete() {
        EventReporter.reportBreakComplete(applicationContext)
        reset()
    }

    private fun reset() {
        mode = MODE_IDLE
        timer = null
        startElapsedMs = 0L
        plannedSeconds = 0
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun sendProgress(mode: Int, secLeft: Int) {
        val intent = Intent(ACTION_PROGRESS).apply {
            setPackage(packageName)
            putExtra(EXTRA_MODE, mode)
            putExtra(EXTRA_SEC_LEFT, secLeft)
        }
        sendBroadcast(intent)
    }

    private fun buildFocusNotification(secLeft: Int): Notification {
        val intent = Intent(this, TimerActivity::class.java)
        val pi = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val mm = secLeft / 60
        val ss = secLeft % 60
        return NotificationCompat.Builder(this, PomodoroApplication.CHANNEL_FOCUS)
            .setContentTitle("🎯 专注中")
            .setContentText("剩余 ${mm}:${"%02d".format(ss)}")
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setOngoing(true)
            .setContentIntent(pi)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun buildBreakNotification(secLeft: Int): Notification {
        val intent = Intent(this, TimerActivity::class.java)
        val pi = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val mm = secLeft / 60
        val ss = secLeft % 60
        return NotificationCompat.Builder(this, PomodoroApplication.CHANNEL_BREAK)
            .setContentTitle("☕ 休息中")
            .setContentText("剩余 ${mm}:${"%02d".format(ss)}")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setContentIntent(pi)
            .setOnlyAlertOnce(true)
            .build()
    }

    override fun onDestroy() {
        timer?.cancel()
        Log.d(TAG, "Service onDestroy")
        super.onDestroy()
    }

    companion object {
        private const val TAG = "TimerService"

        const val ACTION_START_FOCUS = "com.example.pomodoro.START_FOCUS"
        const val ACTION_START_BREAK = "com.example.pomodoro.START_BREAK"
        const val ACTION_ABORT = "com.example.pomodoro.ABORT"
        const val ACTION_PROGRESS = "com.example.pomodoro.PROGRESS"

        const val EXTRA_MINUTES = "minutes"
        const val EXTRA_MODE = "mode"
        const val EXTRA_SEC_LEFT = "secLeft"

        const val MODE_IDLE = 0
        const val MODE_FOCUS = 1
        const val MODE_BREAK = 2

        const val NOTIF_ID_FOCUS = 1001
        const val NOTIF_ID_BREAK = 1002

        fun start(context: Context, action: String, minutes: Int = 25) {
            val intent = Intent(context, TimerService::class.java).apply {
                this.action = action
                putExtra(EXTRA_MINUTES, minutes)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun abort(context: Context) {
            val intent = Intent(context, TimerService::class.java).apply { action = ACTION_ABORT }
            context.startService(intent)
        }
    }
}
