# 跨 App 事件协议 (Inter-App Event Bus)

> 时光日记 (`com.example.diary`) 与 湖边垂钓 (`com.example.fish`) 之间的
> 简单事件总线。基于 Android `BroadcastReceiver`，**本地、零网络**。

## 协议

### 触发方：湖边垂钓

```kotlin
// EventReporter.kt
const val ACTION = "com.example.fish.EVENT"
const val RECEIVER_PACKAGE = "com.example.diary"
val intent = Intent(ACTION)
    .setPackage(RECEIVER_PACKAGE)
    .putExtra("type", "fish.caught")     // 事件类型
    .putExtra("title", "抓到 彩虹鱼")    // 简短标题
    .putExtra("body", "🐟 鱼获：...")    // 详细描述
    .putExtra("tags", "fish,传说")       // 逗号分隔 tag
context.sendBroadcast(intent)
```

### 接收方：时光日记

```kotlin
// FishEventReceiver.kt
class FishEventReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != "com.example.fish.EVENT") return
        val type = intent.getStringExtra("type") ?: return
        val title = intent.getStringExtra("title") ?: return
        val body = intent.getStringExtra("body") ?: ""
        val extraTags = intent.getStringExtra("tags") ?: ""
        // 写入日记,自动加 auto + fish 标签
        repo.save(entry, listOf("auto", "fish", type) + extraTags.split(","))
    }
}
```

注册在 `AndroidManifest.xml`：
```xml
<receiver android:name=".receiver.FishEventReceiver" android:exported="true">
    <intent-filter>
        <action android:name="com.example.fish.EVENT" />
    </intent-filter>
</receiver>
```

## 当前事件类型

| type | title 示例 | body 示例 | 触发 |
|---|---|---|---|
| `fish.caught` | `抓到 鲫鱼` | `🐟 鱼获：...\n⚖️ 重量：0.28 kg\n⭐ 稀有度：常见\n📍 地点：村边小塘` | `captureFish()` |
| `fish.levelup` | `升级到 Lv.5` | `🎉 钓鱼等级提升！当前 Lv.5` | `captureFish()` 升级时 |
| `fish.achievement` | `成就解锁：初识钓鱼` | `🏅 解锁成就 [...]` | 预留（待实现）|

## 日记条目格式

自动写入一条日记，tag 包含：
- `auto` — 标记为自动写入
- `fish` — 来源模块
- `type` — 事件类型
- 额外 tag — 鱼获的 rarity / 地点 / 成就 id

**示例日记**：
```
title:   🎣 抓到 鲫鱼
content: 🐟 鱼获：鲫鱼
         ⚖️ 重量：0.28 kg
         ⭐ 稀有度：常见
         📍 地点：村边小塘
tags:    auto, fish, fish.caught, fish, 常见
```

## 安全 & 鲁棒性

| 项 | 措施 |
|---|---|
| **包名限定** | `setPackage("com.example.diary")`，只发给日记 App |
| **action 白名单** | Receiver 只接受 `com.example.fish.EVENT` |
| **字段长度限制** | title ≤ 200, body ≤ 4000, tags ≤ 200 |
| **缺失字段** | 静默 return，不抛错 |
| **无网络** | 纯本地 Broadcast，零依赖 |
| **节流** | EventReporter 500ms 内同 type 不重复发 |
| **diary 未装** | 静默失败（logcat 一行 debug），游戏不卡 |
| **API 23+** | Reflection 调用 offscreen raster（已有） |
| **try/catch** | 所有 broadcast 失败捕获 |

## 测试

### 单元（已通过）

```bash
node /tmp/test_event_e2e4.js
# → 事件 1 个:
#   [1] type=fish.caught | title=抓到 鲫鱼
#       body: 🐟 鱼获：鲫鱼 / ⚖️ 重量：0.28 kg / ⭐ 稀有度：常见
#       tags: ["fish","常见"]
```

### 真机

1. 安装两个 APK（debug 即可）
2. 在鱼游戏抛竿捕鱼
3. 打开日记 App，**列表顶部**应出现新条目（按 createdAt desc）
4. 可在 `TagManager` 看到 `auto`, `fish`, `fish.caught` 等 tag

## 局限（已知）

| 局限 | 原因 |
|---|---|
| 只 Android 端有效 | Web/PWA 没有 Android Broadcast |
| 需要两个 App 都安装 | Broadcast 必须有 Receiver 在同设备 |
| 不支持 web→diary | Browser 没有 Android Intent API |
| 不支持实时同步 | diary 不在前台时也能接收（Receiver 在 manifest） |
| 无重试 | broadcast 一次性发出，diary 未运行时丢 |

## 未来扩展

1. **持久化队列**：diary 未运行时用 SharedPreferences 暂存，下次启动回放
2. **web 桥接**：在 diary 的 WebView 里 catch web app 的事件
3. **更多模块**：天气、记账、阅读 — 都能加到这套协议
