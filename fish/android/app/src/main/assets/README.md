# 📱 mobile/ — 触屏 / 移动版 (PWA)

> 湖畔垂钓的移动端 PWA 版。支持触屏手势、可"添加到主屏幕"、Service Worker 离线缓存。

![mobile home](../../screenshots/mobile-01-home.png)

## 📦 内容

```
mobile/
├── index.html                  # 入口（importmap + module main）
├── manifest.webmanifest        # PWA 配置（名字 / 图标 / 主题色 / 启动画面）
├── icon.svg                    # 应用图标
├── sw.js                       # Service Worker（v5，预缓存 + 离线降级）
├── LICENSE                     # MIT
├── README.md
├── public/                     # （可选）静态资源
├── src/
│   ├── main.js                 # 端点入口：触屏事件 / FAB / 抽屉
│   ├── ui.js                   # HUD / 地点抽屉 / 鱼饵 / 5 个模态
│   ├── state.js, util.js, data.js, audio.js
│   ├── game.js, scene.js
│   ├── savecode.js, slots.js, validate.js
│   └── vendor/                 # Three.js / OrbitControls / Reflector
```

> `src/` 下有 11 个 JS 模块，其中 **9 个是 `shared/` 的同步副本**（由 `sync-shared.sh` 自动维护）。
>
> 端点专属文件只有 2 个：`main.js` 和 `ui.js`。

## 🚀 启动

```bash
cd mobile
python3 -m http.server 8001
# 手机访问 http://<你的电脑IP>:8001
# 或本机浏览器 http://localhost:8001
```

> ⚠️ 必须走 `http://` 协议（`<script type="module">` 强制 CORS）。

## 📲 PWA 安装

1. 浏览器打开 → 菜单 → "添加到主屏幕"
2. 图标出现在桌面，全屏启动，无浏览器地址栏
3. **首次加载需联网**，之后 **Service Worker 缓存** 实现离线

## 📜 Service Worker 缓存策略

| 资源 | 策略 |
|---|---|
| `index.html`, `src/main.js`, `src/ui.js` | precache |
| `src/state.js` 等 9 个 shared 模块 | precache |
| `src/vendor/*`（Three.js） | precache |
| 其他 GET 请求 | network-first，降级到 cache |

> **版本号**：每次修改 `src/*.js` 记得把 `sw.js` 里的 `VERSION` 往上加（v5 → v6），否则旧用户加载的还是缓存。

## 🆚 与 web 版的差异

| 特性 | web | mobile |
|---|---|---|
| 布局 | 左侧地点栏 + 右侧 5 个按钮 | 底部 FAB 抛杆 + 底部 6 个按钮 |
| 地点选择 | 左侧列表横列 | 抽屉式浮层 |
| 触屏优化 | 无 | pinch 缩放 / 长按禁用 / 双击缩放禁用 |
| PWA 离线 | 无 | Service Worker v5 |
| 持久化前缀 | `fishing_web_*` | `fishing_mobile_*` |
| 抛杆按钮 | 顶部主操作 | 底部圆形 FAB |

## 🔄 修改与同步

- **改 `src/main.js` 或 `src/ui.js`**：直接生效，无需 sync
- **改 `src/state.js` 等共享模块**：应该改 [`shared/`](../../shared) 对应文件，然后跑 `bash scripts/sync-shared.sh`
- **改 `sw.js` 版本号**：手动把 `VERSION = 'v5'` 改成 `'v6'`

## 📜 License

MIT
