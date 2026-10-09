package com.example.diary.ui.common

import android.graphics.Canvas
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView

/**
 * 通用 sticky header 装饰器。
 *
 * 协议:Adapter 提供两类 viewType,viewType == TYPE_HEADER 的项会被"贴顶"。
 * 切换 header 时:旧 header 上滑出 → 下一个 header 从下方顶上来,
 * 两个 header 在交界处短暂共存(alpha 过渡)。
 */
class StickyHeaderDecoration(
    private val isHeader: (position: Int) -> Boolean
) : RecyclerView.ItemDecoration() {

    private var currentHeader: View? = null
    private var currentHeaderPos: Int = RecyclerView.NO_POSITION
    private var nextHeader: View? = null
    private var nextHeaderPos: Int = RecyclerView.NO_POSITION

    override fun onDrawOver(c: Canvas, parent: RecyclerView, state: RecyclerView.State) {
        if (parent.childCount == 0) return
        val topChild = parent.getChildAt(0) ?: return
        val topPosition = parent.getChildAdapterPosition(topChild)
        if (topPosition == RecyclerView.NO_POSITION) return

        val headerPos = findHeaderPositionBelow(topPosition)
        if (headerPos == RecyclerView.NO_POSITION) return

        val header = ensureHeader(parent, headerPos, currentHeaderPos == headerPos) ?: return
        translateHeader(parent, header, topChild)
        c.save()
        c.translate(0f, header.translationY)
        header.draw(c)
        c.restore()

        // 看看下一个 header 是否正在被顶上来
        val nextPos = findHeaderPositionBelow(headerPos + 1)
        if (nextPos != RecyclerView.NO_POSITION) {
            val next = ensureNextHeader(parent, nextPos, nextHeaderPos == nextPos) ?: return
            // 计算推进程度:0 = 刚贴顶,1 = 已完全顶上去
            val nextView = parent.findViewHolderForAdapterPosition(nextPos)?.itemView
            if (nextView != null && nextView.top <= header.height) {
                val progress = (header.height - nextView.top).toFloat() / header.height.toFloat()
                val offset = -header.height * progress
                next.translationY = offset
                next.alpha = progress
                c.save()
                c.translate(0f, next.translationY)
                next.draw(c)
                c.restore()
            }
        }
    }

    private fun findHeaderPositionBelow(position: Int): Int {
        for (i in position downTo 0) {
            if (isHeader(i)) return i
        }
        return RecyclerView.NO_POSITION
    }

    private fun ensureHeader(
        parent: RecyclerView,
        position: Int,
        reuse: Boolean
    ): View? {
        if (reuse && currentHeader != null) return currentHeader
        val adapter = parent.adapter ?: return null
        val holder = adapter.createViewHolder(parent, TYPE_HEADER)
        adapter.bindViewHolder(holder, position)
        measureAndLayout(parent, holder.itemView)
        currentHeader = holder.itemView
        currentHeaderPos = position
        return holder.itemView
    }

    private fun ensureNextHeader(
        parent: RecyclerView,
        position: Int,
        reuse: Boolean
    ): View? {
        if (reuse && nextHeader != null && nextHeaderPos == position) return nextHeader
        val adapter = parent.adapter ?: return null
        val holder = adapter.createViewHolder(parent, TYPE_HEADER)
        adapter.bindViewHolder(holder, position)
        measureAndLayout(parent, holder.itemView)
        nextHeader = holder.itemView
        nextHeaderPos = position
        return holder.itemView
    }

    private fun measureAndLayout(parent: RecyclerView, view: View) {
        val widthSpec = View.MeasureSpec.makeMeasureSpec(parent.width, View.MeasureSpec.EXACTLY)
        val heightSpec = View.MeasureSpec.makeMeasureSpec(parent.height, View.MeasureSpec.AT_MOST)
        val childWidth = ViewGroup.getChildMeasureSpec(
            widthSpec, parent.paddingLeft + parent.paddingRight, view.layoutParams.width
        )
        val childHeight = ViewGroup.getChildMeasureSpec(
            heightSpec, parent.paddingTop + parent.paddingBottom, view.layoutParams.height
        )
        view.measure(childWidth, childHeight)
        view.layout(0, 0, view.measuredWidth, view.measuredHeight)
    }

    private fun translateHeader(parent: RecyclerView, header: View, topChild: View) {
        val translationY = (topChild.top - header.height).toFloat().coerceAtMost(0f)
        header.translationY = translationY
    }

    override fun getItemOffsets(outRect: android.graphics.Rect, view: View, parent: RecyclerView, state: RecyclerView.State) {}

    companion object {
        const val TYPE_HEADER = 1001
    }
}