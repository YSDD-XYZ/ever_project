package com.example.diary.ui.common

object SectionBuilder {

    /**
     * 给定一组 rows + 一个 "row → month" 映射,产出 [Section] 列表,
     * 月份近的在前(要求 rows 已经按月份降序),同月内的 row 保持原顺序。
     */
    fun <R : Any> build(
        rows: List<R>,
        monthOf: (R) -> MonthKey
    ): List<Section<R>> {
        if (rows.isEmpty()) return emptyList()
        val out = ArrayList<Section<R>>(rows.size * 2)
        var current: MonthKey? = null
        for (r in rows) {
            val m = monthOf(r)
            if (m != current) {
                out.add(Section.Header(m) as Section<R>)
                current = m
            }
            out.add(Section.E(r))
        }
        return out
    }
}