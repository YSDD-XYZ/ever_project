// state.js —— 全局游戏状态的唯一来源
// 注意：state 是模块作用域内的可变绑定；其他模块修改 state.* 属性即可
//       如需整体重置，调 resetState()
//
// 存储键规则：
//   web 与 mobile 在 HTML 里通过 <script> window.__storagePrefix = '...' 注入
//   本模块用 `${PREFIX}_save_v1` 作为 localStorage key，自动隔离两端存档。

import { toast } from './util.js';
import { audio } from './audio.js';

const STORAGE_PREFIX = (typeof window !== 'undefined' && window.__storagePrefix) || 'fishing';
const SAVE_KEY = `${STORAGE_PREFIX}_save_v1`;

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
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return Object.assign(defaultState(), JSON.parse(raw));
  } catch (e) {}
  return defaultState();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  toast('已保存 💾');
}

function resetState() {
  localStorage.removeItem(SAVE_KEY);
  state = defaultState();
  state._bait = 'bread';
  save();
  toast('世界已重置');
}

// 用导入的存档对象（来自 savecode 解码）替换当前 state
// 内部会发 game:state-changed 与 game:bait-changed 让 UI 同步
function applyImportedState(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('存档数据格式无效');
  }
  // 强制 _bait 重置为 bread（保证 UI 状态一致）
  state = Object.assign(defaultState(), data, { _bait: 'bread' });
  toast('存档已导入 ✅');
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

export { state, defaultState, load, save, resetState, armAudio, SAVE_KEY, applyImportedState };
