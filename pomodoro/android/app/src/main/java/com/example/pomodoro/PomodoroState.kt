package com.example.pomodoro

import android.content.Context
import android.content.SharedPreferences

/**
 * 全局番茄钟状态。
 *
 * 持久化到 SharedPreferences，应用重启后恢复。
 * 字段：
 *   - focusMinutes: 专注时长（默认 25）
 *   - breakMinutes: 休息时长（默认 5）
 *   - todayCount: 今日完成的番茄数
 *   - todayMinutes: 今日专注分钟数
 *   - todayDate: 日期（YYYY-MM-DD，新一天自动重置计数）
 *   - history: JSON 字符串，最多 50 条历史
 */
class PomodoroState(context: Context) {

    private val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences("pomodoro", Context.MODE_PRIVATE)

    var focusMinutes: Int
        get() = prefs.getInt("focusMin", 25)
        set(v) { prefs.edit().putInt("focusMin", v).apply() }

    var breakMinutes: Int
        get() = prefs.getInt("breakMin", 5)
        set(v) { prefs.edit().putInt("breakMin", v).apply() }

    var todayDate: String
        get() = prefs.getString("todayDate", "") ?: ""
        set(v) { prefs.edit().putString("todayDate", v).apply() }

    var todayCount: Int
        get() = prefs.getInt("todayCount", 0)
        set(v) { prefs.edit().putInt("todayCount", v).apply() }

    var todayMinutes: Int
        get() = prefs.getInt("todayMinutes", 0)
        set(v) { prefs.edit().putInt("todayMinutes", v).apply() }

    /** 获取历史记录（JSON 数组字符串） */
    fun getHistoryJson(): String = prefs.getString("history", "[]") ?: "[]"

    /** 追加一条历史并裁剪到 50 条 */
    fun appendHistory(jsonEntry: String) {
        val cur = getHistoryJson()
        // 简单追加：去掉末尾 ], 加上 ,entry]
        val trimmed = if (cur.endsWith("]")) cur.dropLast(1) else cur
        val next = if (trimmed == "[" || trimmed.isEmpty()) "[$jsonEntry]" else "$trimmed,$jsonEntry]"
        // 限制条数
        val arr = next.split("},{")
        val final = if (arr.size > 50) arr.takeLast(50).joinToString("},{").let {
            if (!it.startsWith("[")) "[{$it" else it
            if (!it.endsWith("]")) "$it}]" else it
        } else next
        prefs.edit().putString("history", final).apply()
    }

    /** 切到新一天：重置计数 */
    fun rolloverIfNeeded(today: String) {
        if (todayDate != today) {
            todayDate = today
            todayCount = 0
            todayMinutes = 0
        }
    }
}
