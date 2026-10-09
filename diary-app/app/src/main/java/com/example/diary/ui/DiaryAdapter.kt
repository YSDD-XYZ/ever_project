package com.example.diary.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.R
import com.example.diary.data.DiaryEntry
import com.example.diary.databinding.ItemDiaryBinding
import com.google.android.material.chip.Chip
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DiaryAdapter(
    private val onClick: (DiaryEntry) -> Unit
) : ListAdapter<DiaryEntry, DiaryAdapter.VH>(DIFF) {

    fun submit(list: List<DiaryEntry>) = submitList(list)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemDiaryBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(getItem(position))
    }

    inner class VH(private val b: ItemDiaryBinding) : RecyclerView.ViewHolder(b.root) {
        private val dateFmt = SimpleDateFormat("MMM d, yyyy", Locale.ENGLISH)
        private val fullFmt = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())

        fun bind(entry: DiaryEntry) {
            // 顶部:日期(英文短格式更耐看)+ 时间
            b.itemDate.text = "${dateFmt.format(Date(entry.updatedAt))} · " +
                fullFmt.format(Date(entry.updatedAt)).substring(11)

            b.itemTitle.text = entry.title.ifBlank { "（无标题）" }

            // 预览:前 160 字,空就不显示
            val preview = entry.content.take(160).trim()
            if (preview.isEmpty()) {
                b.itemPreview.visibility = android.view.View.GONE
            } else {
                b.itemPreview.visibility = android.view.View.VISIBLE
                b.itemPreview.text = preview
            }

            // 标签:切成 Chip
            b.itemTags.removeAllViews()
            entry.tags.split(',', '，')
                .map { it.trim() }
                .filter { it.isNotEmpty() }
                .forEach { tag ->
                    val chip = Chip(b.root.context).apply {
                        text = "#$tag"
                        isClickable = false
                        isCheckable = false
                        textSize = 12f
                        setEnsureMinTouchTargetSize(false)
                        chipMinHeight = b.root.resources.getDimension(R.dimen.chip_min_height)
                    }
                    b.itemTags.addView(chip)
                }
            b.itemTags.visibility =
                if (b.itemTags.childCount == 0) android.view.View.GONE
                else android.view.View.VISIBLE

            b.root.setOnClickListener { onClick(entry) }
        }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<DiaryEntry>() {
            override fun areItemsTheSame(a: DiaryEntry, b: DiaryEntry) = a.id == b.id
            override fun areContentsTheSame(a: DiaryEntry, b: DiaryEntry) = a == b
        }
    }
}