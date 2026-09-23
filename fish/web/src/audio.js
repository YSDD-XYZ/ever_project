const audio = (() => {
  let ctx = null;
  let bgGain = null;
  let masterGain = null;
  let bgNodes = [];
  let started = false;
  const cfg = { bgm: 0.5, sfx: 0.7 };

  function ensure(){
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(ctx.destination);
    return ctx;
  }
  function noiseBuffer(dur=0.5){
    const sr = ctx.sampleRate;
    const buf = ctx.createBuffer(1, sr*dur, sr);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
    return buf;
  }
  function env(g, t0, attack, decay, sustain, release, peak=1){
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0+attack);
    g.gain.linearRampToValueAtTime(peak*sustain, t0+attack+decay);
    g.gain.setValueAtTime(peak*sustain, t0+attack+decay+0.05);
    g.gain.linearRampToValueAtTime(0, t0+attack+decay+release);
  }
  // UI：click / hover（轻高频咔哒）
  function click(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    const o = c.createOscillator(); o.type='square'; o.frequency.value=1800;
    const g = c.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(masterGain);
    env(g, t, 0.001, 0.01, 0.05, 0.05, cfg.sfx*0.25);
    o.frequency.exponentialRampToValueAtTime(900, t+0.06);
    o.start(t); o.stop(t+0.08);
  }
  function hover(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    const o = c.createOscillator(); o.type='triangle'; o.frequency.value=2400;
    const g = c.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(masterGain);
    env(g, t, 0.001, 0.01, 0.05, 0.04, cfg.sfx*0.10);
    o.frequency.exponentialRampToValueAtTime(1900, t+0.04);
    o.start(t); o.stop(t+0.06);
  }
  // 风铃：随机泛音 + 长尾音
  function windbell(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    // 风铃常用五声音阶：C5 D5 E5 G5 A5
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00];
    const f0 = scale[Math.floor(Math.random()*scale.length)];
    // 用一组衰减的高次谐波模拟金属质感
    [1, 2.4, 3.7, 5.2].forEach((mult, i) => {
      const o = c.createOscillator(); o.type='sine'; o.frequency.value = f0 * mult;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(masterGain);
      const peak = cfg.sfx * (0.25 - i*0.05);
      env(g, t, 0.005, 0.05, 0.3, 1.2 + Math.random()*0.8, Math.max(peak, 0.02));
      o.start(t); o.stop(t + 1.6);
    });
  }
  // 备用接口（如果以后想加钢琴 / 三角铁等）
  function chime(freq=523.25){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    [1, 2, 3].forEach((mult, i) => {
      const o = c.createOscillator(); o.type='sine'; o.frequency.value = freq*mult;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(masterGain);
      env(g, t, 0.001, 0.04, 0.4, 0.6, cfg.sfx*(0.3 - i*0.08));
      o.start(t); o.stop(t+0.7);
    });
  }
  // 抛竿：嗖声（带通噪声）+ 落水噗
  function cast(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(0.4);
    const bp = c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=2400; bp.Q.value=2.0;
    const g = c.createGain(); g.gain.value = 0;
    n.connect(bp); bp.connect(g); g.connect(masterGain);
    env(g, t, 0.02, 0.06, 0.4, 0.3, cfg.sfx*0.6);
    bp.frequency.setValueAtTime(800, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t+0.3);
    n.start(t); n.stop(t+0.45);
    // 0.4s 后的落水噗
    setTimeout(()=> splash(), 380);
  }
  // 落水水声（低通噪声包络）
  function splash(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(0.5);
    const lp = c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
    const g = c.createGain(); g.gain.value = 0;
    n.connect(lp); lp.connect(g); g.connect(masterGain);
    env(g, t, 0.005, 0.05, 0.5, 0.35, cfg.sfx*0.45);
    n.start(t); n.stop(t+0.5);
  }
  // 收线小游戏：成功 / 失败
  function reelOk(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    const o = c.createOscillator(); o.type='triangle'; o.frequency.value=660;
    const g = c.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(masterGain);
    env(g, t, 0.005, 0.05, 0.3, 0.18, cfg.sfx*0.5);
    o.frequency.setValueAtTime(660, t);
    o.frequency.linearRampToValueAtTime(990, t+0.15);
    o.start(t); o.stop(t+0.25);
  }
  function reelBad(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    const o = c.createOscillator(); o.type='sawtooth'; o.frequency.value=180;
    const g = c.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(masterGain);
    env(g, t, 0.005, 0.08, 0.2, 0.2, cfg.sfx*0.45);
    o.frequency.linearRampToValueAtTime(80, t+0.25);
    o.start(t); o.stop(t+0.35);
  }
  // 捕获：上行音阶 + 水花
  function caught(){
    if (!started) return;
    const c = ensure(); const t = c.currentTime;
    [523, 784, 1047].forEach((freq, i) => {
      const o = c.createOscillator(); o.type='triangle'; o.frequency.value=freq;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(g); g.connect(masterGain);
      env(g, t + i*0.08, 0.005, 0.04, 0.6, 0.2, cfg.sfx*0.45);
      o.start(t+i*0.08); o.stop(t+i*0.08+0.3);
    });
    splash();
  }
  // BGM：海浪噪声 + 远端拨弦
  function start(){
    if (started) return;
    started = true;
    ensure();
    // 背景噪声（持续）
    bgGain = ctx.createGain();
    bgGain.gain.value = 0;
    bgGain.connect(masterGain);
    const n = ctx.createBufferSource();
    n.buffer = noiseBuffer(4);
    n.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420;
    n.connect(lp); lp.connect(bgGain);
    n.start();
    bgNodes.push({n, lp});

    // 海浪起伏（每 8s 一次 LFO 调音量）
    bgGain.gain.linearRampToValueAtTime(cfg.bgm * 0.6, ctx.currentTime + 3);
    const lfo = setInterval(() => {
      if (!bgGain || !ctx) return;
      const t = ctx.currentTime;
      bgGain.gain.cancelScheduledValues(t);
      bgGain.gain.setValueAtTime(bgGain.gain.value, t);
      bgGain.gain.linearRampToValueAtTime(cfg.bgm * (0.4 + Math.random()*0.5), t + 4);
    }, 5000);
    bgNodes.push({ lfo });

    // 远端风铃：每 4~14s 随机一次，间歇营造"叮"声
    const bell = setInterval(() => {
      if (!started || Math.random() < 0.45) return;
      windbell();
    }, 4000);
    bgNodes.push({ bell });
  }
  function stop(){
    started = false;
    bgNodes.forEach(x => {
      if (x.n) try{ x.n.stop(); }catch(e){}
      if (x.lfo) clearInterval(x.lfo);
      if (x.bell) clearInterval(x.bell);
    });
    if (bgGain){ try{ bgGain.disconnect(); }catch(e){} bgGain = null; }
    bgNodes = [];
  }
  return { start, stop, cast, splash, reelOk, reelBad, caught, click, hover, windbell, chime, cfg };
})();


export { audio };
