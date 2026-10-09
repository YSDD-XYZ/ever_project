# 湖边垂钓 · Android 版

> 钓鱼游戏的 Android 端,基于 WebView + fish/mobile/ 静态资源。

## 架构

```
fish/android/
├── build.gradle.kts          顶层 Gradle
├── settings.gradle.kts
├── gradle/wrapper/           复用 diary-app 的 wrapper
├── gradle.properties
└── app/
    ├── build.gradle.kts      app 模块
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/example/fish/
        │   ├── FishApplication.kt    入口
        │   └── MainActivity.kt       WebView 壳 + JS 桥
        ├── res/                       图标 / 主题 / 颜色
        └── assets/                    = fish/mobile/ 全部静态资源
```

## 设计原则

- **不重写游戏逻辑**：100% 复用 fish/mobile/ (HTML + CSS + JS)
- **JS 桥**：震动 / 分享 / 退出确认 / 版本号
- **离线优先**：所有资源打包在 APK 里,无需联网
- **全屏沉浸**：状态栏/导航栏隐藏,横屏时 swipe 唤出

## 构建

```bash
# 1. 同步 mobile 资源到 assets（开发时）
rsync -a --delete ../mobile/ app/src/main/assets/

# 2. 编译
./gradlew assembleDebug          # → app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease        # → app/build/outputs/apk/release/app-release.apk

# 3. 安装到设备
./gradlew installDebug
```

## 数据存储

- localStorage(浏览器/WebView 内) → `fishing_mobile_save_v1` / `fishing_mobile_slots_v1`
- PWA Service Worker (WebView 内可注册但仅在本进程生效)
- **未来**：可加 Android 原生 SharedPreferences 桥接(实现跨 WebView 的数据共享)

## 已知限制

1. **APK 体积**：~250 KB assets + 1.5 MB Material 库
2. **WebView 版本要求**：Android 5.0+ (API 21+)
3. **iOS 不支持**：iOS 上需要用 Capacitor / Cordova 重新打包

## 跨工程引用

- `app/src/main/assets/` 实际指向 `../mobile/`
- 修改 fish/mobile/ 后,需 `rsync` 到 assets/
- 后续可用 `scripts/sync-mobile-to-android.sh` 自动化
