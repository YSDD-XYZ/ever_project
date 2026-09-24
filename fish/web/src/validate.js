// validate.js —— 统一数据验证 / 修复
// 用途：
//   - state.js load() 后对本地存档纠错
//   - state.js applyImportedState() 后对导入存档纠错
//   - savecode.js decodeSaveCode() 后对反序列化数据纠错
//
// 原则：永远不抛错，只返回修复后的对象。错误信息通过 getLastErrors() 收集。

import { FISH, BAITS, PLACES, WEATHERS, TIMES, ACHIEVEMENTS, SHOP } from './data.js';

let _errors = [];
export function getLastErrors(){ return _errors.slice(); }
function note(msg){ _errors.push(msg); }
export function clearErrors(){ _errors = []; }

// 整数 clamp
function int(value, min, max, fallback) {
  if (typeof value !== 'number' || !Number.isFinite(value)) { note(`${typeof value} → ${fallback}`); return fallback; }
  const i = Math.floor(value);
  if (i < min) { note(`${value} < ${min}`); return min; }
  if (i > max) { note(`${value} > ${max}`); return max; }
  return i;
}

function bool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function string(value, allowed, fallback) {
  if (typeof value !== 'string') return fallback;
  if (allowed && !allowed.includes(value)) return fallback;
  return value;
}

function obj(value, fallback) {
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value : fallback;
}

function array(value, fallback) {
  return Array.isArray(value) ? value : fallback;
}

// 默认 state 形状（白名单来源）
export function defaultStateShape() {
  return {
    money: 80, level: 1, xp: 0,
    totalCatch: 0, totalCast: 0, totalEarn: 0, totalEscape: 0,
    biggestKg: 0, totalRarity: 0, legend: 0, perfectReel: 0,
    baits: { bread: 5, worm: 3, corn: 2, shrimp: 1, lure: 1 },
    owned: ['rod-basic'], equip: 'rod-basic',
    codex: {}, places: {}, log: [], achievements: {},
    placeId: 'pond', weather: '晴', time: '清晨',
    _bait: 'bread',  // 临时 UI 状态：当前选中的鱼饵
  };
}

const FISH_IDS     = new Set(FISH.map(f => f.id));
const BAIT_IDS     = new Set(BAITS.map(b => b.id));
const PLACE_IDS    = new Set(PLACES.map(p => p.id));
const SHOP_IDS     = new Set(SHOP.map(s => s.id));
const ACHV_IDS     = new Set(ACHIEVEMENTS.map(a => a.id));

// 修复 state 对象（in-place）+ 返回
export function validateState(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // —— 第一步：白名单过滤，丢弃未知字段 —— //
  const validKeys = new Set(Object.keys(defaultStateShape()));
  for (const k of Object.keys(data)) {
    if (!validKeys.has(k)) delete data[k];
  }
  data.money       = int(data.money,       0, 99999999, 80);
  data.level       = int(data.level,       1, 99, 1);
  data.xp          = int(data.xp,          0, 999999, 0);
  data.totalCatch  = int(data.totalCatch,  0, 999999, 0);
  data.totalCast   = int(data.totalCast,   0, 999999, 0);
  data.totalEarn   = int(data.totalEarn,   0, 99999999, 0);
  data.totalEscape = int(data.totalEscape, 0, 999999, 0);
  data.biggestKg   = int(data.biggestKg,   0, 99999999, 0);
  data.totalRarity = int(data.totalRarity, 0, 999999, 0);
  data.legend      = int(data.legend,      0, 999999, 0);
  data.perfectReel = int(data.perfectReel, 0, 999999, 0);

  // —— 字符串枚举 —— //
  data.placeId = string(data.placeId, [...PLACE_IDS], 'pond');
  data.equip   = string(data.equip,   [...SHOP_IDS],  'rod-basic');
  data.weather = string(data.weather, WEATHERS, '晴');
  data.time    = string(data.time,    TIMES,    '清晨');
  data._bait   = string(data._bait,   [...BAIT_IDS], 'bread');  // 临时 UI 状态

  // —— 鱼饵：保留已知 key，丢掉未知，数量 clamp —— //
  const baits = obj(data.baits, {});
  const cleanBaits = {};
  for (const k of Object.keys(baits)) {
    if (!BAIT_IDS.has(k)) continue;
    cleanBaits[k] = int(baits[k], 0, 9999, 0);
  }
  data.baits = cleanBaits;

  // —— 鱼竿：数组，仅保留已知 id —— //
  const owned = array(data.owned, []);
  data.owned = owned.filter(x => typeof x === 'string' && SHOP_IDS.has(x));
  if (!data.owned.includes('rod-basic')) data.owned.unshift('rod-basic');  // 默认鱼竿永远拥有

  // —— 字典（id → 整数计数）—— //
  data.codex        = cleanCountMap(obj(data.codex, {}),        FISH_IDS);
  data.places       = cleanCountMap(obj(data.places, {}),       PLACE_IDS);
  data.achievements = cleanCountMap(obj(data.achievements, {}), ACHV_IDS);

  // —— 日志：最多 200 条 —— //
  const log = array(data.log, []);
  data.log = log
    .filter(e => e && typeof e === 'object' && typeof e.msg === 'string')
    .slice(-200);

  return data;
}

function cleanCountMap(map, allowedIds) {
  const out = {};
  for (const k of Object.keys(map)) {
    if (!allowedIds.has(k)) continue;
    out[k] = int(map[k], 0, 999999, 0);
  }
  return out;
}

// 验证 savecode 整体（针对编码后的字符串）
// 1) LK1. 前缀 + 正则
// 2) base64 解码
// 3) CRC32 校验（外部 crc32 函数）
// 4) deflate-raw 解压
// 5) UTF-8 解码
// 6) JSON 解析
// 7) validateState 校验字段
//
// 返回 { ok: true, data } 或 { ok: false, stage: '<出错阶段>', error: msg }
export function validateImportedData(parsed) {
  const errors = [];
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, stage: 'object', error: '存档内容不是合法对象' };
  }
  const v = validateState({ ...parsed });
  if (!v) {
    return { ok: false, stage: 'fields', error: '字段修复后仍无效' };
  }
  return { ok: true, data: v, repaired: errors };
}

// 验证 slot 索引数组：保证行结构合法
export function validateSlotMeta(meta) {
  return (
    meta &&
    typeof meta === 'object' &&
    typeof meta.id === 'string' &&
    typeof meta.name === 'string' &&
    typeof meta.createdAt === 'number' && Number.isFinite(meta.createdAt) &&
    typeof meta.updatedAt === 'number' && Number.isFinite(meta.updatedAt) &&
    typeof meta.length === 'number'
  );
}