package com.example.diary.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.R
import com.example.diary.data.DiaryRepository.DiaryWithTags
import com.example.diary.databinding.ItemDiaryBinding
import com.example.diary.ui.common.Section
import com.example.diary.ui.common.SectionAdapter
import com.google.android.material.chip.Chip
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DiaryEntryVH(val binding: ItemDiaryBinding) : RecyclerView.ViewHolder(binding.root) {
    private val dateFmt = SimpleDateFormat("MMM d, yyyy", Locale.ENGLISH)
    private val fullFmt = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())

    fun bind(item: DiaryWithTags, onClick: (DiaryWithTags) -> Unit) {
        val entry = item.entry
        binding.itemDate.text = "${dateFmt.format(Date(entry.updatedAt))} · " +
            fullFmt.format(Date(entry.updatedAt)).substring(11)
        binding.itemTitle.text = entry.title.ifBlank { "（无标题）" }

        val preview = entry.content.take(160).trim()
        if (preview.isEmpty()) {
            binding.itemPreview.visibility = View.GONE
        } else {
            binding.itemPreview.visibility = View.VISIBLE
            binding.itemPreview.text = preview
        }

        binding.itemTags.removeAllViews()
        for (tag in item.tags) {
            val chip = Chip(binding.root.context).apply {
                text = "#$tag"
                isClickable = false
                isCheckable = false
                textSize = 12f
                setEnsureMinTouchTargetSize(false)
                chipMinHeight = binding.root.resources.getDimension(R.dimen.chip_min_height)
            }
            binding.itemTags.addView(chip)
        }
        binding.itemTags.visibility =
            if (binding.itemTags.childCount == 0) View.GONE else View.VISIBLE

        binding.root.setOnClickListener { onClick(item) }
    }
}

class DiarySectionAdapter(
    private val onClick: (DiaryWithTags) -> Unit
) : SectionAdapter<DiaryWithTags, DiaryEntryVH>(DIFF, R.color.caramel_500) {

    override fun createEntryHolder(parent: ViewGroup): DiaryEntryVH =
        DiaryEntryVH(ItemDiaryBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun bindRow(holder: DiaryEntryVH, row: DiaryWithTags) = holder.bind(row, onClick)

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Section<DiaryWithTags>>() {
            override fun areItemsTheSame(a: Section<DiaryWithTags>, b: Section<DiaryWithTags>): Boolean {
                return when {
                    a is Section.Header && b is Section.Header -> a.month == b.month
                    a is Section.E && b is Section.E -> a.row.entry.id == b.row.entry.id
                    else -> false
                }
            }

            override fun areContentsTheSame(a: Section<DiaryWithTags>, b: Section<DiaryWithTags>): Boolean =
                a == b
        }
    }
}