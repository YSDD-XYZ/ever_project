package com.example.diary.ui.plan

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.example.diary.DiaryApplication
import com.example.diary.R
import com.example.diary.data.PlanEntry
import com.example.diary.databinding.ActivityPlanEditorBinding
import com.example.diary.system.CalendarSync
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class PlanEditorActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPlanEditorBinding
    private val app: DiaryApplication get() = application as DiaryApplication
    private val vm: PlanEditorViewModel by viewModels {
        PlanEditorViewModel.factory(
            app.container.planRepository,
            app.container.calendarSync,
            app.container.reminderScheduler,
            app.container.database.calendarLinkDao()
        )
    }

    private var currentId: Long = 0L
    private var dueAt: Long = 0L
    private var reminderAt: Long = 0L
    private val fullFmt = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())

    private val askCalendarPerm = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = (result[CalendarSync.PERMISSION_READ] == true &&
            result[CalendarSync.PERMISSION_WRITE] == true)
        if (!granted) {
            Toast.makeText(this, R.string.calendar_permission_denied, Toast.LENGTH_LONG).show()
        } else {
            doAddToCalendar()
        }
    }

    private val askNotifPerm = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* ignored */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPlanEditorBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { finish() }

        // 默认状态/优先级
        binding.statusGroup.check(R.id.statusTodo)
        binding.priorityGroup.check(R.id.priorityNone)

        currentId = intent.getLongExtra(EXTRA_ID, 0L)
        if (currentId != 0L) {
            lifecycleScope.launch {
                val wt = app.container.planRepository.getById(currentId)
                if (wt != null) {
                    val entry = wt.entry
                    binding.inputTitle.setText(entry.title)
                    binding.inputContent.setText(entry.content)
                    binding.tagInput.setChips(wt.tags)
                    dueAt = entry.dueAt
                    reminderAt = entry.reminderAt
                    updateDueButton()
                    updateReminderButton()
                    when (entry.status) {
                        PlanEntry.STATUS_DOING -> binding.statusGroup.check(R.id.statusDoing)
                        PlanEntry.STATUS_DONE -> binding.statusGroup.check(R.id.statusDone)
                        else -> binding.statusGroup.check(R.id.statusTodo)
                    }
                    when (entry.priority) {
                        PlanEntry.PRIORITY_LOW -> binding.priorityGroup.check(R.id.priorityLow)
                        PlanEntry.PRIORITY_MEDIUM -> binding.priorityGroup.check(R.id.priorityMedium)
                        PlanEntry.PRIORITY_HIGH -> binding.priorityGroup.check(R.id.priorityHigh)
                        else -> binding.priorityGroup.check(R.id.priorityNone)
                    }
                    refreshCalendarButton()
                }
            }
        }

        binding.btnDue.setOnClickListener { pickDateTime { dueAt = it; updateDueButton() } }
        binding.btnReminder.setOnClickListener {
            pickDateTime { reminderAt = it; updateReminderButton() }
        }

        // 长按清除
        binding.btnDue.setOnLongClickListener {
            dueAt = 0L; updateDueButton(); true
        }
        binding.btnReminder.setOnLongClickListener {
            reminderAt = 0L; updateReminderButton(); true
        }

        binding.btnCalendar.setOnClickListener { onCalendarButtonClicked() }

        lifecycleScope.launch {
            vm.saved.collectLatest { if (it) finish() }
        }
        lifecycleScope.launch {
            vm.toast.collectLatest { tag ->
                val msg = when (tag) {
                    "CALENDAR_ADDED" -> R.string.calendar_added
                    "CALENDAR_REMOVED" -> R.string.calendar_removed
                    "CALENDAR_NO_ACCOUNT" -> R.string.calendar_no_account
                    else -> 0
                }
                if (msg != 0) Toast.makeText(this@PlanEditorActivity, msg, Toast.LENGTH_SHORT).show()
            }
        }

        // Android 13+ 通知权限
        if (Build.VERSION.SDK_INT >= 33) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                askNotifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun updateDueButton() {
        binding.btnDue.text = if (dueAt > 0) {
            "截止:" + fullFmt.format(Date(dueAt)) + " (长按清除)"
        } else getString(R.string.hint_due_date)
    }

    private fun updateReminderButton() {
        binding.btnReminder.text = if (reminderAt > 0) {
            "提醒:" + fullFmt.format(Date(reminderAt)) + " (长按清除)"
        } else getString(R.string.hint_reminder_at)
    }

    private fun refreshCalendarButton() {
        lifecycleScope.launch {
            val link = vm.getLink(currentId)
            binding.btnCalendar.text = if (link != null) {
                getString(R.string.action_remove_from_calendar)
            } else {
                getString(R.string.action_add_to_calendar)
            }
        }
    }

    private fun onCalendarButtonClicked() {
        if (currentId <= 0L) {
            Toast.makeText(this, "请先保存计划", Toast.LENGTH_SHORT).show()
            return
        }
        lifecycleScope.launch {
            val link = vm.getLink(currentId)
            if (link != null) {
                vm.removeFromCalendar(currentId)
                refreshCalendarButton()
            } else {
                ensureCalendarPermission()
            }
        }
    }

    private fun ensureCalendarPermission() {
        val readOk = ContextCompat.checkSelfPermission(this, CalendarSync.PERMISSION_READ) == PackageManager.PERMISSION_GRANTED
        val writeOk = ContextCompat.checkSelfPermission(this, CalendarSync.PERMISSION_WRITE) == PackageManager.PERMISSION_GRANTED
        if (readOk && writeOk) {
            doAddToCalendar()
        } else {
            askCalendarPerm.launch(arrayOf(CalendarSync.PERMISSION_READ, CalendarSync.PERMISSION_WRITE))
        }
    }

    private fun doAddToCalendar() {
        lifecycleScope.launch {
            val wt = app.container.planRepository.getById(currentId) ?: return@launch
            if (vm.addToCalendar(wt.entry)) {
                refreshCalendarButton()
            }
        }
    }

    private fun pickDateTime(onPicked: (Long) -> Unit) {
        val c = Calendar.getInstance()
        DatePickerDialog(this, { _, y, m, d ->
            TimePickerDialog(this, { _, hh, mm ->
                val out = Calendar.getInstance().apply { set(y, m, d, hh, mm, 0) }
                onPicked(out.timeInMillis)
            }, c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE), true).show()
        }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_plan_editor, menu)
        menu.findItem(R.id.action_save)?.icon?.setTint(
            resources.getColor(R.color.caramel_500, theme)
        )
        menu.findItem(R.id.action_delete)?.icon?.setTint(
            resources.getColor(R.color.rose_500, theme)
        )
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean = when (item.itemId) {
        R.id.action_save -> { save(); true }
        R.id.action_delete -> { confirmDelete(); true }
        else -> super.onOptionsItemSelected(item)
    }

    private fun save() {
        val title = binding.inputTitle.text?.toString().orEmpty().trim()
        val content = binding.inputContent.text?.toString().orEmpty().trim()
        val tagNames = binding.tagInput.chipNames()
        if (title.isEmpty() && content.isEmpty()) {
            Toast.makeText(this, "标题和内容不能都为空", Toast.LENGTH_SHORT).show()
            return
        }
        val status = when (binding.statusGroup.checkedButtonId) {
            R.id.statusDoing -> PlanEntry.STATUS_DOING
            R.id.statusDone -> PlanEntry.STATUS_DONE
            else -> PlanEntry.STATUS_TODO
        }
        val priority = when (binding.priorityGroup.checkedButtonId) {
            R.id.priorityLow -> PlanEntry.PRIORITY_LOW
            R.id.priorityMedium -> PlanEntry.PRIORITY_MEDIUM
            R.id.priorityHigh -> PlanEntry.PRIORITY_HIGH
            else -> PlanEntry.PRIORITY_NONE
        }
        val entry = PlanEntry(
            id = currentId,
            title = title,
            content = content,
            tags = tagNames.joinToString(","), // 老字段兼容
            dueAt = dueAt,
            reminderAt = reminderAt,
            status = status,
            priority = priority,
            createdAt = 0L,
            updatedAt = 0L
        )
        lifecycleScope.launch {
            val id = vm.save(entry, tagNames)
            if (id > 0 && currentId == 0L) {
                currentId = id
                refreshCalendarButton()
            }
        }
    }

    private fun confirmDelete() {
        if (currentId == 0L) { finish(); return }
        AlertDialog.Builder(this)
            .setMessage(R.string.confirm_delete)
            .setPositiveButton(R.string.action_delete) { _, _ ->
                lifecycleScope.launch {
                    vm.delete(currentId)
                    Toast.makeText(this@PlanEditorActivity, R.string.deleted, Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    companion object {
        const val EXTRA_ID = "extra_plan_id"
    }
}