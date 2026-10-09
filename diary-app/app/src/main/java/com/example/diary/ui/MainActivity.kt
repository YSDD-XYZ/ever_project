package com.example.diary.ui

import android.app.AlertDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.Menu
import android.view.MenuItem
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.diary.DiaryApplication
import com.example.diary.R
import com.example.diary.databinding.ActivityMainBinding
import com.example.diary.databinding.DialogSetPasswordBinding
import com.example.diary.ui.common.MonthKeys
import com.example.diary.ui.common.SectionBuilder
import com.example.diary.ui.common.SectionAdapter as CommonSectionAdapter
import com.example.diary.ui.common.StickyHeaderDecoration
import com.example.diary.ui.common.TagFilterMode
import com.example.diary.ui.editor.EditorActivity
import com.example.diary.ui.plan.PlanListActivity
import com.example.diary.ui.tag.TagManagerActivity
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var adapter: DiarySectionAdapter
    private val app: DiaryApplication get() = application as DiaryApplication
    private var unlocked = false

    // SAF:导出(用户选目标文件)
    private val createDocLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument("application/octet-stream")
    ) { uri ->
        if (uri == null) return@registerForActivityResult
        lifecycleScope.launch {
            try {
                val bytes = app.container.dbExporter.exportTo(uri)
                toast(getString(R.string.export_success, bytes))
            } catch (t: Throwable) {
                toast(getString(R.string.export_failed, t.message ?: "未知错误"))
            }
        }
    }

    // SAF:导入(用户选源文件)
    private val openDocLauncher = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        if (uri == null) return@registerForActivityResult
        confirmThenImport(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setSupportActionBar(binding.toolbar)

        adapter = DiarySectionAdapter { item ->
            startActivity(
                Intent(this, EditorActivity::class.java)
                    .putExtra(EditorActivity.EXTRA_ID, item.entry.id)
            )
        }
        binding.list.layoutManager = LinearLayoutManager(this)
        binding.list.adapter = adapter

        binding.list.addItemDecoration(
            StickyHeaderDecoration { pos -> adapter.getItemViewType(pos) == CommonSectionAdapter.TYPE_HEADER }
        )

        adapter.onHeaderClick = { _, _ ->
            val target = (0 until adapter.itemCount)
                .firstOrNull { adapter.getItemViewType(it) == CommonSectionAdapter.TYPE_HEADER }
            if (target != null) {
                binding.list.smoothScrollToPosition(target)
            }
        }

        // Tag 筛选
        lifecycleScope.launch {
            app.container.tagRepository.observeDiaryTagCounts().collectLatest { tags ->
                binding.tagFilter.setTags(tags)
            }
        }
        binding.tagFilter.setOnChange { tagIds, mode ->
            observe(binding.searchInput.text?.toString().orEmpty(), tagIds, mode)
        }

        binding.fabNew.setOnClickListener {
            startActivity(Intent(this, EditorActivity::class.java))
        }

        binding.searchInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                observe(s?.toString().orEmpty())
            }
        })

        binding.bottomNav.selectedItemId = R.id.nav_diary
        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_plan -> {
                    startActivity(Intent(this, PlanListActivity::class.java))
                    binding.bottomNav.post { binding.bottomNav.selectedItemId = R.id.nav_diary }
                    false
                }
                else -> true
            }
        }

        gate()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.menu_main, menu)
        return true
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        return when (item.itemId) {
            R.id.action_export -> {
                val stamp = java.text.SimpleDateFormat("yyyyMMdd-HHmm", java.util.Locale.US)
                    .format(java.util.Date())
                createDocLauncher.launch("diary-backup-$stamp.db")
                true
            }
            R.id.action_export_downloads -> {
                lifecycleScope.launch {
                    try {
                        val name = app.container.dbExporter.exportToDownloads()
                        toast("已放进 Downloads/$name")
                    } catch (t: Throwable) {
                        toast(getString(R.string.export_failed, t.message ?: "未知错误"))
                    }
                }
                true
            }
            R.id.action_import -> {
                openDocLauncher.launch(arrayOf("application/octet-stream", "*/*"))
                true
            }
            R.id.action_tag_manager -> {
                startActivity(Intent(this, TagManagerActivity::class.java))
                true
            }
            // 同名冲突:menu_editor.xml 也有 action_import,显式消歧
            else -> super.onOptionsItemSelected(item)
        }
    }

    private fun confirmThenImport(uri: Uri) {
        AlertDialog.Builder(this)
            .setTitle(R.string.import_confirm_title)
            .setMessage(R.string.import_confirm_message)
            .setPositiveButton(com.example.diary.R.string.action_import) { _, _ ->
                lifecycleScope.launch {
                    try {
                        val bytes = app.container.dbImporter.importFrom(uri)
                        // 强制重启 App:Process.killProcess 之后,Android 在 launcher
                        // 看到的就是干净的新进程。
                        toast(getString(R.string.import_success, bytes))
                        // 给个延时,让 toast 上去
                        binding.root.postDelayed({
                            android.os.Process.killProcess(android.os.Process.myPid())
                        }, 1500)
                    } catch (t: Throwable) {
                        toast(getString(R.string.import_failed, t.message ?: "未知错误"))
                    }
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun toast(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
    }

    private fun gate() {
        val pm = app.container.passwordManager
        if (!pm.isSet()) {
            showSetPasswordDialog { set ->
                if (set) tryBiometricThen { unlock() }
                else finish()
            }
        } else {
            tryBiometricThen { promptPassword() }
        }
    }

    private fun promptPassword() {
        val input = android.widget.EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or
                android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = getString(R.string.hint_password)
        }
        AlertDialog.Builder(this)
            .setTitle(R.string.action_unlock)
            .setView(input)
            .setCancelable(false)
            .setPositiveButton(R.string.action_unlock) { _, _ ->
                if (app.container.passwordManager.verify(input.text.toString())) {
                    unlock()
                } else {
                    binding.root.post {
                        android.widget.Toast.makeText(
                            this, R.string.password_wrong, android.widget.Toast.LENGTH_SHORT
                        ).show()
                        promptPassword()
                    }
                }
            }
            .setNegativeButton(android.R.string.cancel) { _, _ -> finish() }
            .show()
    }

    private fun showSetPasswordDialog(onResult: (Boolean) -> Unit) {
        val dlgBinding = DialogSetPasswordBinding.inflate(LayoutInflater.from(this))
        AlertDialog.Builder(this)
            .setTitle(R.string.password_set)
            .setView(dlgBinding.root)
            .setCancelable(false)
            .setPositiveButton(R.string.action_save) { _, _ ->
                val p1 = dlgBinding.pwd1.text.toString()
                val p2 = dlgBinding.pwd2.text.toString()
                if (p1.length < 4 || p1 != p2) {
                    android.widget.Toast.makeText(
                        this, R.string.password_mismatch, android.widget.Toast.LENGTH_SHORT
                    ).show()
                    onResult(false)
                } else {
                    app.container.passwordManager.set(p1)
                    onResult(true)
                }
            }
            .setNegativeButton(android.R.string.cancel) { _, _ -> onResult(false) }
            .show()
    }

    private fun tryBiometricThen(fallback: () -> Unit) {
        val mgr = BiometricManager.from(this)
        val can = mgr.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_WEAK or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
        )
        if (can != BiometricManager.BIOMETRIC_SUCCESS) {
            fallback(); return
        }
        val prompt = BiometricPrompt(
            this,
            ContextCompat.getMainExecutor(this),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    unlock()
                }
                override fun onAuthenticationFailed() {
                    fallback()
                }
            }
        )
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle(getString(R.string.biometric_title))
                .setSubtitle(getString(R.string.biometric_subtitle))
                .setAllowedAuthenticators(
                    BiometricManager.Authenticators.BIOMETRIC_WEAK or
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
                .build()
        )
    }

    private fun unlock() {
        unlocked = true
        observe(binding.searchInput.text?.toString().orEmpty())
    }

    private fun observe(query: String) = observe(query, null, TagFilterMode.AND)

    private fun observe(query: String, tagIds: Set<Long>?, mode: TagFilterMode) {
        if (!unlocked) return
        lifecycleScope.launch {
            app.container.diaryRepository.observeFiltered(
                textQuery = query.trim().ifBlank { null },
                tagIds = tagIds?.toList(),
                tagMode = mode
            ).collectLatest { list ->
                val sections = SectionBuilder.build(list) { MonthKeys.from(it.entry.updatedAt) }
                adapter.submitList(sections)
                binding.empty.visibility =
                    if (list.isEmpty()) View.VISIBLE else View.GONE
                binding.empty.text = getString(
                    if (query.isBlank() && tagIds.isNullOrEmpty()) R.string.empty_list else R.string.empty_search
                )
            }
        }
    }
}