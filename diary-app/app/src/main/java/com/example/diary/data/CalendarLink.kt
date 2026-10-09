package com.example.diary.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * 计划 ↔ 手机日历事件 的关联表。
 * 保存的是系统 Calendar Provider 的 event id(long)。
 * 删除计划时,不会主动删日历事件;反之亦然。
 */
@Entity(
    tableName = "calendar_links",
    foreignKeys = [
        ForeignKey(
            entity = PlanEntry::class,
            parentColumns = ["id"],
            childColumns = ["plan_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("plan_id", unique = true), Index("event_id", unique = true)]
)
data class CalendarLink(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "plan_id")
    val planId: Long,

    @ColumnInfo(name = "calendar_id")
    val calendarId: Long,

    @ColumnInfo(name = "event_id")
    val eventId: Long,

    @ColumnInfo(name = "linked_at")
    val linkedAt: Long
)