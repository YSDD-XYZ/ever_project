package com.example.diary.ui.common

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.databinding.ItemSectionHeaderBinding
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * 通用 section adapter。
 *
 * 子类实现 [createEntryHolder] / [bindRow]。
 * Header 由本类统一渲染,子类可以重写 [onHeaderBind] 增加计数等额外信息。
 */
abstract class SectionAdapter<R : Any, EH : RecyclerView.ViewHolder>(
    diff: DiffUtil.ItemCallback<Section<R>>,
    private val headerAccentRes: Int
) : ListAdapter<Section<R>, RecyclerView.ViewHolder>(diff) {

    private val monthFmt = SimpleDateFormat("MMM yyyy", Locale.ENGLISH)

    override fun getItemViewType(position: Int): Int =
        if (getItem(position) is Section.Header) TYPE_HEADER else TYPE_ENTRY

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == TYPE_HEADER) {
            HeaderVH(
                ItemSectionHeaderBinding.inflate(
                    LayoutInflater.from(parent.context), parent, false
                )
            )
        } else {
            createEntryHolder(parent)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val item = getItem(position)
        when (item) {
            is Section.Header -> {
                if (holder is HeaderVH) {
                    val label = formatMonth(item.month)
                    holder.binding.headerLabel.text = label
                    val count = countBelowHeader(position)
                    onHeaderBind(holder, item.month, count)
                }
            }
            is Section.E -> {
                @Suppress("UNCHECKED_CAST")
                bindRow(holder as EH, item.row)
            }
        }
    }

    /** 子类可重写,默认:染色 + 设置点击监听 + 显示计数 */
    protected open fun onHeaderBind(
        holder: HeaderVH,
        month: MonthKey,
        count: Int
    ) {
        holder.binding.headerAccent.setBackgroundResource(headerAccentRes)
        holder.binding.headerCount.text = "· ${count} 篇"
        holder.binding.headerCount.visibility = if (count > 0) View.VISIBLE else View.GONE
        holder.binding.root.setOnClickListener {
            onHeaderClick?.invoke(month, count)
        }
    }

    /** header 点击回调(由调用方注册) */
    var onHeaderClick: ((month: MonthKey, count: Int) -> Unit)? = null

    /**
     * 计数:同一 header 块下方的 entry 数 = 直到下一个 Header(或列表末尾)。
     */
    private fun countBelowHeader(position: Int): Int {
        var c = 0
        for (i in position + 1 until itemCount) {
            if (getItem(i) is Section.Header) break
            c++
        }
        return c
    }

    protected abstract fun createEntryHolder(parent: ViewGroup): EH
    protected abstract fun bindRow(holder: EH, row: R)

    private fun formatMonth(key: MonthKey): String {
        val cal = Calendar.getInstance().apply {
            set(key.year, key.month - 1, 1)
        }
        return monthFmt.format(cal.time).uppercase()
    }

    /** header 上是否允许隐藏 —— 空 header(没有 entry)不显示 */
    fun shouldShowHeaderAt(position: Int): Boolean {
        return countBelowHeader(position) > 0
    }

    class HeaderVH(val binding: ItemSectionHeaderBinding) : RecyclerView.ViewHolder(binding.root)

    companion object {
        const val TYPE_HEADER = 1001
        const val TYPE_ENTRY = 1002
    }
}