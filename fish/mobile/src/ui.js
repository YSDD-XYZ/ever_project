// ui.js —— DOM 渲染：HUD / 地点 / 鱼饵 / 模态框（图鉴/商店/成就/日志/帮助/捕获/存档码）
import { state, applyImportedState, save } from './state.js';
import { $, el, clamp, toast } from './util.js';
import { FISH, BAITS, PLACES, SHOP, ACHIEVEMENTS } from './data.js';
import { encodeSaveCode, decodeSaveCode, looksLikeSaveCode } from './savecode.js';
import { listSlots, getSlotKey, renameSlot, deleteSlot, saveToNewSlot, importToSlot, defaultName } from './slots.js';

function renderHUD(){
  $('hud-money').textContent = state.money;
  $('hud-level').textContent = state.level;
  const need = state.level * 50;
  $('hud-xp').style.width = clamp(state.xp / need * 100, 0, 100) + '%';
  $('hud-weather').textContent = (state.weather==='晴'?'☀':state.weather==='雨'?'🌧':state.weather==='雾'?'🌫':'❄')+' '+state.weather;
  $('hud-place').textContent = PLACES.find(p=>p.id===state.placeId).name;
  $('hud-time').textContent = state.time;
  $('stat-catch').textContent = state.totalCatch;
  $('stat-heaviest').textContent = state.biggestKg ? state.biggestKg.toFixed(1)+'kg' : '—';
  $('stat-earn').textContent = state.totalEarn;
  $('stat-cast').textContent = state.totalCast;
  $('stat-escape').textContent = state.totalEscape;
  const hits = state.totalCatch + state.totalEscape;
  $('stat-hit').textContent = hits ? Math.round(state.totalCatch/hits*100)+'%' : '—';
}

function renderPlaces(){
  const list = $('place-list'); list.innerHTML='';
  PLACES.forEach(p => {
    const unlock = (state.level >= (p.req.lv||0)) && (state.money >= (p.req.money||0));
    const cls = 'place' + (state.placeId===p.id?' active':'') + (unlock?'':' locked');
    const node = el('div', { class: cls, onclick: ()=>{
      if (!unlock) { toast('需要等级 '+(p.req.lv||0)+(p.req.money?' 且 '+p.req.money+' 金币':'')); return; }
      state.placeId = p.id; state.places[p.id] = (state.places[p.id]||0);
      renderHUD(); renderPlaces();
    }},
      el('h4', {}, p.name + (unlock?'':' 🔒')),
      el('p',  {}, p.desc),
      el('div', { class:'meta' },
        el('span',{class:'tag'},'Lv.'+(p.req.lv||1)),
        p.req.money ? el('span',{class:'tag'},'💰 '+p.req.money) : null,
        ...p.weather.map(w => el('span',{class:'tag weather-'+w}, w)),
        ...p.time.map(t => el('span',{class:'tag'}, t)),
      )
    );
    list.append(node);
  });
}

function renderBaits(){
  const grid = $('bait-grid'); grid.innerHTML='';
  BAITS.forEach(b => {
    const cnt = state.baits[b.id]||0;
    const cls = 'bait' + (state._bait===b.id?' active':'') + (cnt<=0?' disabled':'');
    const node = el('div', { class:cls, onclick: ()=>{
      if (cnt<=0) { toast('这种鱼饵用完了，去商店买一些吧'); return; }
      state._bait = b.id;
      save();
      renderBaits();
      window.dispatchEvent(new CustomEvent('game:bait-changed'));
    }},
      el('div',{class:'emoji'},b.emj),
      el('div',{class:'nm'}, b.name),
      el('div',{class:'cnt'}, '×'+cnt),
    );
    grid.append(node);
  });
}

/* ==========================================================
   模态：图鉴 / 商店 / 成就 / 日志 / 捕获
   ========================================================== */

function openModal(title, builder){
  $('modal-title').textContent = title;
  const body = $('modal-body'); body.innerHTML='';
  builder(body);
  $('modal-mask').classList.add('show');
}
function closeModal(){ $('modal-mask').classList.remove('show'); }
$('modal-close').addEventListener('click', closeModal);
$('modal-mask').addEventListener('click', e => { if (e.target.id==='modal-mask') closeModal(); });
// ESC 关模态
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && $('modal-mask').classList.contains('show')) closeModal();
});

function showCodex(){
  openModal('鱼图鉴 📖', body => {
    const counter = el('div', { style:'opacity:.8;font-size:13px;margin-bottom:10px;' }, `已发现 ${Object.keys(state.codex).length} / ${FISH.length}`);
    body.append(counter);
    const grid = el('div', { class:'codex' });
    FISH.forEach(f => {
      const has = !!state.codex[f.id];
      const it = el('div', { class:'codex-item' + (has?'':' unknown') },
        el('div', { class:'emoji' }, has ? f.emj : '❔'),
        el('div', {},
          el('div', { class:'nm' }, has ? f.name : '???'),
          el('div', { class:'rarity' }, has ? f.rarity : '未发现'),
          has ? el('div', { class:'stat' }, `已捕获 ×${state.codex[f.id]} · ${f.minKg}-${f.maxKg}kg`) : null,
        )
      );
      grid.append(it);
    });
    body.append(grid);
  });
}

function showShop(){
  openModal('商店 🛒', body => {
    body.append(el('div', { style:'opacity:.85;margin-bottom:10px;font-size:13px;' }, '当前金币：💰 '+state.money));
    const list = el('div', { class:'shop-list' });
    SHOP.forEach(s => {
      const owned = state.owned.includes(s.id);
      const equipped = state.equip===s.id;
      const row = el('div', { class:'shop-row'+(owned?' owned':'') },
        el('div', { class:'emoji' }, s.emj),
        el('div', {},
          el('div', { style:'font-weight:700;' }, s.name + (equipped?' · 已装备':'')),
          el('div', { class:'desc' }, s.desc + (s.passive?' · '+s.passive:'')),
        ),
        el('div', { class:'price' }, owned ? (equipped?'✨ 装备中':'✓ 已拥有') : ('💰 '+s.price)),
        owned
          ? (s.type==='rod' && !equipped
              ? el('button',{class:'btn primary', onclick:()=>{state.equip=s.id; toast('装备 '+s.name); showShop(); save();}}, '装备')
              : el('span',{style:'opacity:.5;'}, '✓'))
          : el('button', { class:'btn primary', onclick:()=>buyItem(s) }, '购买')
      );
      list.append(row);
    });
    body.append(list);
  });
}

function buyItem(s){
  if (state.money < s.price) { toast('金币不足'); return; }
  state.money -= s.price;
  state.owned.push(s.id);
  if (s.type==='bait') state.baits[s.item] = (state.baits[s.item]||0) + s.amount;
  if (s.type==='rod') state.equip = s.id;
  toast('购入 '+s.name);
  save();
  renderHUD(); renderBaits();
  window.dispatchEvent(new CustomEvent('game:state-changed'));
  window.dispatchEvent(new CustomEvent('game:bait-changed'));
  showShop();
}

function showAchv(){
  openModal('成就 🏅', body => {
    const list = el('div', { class:'achv-list' });
    ACHIEVEMENTS.forEach(a => {
      const done = !!state.achievements[a.id];
      const it = el('div', { class:'achv'+(done?' done':'') },
        el('div', { class:'ico' }, done ? a.ico : '🔒'),
        el('div', { style:'flex:1;' },
          el('div', { class:'nm' }, a.name + (done?' ✓':'')),
          el('div', { class:'ds' }, a.desc),
        ),
        el('div', { class:'reward' }, a.reward ? '+'+a.reward+'💰' : '纪念'),
      );
      list.append(it);
    });
    body.append(list);
  });
}

function showLogs(){
  openModal('日志 📜', body => {
    const list = el('div', { class:'log-list' });
    if (!state.log.length) list.append(el('div', {}, '暂无记录'));
    state.log.slice().reverse().forEach(l => {
      const row = el('div', {},
        el('span', { class:'ts' }, '['+l.t+']'),
        el('span', { class: l.ok?'ok':(l.tip?'tip':'') }, l.msg),
      );
      list.append(row);
    });
    body.append(list);
  });
}

function showHelp(){
  openModal('玩法 ❓', body => {
    const txt = [
      ['基本循环','选择地点 → 选鱼饵 → 调力度 → 抛竿 → 等待浮漂沉动 → 收线小游戏'],
      ['收线玩法','指针来回扫动，按【空格】或点击「锁定」停在绿色区间 → 完美收线；偏离越大，鱼越可能逃跑。'],
      ['稀有度','常见 / 少见 / 稀有 / 史诗 / 神秘 / 传说。地点越远，稀有率越高。'],
      ['鱼饵偏好','每种鱼有不同的鱼饵/天气/时段偏好，对口会显著提高上钩与价值。'],
      ['鱼竿','更强的鱼竿能提升咬钩判定、抛投距离、传说鱼出现几率。'],
      ['存档','点击右上「💾存档」随时保存。游戏进度自动写入浏览器。'],
      ['天气/时段','每局自动滚动变化，特定鱼只在雾夜/雨晨出现。'],
      ['重开','点「♻重开」会丢失当前进度。新手可尽情挥霍。'],
    ];
    txt.forEach(([k,v])=>{
      const blk = el('div', { style:'margin-bottom:10px;' },
        el('div', { style:'font-weight:700;color:#a3ffd6;' }, k),
        el('div', { style:'opacity:.85;line-height:1.7;' }, v),
      );
      body.append(blk);
    });
  });
}

function showCatchModal(f, weight, gain){
  openModal('捕获成功 🎉', body => {
    const card = el('div', { class:'catch-card' },
      el('div', { class:'big-fish' }, f.emj),
      el('div', {},
        el('h3', {}, `${f.name} · ${weight.toFixed(2)}kg`),
        el('div', { class:'rarity' }, f.rarity),
        el('div', { class:'flavor' }, f.flavor),
        el('div', { class:'stats' },
          el('div',{}, el('span',{},'体型区间'), el('b',{}, `${f.minKg}-${f.maxKg}kg`)),
          el('div',{}, el('span',{},'鱼饵偏好'), el('b',{}, f.baits.map(b=>BAITS.find(x=>x.id===b).emj).join(' '))),
          el('div',{}, el('span',{},'天气/时段'), el('b',{}, f.weathers.join('/')+' · '+f.times.join('/'))),
        ),
        el('div', { class:'reward' }, `+ ${gain} 💰`)
      )
    );
    body.append(card);
    setTimeout(closeModal, 3200);
  });
}

/* ==========================================================
   成就检测
   ========================================================== */

// ---- 存档码模态 ----
let _saveCodeCache = null;
async function showSaveCode() {
  let code;
  try {
    code = await encodeSaveCode(state);
  } catch (e) {
    code = '⚠️ 生成失败：' + (e.message || e);
  }
  _saveCodeCache = code;
  openModal('导出存档码 🔑', body => {
    const intro = el('p', { style:'color:var(--text-2);font-size:13px;margin-bottom:14px;line-height:1.6;' },
      '复制下面这串字符，妥善保存。下次想恢复存档时，打开此页面，输入或粘贴这段字符串即可。');
    const wrap = el('div', { style:'position:relative;background:rgba(0,0,0,.3);padding:14px;border-radius:var(--r-md);border:1px solid var(--border);' });
    const ta = el('textarea', { readonly: 'readonly', style:'width:100%;min-height:84px;background:transparent;color:var(--primary);font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.5;letter-spacing:.5px;word-break:break-all;resize:vertical;border:0;outline:0;color:var(--primary);' }, code);
    ta.id = 'save-code-text';
    const copyBtn = el('button', { class:'btn primary', style:'position:absolute;top:10px;right:10px;padding:6px 12px;font-size:12px;' }, '📋 复制');
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 1500);
      } catch (e) {
        ta.select();
        document.execCommand('copy');
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => { copyBtn.textContent = '📋 复制'; }, 1500);
      }
    });
    wrap.append(ta, copyBtn);
    const stats = el('div', { style:'margin-top:10px;font-size:11px;color:var(--text-3);' },
      `长度 ${code.length} 字符 · 已压缩 · 自带 CRC32 校验`);
    body.append(intro, wrap, stats);
  });
}
async function importSaveCode(code) {
  try {
    const data = await decodeSaveCode(code);
    applyImportedState(data);
    renderHUD(); renderPlaces(); renderBaits();
    window.dispatchEvent(new CustomEvent('game:state-changed'));
    window.dispatchEvent(new CustomEvent('game:bait-changed'));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}


/* ==========================================================
   移动版：地点抽屉
   ========================================================== */
function togglePlacesDrawer(){
  const el = document.querySelector('.left-panel');
  if (!el) return;
  el.classList.toggle('open');
  if (el.classList.contains('open')){
    el.style.display = 'block';
    requestAnimationFrame(()=> el.style.transform = 'translateX(0)');
  } else {
    el.style.transform = 'translateX(-100%)';
    setTimeout(()=> { if (!el.classList.contains('open')) el.style.display='none'; }, 220);
  }
}

// ---- 多存档槽模态 ----
function fmtTime(t) {
  const d = new Date(t);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function showSlots() {
  // 渲染模态
  openModal('存档槽 📚', body => {
    const wrap = el('div', { id:'slots-list', style:'display:flex;flex-direction:column;gap:10px;' });

    const slots = listSlots();
    if (slots.length === 0) {
      wrap.append(el('div', { style:'text-align:center;color:var(--text-3);font-size:13px;padding:32px 0;' },
        '还没有存档。点击「➕ 新建当前存档」或「📥 导入外部 key」来添加。'));
    } else {
      slots.forEach(s => wrap.append(renderSlotRow(s)));
    }

    const actions = el('div', { style:'display:flex;gap:8px;margin-top:14px;' },
      el('button', { class:'btn primary', id:'slot-new', style:'flex:1;' }, '➕ 新建当前存档'),
      el('button', { class:'btn', id:'slot-import', style:'flex:1;' }, '📥 导入 key'),
    );

    body.append(wrap, actions);
  });

  // 重新绑定（因为 openModal 替换了 body 内容，但 modal-mask 没换）
  setTimeout(() => {
    $('slot-new')?.addEventListener('click', onSlotNew);
    $('slot-import')?.addEventListener('click', onSlotImport);
    document.querySelectorAll('[data-slot-action]').forEach(btn => {
      btn.addEventListener('click', () => handleSlotAction(btn.dataset.slotAction, btn.dataset.slotId));
    });
  }, 0);
}

function renderSlotRow(slot) {
  const row = el('div', { class:'slot-row', style:'background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:var(--r-md);padding:12px 14px;' });
  // 标题行
  const head = el('div', { style:'display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;' });
  const left = el('div', { style:'display:flex;align-items:center;gap:8px;flex:1;min-width:0;' });
  const nameIpt = el('input', { type:'text', value: slot.name, maxlength:'24', style:'background:transparent;border:1px solid transparent;border-radius:6px;padding:4px 6px;color:var(--text);font-weight:600;font-size:14px;width:100%;' });
  nameIpt.addEventListener('change', () => {
    if (renameSlot(slot.id, nameIpt.value.trim())) toast('已重命名');
  });
  nameIpt.addEventListener('keydown', e => { if (e.key === 'Enter') nameIpt.blur(); });
  left.append(nameIpt);
  const updated = el('div', { style:'font-size:11px;color:var(--text-3);white-space:nowrap;' }, '更新于 ' + fmtTime(slot.updatedAt));
  head.append(left, updated);
  row.append(head);

  // meta
  const meta = el('div', { style:'font-size:11px;color:var(--text-3);margin-bottom:10px;font-variant-numeric:tabular-nums;' },
    `key 长度 ${slot.length} 字符 · 创建 ${fmtTime(slot.createdAt)}`);
  row.append(meta);

  // 按钮行
  const btns = el('div', { style:'display:flex;gap:6px;flex-wrap:wrap;' });
  btns.append(
    el('button', { class:'btn primary', 'data-slot-action':'load', 'data-slot-id': slot.id, style:'flex:1;padding:6px 10px;font-size:12px;' }, '⬇️ 加载'),
    el('button', { class:'btn', 'data-slot-action':'copy', 'data-slot-id': slot.id, style:'flex:1;padding:6px 10px;font-size:12px;' }, '📋 复制 key'),
    el('button', { class:'btn', 'data-slot-action':'view', 'data-slot-id': slot.id, style:'flex:1;padding:6px 10px;font-size:12px;' }, '👁 查看'),
    el('button', { class:'btn', 'data-slot-action':'delete', 'data-slot-id': slot.id, style:'padding:6px 10px;font-size:12px;color:var(--danger);border-color:rgba(255,118,118,.3);' }, '🗑'),
  );
  row.append(btns);
  return row;
}

async function onSlotNew() {
  // 弹命名提示
  const name = prompt('为这个存档命名：', defaultName());
  if (name === null) return;
  try {
    const code = await encodeSaveCode(state);
    const slot = saveToNewSlot(code, name);
    toast(`已新建存档「${slot.name}」`);
    refreshSlotsList();
  } catch (e) {
    toast('❌ 生成失败：' + (e.message || e));
  }
}

function onSlotImport() {
  const code = prompt('粘贴存档码（以 LK1. 开头）：');
  if (!code) return;
  if (!looksLikeSaveCode(code)) {
    toast('❌ 存档码格式无效');
    return;
  }
  const name = prompt('为这个导入存档命名：', defaultName());
  if (name === null) return;
  try {
    importToSlot(code, name);
    toast('已导入到存档槽');
    refreshSlotsList();
  } catch (e) {
    toast('❌ ' + (e.message || e));
  }
}

async function handleSlotAction(action, id) {
  const slot = listSlots().find(s => s.id === id);
  if (!slot) return;
  const key = getSlotKey(id);
  switch (action) {
    case 'load': {
      if (!key) { toast('该存档数据丢失'); return; }
      if (!confirm(`加载「${slot.name}」会覆盖当前进度，确定？`)) return;
      const r = await importSaveCode(key);
      if (!r.ok) { toast('❌ ' + r.error); return; }
      closeModal();
      break;
    }
    case 'copy': {
      if (!key) { toast('该存档数据丢失'); return; }
      try {
        await navigator.clipboard.writeText(key);
        toast('✓ key 已复制');
      } catch (e) {
        toast('复制失败，请手动复制');
      }
      break;
    }
    case 'view': {
      // 在导出模态里显示完整 key
      _saveCodeCache = key;
      closeModal();
      setTimeout(() => {
        openModal(`查看 key：${slot.name} 🔑`, body => {
          const intro = el('p', { style:'color:var(--text-2);font-size:12px;margin-bottom:10px;' },
            '这是存档「' + slot.name + '」的完整 key。可复制后保存到任何地方。');
          const wrap = el('div', { style:'position:relative;background:rgba(0,0,0,.3);padding:14px;border-radius:var(--r-md);border:1px solid var(--border);' });
          const ta = el('textarea', { readonly: 'readonly', style:'width:100%;min-height:120px;background:transparent;color:var(--primary);font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.5;word-break:break-all;border:0;outline:0;' }, key);
          const copyBtn = el('button', { class:'btn primary', style:'position:absolute;top:10px;right:10px;padding:6px 12px;font-size:12px;' }, '📋 复制');
          copyBtn.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(key); copyBtn.textContent = '✓'; setTimeout(() => copyBtn.textContent = '📋 复制', 1200); } catch (e) {}
          });
          wrap.append(ta, copyBtn);
          const back = el('button', { class:'btn', style:'width:100%;margin-top:10px;' }, '← 返回存档槽');
          back.addEventListener('click', showSlots);
          body.append(intro, wrap, back);
        });
      }, 50);
      break;
    }
    case 'delete': {
      if (!confirm(`删除「${slot.name}」？此操作不可撤销。`)) return;
      deleteSlot(id);
      toast('已删除');
      refreshSlotsList();
      break;
    }
  }
}

function refreshSlotsList() {
  // 重新打开存档槽模态（包含最新数据）
  closeModal();
  setTimeout(showSlots, 50);
}


export { renderHUD, renderPlaces, renderBaits, openModal, closeModal, showCodex, showShop, showAchv, showLogs, showHelp, showCatchModal, showSaveCode, importSaveCode, showSlots, togglePlacesDrawer, buyItem };
