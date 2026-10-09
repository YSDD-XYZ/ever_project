package com.example.diary.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface DiaryDao {

    @Query("SELECT * FROM diary ORDER BY updated_at DESC")
    fun observeAll(): Flow<List<DiaryEntry>>

    @Query(
        """
        SELECT * FROM diary
        WHERE title LIKE '%' || :q || '%'
           OR content LIKE '%' || :q || '%'
           OR tags LIKE '%' || :q || '%'
        ORDER BY updated_at DESC
        """
    )
    fun search(q: String): Flow<List<DiaryEntry>>

    @Query("SELECT * FROM diary WHERE id = :id LIMIT 1")
    suspend fun getById(id: Long): DiaryEntry?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: DiaryEntry): Long

    @Update
    suspend fun update(entry: DiaryEntry)

    @Delete
    suspend fun delete(entry: DiaryEntry)

    @Query("DELETE FROM diary WHERE id = :id")
    suspend fun deleteById(id: Long)

    /** 一次性快照,非 Flow —— 给 Receiver / 启动初始化用 */
    @Query("SELECT * FROM diary ORDER BY updated_at DESC")
    suspend fun snapshotAll(): List<DiaryEntry>
}