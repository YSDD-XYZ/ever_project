package com.example.pomodoro.ui

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.pomodoro.PomodoroApplication
import com.example.pomodoro.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * HistoryActivity —— 简单列出最近 50 条历史
 */
class HistoryActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_history)

        val list = findViewById<TextView>(R.id.history_list)
        val app = applicationContext as PomodoroApplication
        val historyJson = app.state.getHistoryJson()

        // 简易解析：每条形如 {"type":"focus","plannedMin":25,"actualMin":25,"timestamp":1234}
        // 提取 timestamp + actualMin 即可
        val df = SimpleDateFormat("MM-dd HH:mm", Locale.US)
        val items = historyJson
            .removePrefix("[")
            .removeSuffix("]")
            .split("},{")
            .map { "{$it}" }
            .filter { it.startsWith("{") }
            .mapNotNull { entry ->
                val ts = Regex("\"timestamp\":(\\d+)").find(entry)?.groupValues?.getOrNull(1)?.toLongOrNull()
                val actual = Regex("\"actualMin\":(\\d+)").find(entry)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                val planned = Regex("\"plannedMin\":(\\d+)").find(entry)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                if (ts != null) {
                    "${df.format(Date(ts))}  ·  ${actual}/${planned} min" to actual
                } else null
            }
            .sortedByDescending { it.second }
            .map { it.first }

        list.text = if (items.isEmpty()) "还没有历史。开始一次专注吧！" else items.joinToString("\n")
    }
}
