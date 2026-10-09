package com.example.diary

import android.app.Application
import com.example.diary.data.AppContainer
import com.example.diary.data.DefaultAppContainer

class DiaryApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = DefaultAppContainer(this)
    }
}