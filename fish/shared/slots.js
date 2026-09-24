// slots.js —— 多存档槽管理
// localStorage 结构：
//   <prefix>_slots_v1   = string  JSON 数组（slot 元数据：[{id, name, createdAt, updatedAt, length}]）
//   <prefix>_slot_<id>  = string  完整存档码（encodeSaveCode 结果）
//
// 与 savecode.js 协作：encodeSaveCode 产出 key，存到 slot；导出时直接显示 key。

const STORAGE_PREFIX = (typeof window !== 'undefined' && window.__storagePrefix) || 'fishing';

function indexKey()  { return `${STORAGE_PREFIX}_slots_v1`; }
function slotKey(id){ return `${STORAGE_PREFIX}_slot_${id}`; }

// 生成 slot id：时间戳 + 4 位随机
function genId() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

// 读 / 写索引
function readIndex() {
  try {
    const raw = localStorage.getItem(indexKey());
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {}
  return [];
}
function writeIndex(list) {
  try {
    localStorage.setItem(indexKey(), JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

// 列出所有 slot（按 updatedAt 倒序）
export function listSlots() {
  // 读索引
  let list = readIndex();
  // 索引损坏或为空时：尝试从所有 slot_<x> key 重建
  if (list.length === 0) {
    list = rebuildIndexFromKeys();
  }
  return list.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

// 扫描 localStorage 找所有以 <prefix>_slot_ 开头的 key，
// 从每个 key 的存档码里解析出元信息（updatedAt / length）
function rebuildIndexFromKeys() {
  const prefix = `${STORAGE_PREFIX}_slot_`;
  const list = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const id = k.slice(prefix.length);
    if (!id || !/^[a-z0-9_]+$/i.test(id)) continue;
    const key = localStorage.getItem(k) || '';
    list.push({
      id,
      name: defaultName(Date.now() - i * 60000),  // 用 key 顺序推时间
      createdAt: Date.now() - i * 60000,
      updatedAt: Date.now() - i * 60000,
      length: key.length,
      _recovered: true,  // 标记这是恢复出来的
    });
  }
  if (list.length) writeIndex(list);
  return list;
}

// 取一个 slot 的 key（完整存档码）
export function getSlotKey(id) {
  return localStorage.getItem(slotKey(id)) || '';
}

// 重命名 slot
export function renameSlot(id, newName) {
  const list = readIndex();
  const i = list.findIndex(s => s.id === id);
  if (i < 0) return false;
  list[i].name = String(newName || '').slice(0, 24) || list[i].name || '未命名';
  return writeIndex(list);
}

// 删除 slot
export function deleteSlot(id) {
  const list = readIndex();
  const next = list.filter(s => s.id !== id);
  localStorage.removeItem(slotKey(id));
  return writeIndex(next);
}

// 通用保存一个 key 到一个新 slot 或更新现有 slot（用 name）
// 返回 {id, name, length, createdAt, updatedAt}
export function saveToNewSlot(key, name) {
  const id = genId();
  const now = Date.now();
  const list = readIndex();
  const slot = {
    id,
    name: String(name || '').slice(0, 24) || defaultName(now),
    createdAt: now,
    updatedAt: now,
    length: key.length,
  };
  list.push(slot);
  writeIndex(list);
  localStorage.setItem(slotKey(id), key);
  return slot;
}

export function defaultName(t = Date.now()) {
  const d = new Date(t);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 把外部导入的 key 保存到新 slot
// name 可选；为空则用 defaultName
export function importToSlot(key, name) {
  return saveToNewSlot(key, name);
}