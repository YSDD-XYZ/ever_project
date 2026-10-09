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
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature

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

        // 创建 WebView（不加载 layout，直接 new）
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
        }
        // 离屏渲染（可选）
        if (WebViewFeature.isFeatureSupported(WebViewFeature.OFF_SCREEN_PRE_RENDER)) {
            WebSettingsCompat.setOffscreenPreRaster(webView.settings, true)
        }

        // JS 桥：暴露 vibrate / share / exit
        webView.addJavascriptInterface(JsBridge(this), "AndroidBridge")

        // 加载本地资源
        webView.webViewClient = WebViewClient()
        webView.loadUrl("file:///android_asset/index.html")

        // 拦截返回键 → 让 WebView 处理（不退出 App）
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    showExitDialog()
                }
            }
        })
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
 * - exitConfirm(): 显示退出确认
 * - getVersion(): 返回 App 版本
 */
class JsBridge(private val ctx: Context) {
    @android.webkit.JavascriptInterface
    fun vibrate(ms: Long) {
        if (ms <= 0) return
        val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
        vibrator?.let {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                it.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                it.vibrate(ms)
            }
        }
    }

    @android.webkit.JavascriptInterface
    fun share(text: String) {
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        ctx.startActivity(Intent.createChooser(intent, "分享渔获").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    @android.webkit.JavascriptInterface
    fun getVersion(): String = "0.1.0"

    @android.webkit.JavascriptInterface
    fun isAndroid(): Boolean = true
}
