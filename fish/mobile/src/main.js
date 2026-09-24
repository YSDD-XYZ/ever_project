// main.js (mobile) —— 移动版入口
// 与 web 版差异：注册 SW 离线、禁用 pinch-zoom 与 overscroll、点按代替 hover、移动端 toast 文案
import { $, el, toast } from './util.js';
import { state, save, resetState, armAudio } from './state.js';
import { audio } from './audio.js';
import { scene } from './scene.js';
import { cast, reel, pushLog } from './game.js';
import {
  renderHUD, renderPlaces, renderBaits,
  showLogs, showCodex, showShop, showAchv, showHelp,
  togglePlacesDrawer,
  showSaveCode, importSaveCode, showSlots,
  openModal, closeModal,
} from './ui.js';

// 注册 Service Worker（离线 / 安装到主屏）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW reg failed:', e));
  });
}

// 阻止移动端双指 zoom / 双击 zoom / overscroll pull-to-refresh
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();  // 双指缩放交由 OrbitControls 自己处理
}, { passive: false });
let _lastTap = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - _lastTap < 300) e.preventDefault();
  _lastTap = now;
}, { passive: false });

// 启动音节注册
armAudio();

// UI 音效：click（移动端用 touchstart 也可以，但 click 在 tap 后触发，最稳）
document.addEventListener('click', (e) => {
  if (e.target.closest('button, .btn, .side-btn, .big-cast, .bait, .place, .codex-item, .shop-row')) {
    audio.click();
  }
});

function renderAll() {
  renderHUD();
  renderPlaces();
  renderBaits();
}

// state._bait 由 validate.js 兜底为 'bread'；用户上次选择会从 localStorage 恢复
renderAll();
pushLog('欢迎来到湖畔垂钓 🎣', 'tip');
save();

// mobile FAB 模式：把抛杆按钮移到 body 直接子，让 CSS 'body > .big-cast'
// 选择器能命中（同时 .controls > .big-cast { display:none } 隐藏原位置）。
const _fab = document.getElementById('cast');
const _isMobile = matchMedia('(max-width: 480px)').matches;
if (_isMobile && _fab && _fab.parentElement !== document.body){
  document.body.appendChild(_fab);
}

// 隐藏 loading 屏（DOM 完全就绪）
const _loadingEl = document.getElementById('loading');
if (_loadingEl){
  _loadingEl.classList.add('hide');
  setTimeout(() => _loadingEl.remove(), 500);
}

// 新手引导：第一次进入游戏时展示
function runOnboarding(){
  const ONB_KEY = 'fishing_onboarded_v1';
  if (localStorage.getItem(ONB_KEY)) return;

  const STEPS = [
    {
      title: '选一个钓鱼地点',
      desc:  '点击右下「📍 地点」按钮展开抽屉，里面列出了可用的钓鱼点。',
      highlight: null,
    },
    {
      title: '选择鱼饵',
      desc:  '鱼饵栏有 5 种鱼饵：面团、蚯蚓、玉米、河虾、亮片假饵。不同的鱼对鱼饵有偏好。',
      highlight: '#bait-grid',
    },
    {
      title: '调整力度后抛竿',
      desc:  '力度滑块越大，抛得越远，稀有鱼出现概率也越高。点击右下的橙色大按钮开始抛竿。',
      highlight: '#cast',
    },
    {
      title: '等待鱼上钩',
      desc:  '鱼会先试探浮漂（轻微跳动），犹豫后猛咬钩（浮漂顿挫下沉）。看到顿挫就快点收线。',
      highlight: '.stage',
    },
    {
      title: '收线小游戏',
      desc:  '点击「↩ 收线」后，指针会左右扫动。按下空格或点击「锁定」停在绿色区间内 = 完美收线。',
      highlight: '#reel',
    },
    {
      title: '开始你的渔夫之旅',
      desc:  '商店可以买鱼竿和鱼饵；图鉴记录捕获；成就奖励金币。祝你丰收！',
      highlight: null,
    },
  ];

  const mask   = document.getElementById('onboard');
  const title  = document.getElementById('onboard-title');
  const desc   = document.getElementById('onboard-desc');
  const step   = document.getElementById('onboard-step');
  const prog   = document.getElementById('onboard-progress');
  const next   = document.getElementById('onboard-next');
  const skip   = document.getElementById('onboard-skip');
  if (!mask) return;

  prog.innerHTML = '';
  STEPS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'onboard-dot' + (i === 0 ? ' active' : '');
    prog.appendChild(d);
  });

  let idx = 0;
  let currentHl = null;

  function render(){
    const s = STEPS[idx];
    step.textContent = `STEP ${idx + 1} / ${STEPS.length}`;
    title.textContent = s.title;
    desc.textContent  = s.desc;
    next.textContent  = idx === STEPS.length - 1 ? '开始游戏' : '下一步 →';
    Array.from(prog.children).forEach((d, i) => {
      d.classList.toggle('active', i <= idx);
    });
    if (currentHl) currentHl.classList.remove('onboard-highlight');
    currentHl = s.highlight ? document.querySelector(s.highlight) : null;
    if (currentHl) currentHl.classList.add('onboard-highlight');
  }

  function end(){
    if (currentHl) currentHl.classList.remove('onboard-highlight');
    mask.classList.remove('show');
    localStorage.setItem(ONB_KEY, '1');
  }

  next.addEventListener('click', () => {
    if (idx < STEPS.length - 1){ idx++; render(); }
    else { end(); }
  });
  skip.addEventListener('click', end);
  mask.addEventListener('click', (e) => {
    if (e.target === mask) next.click();
  });

  render();
  mask.classList.add('show');
}
setTimeout(runOnboarding, 600);

// 监听 game.js 发出的状态变化事件，统一刷新 HUD
window.addEventListener('game:state-changed', () => {
  renderHUD();
  renderPlaces();
});
window.addEventListener('game:bait-changed', () => {
  renderBaits();
});

// 绑定
$('cast').addEventListener('click', cast);
$('reel').addEventListener('click', reel);
$('power').addEventListener('input', e => $('power-val').textContent = e.target.value);
$('btn-save').addEventListener('click', () => showSaveCode());
$('btn-load').addEventListener('click', () => showImportDialog());
$('btn-slots')?.addEventListener('click', () => showSlots());
$('btn-reset').addEventListener('click', () => {
  if (confirm('确定要重新开始吗？所有进度会丢失。')) {
    resetState();
    renderAll();
  }
});

// 导入弹窗
function showImportDialog(){
  openModal('导入存档码 📥', body => {
    const intro = el('p', { style:'color:var(--text-2);font-size:13px;margin-bottom:12px;line-height:1.6;' },
      '粘贴之前导出的存档码（以 LK1. 开头）。确认后会覆盖当前进度。');
    const ta = el('textarea', { id:'import-code-text', placeholder:'LK1.<base64>.<crc32>', style:'width:100%;min-height:96px;background:rgba(0,0,0,.3);color:var(--primary);font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.5;letter-spacing:.5px;word-break:break-all;border:1px solid var(--border);border-radius:var(--r-md);padding:12px;resize:vertical;outline:0;' });
    const errBox = el('div', { style:'color:var(--danger);font-size:12px;margin-top:8px;display:none;' });
    const importBtn = el('button', { class:'btn primary', style:'width:100%;margin-top:12px;' }, '✅ 确认导入');
    const cancelBtn = el('button', { class:'btn', style:'width:100%;margin-top:8px;' }, '取消');
    importBtn.addEventListener('click', async () => {
      errBox.style.display = 'none';
      const code = ta.value.trim();
      if (!code) { errBox.textContent = '请粘贴存档码'; errBox.style.display='block'; return; }
      if (!confirm('导入会覆盖当前所有进度，确定继续？')) return;
      const r = await importSaveCode(code);
      if (!r.ok) { errBox.textContent = '❌ ' + r.error; errBox.style.display='block'; return; }
      closeModal();
    });
    cancelBtn.addEventListener('click', closeModal);
    body.append(intro, ta, errBox, importBtn, cancelBtn);
  });
}
document.querySelectorAll('.side-btn').forEach(b => b.addEventListener('click', () => {
  const m = b.dataset.modo;
  if (m === 'places') togglePlacesDrawer();
  if (m === 'logs') showLogs();
  if (m === 'codex') showCodex();
  if (m === 'shop') showShop();
  if (m === 'achv') showAchv();
  if (m === 'help') showHelp();
}));
