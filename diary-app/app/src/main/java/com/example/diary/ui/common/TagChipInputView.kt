package com.example.diary.ui.common

import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.util.AttributeSet
import android.view.LayoutInflater
import android.view.View
import android.widget.FrameLayout
import com.example.diary.databinding.ViewTagChipInputBinding
import com.google.android.material.chip.Chip

/**
 * "标签输入"复合控件:上面已经存在的 chip + 下面输入框,空格 / 回车把当前输入变成 chip。
 */
class TagChipInputView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : FrameLayout(context, attrs) {

    private val b: ViewTagChipInputBinding =
        ViewTagChipInputBinding.inflate(LayoutInflater.from(context), this)

    private val chips = mutableListOf<String>()

    init {
        b.tagEdit.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(text: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(text: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(text: Editable?) {
                val cur = text?.toString().orEmpty()
                if (cur.endsWith(" ") || cur.endsWith("\n") || cur.endsWith(",")) {
                    val candidate = cur.dropLast(1).trim()
                    if (candidate.isNotEmpty()) addChip(candidate)
                    b.tagEdit.setText("")
                }
            }
        })
    }

    fun setChips(names: List<String>) {
        chips.clear()
        b.chipGroup.removeAllViews()
        for (n in names) addChip(n)
    }

    fun addChip(name: String) {
        val cleaned = name.trim().trimStart('#')
        if (cleaned.isEmpty()) return
        if (chips.any { it.equals(cleaned, ignoreCase = true) }) return
        chips.add(cleaned)
        val chip = Chip(context).apply {
            text = "#$cleaned"
            isCloseIconVisible = true
            isClickable = true
            setOnCloseIconClickListener {
                chips.remove(cleaned)
                b.chipGroup.removeView(this)
            }
        }
        b.chipGroup.addView(chip)
    }

    fun chipNames(): List<String> = chips.toList()
}