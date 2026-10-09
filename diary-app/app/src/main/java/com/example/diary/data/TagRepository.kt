package com.example.diary.data

import kotlinx.coroutines.flow.Flow

class TagRepository(private val dao: TagDao) {

    fun observeAll(): Flow<List<Tag>> = dao.observeAll()
    fun observeDiaryTagCounts(): Flow<List<TagWithCount>> = dao.observeDiaryTagCounts()
    fun observePlanTagCounts(): Flow<List<TagWithCount>> = dao.observePlanTagCounts()

    suspend fun create(name: String): Long = dao.findOrCreate(name)

    suspend fun rename(id: Long, newName: String) = dao.rename(id, newName.trim())

    /** 删除 Tag:由于 FK CASCADE,所有 diary_tags / plan_tags 关联会自动清掉 */
    suspend fun delete(id: Long) = dao.delete(id)
}