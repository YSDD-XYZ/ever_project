# shared/

跨 `web/` 与 `mobile/` 复用的源代码。每个文件同时复制到 `web/src/` 与 `mobile/src/`，
保证两端可以独立部署（不需要 monorepo 视图）。

## 文件清单

| 文件 | 内容 |
|---|---|
| `state.js`  | 全局游戏状态的唯一来源：`defaultState / load / save / resetState / armAudio` |
| `util.js`   | DOM 工具：`$ / el / rand / randInt / choice / clamp / toast` |
| `data.js`   | 数据层：`FISH / BAITS / PLACES / WEATHERS / TIMES / ACHIEVEMENTS / SHOP` |
| `audio.js`  | WebAudio 程序化合成：BGM + 抛竿 / 收线 / 捕获 + UI 音效 |
| `game.js`   | 玩法逻辑：`cast / reel / capture / tickFish / tickWorld` 等 |
| `scene.js`  | Three.js 3D 场景：水面 / 山 / 月 / 鱼 / 后处理 |

## 修改规范

1. **改 shared/ 后必须同步**：

   ```bash
   bash scripts/sync-shared.sh
   ```

   该脚本会把 main.js / ui.js 以外的文件拷到 `web/src/` 与 `mobile/src/`。

2. **改 main.js / ui.js**：这些是端点专属，**不能放 shared/**。

3. **CI 自动校验**：`.github/workflows/lint-sync.yml` 跑 sync-shared.sh，若 working tree 有变动说明同步未提交，会失败。

## 依赖图（端点 → shared）

```
main.js ──┬── state.js ──── util.js
          ├── audio.js
          ├── scene.js        (无 shared 依赖；用全局 THREE)
          ├── game.js ────┬── state.js
          │               ├── data.js
          │               ├── audio.js
          │               ├── scene.js
          │               └── util.js
          └── ui.js ───────┬── state.js
                           ├── data.js
                           └── util.js
```

无循环依赖；`scene.js` 依赖全局 `THREE`（由 CDN 引入）。