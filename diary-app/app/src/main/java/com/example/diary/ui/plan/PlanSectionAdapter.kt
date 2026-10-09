package com.example.diary.ui.plan

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.data.PlanRepository.PlanWithTags
import com.example.diary.databinding.ItemPlanBinding
import com.example.diary.ui.common.Section
import com.example.diary.ui.common.SectionAdapter
import com.example.diary.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PlanEntryVH(val binding: ItemPlanBinding) : RecyclerView.ViewHolder(binding.root) {
    private val dueFmt = SimpleDateFormat("MMM d, yyyy · HH:mm", Locale.ENGLISH)

    fun bind(item: PlanWithTags, onClick: (PlanWithTags) -> Unit, onCheck: (PlanWithTags, Boolean) -> Unit) {
        val p = item.entry
        binding.itemTitle.text = p.title.ifBlank { "（无标题）" }
        binding.itemCheck.setOnCheckedChangeListener(null)
        binding.itemCheck.isChecked = p.status == com.example.diary.data.PlanEntry.STATUS_DONE
        binding.itemCheck.setOnCheckedChangeListener { _, isChecked -> onCheck(item, isChecked) }

        binding.itemStatus.text = when (p.status) {
            com.example.diary.data.PlanEntry.STATUS_DONE -> "已完成"
            com.example.diary.data.PlanEntry.STATUS_DOING -> "进行中"
            else -> "待办"
        }
        binding.itemPriority.text = when (p.priority) {
            com.example.diary.data.PlanEntry.PRIORITY_HIGH -> "高"
            com.example.diary.data.PlanEntry.PRIORITY_MEDIUM -> "中"
            com.example.diary.data.PlanEntry.PRIORITY_LOW -> "低"
            else -> "无优先级"
        }
        if (p.dueAt > 0) {
            binding.itemDue.visibility = View.VISIBLE
            binding.itemDue.text = "截止 " + dueFmt.format(Date(p.dueAt))
        } else {
            binding.itemDue.visibility = View.GONE
        }

        val preview = p.content.take(120).trim()
        if (preview.isEmpty()) {
            binding.itemPreview.visibility = View.GONE
        } else {
            binding.itemPreview.visibility = View.VISIBLE
            binding.itemPreview.text = preview
        }

        binding.root.setOnClickListener { onClick(item) }
    }
}

class PlanSectionAdapter(
    private val onClick: (PlanWithTags) -> Unit,
    private val onCheck: (PlanWithTags, Boolean) -> Unit
) : SectionAdapter<PlanWithTags, PlanEntryVH>(DIFF, R.color.rose_500) {

    override fun createEntryHolder(parent: ViewGroup): PlanEntryVH =
        PlanEntryVH(ItemPlanBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun bindRow(holder: PlanEntryVH, row: PlanWithTags) =
        holder.bind(row, onClick, onCheck)

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Section<PlanWithTags>>() {
            override fun areItemsTheSame(a: Section<PlanWithTags>, b: Section<PlanWithTags>): Boolean {
                return when {
                    a is Section.Header && b is Section.Header -> a.month == b.month
                    a is Section.E && b is Section.E -> a.row.entry.id == b.row.entry.id
                    else -> false
                }
            }

            override fun areContentsTheSame(a: Section<PlanWithTags>, b: Section<PlanWithTags>): Boolean =
                a == b
        }
    }
}