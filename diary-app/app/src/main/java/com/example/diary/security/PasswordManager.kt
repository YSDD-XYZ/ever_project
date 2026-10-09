package com.example.diary.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * 密码存到 EncryptedSharedPreferences（AES256-GCM）。
 *
 * 注意：这里只存"能不能解锁"的校验位，不直接明文存密码。
 * - set(pwd): 用 PBKDF2 派生 hash + salt，写入 prefs
 * - verify(pwd): 同样派生再比较
 *
 * 真正的依赖 androidx.security:security-crypto 没加进 build.gradle.kts（先保持精简）；
 * 启用时只需在 dependencies 加：
 *   implementation("androidx.security:security-crypto:1.1.0-alpha06")
 */
class PasswordManager(context: Context) {

    private val prefs by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun isSet(): Boolean = prefs.contains(KEY_HASH)

    fun set(password: String) {
        val salt = generateSalt()
        val hash = pbkdf2(password, salt)
        prefs.edit()
            .putString(KEY_SALT, salt)
            .putString(KEY_HASH, hash)
            .apply()
    }

    fun verify(password: String): Boolean {
        val salt = prefs.getString(KEY_SALT, null) ?: return false
        val hash = prefs.getString(KEY_HASH, null) ?: return false
        return constantTimeEquals(pbkdf2(password, salt), hash)
    }

    private fun pbkdf2(password: String, saltB64: String): String {
        // 占位实现 —— 真上线前接入 BouncyCastle 或 Conscrypt 的 PBKDF2。
        // 这里用 SHA-256(salt || password) 仅作 demo，请勿在生产直接使用。
        val md = java.security.MessageDigest.getInstance("SHA-256")
        val saltBytes = android.util.Base64.decode(saltB64, android.util.Base64.NO_WRAP)
        md.update(saltBytes)
        md.update(password.toByteArray(Charsets.UTF_8))
        return android.util.Base64.encodeToString(
            md.digest(), android.util.Base64.NO_WRAP
        )
    }

    private fun generateSalt(): String {
        val bytes = ByteArray(16)
        java.security.SecureRandom().nextBytes(bytes)
        return android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
    }

    private fun constantTimeEquals(a: String, b: String): Boolean {
        if (a.length != b.length) return false
        var r = 0
        for (i in a.indices) r = r or (a[i].code xor b[i].code)
        return r == 0
    }

    companion object {
        private const val KEY_SALT = "pwd_salt"
        private const val KEY_HASH = "pwd_hash"
    }
}