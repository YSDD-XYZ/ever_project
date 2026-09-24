# 📸 screenshots/

> README 引用的 8 张预览图。

## web（桌面浏览器）

| 文件 | 说明 |
|---|---|
| `web-01-home.png` | 主界面：3D 水面 + 浮漂 + 侧边按钮 |
| `web-02-shop.png` | 商店模态：鱼饵 / 鱼竿购买 |
| `web-03-codex.png` | 图鉴模态：捕获鱼种列表 |
| `web-04-achievements.png` | 成就模态：10 项成就解锁状态 |
| `web-05-logs.png` | 日志模态：游戏事件时间线 |

## mobile（触屏）

| 文件 | 说明 |
|---|---|
| `mobile-01-home.png` | 主界面：FAB 抛杆 + 底部 6 个按钮 |
| `mobile-02-shop.png` | 商店模态（移动版布局） |
| `mobile-03-codex.png` | 图鉴模态（移动版布局） |

## 拍摄方式

```bash
# 启动本地服务
cd web && python3 -m http.server 8000 &
cd mobile && python3 -m http.server 8001 &

# 用 Puppeteer 截图
node /tmp/screenshot.js
```

截图分辨率为 2× DPR（web 2560×1600、mobile 780×1688），适合 README 直接显示。
