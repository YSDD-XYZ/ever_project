// main.js —— 入口：所有 DOM 事件绑定、模块初始化、首次渲染
import { $, toast } from './util.js';
import { state, save, resetState, armAudio } from './state.js';
import { audio } from './audio.js';
import { scene } from './scene.js';
import { cast, reel, pushLog } from './game.js';
import {
  renderHUD, renderPlaces, renderBaits,
  showLogs, showCodex, showShop, showAchv, showHelp,
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
  if (m === 'logs') showLogs();
  if (m === 'codex') showCodex();
  if (m === 'shop') showShop();
  if (m === 'achv') showAchv();
  if (m === 'help') showHelp();
}));
