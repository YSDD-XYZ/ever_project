# 湖畔垂钓 · 触屏版 (mobile)

> 移动端 / 触屏优先版本：响应式布局、PWA、离线可玩。

## ✨ 相比 web 版的差异

| | web | mobile |
|---|---|---|
| 视图 | 桌面横屏 | 手机竖屏为主、横屏/折叠屏自适应 |
| 地点面板 | 常驻左侧 | 默认隐藏，右下"📍 地点"按钮抽屉呼出 |
| HUD | 8 个 chip 全显示 | < 720px 时只保留必要信息 |
| 鱼饵栏 | 3 列 | 5 → 3 → 2 列自适应 |
| 抛杆按钮 | 中等 | 全屏宽度（移动设备易按） |
| 触屏 | OrbitControls | OrbitControls + 显式禁双指/双击 zoom + overscroll 防抖 |
| 离线 | 无 | Service Worker 预缓存，可加入主屏 / 断网游玩 |
| 安装到主屏 | 不可 | 浏览器菜单 → "添加到主屏幕"，启动后全屏 + 自定义图标 |

## 🚀 本地运行

```bash
cd fish/mobile
python3 -m http.server 8001
```

然后用手机扫码/同局域网访问 `http://<电脑-ip>:8001`。

> **Service Worker 要求 https 或 localhost**。内网 HTTP 浏览器会拒绝注册 SW（但游戏本身仍能跑）。

## 📱 安装到主屏

- iOS Safari：分享 → 添加到主屏幕
- Android Chrome：菜单 → 添加到主屏幕 / 安装应用

启动后无地址栏、全屏、横屏锁定为 portrait。

## 🛠 适配断点

| 断点 | 行为 |
|---|---|
| ≤ 900px | 控件 2 列、地点面板仍可见 |
| ≤ 720px | HUD 精简、地点改抽屉、鱼饵 5 列、统计隐藏 |
| ≤ 480px | 鱼饵 3 列、抛杆全宽 |
| ≤ 360px | 鱼饵 2 列 |

## 🗂 文件清单（相对 web 的差异）

```
mobile/
├── index.html         # 多 <meta> mobile/PWA + 响应式 CSS + 抽屉样式
├── manifest.webmanifest
├── icon.svg
├── sw.js              # 离线缓存
└── src/
    ├── main.js        # 注册 SW + 禁用 overscroll + 处理"📍 地点"按钮
    └── ui.js          # + togglePlacesDrawer()
    # 其余 6 个文件（state/util/data/audio/game/scene）与 web 相同
```

## 📜 License

MIT — 与父项目共享。