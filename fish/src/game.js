// game.js —— 玩法核心（cast / reel / capture / tickFish / 杂项 / 天气）
import { state } from './state.js';
import { $, rand, randInt, choice, clamp, toast } from './util.js';
import { FISH, BAITS, PLACES, WEATHERS, ACHIEVEMENTS } from './data.js';
import { audio } from './audio.js';
import { scene } from './scene.js';

let casting = false;
let hooked = null;     // 当前咬钩的鱼
let hookAt = 0;        // 鱼出现到现在的时间
let castDist = 0;      // 抛投距离 (0~1)

function cast(){
  if (casting) return;
  if (!state._bait) { toast('先选一种鱼饵'); return; }
  if ((state.baits[state._bait]||0) <= 0) { toast('鱼饵不足'); return; }

  casting = true;
  hooked = null;
  audio.cast();
  state.totalCast++;
  state.baits[state._bait]--;
  save();

  const power = +$('power').value;
  castDist = clamp(0.3 + power/100 * (1 + getRodEffect('rangeBonus')/100), 0.3, 1.4);

  // 通知 3D 场景：抛竿
  scene.cast(castDist);

  // 鱼饵消费 + UI
  renderBaits();

  $('cast').disabled = true;
  $('reel').disabled = false;
  toast('抛竿，等待鱼儿上钩…');

  // 等 2.5~6 秒
  const wait = rand(2500, 6000);
  setTimeout(()=> tryBite(power), wait);
}

function tryBite(power){
  // 决定是否上钩
  const place = PLACES.find(p=>p.id===state.placeId);
  const bait = state._bait;
  const candidates = FISH.filter(f =>
    f.waters.includes(place.id) &&
    f.baits.includes(bait) &&
    f.weathers.includes(state.weather) &&
    f.times.includes(state.time)
  );
  const pool = candidates.length ? candidates : FISH.filter(f=>f.waters.includes(place.id));
  if (!pool.length) { toast('此地暂无鱼，换个地点吧'); resetAfterAction(); return; }

  // 稀有度分布（来自地点）
  const dist = place.fishChance;
  const r = Math.random()*100;
  let cum = 0, idx = 4;
  for (let i=0;i<dist.length;i++){ cum += dist[i]; if (r < cum) { idx = i; break; } }
  const rarityTier = idx; // 0~4

  // 池子过滤
  const rarityOrder = ['常见','少见','稀有','史诗','神秘','传说'];
  let pick = pool.filter(f=> f.rarity===rarityOrder[rarityTier]);
  if (!pick.length) pick = pool;
  let fish = choice(pick);

  // 传说几率强化
  if (Math.random()*100 < getRodEffect('legBonus')) {
    const leg = FISH.filter(f=> ['传说','神秘'].includes(f.rarity) && f.waters.includes(place.id));
    if (leg.length) fish = choice(leg);
  }

  hooked = fish;
  hookAt = 0;

  // 通知 3D：浮漂开始颤动（试探）
  scene.bobberNibble();

  // 出现提示
  hintAt(`鱼在试探浮漂… 等它沉住气！`, 1100);
}

let fishEl = null; // 当前浮漂下的鱼影

function tickFish(){
  if (!hooked) return;
  hookAt += 16;
  // 出鱼影（3D）
  if (!fishEl && hookAt > 800) {
    fishEl = scene.showFish(hooked);
  }
  // 三段动作：试探 1.5s → 沉住气 2~4s → 咬钩
  if (hookAt > 4000 && !hooked._bit){
    hooked._bit = true;
    scene.bobberBite();
    hintAt('咬钩了！快收线！', 800);
  }
}

setInterval(tickFish, 16);

/* ---------- 收线 ---------- */
let reeling = false;
function reel(){
  if (reeling) return;
  if (!hooked){ toast('还没上鱼'); return; }
  reeling = true;
  const power = +$('power').value;
  const hookBonus = getRodEffect('hookBonus');
  // 拉断概率基于重量与力度
  const w = rand(hooked.minKg, hooked.maxKg);
  const breakChance = clamp((w/20) * (1 - power/100) - hookBonus/100, 0.05, 0.7);

  // 收线小游戏：拖动滑块到"绿色区"
  miniReelGame(power, w, breakChance);
}

function miniReelGame(power, weight, breakChance){
  // 全屏小的圆环游戏
  const mask = el('div', { class:'modal-mask show', style:'background:rgba(0,0,0,.6)' });
  const box = el('div', { class:'panel', style:'position:relative;width:340px;padding:18px;background:#0e2341;' });
  mask.append(box);

  const title = el('h3', { style:'margin-bottom:8px;' }, '↩ 收线！跟紧指针');
  const target = randInt(35, 75); // 目标区间中点
  const tol = 6; // 容差
  const bar = el('div', { style:'position:relative;height:24px;background:#13355c;border-radius:8px;overflow:hidden;margin:10px 0;border:1px solid #244c7a;' });
  const zone = el('div', { style:`position:absolute;top:0;bottom:0;left:${target-tol}%;width:${tol*2}%;background:linear-gradient(90deg,#5be3c2,#7ad7ff);opacity:.85;` });
  const cursor = el('div', { style:'position:absolute;top:-2px;bottom:-2px;width:3px;background:#ffeb88;box-shadow:0 0 6px #ffe28a;left:0%;' });
  bar.append(zone, cursor);

  const tip = el('div', { style:'font-size:13px;opacity:.8;margin-top:6px;' }, '按住 <b>空格</b> 或点击「锁定」冻结指针');
  const stopBtn = el('button', { class:'btn primary', style:'margin-top:12px;width:100%;' }, '🎯 锁定！');

  box.append(title, bar, tip, stopBtn);
  document.body.append(mask);

  let v = 1 + Math.random()*2;
  let pos = 0; let dir = 1; let stopped = false; let won = false;
  function loop(){
    if (stopped) return;
    pos += dir * v;
    if (pos < 0) { pos = 0; dir = 1; }
    if (pos > 100) { pos = 100; dir = -1; }
    cursor.style.left = pos+'%';
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function stop(){
    if (stopped) return;
    stopped = true;
    // 判定
    const diff = Math.abs(pos - target);
    won = diff <= tol;
    finalize(won);
  }
  function finalize(ok){
    mask.remove();
    reeling = false;
    if (ok){
      audio.reelOk();
      captureFish(weight);
    } else {
      audio.reelBad();
      if (Math.random() < breakChance) {
        toast('线断了！'+hooked.name+' 跑了 🐟💨');
        state.totalEscape++;
        spawnFloatText('逃！', '#ff9a9a');
      } else {
        // 勉强捕获，价值打折
        captureFish(weight, 0.6);
      }
    }
    hooked = null; if (fishEl) { fishEl.remove(); fishEl=null; }
    resetAfterAction();
    renderHUD();
  }
  stopBtn.addEventListener('click', stop);
  function keyHandler(e){
    if (e.code === 'Space') { e.preventDefault(); stop(); }
    if (e.key === 'Escape') { stopBtn.removeEventListener; mask.remove(); resetAfterAction(); }
  }
  document.addEventListener('keydown', keyHandler, { once:true });
}

function captureFish(weight, factor=1){
  const f = hooked;
  const gain = Math.round(f.base * (0.7 + (weight - f.minKg)/(f.maxKg - f.minKg + 0.001)*1.2) * factor);
  state.money += gain;
  state.totalEarn += gain;
  state.totalCatch++;
  if (weight > state.biggestKg) state.biggestKg = weight;
  state.xp += Math.round(8 + weight*2);
  while (state.xp >= state.level*50) {
    state.xp -= state.level*50;
    state.level++;
    toast(`升级！Lv.${state.level} 🎉`);
  }
  state.codex[f.id] = (state.codex[f.id]||0)+1;
  state.places[state.placeId] = (state.places[state.placeId]||0);
  if (['稀有','史诗','神秘'].includes(f.rarity)) state.totalRarity++;
  if (['传说','神秘'].includes(f.rarity)) state.legend++;
  if (factor >= 1) state.perfectReel++;
  pushLog(`捕获 ${f.emj} ${f.name}（${weight.toFixed(2)}kg），获得 ${gain} 金币`);
  spawnFloatText('+'+gain+'💰','#ffe28a');
  checkAchievements();
  save();
  renderHUD();
  // 启动 3D 捕获序列；动画结束后再弹模态框、解除按钮锁定
  audio.caught();
  casting = true;
  $('cast').disabled = true;
  $('reel').disabled = true;
  scene.catchSequence(f, () => {
    showCatchModal(f, weight, gain);
    casting = false;
    $('cast').disabled = false;
    $('reel').disabled = true;
    scene.bobberReset();
  });
}

function getRodEffect(key){
  const id = state.equip;
  const it = SHOP.find(s=>s.id===id);
  return (it && it.effect && it.effect[key]) || 0;
}

function checkAchievements(){
  const s = {
    totalCatch: state.totalCatch,
    totalRarity: state.totalRarity,
    biggestKg: state.biggestKg,
    legend: state.legend,
    places: state.places,
    money: state.money,
    codexCount: Object.keys(state.codex).length,
    perfectReel: state.perfectReel,
  };
  ACHIEVEMENTS.forEach(a => {
    if (state.achievements[a.id]) return;
    if (a.check(s)) {
      state.achievements[a.id] = true;
      if (a.reward) { state.money += a.reward; pushLog(`🏅 解锁成就：${a.name} (+${a.reward}💰)`, 'tip'); }
      else pushLog(`🏅 解锁成就：${a.name}`, 'tip');
      toast('成就达成：'+a.name);
    }
  });
}
function pushLog(msg, type='ok'){
  const t = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  state.log.push({ t, msg, type });
  if (state.log.length > 200) state.log.shift();
}
function spawnRipple(){
  // 兼容空参数：3D 涟漪由 scene.spawnRipple 接管
  scene.spawnRipple();
}
function spawnFloatText(text, color){
  // 在 3D 场景的浮漂位置（投影到屏幕）显示飘字
  const p = scene.projectBobber();
  const node = el('div', { class:'float-text', style:`left:${p.x}px;top:${p.y}px;color:${color};` }, text);
  $('stage').append(node);
  setTimeout(()=>node.remove(), 1700);
}
function hintAt(text, ms=1200){
  const h = $('hint'); h.textContent = text;
  h.style.opacity = 1;
  setTimeout(()=> { h.textContent = '选择地点与鱼饵，按下「抛竿」开始 🎣'; }, ms);
}

function resetAfterAction(){
  casting = false;
  $('cast').disabled = false;
  $('reel').disabled = true;
  scene.bobberReset();
  // 移除 DOM 残留飘字
  if (fishEl && fishEl.dispose) fishEl.dispose();
  fishEl = null;
}

/* ==========================================================
   天气 / 时段自动滚动
   ========================================================== */
function tickWorld(){
  // 慢速轮换
  if (Math.random() < 0.04) {
    state.weather = choice(WEATHERS);
    scene.setWeather(state.weather);
    pushLog('天气变化：'+state.weather, 'tip');
  }
  if (Math.random() < 0.025) {
    state.time = choice(TIMES);
    pushLog('时间流转：'+state.time, 'tip');
  }
  renderHUD();
}
setInterval(tickWorld, 6000);


export { casting, hooked, fishEl, hookAt, castDist, cast, tryBite, tickFish, reel, miniReelGame, captureFish, getRodEffect, checkAchievements, pushLog, spawnRipple, spawnFloatText, hintAt, resetAfterAction, tickWorld, reeling };
