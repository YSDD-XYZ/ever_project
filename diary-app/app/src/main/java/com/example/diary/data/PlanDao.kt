package com.example.diary.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface PlanDao {

    /** 默认:未完成的在前,同状态按截止时间升序,无截止放最后 */
    @Query(
        """
        SELECT * FROM plan_entries
        ORDER BY
          CASE WHEN status = 2 THEN 1 ELSE 0 END ASC,
          CASE WHEN due_at = 0 THEN 1 ELSE 0 END ASC,
          due_at ASC,
          priority DESC,
          updated_at DESC
        """
    )
    fun observeAll(): Flow<List<PlanEntry>>

    @Query(
        """
        SELECT * FROM plan_entries
        WHERE title LIKE '%' || :q || '%'
           OR content LIKE '%' || :q || '%'
           OR tags LIKE '%' || :q || '%'
        ORDER BY
          CASE WHEN status = 2 THEN 1 ELSE 0 END ASC,
          CASE WHEN due_at = 0 THEN 1 ELSE 0 END ASC,
          due_at ASC
        """
    )
    fun search(q: String): Flow<List<PlanEntry>>

    @Query("SELECT * FROM plan_entries WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): PlanEntry?

    /** 一次性快照 —— 给 Receiver 重启后重新排提醒用 */
    @Query("SELECT * FROM plan_entries")
    suspend fun snapshotAll(): List<PlanEntry>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: PlanEntry): Long

    @Update
    suspend fun update(entry: PlanEntry)

    @Delete
    suspend fun delete(entry: PlanEntry)

    @Query("DELETE FROM plan_entries WHERE id = :id")
    suspend fun deleteById(id: Long)

    @Query("UPDATE plan_entries SET status = :status, updated_at = :now WHERE id = :id")
    suspend fun updateStatus(id: Long, status: Int, now: Long)
}

@Dao
interface CalendarLinkDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(link: CalendarLink): Long

    @Query("SELECT * FROM calendar_links WHERE plan_id = :planId LIMIT 1")
    suspend fun getByPlan(planId: Long): CalendarLink?

    @Query("DELETE FROM calendar_links WHERE plan_id = :planId")
    suspend fun deleteByPlan(planId: Long)

    @Query("DELETE FROM calendar_links WHERE event_id = :eventId")
    suspend fun deleteByEvent(eventId: Long)
}