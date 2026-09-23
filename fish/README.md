# 湖畔垂钓 · Lake Fishing

> 一个 3D 网页钓鱼游戏：抛竿、等鱼、收线小游戏、捕获——全程 3D 反馈：水面波纹、镜面倒影、屏幕空间反射、镜头跟拍、WebAudio BGM。

## 📸 预览

> 截图待上传到 [`screenshots/`](./screenshots)。详见 [`screenshots/README.md`](./screenshots/README.md)。

## 📦 版本

- [`web/`](./web) —— 桌面 / 浏览器版
- [`mobile/`](./mobile) —— 触屏 / 移动版（PWA、离线、FAB 抛杆）
- [`shared/`](./shared) —— 跨 web/mobile 复用的 6 个核心模块

## 🎯 快速预览

```bash
# web 版（任意浏览器）
cd web && python3 -m http.server 8000

# mobile 版（同局域网内用手机访问）
cd mobile && python3 -m http.server 8001
```

> ⚠️ `<script type="module">` 强制 CORS，必须走 `http://` 协议，不能直接双击 `index.html`。

> 改完 [`shared/`](./shared) 下的文件，记得执行 `./scripts/sync-shared.sh` 同步到 web/src 与 mobile/src。

## ✨ 特性一览

- **真 3D 场景**（Three.js r158）：波纹水面、镜面倒影（Reflector）、自实现 SSR、自实现 DoF
- **天气系统**：晴 / 雨 / 雾 / 雪（GPU 实例化粒子）
- **5 个钓鱼地点、15 种鱼、6 档稀有度**
- **5 种鱼饵、4 款鱼竿** —— 鱼竿有不同 buff（咬钩判定 / 抛投距离 / 传说鱼几率）
- **收线小游戏**：按下空格或点击"锁定"指针，停在绿色区间内完美收线
- **音效全程序化**：WebAudio 合成的海浪 BGM + 风铃 + 抛竿 / 收线 / 捕获 / UI 咔哒
- **镜头**：OrbitControls（鼠标拖 / 触屏 pinch）；捕获时 cinematic 跟拍
- **持久化**：localStorage 自动存档
- **设计系统**：CSS variables（色板 / 间距 / 字号 / 圆角 / 阴影）
- **mobile 专属**：PWA + Service Worker 离线 + 触屏过激行为禁用 + 抛杆按钮 FAB 化

## 🗂 仓库结构

```
fish/
├── .github/workflows/         # CI：lint + sync 验证
├── .vscode/                   # （gitignore）VS Code 推荐扩展 / 配置
├── screenshots/               # 截图占位
├── scripts/
│   └── sync-shared.sh         # 改 shared/ 后跑一下同步
├── shared/                    # 跨 web/mobile 复用模块（6 个）
│   ├── state.js util.js data.js
│   ├── audio.js game.js scene.js
│   └── README.md
├── web/                       # 桌面 / 浏览器版
│   ├── index.html
│   ├── README.md
│   ├── LICENSE
│   ├── public/
│   └── src/                   # 8 个文件：6 shared 副本 + main/ui 专属
└── mobile/                    # 触屏 / 移动版
    ├── index.html manifest.webmanifest icon.svg sw.js
    ├── README.md LICENSE public/
    └── src/                   # 8 个文件：6 shared 副本 + main/ui 专属
```

## 🛠 技术栈

- Three.js r158（CDN）
- OrbitControls UMD 版
- WebAudio API（无任何外部音频文件）
- ES Modules（无构建步骤）
- Service Worker（仅 mobile）

## 🔄 开发工作流

1. 改 `shared/*.js` → 跑 `bash scripts/sync-shared.sh`
2. 改 `web/src/main.js` / `mobile/src/main.js`（端点专属）→ 不需要 sync
3. 提交时 CI 跑：① sync-shared.sh（必须 no-op）② 全部 JS 语法 ③ 静态资源可达

## 📜 License

MIT — 见各子目录 `LICENSE` 文件。