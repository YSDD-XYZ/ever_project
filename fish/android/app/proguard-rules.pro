# WebView 桥接需要保留
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.example.fish.** { *; }
