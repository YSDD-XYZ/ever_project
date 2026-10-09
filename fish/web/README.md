# 🖥️ web/ — 桌面 / 浏览器版

> 湖畔垂钓的桌面浏览器版。适合鼠标拖拽 OrbitControls、键盘快捷键、侧边按钮布局。

![web home](../../screenshots/web-with-portal-nav.png)

## 📦 内容

```
web/
├── index.html                  # 钓鱼游戏入口（带顶部项目导航）
├── portal.html                 # 项目集入口（卡片式）
├── favicon.svg
├── LICENSE                     # MIT
├── README.md
├── src/                        # 见下方
```

> 进入 `portal.html` 查看**所有项目**（鱼游戏 / 时光日记 / 文档）。游戏页 `index.html` 顶部也加了导航条，可一键返回 portal。

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
