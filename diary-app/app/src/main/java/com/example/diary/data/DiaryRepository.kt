package com.example.diary.data

import com.example.diary.ui.common.TagFilterMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOf

/**
 * 日记 Repository —— 现在读 tags 通过关联表。
 *
 * 一次 observeAll 返回 List<DiaryWithTags>:data class 包了 entry + tag 列表。
 * 用 Flow.combine 把 entry 流和"id → tags"映射流合并成最终流。
 */
class DiaryRepository(
    private val dao: DiaryDao,
    private val tagDao: TagDao,
    private val diaryTagDao: DiaryTagDao
) {

    data class DiaryWithTags(
        val entry: DiaryEntry,
        val tags: List<String>
    )

    fun observeAll(): Flow<List<DiaryWithTags>> = observeFiltered(null, null, TagFilterMode.AND)

    fun search(q: String): Flow<List<DiaryWithTags>> = observeFiltered(q.trim().ifBlank { null }, null, TagFilterMode.AND)

    /**
     * @param textQuery 标题/内容/标签名字的 LIKE 关键字(null = 不过滤)
     * @param tagIds    选中的 tag id 列表(null = 不过滤)
     * @param tagMode   TagFilterMode.AND / OR (tagIds 为 null 时忽略)
     */
    fun observeFiltered(
        textQuery: String?,
        tagIds: List<Long>?,
        tagMode: TagFilterMode
    ): Flow<List<DiaryWithTags>> {
        // 先拿 entry 流(基础过滤:文本)
        val entryFlow: Flow<List<DiaryEntry>> = if (textQuery.isNullOrBlank()) {
            dao.observeAll()
        } else {
            dao.search(textQuery)
        }

        // 再根据 tagIds 过滤 entry id
        val finalEntryFlow: Flow<List<DiaryEntry>> = if (tagIds.isNullOrEmpty()) {
            entryFlow
        } else {
            entryFlow.combine(flowOf(tagIds to tagMode)) { entries, (ids, mode) ->
                val diaryIds = entries.map { it.id }
                if (diaryIds.isEmpty()) return@combine emptyList<DiaryEntry>()
                // 一次性把所有日记的 tag 关系拿出来
                val xrefs = diaryTagDao.tagsOfDiariesWithDiaryId(diaryIds)
                val tagsByDiary: Map<Long, Set<Long>> = xrefs
                    .groupBy { it.diaryId }
                    .mapValues { it.value.map { r -> r.id }.toSet() }
                when (mode) {
                    TagFilterMode.AND -> entries.filter { e ->
                        val owned = tagsByDiary[e.id].orEmpty()
                        ids.all { it in owned }
                    }
                    TagFilterMode.OR -> entries.filter { e ->
                        val owned = tagsByDiary[e.id].orEmpty()
                        ids.any { it in owned }
                    }
                }
            }
        }

        return finalEntryFlow.combine(flowOf(Unit)) { entries, _ -> attachTags(entries) }
    }

    private suspend fun attachTags(entries: List<DiaryEntry>): List<DiaryWithTags> {
        if (entries.isEmpty()) return emptyList()
        val ids = entries.map { it.id }
        val xrefs = diaryTagDao.tagsOfDiariesWithDiaryId(ids)
        val tagsByDiary: Map<Long, List<String>> = xrefs
            .groupBy { it.diaryId }
            .mapValues { it.value.map { r -> r.name } }
        return entries.map { e -> DiaryWithTags(e, tagsByDiary[e.id].orEmpty()) }
    }

    suspend fun getById(id: Long): DiaryWithTags? {
        val e = dao.getById(id) ?: return null
        val tags = diaryTagDao.tagsOfDiariesWithDiaryId(listOf(id)).map { it.name }
        return DiaryWithTags(e, tags)
    }

    suspend fun getAllOnce(): List<DiaryEntry> = dao.snapshotAll()

    /** 保存:更新 entry + 同步 tag 关联 */
    suspend fun save(entry: DiaryEntry, tagNames: List<String>): Long {
        val now = System.currentTimeMillis()
        val id = if (entry.id == 0L) {
            dao.insert(entry.copy(createdAt = now, updatedAt = now))
        } else {
            dao.update(entry.copy(updatedAt = now))
            entry.id
        }
        applyTags(id, tagNames)
        return id
    }

    suspend fun applyTags(diaryId: Long, tagNames: List<String>) {
        diaryTagDao.clear(diaryId)
        val cleaned = tagNames
            .flatMap { it.split(',', '，') }
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
        for (name in cleaned) {
            val tagId = tagDao.findOrCreate(name)
            if (tagId > 0) {
                diaryTagDao.insert(DiaryTagXref(diaryId = diaryId, tagId = tagId))
            }
        }
    }

    suspend fun delete(id: Long) = dao.deleteById(id)
}