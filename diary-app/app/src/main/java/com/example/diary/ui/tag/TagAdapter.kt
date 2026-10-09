package com.example.diary.ui.tag

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.databinding.ItemTagBinding

class TagAdapter(
    private val onClick: (Row) -> Unit
) : ListAdapter<TagAdapter.Row, TagAdapter.VH>(DIFF) {

    data class Row(
        val id: Long,
        val name: String,
        val diaryCount: Int,
        val planCount: Int
    )

    fun submit(list: List<Row>) = submitList(list)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val b = ItemTagBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VH(b)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(getItem(position), onClick)
    }

    class VH(val b: ItemTagBinding) : RecyclerView.ViewHolder(b.root) {
        fun bind(row: Row, onClick: (Row) -> Unit) {
            b.itemName.text = row.name
            b.itemCount.text = "${row.diaryCount} 篇 · ${row.planCount} 记"
            b.root.setOnClickListener { onClick(row) }
        }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Row>() {
            override fun areItemsTheSame(a: Row, b: Row) = a.id == b.id
            override fun areContentsTheSame(a: Row, b: Row) = a == b
        }
    }
}