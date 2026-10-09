package com.example.fish

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat

/**
 * MainActivity —— 钓鱼游戏 Android 端入口
 *
 * 架构：WebView 壳 + JS ↔ Kotlin 桥
 * - WebView 加载 file:///android_asset/index.html (即 fish/mobile/)
 * - 桥接能力：震动、退出确认、HUD 状态查询、分享
 * - 全屏沉浸模式，状态栏/导航栏透明
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            setupWindow()
            setupWebView()
            setupBackPress()
        } catch (t: Throwable) {
            // 任何初始化失败：显示一个静态错误页而不是闪退
            android.util.Log.e("FishApp", "onCreate failed", t)
            showErrorPage(t)
        }
    }

    private fun setupWindow() {
        // 全屏沉浸
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { c ->
                c.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                c.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        // 创建 WebView
        webView = WebView(this)
        setContentView(webView)

        // 配置
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            mediaPlaybackRequiresUserGesture = false
            databaseEnabled = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            // 关闭 file:// 跨域限制(本地资源互相访问)
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
        }
        // 关闭 WebView 黑底白字（一些设备的深色模式 bug）
        webView.setBackgroundColor(0x00000000)

        // 离屏渲染（API 23+）：反射调用,失败忽略
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val method = webView.javaClass.getMethod("setOffscreenPreRaster", Boolean::class.javaPrimitiveType)
                method.invoke(webView, true)
            } catch (_: Throwable) { }
        }

        // JS 桥
        webView.addJavascriptInterface(JsBridge(this), "AndroidBridge")

        // 客户端 + Console 错误捕获
        webView.webChromeClient = object : android.webkit.WebChromeClient() {
            override fun onConsoleMessage(msg: android.webkit.ConsoleMessage): Boolean {
                android.util.Log.d("FishJS", "${msg.message()} @${msg.lineNumber()}")
                return true
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, req: android.webkit.WebResourceRequest?, err: android.webkit.WebResourceError?) {
                android.util.Log.e("FishWeb", "err ${err?.errorCode} ${err?.description} url=${req?.url}")
            }
            override fun onPageFinished(view: WebView?, url: String?) {
                android.util.Log.d("FishWeb", "loaded $url")
            }
        }

        // 加载
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun setupBackPress() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                try {
                    if (::webView.isInitialized && webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        showExitDialog()
                    }
                } catch (_: Throwable) {
                    finish()
                }
            }
        })
    }

    private fun showErrorPage(t: Throwable) {
        val tv = android.widget.TextView(this).apply {
            text = "⚠️ 启动失败\n\n${t.javaClass.simpleName}\n${t.message}\n\n请检查 Android 系统 WebView 是否已更新。"
            setPadding(48, 96, 48, 48)
            textSize = 16f
            setTextColor(0xFF333333.toInt())
            setBackgroundColor(0xFFFFF8E1.toInt())
        }
        setContentView(tv)
    }

    /**
     * 退出前确认（防止误触）
     */
    private fun showExitDialog() {
        AlertDialog.Builder(this)
            .setTitle("退出游戏？")
            .setMessage("当前进度已自动保存。")
            .setPositiveButton("退出") { _, _ -> finish() }
            .setNegativeButton("继续钓鱼", null)
            .show()
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}

/**
 * JS ↔ Kotlin 桥
 *
 * 暴露给 window.AndroidBridge：
 * - vibrate(ms): 触发震动
 * - share(text): 调起系统分享
 * - getVersion(): 返回 App 版本
 * - isAndroid(): 平台判断
 *
 * 注意：所有方法都包 try/catch 防止设备/系统异常导致闪退。
 *   使用 applicationContext 而非 activity context,避免 Activity 已 finish 时崩溃。
 */
class JsBridge(private val appCtx: Context) {
    private val ctx: Context get() = appCtx.applicationContext
    @android.webkit.JavascriptInterface
    fun vibrate(ms: Long) {
        if (ms <= 0) return
        try {
            val vibrator: Vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator ?: return
            } else {
                @Suppress("DEPRECATION")
                ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!vibrator.hasVibrator()) return
                vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(ms)
            }
        } catch (_: Throwable) {
            // 任何设备异常都安全降级,绝不抛回 JS
        }
    }

    @android.webkit.JavascriptInterface
    fun share(text: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, text)
            }
            ctx.startActivity(Intent.createChooser(intent, "分享渔获").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (_: Throwable) {
            // 没装能分享的 app,降级
        }
    }

    @android.webkit.JavascriptInterface
    fun getVersion(): String = "0.1.0"

    @android.webkit.JavascriptInterface
    fun isAndroid(): Boolean = true

    /**
     * JS 端调用：把游戏事件通过 EventReporter 发给 diary-app
     * - type: 事件类型
     * - title: 短标题
     * - body: 详细描述
     * - tagsJson: JSON 数组字符串 ["fish","传说"]
     */
    @android.webkit.JavascriptInterface
    fun reportEvent(type: String, title: String, body: String, tagsJson: String) {
        try {
            // tagsJson 是 JSON 数组,简单解析（不依赖外部库）
            val tags = tagsJson
                .removePrefix("[")
                .removeSuffix("]")
                .split(",")
                .map { it.trim().removeSurrounding("\"") }
                .filter { it.isNotEmpty() }

            when (type) {
                "fish.caught" -> {
                    // 解析 body 里的 kg 和 rarity
                    val kg = Regex("⚖️\\s*重量：([\\d.]+)").find(body)?.groupValues?.getOrNull(1)?.toDoubleOrNull() ?: 0.0
                    val rarity = Regex("⭐\\s*稀有度：(\\S+)").find(body)?.groupValues?.getOrNull(1) ?: "常见"
                    val place = Regex("📍\\s*地点：(.*)").find(body)?.groupValues?.getOrNull(1)?.trim()
                    val fishName = title.removePrefix("抓到 ").trim()
                    EventReporter.reportFishCaught(ctx, fishName, kg, rarity, place)
                }
                "fish.levelup" -> {
                    val level = Regex("Lv\\.(\\d+)").find(title)?.groupValues?.getOrNull(1)?.toIntOrNull() ?: 0
                    EventReporter.reportLevelUp(ctx, level)
                }
                "fish.achievement" -> {
                    val achvId = tags.firstOrNull { it != "fish" && it != "achievement" } ?: ""
                    val achvName = title.removePrefix("成就解锁：").trim()
                    EventReporter.reportAchievement(ctx, achvId, achvName)
                }
                else -> {
                    // 通用事件：直接发
                    // 通过反射调用（避免在 JsBridge 里再写一遍 send 逻辑）
                    val reporterClass = Class.forName("com.example.fish.EventReporter")
                    val method = reporterClass.getMethod("sendGeneric", android.content.Context::class.java, String::class.java, String::class.java, String::class.java, Array<String>::class.java)
                    method.invoke(null, ctx, type, title, body, tags.toTypedArray())
                }
            }
        } catch (e: Throwable) {
            android.util.Log.d("FishJS", "reportEvent 失败（无影响）: ${e.message}")
        }
    }
}
