package com.example.diary.data

import com.example.diary.ui.common.TagFilterMode
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flowOf

class PlanRepository(
    private val dao: PlanDao,
    private val tagDao: TagDao,
    private val planTagDao: PlanTagDao
) {

    data class PlanWithTags(
        val entry: PlanEntry,
        val tags: List<String>
    )

    fun observeAll(): Flow<List<PlanWithTags>> = observeFiltered(null, null, TagFilterMode.AND)

    fun search(q: String): Flow<List<PlanWithTags>> = observeFiltered(q.trim().ifBlank { null }, null, TagFilterMode.AND)

    fun observeFiltered(
        textQuery: String?,
        tagIds: List<Long>?,
        tagMode: TagFilterMode
    ): Flow<List<PlanWithTags>> {
        val entryFlow: Flow<List<PlanEntry>> = if (textQuery.isNullOrBlank()) {
            dao.observeAll()
        } else {
            dao.search(textQuery)
        }
        return entryFlow.combine(flowOf(tagIds to tagMode)) { entries, (ids, mode) ->
            if (ids.isNullOrEmpty()) entries
            else {
                val perTagPlanIds = ids.map { tagId -> planTagDao.planIdsOfTag(tagId).toSet() }
                val combined = when (mode) {
                    TagFilterMode.AND -> perTagPlanIds.reduce { acc, ids2 -> acc intersect ids2 }
                    TagFilterMode.OR -> perTagPlanIds.flatten().toSet()
                }
                entries.filter { it.id in combined }
            }
        }.combine(flowOf(Unit)) { entries, _ -> attachTags(entries) }
    }

    private suspend fun attachTags(entries: List<PlanEntry>): List<PlanWithTags> {
        if (entries.isEmpty()) return emptyList()
        return entries.map { e ->
            PlanWithTags(e, planTagDao.tagsOfPlan(e.id).map { it.name })
        }
    }

    suspend fun getById(id: Long): PlanWithTags? {
        val e = dao.getById(id) ?: return null
        return PlanWithTags(e, planTagDao.tagsOfPlan(id).map { it.name })
    }

    suspend fun getAllOnce(): List<PlanEntry> = dao.snapshotAll()

    suspend fun save(entry: PlanEntry, tagNames: List<String>): Long {
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

    suspend fun applyTags(planId: Long, tagNames: List<String>) {
        planTagDao.clear(planId)
        val cleaned = tagNames
            .flatMap { it.split(',', '，') }
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
        for (name in cleaned) {
            val tagId = tagDao.findOrCreate(name)
            if (tagId > 0) {
                planTagDao.insert(PlanTagXref(planId = planId, tagId = tagId))
            }
        }
    }

    suspend fun setStatus(id: Long, status: Int) =
        dao.updateStatus(id, status, System.currentTimeMillis())

    suspend fun delete(id: Long) = dao.deleteById(id)
}