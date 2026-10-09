package com.example.diary.ui.tag

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.diary.DiaryApplication
import com.example.diary.R
import com.example.diary.databinding.ActivityTagManagerBinding
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class TagManagerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityTagManagerBinding
    private val app: DiaryApplication get() = application as DiaryApplication
    private lateinit var adapter: TagAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityTagManagerBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { finish() }

        adapter = TagAdapter(
            onClick = { tag ->
                // 点击 → 改名
                val input = EditText(this).apply {
                    setText(tag.name)
                    setSelection(text.length)
                }
                AlertDialog.Builder(this)
                    .setTitle("重命名标签")
                    .setView(input)
                    .setPositiveButton("保存") { _, _ ->
                        val newName = input.text.toString().trim()
                        if (newName.isEmpty()) {
                            Toast.makeText(this, "名字不能为空", Toast.LENGTH_SHORT).show()
                            return@setPositiveButton
                        }
                        lifecycleScope.launch {
                            val newId = app.container.tagRepository.create(newName)
                            if (newId <= 0) {
                                Toast.makeText(this@TagManagerActivity, "已存在同名标签", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                    .setNegativeButton(R.string.action_delete) { _, _ ->
                        AlertDialog.Builder(this)
                            .setMessage("删除\"#${tag.name}\"将从所有日记和计划中移除,确定吗?")
                            .setPositiveButton(R.string.action_delete) { _, _ ->
                                lifecycleScope.launch {
                                    app.container.tagRepository.delete(tag.id)
                                }
                            }
                            .setNegativeButton(android.R.string.cancel, null)
                            .show()
                    }
                    .setNeutralButton(android.R.string.cancel, null)
                    .show()
            }
        )
        binding.list.layoutManager = LinearLayoutManager(this)
        binding.list.adapter = adapter

        binding.fabNew.setOnClickListener {
            val input = EditText(this).apply {
                hint = "新标签名"
            }
            AlertDialog.Builder(this)
                .setTitle("新建标签")
                .setView(input)
                .setPositiveButton("创建") { _, _ ->
                    val name = input.text.toString().trim()
                    if (name.isEmpty()) return@setPositiveButton
                    lifecycleScope.launch {
                        val id = app.container.tagRepository.create(name)
                        if (id <= 0) {
                            Toast.makeText(this@TagManagerActivity, "已存在同名标签", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
                .setNegativeButton(android.R.string.cancel, null)
                .show()
        }

        lifecycleScope.launch {
            // 同时拿日记 tag 计数 和计划 tag 计数,合并
            kotlinx.coroutines.flow.combine(
                app.container.tagRepository.observeDiaryTagCounts(),
                app.container.tagRepository.observePlanTagCounts()
            ) { d, p ->
                val merged = HashMap<Long, TagAdapter.Row>()
                for (t in d) merged.getOrPut(t.id) { TagAdapter.Row(t.id, t.name, 0, 0) }.let {
                    merged[t.id] = it.copy(diaryCount = t.count)
                }
                for (t in p) merged.getOrPut(t.id) { TagAdapter.Row(t.id, t.name, 0, 0) }.let {
                    merged[t.id] = it.copy(planCount = t.count)
                }
                merged.values.sortedWith(
                    compareByDescending<com.example.diary.ui.tag.TagAdapter.Row> { it.diaryCount + it.planCount }
                        .thenBy { it.name.lowercase() }
                )
            }.collectLatest { list -> adapter.submit(list) }
        }
    }
}