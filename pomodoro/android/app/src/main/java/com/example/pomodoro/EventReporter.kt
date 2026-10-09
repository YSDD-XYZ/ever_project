package com.example.pomodoro

import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * EventReporter —— 把番茄钟事件发给 diary-app
 *
 * 复用 fish 的协议：
 *   - action: "com.example.fish.EVENT"
 *   - package: "com.example.diary"
 *   - extras: type / title / body / tags
 *
 * 这样日记 App 不用单独为番茄钟写一个 receiver，
 * 现有的 FishEventReceiver 直接接收。
 *
 * 协议约定的事件类型：
 *   - pomodoro.start
 *   - pomodoro.complete
 *   - pomodoro.abort
 *   - pomodoro.break_start
 *   - pomodoro.break_complete
 *
 * 安全性同 fish：
 *   - setPackage 限定接收方
 *   - 字段长度限制
 *   - 静默失败
 */
object EventReporter {

    private const val TAG = "PomodoroEvent"
    private const val ACTION = "com.example.fish.EVENT"
    private const val RECEIVER_PACKAGE = "com.example.diary"

    fun reportStart(context: Context, plannedMinutes: Int) {
        send(
            context, type = "pomodoro.start",
            title = "开始专注",
            body = "🎯 开始一次专注（计划 ${plannedMinutes} 分钟）",
            tags = "pomodoro,focus,start",
        )
    }

    fun reportComplete(
        context: Context,
        actualMinutes: Int,
        plannedMinutes: Int,
    ) {
        send(
            context, type = "pomodoro.complete",
            title = "完成专注",
            body = "🍅 完成！专注了 ${actualMinutes} 分钟（计划 ${plannedMinutes}）",
            tags = "pomodoro,focus,complete",
        )
    }

    fun reportAbort(
        context: Context,
        elapsedMinutes: Int,
    ) {
        send(
            context, type = "pomodoro.abort",
            title = "中断专注",
            body = "⏸ 中断专注（已专注 ${elapsedMinutes} 分钟）",
            tags = "pomodoro,focus,abort",
        )
    }

    fun reportBreakStart(context: Context, minutes: Int) {
        send(
            context, type = "pomodoro.break_start",
            title = "休息开始",
            body = "☕ 休息 ${minutes} 分钟",
            tags = "pomodoro,break",
        )
    }

    fun reportBreakComplete(context: Context) {
        send(
            context, type = "pomodoro.break_complete",
            title = "休息结束",
            body = "🔋 充电完成，继续！",
            tags = "pomodoro,break",
        )
    }

    /**
     * 每日汇总（App 启动时检查 + 写一条"昨天汇总"）
     */
    fun reportDailySummary(
        context: Context,
        date: String,
        count: Int,
        minutes: Int,
    ) {
        send(
            context, type = "pomodoro.daily_summary",
            title = "专注日报 $date",
            body = "📊 $date 完成 $count 番茄，累计 $minutes 分钟",
            tags = "pomodoro,summary",
        )
    }

    private fun send(
        context: Context,
        type: String,
        title: String,
        body: String,
        tags: String,
    ) {
        try {
            val intent = Intent(ACTION).apply {
                setPackage(RECEIVER_PACKAGE)
                putExtra("type", type.take(50))
                putExtra("title", title.take(200))
                putExtra("body", body.take(4000))
                putExtra("tags", tags.take(200))
            }
            context.sendBroadcast(intent)
            Log.d(TAG, "→ 已发: $type / $title")
        } catch (e: Throwable) {
            // 静默失败：diary 没装不影响番茄钟
            Log.d(TAG, "发送失败（无影响）: ${e.message}")
        }
    }
}
