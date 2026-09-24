// savecode.js —— 离线存档编码 / 解码
// 用户获得一串字符（"key"），跨设备粘贴即可恢复存档。
// 格式：<magic>.<base64url>.<crc32>
//   magic  : 'LK1' （Lake Fishing v1，未来格式不兼容）
//   base64 : deflate(JSON(state)) 后的 URL-safe base64
//   crc32  : 4 hex chars（完整性校验）
//
// 不接触 localStorage —— 由调用方决定何时存。

// ---------- CRC32 (IEEE 802.3 polynomial 0xEDB88320) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++){
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++){
    c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ---------- Base64URL ----------
function bytesToBase64Url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // 标准 base64 → URL-safe（替换 +/=）
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- DEFLATE / INFLATE ----------
// 用原生 CompressionStream / DecompressionStream（Chrome 80+, Safari 16.4+, FF 113+）
async function deflate(uint8) {
  if (typeof CompressionStream === 'undefined') {
    // 老浏览器降级：返回未压缩版本（fallback 给编码器用 sync 版本）
    return uint8;
  }
  const stream = new Blob([uint8]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}
async function inflate(uint8) {
  if (typeof DecompressionStream === 'undefined') {
    return uint8;
  }
  const stream = new Blob([uint8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

// ---------- 主 API ----------

// 从 state 提取可序列化字段（剔除内部 _bait 等临时量）
function extractState(state) {
  // 浅拷贝 + 移除临时字段
  const out = { ...state };
  delete out._bait;
  return out;
}

// 编码：state -> 'LK1.<base64url>.<crc32>'
export async function encodeSaveCode(state) {
  const clean = extractState(state);
  const json = JSON.stringify(clean);
  const jsonBytes = new TextEncoder().encode(json);
  const compressed = await deflate(jsonBytes);
  const b64 = bytesToBase64Url(compressed);
  const checksum = crc32(compressed).toString(16).padStart(8, '0');
  return `LK1.${b64}.${checksum}`;
}

// 解码：'LK1.<base64url>.<crc32>' -> state
// 失败抛 Error
export async function decodeSaveCode(code) {
  if (typeof code !== 'string') throw new Error('存档码格式错误');
  const trimmed = code.trim().replace(/\s+/g, '');
  const m = trimmed.match(/^LK1\.([A-Za-z0-9_-]+)\.([0-9a-f]{8})$/);
  if (!m) throw new Error('存档码格式错误（应以 LK1. 开头，以 8 位十六进制结尾）');
  const [, b64, crcHex] = m;
  const compressed = base64UrlToBytes(b64);
  const expectedCrc = parseInt(crcHex, 16);
  const actualCrc = crc32(compressed);
  if (expectedCrc !== actualCrc) {
    throw new Error('存档码校验失败（可能被篡改或截断）');
  }
  const jsonBytes = await inflate(compressed);
  const json = new TextDecoder().decode(jsonBytes);
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') throw new Error('存档码内容无效');
  return data;
}

// 检测：字符串看起来像 save code？
export function looksLikeSaveCode(s) {
  return typeof s === 'string' && /^LK1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(s.trim().replace(/\s+/g, ''));
}