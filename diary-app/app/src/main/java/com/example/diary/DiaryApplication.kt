package com.example.diary

import android.app.Application
import com.example.diary.data.AppContainer
import com.example.diary.data.DefaultAppContainer

class DiaryApplication : Application() {
    lateinit var container: AppContainer
        internal set  // 允许同 module 内部访问,被 BroadcastReceiver 使用

    override fun onCreate() {
        super.onCreate()
        container = DefaultAppContainer(this)
    }
}