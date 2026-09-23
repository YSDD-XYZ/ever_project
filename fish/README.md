# 湖畔垂钓 · 轻松钓鱼 🎣

> 一个单文件起步、用 Three.js 把它做成真 3D 场景的网页钓鱼小游戏。
> 抛竿、等待、收线小游戏、捕获——所有反馈都是 3D 的：鱼跃出水面、镜头切换、水花粒子、镜面反射、海上风铃。

![preview](public/preview.png)

## ✨ 特性

- **真 3D 场景**（Three.js r158）：波纹水面 + 程序化法线贴图 + 镜面倒影（Reflector）+ 自实现屏幕空间反射（SSR）+ 自实现 DoF 后处理
- **天气系统**：晴 / 雨 / 雾 / 雪，每种天气有对应的实例化粒子系统（雨丝、雪花）和 fog 强度变化
- **完整玩法循环**：5 个钓鱼地点、15 种鱼、5 档稀有度、5 种鱼饵、4 款鱼竿、商店 / 图鉴 / 成就 / 天气时段偏好
- **收线小游戏**：按下空格（或点击按钮）锁定指针，停在绿色区间内才能完美收线
- **音效全程序化**：WebAudio 合成的海浪 BGM + 远端风铃 + 抛竿/收线/捕获音效 + UI 点击/悬停咔哒
- **镜头系统**：OrbitControls 拖拽旋转 / 缩放 / 触屏 pinch；捕获时自动 cinematic 跟拍
- **持久化**：localStorage 自动存档，可手动存档 / 重开
- **响应式**：自适屏窗口尺寸 + 移动端触屏支持

## 🚀 运行

需要一个静态服务器（因为用了 `<script type="module">`）。最简单的几种：

```bash
# 方式一：Python（系统自带）
python3 -m http.server 8000

# 方式二：Node
npx serve .
```

然后访问 `http://localhost:8000`。

> **不能直接双击 `index.html` 打开**：浏览器对 `type="module"` 的脚本会做 CORS 限制，
> 必须通过 `http://` 协议访问。如果你只是想本地玩，可以在系统外启一个最简的静态服务器。

## 🕹 玩法

| 操作 | 效果 |
|---|---|
| 鼠标移动 | 鱼竿跟随你指的方向自然倾斜 |
| 鼠标左键拖拽 | 旋转镜头视角 |
| 鼠标滚轮 / 双指捏合 | 缩放 |
| 点击「🎣 抛竿」 | 抛竿，等待鱼上钩 |
| 点击「↩ 收线」 | 启动收线小游戏 |
| 收线游戏中按空格 | 锁定指针（锁定区为绿色） |
| 点击右上「💾 存档 / ♻ 重开」 | 手动存档或重置 |

## 🗂 项目结构

```
.
├── index.html              # 主 HTML（壳 + CSS + DOM）
├── src/
│   ├── main.js             # 入口：所有 DOM 事件绑定 + 首次渲染
│   ├── state.js            # 游戏状态：defaultState / load / save / resetState
│   ├── data.js             # 数据层：鱼 / 鱼饵 / 地点 / 天气 / 成就 / 商店
│   ├── util.js             # 工具：$ / el / rand / clamp / toast
│   ├── ui.js               # DOM 渲染：HUD / 地点 / 鱼饵 / 模态框
│   ├── game.js             # 玩法核心：cast / reel / capture / tickFish / tickWorld
│   ├── audio.js            # WebAudio：BGM + 抛竿 / 收线 / 捕获 + UI 音效
│   └── scene.js            # Three.js：3D 场景搭建 + 渲染 + 后处理
└── public/                 # （占位）未来贴图 / 模型 / 音频
```

### 模块依赖图

```
main.js ──┬──→ state.js ──→ util.js
          ├──→ util.js      └──→ audio.js
          ├──→ audio.js
          ├──→ scene.js    (无 module 依赖；用全局 THREE)
          ├──→ game.js ────┬──→ state.js
          │                ├──→ util.js
          │                ├──→ data.js
          │                ├──→ audio.js
          │                └──→ scene.js
          └──→ ui.js ───────┬──→ state.js
                            ├──→ util.js
                            └──→ data.js
```

无循环依赖；`scene.js` / `audio.js` 无外部 module 依赖，但 `scene.js` 依赖全局 `THREE`（CDN 引入）。

## 🛠 技术细节

- **Three.js r158** via unpkg CDN
- **OrbitControls** UMD 版
- **WebAudio API** —— 完全程序化合成的 BGM 与音效，无外部音频文件
- **法线贴图** —— 程序化 CanvasTexture（鱼竿木纹 + 鱼鳞）
- **GPU 实例化粒子** —— `THREE.InstancedMesh` 雨丝 / 雪花
- **后处理** —— 自实现 ShaderPass：DoF 高斯模糊 + 水面屏幕空间反射（5 tap 镜像采样 + Fresnel 衰减）

## 🎨 自定义

### 调整平衡

打开 `src/data.js`，所有数值都在那里：
- `FISH` 的 `base` / `minKg` / `maxKg`
- `BAITS` / `SHOP` 的价格与数量
- `ACHIEVEMENTS` 的奖励与触发条件
- `PLACES` 的 `fishChance` 分布（0..4 分别对应稀有度）

### 调音

打开 `src/audio.js`，每个函数都能改：
- `cast()` / `reelOk()` / `reelBad()` / `caught()` 改频率与包络
- `start()` 里改 `bgm` / `sfx` 音量与 LFO 节奏

### 改场景

打开 `src/scene.js`：
- 水面顶点波纹公式在 `tick()`
- 山脉形状在 `makeMountain()`
- 镜头 fog 距离在 `setWeather()`

## 📜 License

MIT — 见 `LICENSE`。

## 🙏 致谢

- 灵感来自钓鱼佬的午后
- Three.js 团队