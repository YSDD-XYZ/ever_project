# Diary App

Android 原生日记 App,本地存储,数据库可移植。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 语言 | Kotlin 1.9.24 | |
| UI | Material 3 + ViewBinding | 主题:`Theme.Material3.DayNight.NoActionBar` |
| 架构 | MVVM | `Activity / ViewModel / Repository / DAO` |
| 异步 | Kotlin Coroutines + Flow | Room DAO 直接返回 `Flow<List<…>>` |
| 数据库 | Room 2.6.1(SQLite) | DB 文件落在 `databases/diary.db`,可直接拷贝移植 |
| 密码 | EncryptedSharedPreferences + BiometricPrompt | AES-256 GCM 加密本地密码;首次启动引导设置,后续可选指纹/面容 |

## 工程结构

```
diary-app/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/example/diary/
        │   ├── DiaryApplication.kt        ← 入口,组装 DI 容器
        │   ├── data/
        │   │   ├── AppContainer.kt       ← 手写极简 DI
        │   │   ├── AppDatabase.kt        ← Room 数据库
        │   │   ├── DiaryDao.kt           ← 查询/写入
        │   │   ├── DiaryEntry.kt         ← 实体(单表,字段含义见注释)
        │   │   └── DiaryRepository.kt    ← 业务封装(打时间戳)
        │   ├── security/
        │   │   └── PasswordManager.kt    ← 密码 + 加密存储
        │   └── ui/
        │       ├── MainActivity.kt       ← 列表 + 搜索 + 密码门
        │       ├── DiaryAdapter.kt       ← RecyclerView 适配器
        │       └── editor/
        │           ├── EditorActivity.kt
        │           └── EditorViewModel.kt
        └── res/
            ├── layout/                   ← activity_main / activity_editor / item_diary / dialog_set_password
            ├── menu/menu_editor.xml
            ├── mipmap-anydpi-v26/        ← 自适应图标
            ├── values/colors.xml strings.xml themes.xml
            ├── drawable/ic_launcher_foreground.xml
            └── xml/backup_rules.xml data_extraction_rules.xml
```

## 数据库字段

`diary` 表(单表结构,移植直接拷 `diary.db` 即可):

| 列 | 类型 | 说明 |
|---|---|---|
| id INTEGER PK AUTOINCREMENT | 主键 | |
| title TEXT | 标题,允许为空字符串(列表里以"无标题"显示) | |
| content TEXT | 正文 | |
| tags TEXT | 标签,逗号分隔 | |
| created_at INTEGER | 创建时间戳(毫秒) | |
| updated_at INTEGER | 最近修改时间戳(毫秒),列表默认按它降序 | |

升级路径:把 `version` 提到 2、写 `Migration`、把 schema JSON(由 `exportSchema = true` 自动生成在 `app/schemas/`)提交进版本库。

## 编译运行

### 前置
- JDK 17(`java -version` 应输出 17.x)
- Android SDK(`ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 指向 SDK 根目录,platforms/android-34 + build-tools/34.0.0 已装)
- 一台 Android 7.0+(API 24)真机或模拟器

### 一次性补齐 wrapper jar(本仓库的 `gradle-wrapper.jar` 已就位)

`gradle/wrapper/gradle-wrapper.properties` 默认指向 `file:/opt/gradle-dist/gradle-8.7-bin.zip`(本机缓存),避免重复下载。要用 Gradle 官方分发站,请改回:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-bin.zip
```

### 编译

```bash
# 在项目根目录(/work/1/diary-app)执行:
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # 或你的 JDK 17 路径
export ANDROID_HOME=/opt/android-sdk                  # 或你的 SDK 路径
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

./gradlew assembleDebug          # → app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease        # → app/build/outputs/apk/release/app-release.apk
./gradlew installDebug           # 装到已连接的设备
./gradlew --version              # 验证 wrapper 工作
```

首次构建会从 `gradle-wrapper.properties` 下载 `gradle-8.7-bin.zip`,落到 `~/.gradle/wrapper/dists/`,之后离线可用。

## 已实现的默认功能

- 列表(按更新时间排序)
- 写 / 保存 / 编辑
- 删除(带二次确认)
- 搜索(标题/内容/标签 LIKE)
- 标签(逗号分隔,列表预览展示)
- 富文本:当前为多行纯文本(`inputType=textMultiLine`),如需图片附件可在 `DiaryEntry` 加 `imagePaths: String`,列表项用 Coil 渲染
- 密码锁 + 首次启动引导设置
- 生物识别(指纹/面容,弱认证 + 设备凭据回退),无生物特征设备自动降级为密码

## 后续可移植能力

- **DB 整库迁移**:直接 `adb pull /data/data/com.example.diary/databases/diary.db`,放进新 App 同一表结构即可读;`backup_rules.xml` / `data_extraction_rules.xml` 已禁用云备份,防止隐私外泄。
- **升级迁移**:升 Room 版本号 + 写 `Migration` + 在 CI 用 `Room.exportSchema` 校验 schema 变更。
- **同步**:未来要加云同步时,在 Repository 注入 RemoteDataSource 即可,UI/ViewModel 不动。