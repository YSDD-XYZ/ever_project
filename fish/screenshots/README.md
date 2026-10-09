# 📸 screenshots/

项目截图存档。保留有意义的版本,迭代中产生的一次性截图会被清理。

## 移动端（2D 场景,PWA）

| 文件 | 说明 |
|---|---|
| `current-mobile.png` | 主界面：FAB 抛杆 + 底部鱼饵 + 顶部 HUD |
| `2d-1-home.png` | 2D 场景首屏：天空 / 水面 / 浮漂 |
| `2d-2-cast.png` | 抛竿中：浮漂入水 + 涟漪 |
| `2d-3-jump.png` | 鱼跳跃动画 |
| `2d-4-catch.png` | 捕获瞬间 |
| `2d-5-rain.png` | 雨天场景：暗色天空 + 雨滴 |

## 桌面端（web）

| 文件 | 说明 |
|---|---|
| `2d-web.png` | 2D 场景桌面布局 |

## 模态框

| 文件 | 说明 |
|---|---|
| `codex-with-tier.png` | 鱼图鉴 + 段位徽章（初识 → 入门 → 熟练 …）|
| `codex-tier.png` | 段位进度条特写 |
| `quests-modal.png` | 每日任务模态 |
| `quests-done.png` | 任务完成态 |

## 拍摄方式

```bash
# 启动本地服务
cd web && python3 -m http.server 8000 &
cd mobile && python3 -m http.server 8001 &

# 用 Puppeteer 截图（参见 /tmp/shot_*.js）
node /tmp/shot_quests.js
```

截图分辨率：mobile 780×1688 (2× DPR)，web 2560×1600 (2× DPR)。
