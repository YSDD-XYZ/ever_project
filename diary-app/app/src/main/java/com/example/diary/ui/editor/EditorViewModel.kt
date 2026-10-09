package com.example.diary.ui.editor

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.diary.data.DiaryEntry
import com.example.diary.data.DiaryRepository
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch

class EditorViewModel(
    private val repo: DiaryRepository
) : ViewModel() {

    private val _saved = MutableSharedFlow<Boolean>(extraBufferCapacity = 1)
    val saved = _saved.asSharedFlow()

    fun save(entry: DiaryEntry, tagNames: List<String>) = viewModelScope.launch {
        repo.save(entry, tagNames)
        _saved.tryEmit(true)
    }

    fun delete(id: Long) = viewModelScope.launch {
        repo.delete(id)
    }

    companion object {
        fun factory(repo: DiaryRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                EditorViewModel(repo) as T
        }
    }
}