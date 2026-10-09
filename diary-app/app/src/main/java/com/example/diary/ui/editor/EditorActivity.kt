package com.example.diary.ui.editor

import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.example.diary.DiaryApplication
import com.example.diary.R
import com.example.diary.databinding.ActivityEditorBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class EditorActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEditorBinding
    private val app: DiaryApplication get() = application as DiaryApplication
    private val vm: EditorViewModel by viewModels {
        EditorViewModel.factory(app.container.diaryRepository)
    }

    private var currentId: Long = 0L
    private val dateFmt = SimpleDateFormat("EEEE · MMM d, yyyy", Locale.ENGLISH)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEditorBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.editorDate.text = dateFmt.format(Date())

        binding.btnInsertToday.setOnClickListener {
            val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date())
            val line = "\n[$stamp] "
            val cur = binding.inputContent.text?.toString().orEmpty()
            binding.inputContent.setText(line + cur)
            binding.inputContent.setSelection(line.length)
        }

        if (currentId != 0L || intent.hasExtra(EXTRA_ID)) {
            currentId = intent.getLongExtra(EXTRA_ID, 0L)
            if (currentId != 0L) {
                lifecycleScope.launch {
                    val wt = app.container.diaryRepository.getById(currentId)
                    if (wt != null) {
                        binding.editorDate.text = dateFmt.format(Date(wt.entry.updatedAt))
                        binding.inputTitle.setText(wt.entry.title)
                        binding.inputContent.setText(wt.entry.content)
                        // tags 自动拆分成 chip
                        binding.tagInput.setChips(wt.tags)
                    }
                }
            }
        }

        lifecycleScope.launch {
            vm.saved.collectLatest { if (it) finish() }
        }
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_editor, menu)
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
        if (title.isEmpty() && content.isEmpty()) {
            Toast.makeText(this, "标题和内容不能都为空", Toast.LENGTH_SHORT).show()
            return
        }
        val tagNames = binding.tagInput.chipNames()
        vm.save(
            com.example.diary.data.DiaryEntry(
                id = currentId,
                title = title,
                content = content,
                tags = tagNames.joinToString(","), // 老字段兼容,新逻辑走关联表
                createdAt = 0L,
                updatedAt = 0L
            ),
            tagNames
        )
    }

    private fun confirmDelete() {
        if (currentId == 0L) { finish(); return }
        AlertDialog.Builder(this)
            .setMessage(R.string.confirm_delete)
            .setPositiveButton(R.string.action_delete) { _, _ ->
                vm.delete(currentId)
                Toast.makeText(this, R.string.deleted, Toast.LENGTH_SHORT).show()
                finish()
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    companion object {
        const val EXTRA_ID = "extra_id"
    }
}