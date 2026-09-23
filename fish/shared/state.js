// state.js —— 全局游戏状态的唯一来源
// 注意：state 是模块作用域内的可变绑定；其他模块修改 state.* 属性即可
//       如需整体重置，调 resetState()

import { toast } from './util.js';
import { audio } from './audio.js';

function defaultState() {
  return {
    money: 80,
    level: 1,
    xp: 0,
    totalCatch: 0,
    totalCast: 0,
    totalEarn: 0,
    totalEscape: 0,
    biggestKg: 0,
    totalRarity: 0,
    legend: 0,
    perfectReel: 0,
    baits: { bread: 5, worm: 3, corn: 2, shrimp: 1, lure: 1 },
    owned: ['rod-basic'],
    equip: 'rod-basic',
    codex: {},        // id -> count
    places: {},       // id -> count
    log: [],
    achievements: {},
    placeId: 'pond',
    weather: '晴',
    time: '清晨',
  };
}

function load() {
  try {
    const raw = localStorage.getItem('fishing_save_v1');
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {}
  return defaultState();
}

function save() {
  try { localStorage.setItem('fishing_save_v1', JSON.stringify(state)); } catch (e) {}
  toast('已保存 💾');
}

function resetState() {
  localStorage.removeItem('fishing_save_v1');
  state = defaultState();
  state._bait = 'bread';
  save();
  toast('世界已重置');
}

let state = load();

// 浏览器策略：首次任意交互后再启动 AudioContext
let _audioArmed = false;
function armAudio() {
  if (_audioArmed) return;
  _audioArmed = true;
  try { audio.start(); } catch (e) {}
}
['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, armAudio, { once: true, capture: true })
);

export { state, defaultState, load, save, resetState, armAudio };
