package com.example.diary.ui.common

import android.content.Context
import android.util.AttributeSet
import android.view.LayoutInflater
import android.widget.FrameLayout
import com.example.diary.data.TagWithCount
import com.example.diary.databinding.ViewTagFilterRowBinding
import com.google.android.material.chip.Chip

/**
 * Tag 筛选条:横滑 chip 行 + AND/OR 切换。
 *
 * 用法:
 *   - setTags(list):刷新所有 tag
 *   - setSelectedTagIds(set) / selectedTagIds:当前选中的 tag id 集合(回调变化)
 *   - setMode / mode:AND/OR
 */
class TagFilterRow @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : FrameLayout(context, attrs) {

    private val b: ViewTagFilterRowBinding =
        ViewTagFilterRowBinding.inflate(LayoutInflater.from(context), this)

    private val _selected = LinkedHashSet<Long>()
    var mode: TagFilterMode = TagFilterMode.AND
        private set

    private var onChange: ((Set<Long>, TagFilterMode) -> Unit)? = null

    init {
        b.toggleMode.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener
            mode = if (checkedId == b.toggleOr.id) TagFilterMode.OR else TagFilterMode.AND
            onChange?.invoke(_selected, mode)
        }
        b.toggleMode.check(b.toggleAnd.id)
        b.btnClear.setOnClickListener {
            _selected.clear()
            refreshChipStates()
            onChange?.invoke(_selected, mode)
        }
    }

    fun setOnChange(cb: (Set<Long>, TagFilterMode) -> Unit) {
        onChange = cb
    }

    fun setTags(tags: List<TagWithCount>) {
        b.chipGroup.removeAllViews()
        for (t in tags) {
            val chip = Chip(context).apply {
                text = "#${t.name}  ${t.count}"
                isCheckable = true
                isClickable = true
                tag = t.id
            }
            b.chipGroup.addView(chip)
        }
        // 绑定点击
        for (i in 0 until b.chipGroup.childCount) {
            val chip = b.chipGroup.getChildAt(i) as Chip
            chip.setOnCheckedChangeListener { _, isChecked ->
                val tagId = (chip.tag as? Long) ?: return@setOnCheckedChangeListener
                if (isChecked) _selected.add(tagId) else _selected.remove(tagId)
                b.btnClear.visibility = if (_selected.isEmpty()) GONE else VISIBLE
                onChange?.invoke(_selected, mode)
            }
        }
    }

    fun selectedTagIds(): Set<Long> = _selected.toSet()

    private fun refreshChipStates() {
        for (i in 0 until b.chipGroup.childCount) {
            val chip = b.chipGroup.getChildAt(i) as Chip
            val tagId = chip.tag as? Long ?: continue
            chip.isChecked = tagId in _selected
        }
        b.btnClear.visibility = if (_selected.isEmpty()) GONE else VISIBLE
    }
}

enum class TagFilterMode { AND, OR }