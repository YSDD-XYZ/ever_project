# WebView 桥接 (当前未用,预留)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.example.pomodoro.** { *; }
