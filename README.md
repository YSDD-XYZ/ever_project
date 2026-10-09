# ever_project

个人项目集(mono-repo)。每个子目录都是一个独立工程。

## 子项目

| 目录 | 名称 | 平台 | 说明 |
|---|---|---|---|
| `fish/` | 钓鱼游戏 | Web / Mobile (PWA) / Android (新增) | 轻松有趣,2D 场景,丰富内容(36 鱼/9 地点/22 成就/5 每日任务) |
| `diary-app/` | 时光日记 | Android (Kotlin / Room) | 本地日记 App,密码 + 指纹,标签 / 计划 / 日历同步 |

## 目录约定

- 根 `.gitignore` 涵盖 web / node / python / android 通用规则
- 每个子项目有自己的 README 和构建配置
- 子项目间不共享代码

## 部署

- `fish/` → GitHub Pages (https://ysdd-xyz.github.io/ever_project/)
- `diary-app/` → Android APK (见各子目录)
