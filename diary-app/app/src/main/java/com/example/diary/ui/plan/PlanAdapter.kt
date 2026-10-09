package com.example.diary.ui.plan

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.data.PlanEntry
import com.example.diary.databinding.ItemPlanBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PlanAdapter(
    private val onClick: (PlanEntry) -> Unit,
    private val onCheck: (PlanEntry, Boolean) -> Unit
) : ListAdapter<PlanEntry, PlanAdapter.VH>(DIFF) {

    fun submit(list: List<PlanEntry>) = submitList(list)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemPlanBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(getItem(position))
    }

    inner class VH(private val b: ItemPlanBinding) : RecyclerView.ViewHolder(b.root) {
        private val dueFmt = SimpleDateFormat("MMM d, yyyy · HH:mm", Locale.ENGLISH)

        fun bind(p: PlanEntry) {
            b.itemTitle.text = p.title.ifBlank { "（无标题）" }
            b.itemCheck.setOnCheckedChangeListener(null)
            b.itemCheck.isChecked = p.status == PlanEntry.STATUS_DONE
            b.itemCheck.setOnCheckedChangeListener { _, isChecked ->
                onCheck(p, isChecked)
            }

            // 状态文字
            b.itemStatus.text = when (p.status) {
                PlanEntry.STATUS_DONE -> "已完成"
                PlanEntry.STATUS_DOING -> "进行中"
                else -> "待办"
            }

            // 优先级
            b.itemPriority.text = when (p.priority) {
                PlanEntry.PRIORITY_HIGH -> "高"
                PlanEntry.PRIORITY_MEDIUM -> "中"
                PlanEntry.PRIORITY_LOW -> "低"
                else -> "无优先级"
            }

            // 截止
            if (p.dueAt > 0) {
                b.itemDue.visibility = View.VISIBLE
                b.itemDue.text = "截止 " + dueFmt.format(Date(p.dueAt))
            } else {
                b.itemDue.visibility = View.GONE
            }

            // 预览
            val preview = p.content.take(120).trim()
            if (preview.isEmpty()) {
                b.itemPreview.visibility = View.GONE
            } else {
                b.itemPreview.visibility = View.VISIBLE
                b.itemPreview.text = preview
            }

            b.root.setOnClickListener { onClick(p) }
        }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<PlanEntry>() {
            override fun areItemsTheSame(a: PlanEntry, b: PlanEntry) = a.id == b.id
            override fun areContentsTheSame(a: PlanEntry, b: PlanEntry) = a == b
        }
    }
}