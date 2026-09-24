# 🖥️ web/ — 桌面 / 浏览器版

> 湖畔垂钓的桌面浏览器版。适合鼠标拖拽 OrbitControls、键盘快捷键、侧边按钮布局。

![web home](../../screenshots/web-01-home.png)

## 📦 内容

```
web/
├── index.html                  # 入口（importmap + module main）
├── LICENSE                     # MIT
├── README.md
├── public/                     # （可选）静态资源
├── src/
│   ├── main.js                 # 端点入口：绑定事件 / 启动 3D / onboard
│   ├── ui.js                   # HUD / 地点 / 鱼饵 / 5 个模态
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
cd web
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

> ⚠️ 必须走 `http://` 协议（`<script type="module">` 强制 CORS）。

## ⌨️ 键盘快捷键

| 按键 | 行为 |
|---|---|
| `空格` | 收线小游戏：锁定指针 |
| `Esc` | 收线小游戏：放弃 |
| `W/A/S/D` | （未实现，预留） |
| 鼠标左键拖 | 旋转 3D 视角 |
| 鼠标滚轮 | 缩放 3D 视角 |
| 鼠标右键拖 | 平移 3D 视角 |

## 🆚 与 mobile 版的差异

| 特性 | web | mobile |
|---|---|---|
| 布局 | 左侧地点栏 + 右侧 5 个按钮 | 底部 FAB 抛杆 + 底部 6 个按钮 |
| 地点选择 | 左侧列表横列 | 抽屉式浮层 |
| 触屏优化 | 无 | pinch 缩放 / 长按禁用 / 双击缩放禁用 |
| PWA 离线 | 无 | Service Worker v5 |
| 持久化前缀 | `fishing_web_*` | `fishing_mobile_*` |

## 🔄 修改与同步

- **改 `src/main.js` 或 `src/ui.js`**：直接生效，无需 sync
- **改 `src/state.js` 等共享模块**：应该改 [`shared/`](../../shared) 对应文件，然后跑 `bash scripts/sync-shared.sh`

## 📜 License

MIT
