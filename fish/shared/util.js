/* ==========================================================
   工具
   ========================================================== */

const $ = id => document.getElementById(id);
const el = (tag, props={}, ...children) => {
  const n = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if (k==='class') n.className = v;
    else if (k==='html') n.innerHTML = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2).toLowerCase(), v);
    else n.setAttribute(k, v);
  });
  children.flat().forEach(c => n.append(c?.nodeType ? c : document.createTextNode(c ?? '')));
  return n;
};
const rand = (a,b) => a + Math.random()*(b-a);
const randInt = (a,b) => Math.floor(rand(a,b+1));
const choice = arr => arr[randInt(0,arr.length-1)];
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove('show'), 1500);
}

/* ==========================================================
   UI：HUD / 面板
   ========================================================== */

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


export { $, el, rand, randInt, choice, clamp, toast };
