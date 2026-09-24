// main.js —— 入口：所有 DOM 事件绑定、模块初始化、首次渲染
import { $, el, toast } from './util.js';
import { state, save, resetState, armAudio } from './state.js';
import { audio } from './audio.js';
import { scene } from './scene.js';
import { cast, reel, pushLog } from './game.js';
import {
  renderHUD, renderPlaces, renderBaits,
  showLogs, showCodex, showShop, showAchv, showHelp,
  showSaveCode, importSaveCode,
  openModal, closeModal,
} from './ui.js';

function renderAll() {
  renderHUD();
  renderPlaces();
  renderBaits();
}

// 启动音节注册
armAudio();

// UI 音效：click
document.addEventListener('click', (e) => {
  if (e.target.closest('button, .btn, .side-btn, .big-cast, .bait, .place, .codex-item, .shop-row')) {
    audio.click();
  }
});
let _lastHover = 0;
document.addEventListener('mouseover', (e) => {
  if (Date.now() - _lastHover < 80) return;
  if (e.target.closest('button, .btn, .side-btn, .big-cast, .bait, .place, .codex-item, .shop-row')) {
    _lastHover = Date.now(); audio.hover();
  }
});

state._bait = 'bread';
renderAll();
pushLog('欢迎来到湖畔垂钓 🎣', 'tip');
save();

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
      desc:  '左侧面板列出可用的钓鱼点。每个地点有不同的解锁条件、鱼种偏好和天气时段偏好。',
      highlight: '.left-panel',
    },
    {
      title: '选择鱼饵',
      desc:  '鱼饵栏有 5 种鱼饵，面团、蚯蚓、玉米、河虾、亮片假饵。不同的鱼对鱼饵有偏好。',
      highlight: '#bait-grid',
    },
    {
      title: '调整力度后抛竿',
      desc:  '力度滑块越大，抛得越远，稀有鱼出现概率也会提高。点击大橙色按钮开始抛竿。',
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

  // 渲染进度点
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
    // 高亮元素
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
  // 点击 mask 空白处也可以切下一步（移动端友好）
  mask.addEventListener('click', (e) => {
    if (e.target === mask) next.click();
  });

  render();
  mask.classList.add('show');
}
// 短暂延后启动 onboarding（让 loading 动画先消失）
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
$('btn-reset').addEventListener('click', () => {
  if (confirm('确定要重新开始吗？所有进度会丢失。')) {
    resetState();
    renderAll();
  }
});

// 导入弹窗：复用 openModal
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
  if (m === 'logs') showLogs();
  if (m === 'codex') showCodex();
  if (m === 'shop') showShop();
  if (m === 'achv') showAchv();
  if (m === 'help') showHelp();
}));
