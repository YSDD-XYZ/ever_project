package com.example.diary.ui.plan

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.diary.DiaryApplication
import com.example.diary.data.PlanEntry
import com.example.diary.data.PlanRepository.PlanWithTags
import com.example.diary.databinding.ActivityPlanListBinding
import com.example.diary.ui.common.MonthKeys
import com.example.diary.ui.common.SectionAdapter as CommonSectionAdapter
import com.example.diary.ui.common.SectionBuilder
import com.example.diary.ui.common.StickyHeaderDecoration
import com.example.diary.ui.common.TagFilterMode
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class PlanListActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPlanListBinding
    private val app: DiaryApplication get() = application as DiaryApplication
    private lateinit var adapter: PlanSectionAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPlanListBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        binding.toolbar.setNavigationOnClickListener { finish() }

        app.container.reminderScheduler.ensureChannel()

        adapter = PlanSectionAdapter(
            onClick = { item ->
                startActivity(
                    Intent(this, PlanEditorActivity::class.java)
                        .putExtra(PlanEditorActivity.EXTRA_ID, item.entry.id)
                )
            },
            onCheck = { item, _ ->
                val p = item.entry
                val next = if (p.status == PlanEntry.STATUS_DONE) PlanEntry.STATUS_TODO
                else PlanEntry.STATUS_DONE
                lifecycleScope.launch {
                    app.container.planRepository.setStatus(p.id, next)
                    if (next == PlanEntry.STATUS_DONE) {
                        app.container.reminderScheduler.cancel(p.id)
                    } else if (p.reminderAt > 0) {
                        app.container.reminderScheduler.schedule(p.copy(status = next))
                    }
                }
            }
        )
        binding.list.layoutManager = LinearLayoutManager(this)
        binding.list.adapter = adapter
        binding.list.addItemDecoration(
            StickyHeaderDecoration { pos -> adapter.getItemViewType(pos) == CommonSectionAdapter.TYPE_HEADER }
        )

        // Tag 筛选
        lifecycleScope.launch {
            app.container.tagRepository.observePlanTagCounts().collectLatest { tags ->
                binding.tagFilter.setTags(tags)
            }
        }
        binding.tagFilter.setOnChange { ids, mode -> observePlan(ids, mode) }

        binding.fabNew.setOnClickListener {
            startActivity(Intent(this, PlanEditorActivity::class.java))
        }

        observePlan(emptySet(), TagFilterMode.AND)
    }

    private fun observePlan(tagIds: Set<Long>, mode: TagFilterMode) {
        lifecycleScope.launch {
            app.container.planRepository.observeFiltered(
                textQuery = null,
                tagIds = tagIds.toList().ifEmpty { null },
                tagMode = mode
            ).collectLatest { list ->
                val sections = SectionBuilder.build(list) { p ->
                    val key = if (p.entry.dueAt > 0) MonthKeys.from(p.entry.dueAt)
                    else MonthKeys.from(p.entry.updatedAt)
                    key
                }
                adapter.submitList(sections)
                binding.empty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
            }
        }
    }
}