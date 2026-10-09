# 番茄专注 (Pomodoro)

> 25/5 番茄钟 Android App。专注完成时**自动写入时光日记**。

## 架构

```
pomodoro/android/        ← Android Studio 工程
├── settings.gradle.kts
├── build.gradle.kts
├── gradle/wrapper/      ← 复用 diary-app 的 wrapper
├── gradlew, gradlew.bat
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── res/{values,drawable,mipmap-*}/   资源
        ├── res/layout/{activity_timer,activity_history}.xml
        └── java/com/example/pomodoro/
            ├── PomodoroApplication.kt   入口 + 通知 Channel
            ├── PomodoroState.kt         全局状态（SharedPreferences 持久化）
            ├── TimerService.kt          前台 Service 倒计时
            ├── EventReporter.kt         事件上报（接 diary 协议）
            └── ui/
                ├── TimerActivity.kt     主计时界面
                └── HistoryActivity.kt   历史记录
```

## 设计原则

- **零网络**：纯本地 App
- **事件总线**：复用 fish 的事件协议（`com.example.fish.EVENT` + setPackage）
- **零 DB 依赖**：状态存 SharedPreferences（适合轻量 App）
- **前台 Service**：专注时显示通知 + 防止被系统杀

## 事件类型

番茄钟会发 5 种事件给 diary：

| type | 触发 | diary 写入示例 |
|---|---|---|
| `pomodoro.start` | 开始 25min | 🎯 开始专注（计划 25min） |
| `pomodoro.complete` | 25min 跑完 | 🍅 完成！专注了 25 分钟 |
| `pomodoro.abort` | 中断 | ⏸ 中断专注（已专注 12min） |
| `pomodoro.break_start` | 5min 休息开始 | ☕ 休息 5min |
| `pomodoro.break_complete` | 休息结束 | 🔋 充电完成 |

`tags` 字段统一包含 `pomodoro`，便于在 diary 中按 tag 筛选。

## 构建

```bash
cd pomodoro/android
./gradlew assembleDebug    # → app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug
```

## 真机使用

1. 装两个 APK：`com.example.diary` + `com.example.pomodoro`
2. 打开番茄专注 → 设置专注时长（默认 25）→ 点「开始专注」
3. 切到后台：通知栏显示「专注中 25:00」
4. 完成时自动发 broadcast → diary 自动新增一条「🍅 完成！专注了 25 分钟」
5. 切回 diary App → 列表顶部出现新条目（tag: `pomodoro, focus, complete`）

## 跨工程引用

- **事件协议**：`docs/EVENT_PROTOCOL.md`
- **接收方**：`diary-app/.../receiver/FishEventReceiver.kt`
- **类比模块**：`fish/android/.../EventReporter.kt`（一样的协议）

## 限制（同 fish 一样）

- 只 Android 端，Web/PWA 用不到
- 需要 diary 也安装（否则 broadcast 静默失败）
- 不重试：diary 未运行时事件丢失（未来可加 SharedPreferences 队列）
