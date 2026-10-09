package com.example.diary.data

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * 日记实体。
 * 注意 v1 schema 已经有 id/title/content/tags/createdAt/updatedAt。
 * v2 不动这表(日记结构稳定),改由 plan_entries / calendar_links 提供新能力。
 */
@Entity(tableName = "diary")
data class DiaryEntry(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,

    @ColumnInfo(name = "title")
    val title: String,

    @ColumnInfo(name = "content")
    val content: String,

    @ColumnInfo(name = "tags")
    val tags: String = "",

    @ColumnInfo(name = "created_at")
    val createdAt: Long,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long
)