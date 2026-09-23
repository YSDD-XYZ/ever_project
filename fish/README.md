# 湖畔垂钓 · Lake Fishing

> 一个 3D 网页钓鱼游戏。抛竿、等鱼、收线小游戏、捕获——全程 3D 反馈：水面波纹、镜面倒影、屏幕空间反射、镜头跟拍、WebAudio BGM。

## 📦 版本

- [`web/`](./web) —— 桌面 / 浏览器版（已完整开发）
- [`mobile/`](./mobile) —— 触屏 / 移动版（触屏优先 + PWA + 离线）

## 🎯 快速预览

```bash
# web 版（任意浏览器）
cd web && python3 -m http.server 8000

# mobile 版（同局域网内用手机访问）
cd mobile && python3 -m http.server 8001
```

> ⚠️ `<script type="module">` 强制 CORS，必须走 `http://` 协议，不能直接双击 `index.html`。

## ✨ 特性一览

- **真 3D 场景**（Three.js r158）：波纹水面、镜面倒影（Reflector）、自实现 SSR、自实现 DoF
- **天气系统**：晴 / 雨 / 雾 / 雪（实例化粒子）
- **5 个钓鱼地点、15 种鱼、5 档稀有度**
- **5 种鱼饵、4 款鱼竿** —— 鱼竿有不同 buff（咬钩判定 / 抛投距离 / 传说鱼几率）
- **收线小游戏**：按下空格或点击"锁定"指针，停在绿色区间内完美收线
- **音效全程序化**：WebAudio 合成的海浪 BGM + 风铃 + 抛竿 / 收线 / 捕获 / UI 咔哒
- **镜头**：OrbitControls（鼠标拖 / 触屏 pinch）；捕获时 cinematic 跟拍
- **持久化**：localStorage 自动存档
- **响应式**：web 版大屏布局，mobile 版抽屉化 + PWA

## 🗂 仓库结构

```
fish/
├── web/                    # 桌面 / 浏览器版
│   ├── index.html
│   ├── README.md           # web 版详细说明
│   ├── LICENSE
│   ├── public/             # 占位（贴图 / 模型 / 音频）
│   └── src/                # main.js / state.js / data.js / util.js / ui.js / game.js / audio.js / scene.js
└── mobile/                 # 触屏 / 移动版（PWA + 离线 + 抽屉化）
    ├── index.html
    ├── manifest.webmanifest
    ├── icon.svg
    ├── sw.js
    ├── README.md           # mobile 版详细说明
    ├── LICENSE
    ├── public/
    └── src/                # 在 web 版基础上扩展 main.js 与 ui.js
```

## 🛠 技术栈

- Three.js r158（CDN）
- OrbitControls UMD 版
- WebAudio API（无任何外部音频文件）
- ES Modules（无构建步骤）

## 📜 License

MIT — 见各子目录 `LICENSE` 文件。