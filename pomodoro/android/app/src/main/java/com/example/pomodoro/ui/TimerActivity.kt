package com.example.pomodoro.ui

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.example.pomodoro.PomodoroApplication
import com.example.pomodoro.R
import com.example.pomodoro.TimerService

/**
 * TimerActivity —— 主计时界面
 *
 * UI 元素：
 *   - 两个 EditText: focusMin / breakMin（可调）
 *   - 大圆形时间显示
 *   - 3 个按钮: 开始 / 放弃 / 历史
 *   - 底部: 今日累计（番茄数 + 分钟）
 */
class TimerActivity : AppCompatActivity() {

    private lateinit var timeText: TextView
    private lateinit var statusText: TextView
    private lateinit var focusInput: EditText
    private lateinit var breakInput: EditText
    private lateinit var startBtn: Button
    private lateinit var abortBtn: Button
    private lateinit var historyBtn: Button
    private lateinit var todayText: TextView

    private val progressReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action != TimerService.ACTION_PROGRESS) return
            val mode = intent.getIntExtra(TimerService.EXTRA_MODE, TimerService.MODE_IDLE)
            val secLeft = intent.getIntExtra(TimerService.EXTRA_SEC_LEFT, 0)
            updateDisplay(mode, secLeft)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_timer)

        timeText = findViewById(R.id.time_text)
        statusText = findViewById(R.id.status_text)
        focusInput = findViewById(R.id.focus_input)
        breakInput = findViewById(R.id.break_input)
        startBtn = findViewById(R.id.start_btn)
        abortBtn = findViewById(R.id.abort_btn)
        historyBtn = findViewById(R.id.history_btn)
        todayText = findViewById(R.id.today_text)

        val app = applicationContext as PomodoroApplication
        focusInput.setText(app.state.focusMinutes.toString())
        breakInput.setText(app.state.breakMinutes.toString())

        startBtn.setOnClickListener {
            val focusMin = focusInput.text.toString().toIntOrNull()?.coerceIn(1, 90) ?: 25
            val breakMin = breakInput.text.toString().toIntOrNull()?.coerceIn(1, 30) ?: 5
            app.state.focusMinutes = focusMin
            app.state.breakMinutes = breakMin
            TimerService.start(this, TimerService.ACTION_START_FOCUS, focusMin)
            abortBtn.visibility = View.VISIBLE
            startBtn.isEnabled = false
            focusInput.isEnabled = false
            breakInput.isEnabled = false
        }

        abortBtn.setOnClickListener {
            TimerService.abort(this)
            abortBtn.visibility = View.GONE
            startBtn.isEnabled = true
            focusInput.isEnabled = true
            breakInput.isEnabled = true
            updateDisplay(TimerService.MODE_IDLE, 0)
        }

        historyBtn.setOnClickListener {
            startActivity(Intent(this, HistoryActivity::class.java))
        }

        updateDisplay(TimerService.MODE_IDLE, 0)
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(TimerService.ACTION_PROGRESS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(progressReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(progressReceiver, filter)
        }
        updateToday()
    }

    override fun onPause() {
        super.onPause()
        try { unregisterReceiver(progressReceiver) } catch (_: Throwable) {}
    }

    private fun updateDisplay(mode: Int, secLeft: Int) {
        when (mode) {
            TimerService.MODE_FOCUS -> {
                val mm = secLeft / 60
                val ss = secLeft % 60
                timeText.text = String.format("%02d:%02d", mm, ss)
                statusText.text = getString(R.string.state_focus)
            }
            TimerService.MODE_BREAK -> {
                val mm = secLeft / 60
                val ss = secLeft % 60
                timeText.text = String.format("%02d:%02d", mm, ss)
                statusText.text = getString(R.string.state_break)
            }
            else -> {
                val app = applicationContext as PomodoroApplication
                timeText.text = String.format("%02d:00", app.state.focusMinutes)
                statusText.text = getString(R.string.state_idle)
            }
        }
        updateToday()
    }

    private fun updateToday() {
        val app = applicationContext as PomodoroApplication
        val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
        app.state.rolloverIfNeeded(today)
        todayText.text = "🍅 今日 ${app.state.todayCount} 番茄 · ${app.state.todayMinutes} 分钟"
    }
}
