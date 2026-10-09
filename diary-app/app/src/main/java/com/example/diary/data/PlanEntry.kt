package com.example.diary.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * 计划实体。一条计划 = 一件将来要做的事。
 *
 * - status:   0=TODO / 1=DOING / 2=DONE
 * - priority: 0=NONE / 1=LOW / 2=MEDIUM / 3=HIGH
 * - dueAt:    截止时刻(毫秒);0 表示没设
 * - reminderAt: 提醒时刻(毫秒);0 表示不提醒;提醒基于本地 AlarmManager
 */
@Entity(tableName = "plan_entries")
data class PlanEntry(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "content")
    val content: String = "",

    @ColumnInfo(name = "tags")
    val tags: String = "",

    @ColumnInfo(name = "due_at")
    val dueAt: Long = 0L,

    @ColumnInfo(name = "reminder_at")
    val reminderAt: Long = 0L,

    @ColumnInfo(name = "status")
    val status: Int = STATUS_TODO,

    @ColumnInfo(name = "priority")
    val priority: Int = PRIORITY_NONE,

    @ColumnInfo(name = "created_at")
    val createdAt: Long,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long
) {
    companion object {
        const val STATUS_TODO = 0
        const val STATUS_DOING = 1
        const val STATUS_DONE = 2

        const val PRIORITY_NONE = 0
        const val PRIORITY_LOW = 1
        const val PRIORITY_MEDIUM = 2
        const val PRIORITY_HIGH = 3
    }
}