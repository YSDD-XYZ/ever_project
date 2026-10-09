package com.example.fish

import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * EventReporter —— 把鱼游戏的事件通过 Android Broadcast 发给其他 App
 *
 * 当前接收方：com.example.diary (时光日记) 的 FishEventReceiver
 *
 * 设计原则：
 * - 静默失败：发送失败只 log,不抛错（不破坏游戏体验）
 * - 节流：避免一条鱼触发 10 个事件
 * - 字段长度限制：保护接收方
 *
 * 使用：
 *   EventReporter.reportFishCaught(context, "彩虹鱼", 3.2, "传说", placeName = "青石湖")
 */
object EventReporter {

    private const val TAG = "FishEvent"
    // 必须与 diary-app 的 FishEventReceiver 中保持一致
    private const val ACTION = "com.example.fish.EVENT"
    private const val RECEIVER_PACKAGE = "com.example.diary"

    // 节流：同一 type 间隔至少 500ms
    private val lastSent = mutableMapOf<String, Long>()
    private const val THROTTLE_MS = 500L

    /**
     * 抓到鱼时调用
     * @param fishName 鱼名（中文）
     * @param kg 重量
     * @param rarity 稀有度（常见/少见/稀有/史诗/神秘/传说）
     * @param placeName 地点名
     */
    fun reportFishCaught(
        context: Context,
        fishName: String,
        kg: Double,
        rarity: String,
        placeName: String? = null,
    ) {
        val type = "fish.caught"
        if (isThrottled(type)) return

        val title = "抓到 $fishName"
        val body = buildString {
            append("🐟 鱼获：").append(fishName).append('\n')
            append("⚖️ 重量：").append(String.format("%.2f", kg)).append(" kg\n")
            append("⭐ 稀有度：").append(rarity).append('\n')
            if (!placeName.isNullOrBlank()) {
                append("📍 地点：").append(placeName)
            }
        }
        send(context, type, title, body, tags = listOfNotNull("fish", rarity, placeName?.let { "place:$it" }))
    }

    /**
     * 升级时调用
     */
    fun reportLevelUp(context: Context, newLevel: Int) {
        val type = "fish.levelup"
        if (isThrottled(type)) return
        send(
            context, type,
            title = "升级到 Lv.$newLevel",
            body = "🎉 钓鱼等级提升！当前 Lv.$newLevel",
            tags = listOf("fish", "levelup"),
        )
    }

    /**
     * 达成成就
     */
    fun reportAchievement(context: Context, achvId: String, achvName: String) {
        val type = "fish.achievement"
        if (isThrottled(type)) return
        send(
            context, type,
            title = "成就解锁：$achvName",
            body = "🏅 解锁成就 [$achvId] $achvName",
            tags = listOf("fish", "achievement", achvId),
        )
    }

    /**
     * 通用发送
     */
    private fun send(
        context: Context,
        type: String,
        title: String,
        body: String,
        tags: List<String>,
    ) {
        try {
            val intent = Intent(ACTION).apply {
                setPackage(RECEIVER_PACKAGE)  // 限定只发给 diary,避免被其他 App 接收
                putExtra("type", type.take(50))
                putExtra("title", title.take(200))
                putExtra("body", body.take(4000))
                putExtra("tags", tags.joinToString(",").take(200))
            }
            context.sendBroadcast(intent)
            Log.d(TAG, "→ 已发: $type / $title")
        } catch (e: Throwable) {
            // 静默失败：diary 没装/没权限/其他,不影响游戏
            Log.d(TAG, "发送失败（无影响）: ${e.message}")
        }
    }

    /**
     * 公开版通用发送（JsBridge 调用）
     */
    fun sendGeneric(
        context: Context,
        type: String,
        title: String,
        body: String,
        tags: Array<String>,
    ) {
        if (isThrottled(type)) return
        send(context, type, title, body, tags.toList())
    }

    /**
     * 节流：同一 type 短时间内不重复发
     */
    private fun isThrottled(type: String): Boolean {
        val now = System.currentTimeMillis()
        val last = lastSent[type] ?: 0
        if (now - last < THROTTLE_MS) return true
        lastSent[type] = now
        return false
    }
}
