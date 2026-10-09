package com.example.diary.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index

/**
 * 日记 ↔ Tag 多对多关联表。
 * 复合主键 (diary_id, tag_id) 让一条日记 / 一个 Tag 唯一对应。
 */
@Entity(
    tableName = "diary_tags",
    primaryKeys = ["diary_id", "tag_id"],
    foreignKeys = [
        ForeignKey(
            entity = DiaryEntry::class,
            parentColumns = ["id"],
            childColumns = ["diary_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = Tag::class,
            parentColumns = ["id"],
            childColumns = ["tag_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("tag_id")]
)
data class DiaryTagXref(
    @ColumnInfo(name = "diary_id") val diaryId: Long,
    @ColumnInfo(name = "tag_id") val tagId: Long
)

/**
 * 计划 ↔ Tag 多对多关联表。
 */
@Entity(
    tableName = "plan_tags",
    primaryKeys = ["plan_id", "tag_id"],
    foreignKeys = [
        ForeignKey(
            entity = PlanEntry::class,
            parentColumns = ["id"],
            childColumns = ["plan_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = Tag::class,
            parentColumns = ["id"],
            childColumns = ["tag_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("tag_id")]
)
data class PlanTagXref(
    @ColumnInfo(name = "plan_id") val planId: Long,
    @ColumnInfo(name = "tag_id") val tagId: Long
)