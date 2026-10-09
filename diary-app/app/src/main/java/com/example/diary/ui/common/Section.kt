package com.example.diary.ui.common

/**
 * 一个抽象的"列表行"项,可承载 header 或 entry。
 *
 * sealed 表达:
 *   Header(month) → 月份 header
 *   E(row)       → 任意业务数据(DiaryEntry / PlanEntry)
 *
 * 设计选择:用 [Section.Any] 来装异构数据,Header 和 E 共用同一个 type parameter,
 * 这样 SectionBuilder 和 adapter 都不用每次都写两份。
 */
sealed class Section<out Row> {
    abstract val key: String

    data class Header(val month: MonthKey) : Section<Nothing>() {
        override val key: String = "month:${month.year}-${month.month}"
    }

    data class E<R>(val row: R) : Section<R>() {
        override val key: String = "row:${System.identityHashCode(row)}"
    }
}

/** 用 "yyyy-MM" 表达某月,跟 timestamp 比对容易。 */
data class MonthKey(val year: Int, val month: Int) : Comparable<MonthKey> {
    override fun compareTo(other: MonthKey): Int {
        return compareValuesBy(this, other, { it.year }, { it.month })
    }
}

object MonthKeys {
    fun from(timestamp: Long): MonthKey {
        val cal = java.util.Calendar.getInstance().apply { timeInMillis = timestamp }
        return MonthKey(cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1)
    }
    fun now(): MonthKey = from(System.currentTimeMillis())
}