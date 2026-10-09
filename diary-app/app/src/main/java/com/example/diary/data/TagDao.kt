package com.example.diary.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface TagDao {

    /** 全部 tag,按名字升序 */
    @Query("SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC")
    fun observeAll(): Flow<List<Tag>>

    @Query("SELECT * FROM tags WHERE name = :name LIMIT 1")
    suspend fun findByName(name: String): Tag?

    /**
     * 找或创建。返回的 id 一定非空。
     * 用 IGNORE 撞唯一索引,如果已存在则忽略,再 SELECT 一次拿回真实 id。
     */
    @Transaction
    suspend fun findOrCreate(name: String): Long {
        val cleaned = name.trim()
        if (cleaned.isEmpty()) return -1L
        val existing = findByName(cleaned)
        if (existing != null) return existing.id
        val rowId = insert(Tag(name = cleaned))
        return if (rowId == -1L) findByName(cleaned)?.id ?: -1L else rowId
    }

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(tag: Tag): Long

    @Query("UPDATE tags SET name = :newName WHERE id = :id")
    suspend fun rename(id: Long, newName: String)

    @Query("DELETE FROM tags WHERE id = :id")
    suspend fun delete(id: Long)

    /**
     * 每个 tag 出现在多少篇日记里。
     * 用 LEFT JOIN 让 0 篇的也出现(便于做"未使用 tag 清理")。
     */
    @Query(
        """
        SELECT t.id AS id, t.name AS name, COUNT(d.diary_id) AS count
        FROM tags t
        LEFT JOIN diary_tags d ON d.tag_id = t.id
        GROUP BY t.id
        ORDER BY count DESC, t.name COLLATE NOCASE ASC
        """
    )
    fun observeDiaryTagCounts(): Flow<List<TagWithCount>>

    @Query(
        """
        SELECT t.id AS id, t.name AS name, COUNT(p.plan_id) AS count
        FROM tags t
        LEFT JOIN plan_tags p ON p.tag_id = t.id
        GROUP BY t.id
        ORDER BY count DESC, t.name COLLATE NOCASE ASC
        """
    )
    fun observePlanTagCounts(): Flow<List<TagWithCount>>
}

data class TagWithCount(
    val id: Long,
    val name: String,
    val count: Int
)

/**
 * 关联表 DAO —— 主要给 Repository 调用。
 */
@Dao
interface DiaryTagDao {
    /** 替换给定日记的全部 tag 关联(传入 tag id 集合) */
    @Query("DELETE FROM diary_tags WHERE diary_id = :diaryId")
    suspend fun clear(diaryId: Long)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(xref: DiaryTagXref)

    @Query("SELECT t.id AS id, t.name AS name FROM tags t INNER JOIN diary_tags x ON x.tag_id = t.id WHERE x.diary_id IN (:diaryIds) ORDER BY t.name COLLATE NOCASE ASC")
        suspend fun tagsOfDiaries(diaryIds: List<Long>): List<TagRef>

        @Query("SELECT x.diary_id AS diaryId, t.id AS id, t.name AS name FROM tags t INNER JOIN diary_tags x ON x.tag_id = t.id WHERE x.diary_id IN (:diaryIds) ORDER BY t.name COLLATE NOCASE ASC")
        suspend fun tagsOfDiariesWithDiaryId(diaryIds: List<Long>): List<TagRefDiary>

        @Query(
            """
            SELECT DISTINCT t.id AS id, t.name AS name
            FROM tags t
            INNER JOIN diary_tags x ON x.tag_id = t.id
            WHERE x.diary_id IN (
              SELECT diary_id FROM diary_tags WHERE tag_id IN (:tagIds)
            )
            """
        )
        suspend fun tagsUsedWith(tagIds: List<Long>): List<TagRef>
    }

data class TagRef(val id: Long, val name: String)
data class TagRefDiary(val id: Long, val name: String, val diaryId: Long)

@Dao
interface PlanTagDao {
    @Query("DELETE FROM plan_tags WHERE plan_id = :planId")
    suspend fun clear(planId: Long)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(xref: PlanTagXref)

    @Query("SELECT t.id AS id, t.name AS name FROM tags t INNER JOIN plan_tags x ON x.tag_id = t.id WHERE x.plan_id = :planId ORDER BY t.name COLLATE NOCASE ASC")
    suspend fun tagsOfPlan(planId: Long): List<TagRef>

    @Query("SELECT plan_id FROM plan_tags WHERE tag_id = :tagId")
    suspend fun planIdsOfTag(tagId: Long): List<Long>
}