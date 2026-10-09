# ever_project

个人项目集(mono-repo)。每个子目录都是一个独立工程。

## 在线入口

🎯 **项目集**: [https://ysdd-xyz.github.io/ever_project/web/portal.html](https://ysdd-xyz.github.io/ever_project/web/portal.html)
- 卡片式浏览所有项目,点击进入
- 鱼游戏页顶部有"返回项目集"导航

## 子项目

| 目录 | 名称 | 平台 | 入口 | 说明 |
|---|---|---|---|---|
| `fish/` | 湖边垂钓 | Web / Mobile (PWA) / Android | [web/portal.html](fish/web/portal.html) | 2D 钓鱼游戏,36 鱼/9 地点/22 成就/每日任务 |
| `diary-app/` | 时光日记 | Android (Kotlin / Room) | [diary-app/README.md](diary-app/README.md) | 本地日记,密码 + 指纹,标签 / 计划 / 日历同步 |

## 目录约定

- 根 `.gitignore` 涵盖 web / node / python / android 通用规则
- 每个子项目有自己的 README 和构建配置
- 子项目间不共享代码

## 部署

- `fish/web/` → GitHub Pages (https://ysdd-xyz.github.io/ever_project/)
  - `portal.html` = 项目集入口
  - `index.html` = 钓鱼游戏(带顶部项目导航)
- `fish/android/` → APK (`fish/dist/`)
- `diary-app/` → Android APK (见子目录)
