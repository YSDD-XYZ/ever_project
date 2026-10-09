package com.example.diary.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.example.diary.data.AppContainer
import com.example.diary.data.DiaryEntry
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * FishEventReceiver —— 接收鱼游戏 Android 端发来的鱼获事件
 *
 * 协议：
 *   intent.action = "com.example.fish.EVENT"
 *   intent.extras:
 *     - type  : String  事件类型 (e.g. "fish.caught", "fish.levelup", "fish.achievement")
 *     - title : String  简短的标题（用于日记 title）
 *     - body  : String  详细描述（用于日记 content）
 *     - tags  : String? 额外标签(逗号分隔,会合并到 diary.tags)
 *
 * 安全性：
 *   - 通过 signature 级权限保护：只有 fish/android 签名的 APK 才能发送
 *   - 白名单 action：只接受 com.example.fish.EVENT
 *   - 拒绝空 / 超长字段
 */
class FishEventReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION = "com.example.fish.EVENT"
        private const val TAG = "FishEventReceiver"
        // 字段长度限制（防止恶意超长 payload）
        private const val MAX_TITLE = 200
        private const val MAX_BODY = 4000
        private const val MAX_TAGS = 200
    }

    override fun onReceive(context: Context, intent: Intent) {
        // 1) 校验 action
        if (intent.action != ACTION) {
            Log.w(TAG, "拒绝非预期 action: ${intent.action}")
            return
        }

        // 2) 提取字段
        val type = intent.getStringExtra("type") ?: return
        val title = intent.getStringExtra("title")?.take(MAX_TITLE) ?: return
        val body = intent.getStringExtra("body")?.take(MAX_BODY) ?: ""
        val extraTags = intent.getStringExtra("tags")?.take(MAX_TAGS) ?: ""

        // 3) 构造日记条目
        val now = System.currentTimeMillis()
        val mergedTags = buildString {
            append("auto,fish")  // 双标签：auto（自动）+ fish（来源）
            if (type.isNotBlank()) append(",").append(type)
            if (extraTags.isNotBlank()) append(",").append(extraTags)
        }

        val entry = DiaryEntry(
            title = "🎣 $title",
            content = body,
            tags = mergedTags,
            createdAt = now,
            updatedAt = now,
        )

        // 4) 写入数据库（用 goAsync 异步）
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as? com.example.diary.DiaryApplication
                if (app == null) {
                    Log.e(TAG, "找不到 DiaryApplication")
                    return@launch
                }
                val repo = app.container.diaryRepository
                // 把"auto,fish"等拆成 tag 列表,走 v3 的 tag 表 + 关联
                val tagList = mergedTags.split(',', '，')
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }
                    .distinct()
                repo.save(entry, tagList)
                Log.d(TAG, "✓ 已记录: $title (type=$type, tags=$tagList)")
            } catch (e: Throwable) {
                Log.e(TAG, "记录失败: $title", e)
            } finally {
                pending.finish()
            }
        }
    }
}
