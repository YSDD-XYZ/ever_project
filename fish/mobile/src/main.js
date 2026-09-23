// main.js (mobile) —— 移动版入口
// 与 web 版差异：注册 SW 离线、禁用 pinch-zoom 与 overscroll、点按代替 hover、移动端 toast 文案
import { $, toast } from './util.js';
import { state, save, resetState, armAudio } from './state.js';
import { audio } from './audio.js';
import { scene } from './scene.js';
import { cast, reel, pushLog } from './game.js';
import {
  renderHUD, renderPlaces, renderBaits,
  showLogs, showCodex, showShop, showAchv, showHelp,
  togglePlacesDrawer,
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

state._bait = 'bread';
renderAll();
pushLog('欢迎来到湖畔垂钓 🎣', 'tip');
save();

// 绑定
$('cast').addEventListener('click', cast);
$('reel').addEventListener('click', reel);
$('power').addEventListener('input', e => $('power-val').textContent = e.target.value);
$('btn-save').addEventListener('click', save);
$('btn-reset').addEventListener('click', () => {
  if (confirm('确定要重新开始吗？所有进度会丢失。')) {
    resetState();
    renderAll();
  }
});
document.querySelectorAll('.side-btn').forEach(b => b.addEventListener('click', () => {
  const m = b.dataset.modo;
  if (m === 'places') togglePlacesDrawer();
  if (m === 'logs') showLogs();
  if (m === 'codex') showCodex();
  if (m === 'shop') showShop();
  if (m === 'achv') showAchv();
  if (m === 'help') showHelp();
}));
