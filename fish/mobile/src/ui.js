// ui.js —— DOM 渲染：HUD / 地点 / 鱼饵 / 模态框（图鉴/商店/成就/日志/帮助/捕获）
import { state } from './state.js';
import { $ } from './util.js';
import { FISH, BAITS, SHOP } from './data.js';

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
      renderBaits();
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

export { renderHUD, renderPlaces, renderBaits, openModal, closeModal, showCodex, showShop, showAchv, showLogs, showHelp, showCatchModal, togglePlacesDrawer, buyItem };
