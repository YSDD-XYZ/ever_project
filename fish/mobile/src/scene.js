// scene2d.js —— 轻量 2D 钓鱼场景
// 保留同名 scene API，但用 DOM + CSS + SVG 替代 Three.js
// 优势：去掉 600KB Three.js，加载快，mobile 流畅

const $ = (s) => document.querySelector(s);

// ── 内部 DOM ──
let root = null;        // #stage
let skyEl = null;       // 天空层
let waterEl = null;     // 水面层
let bobberEl = null;    // 浮漂
let fishEl = null;      // 水下鱼影
let splashEl = null;    // 捕获水花
let rippleEls = [];     // 水波涟漪
let weatherState = { type: '晴' };

const FISH_EMOJI = {
  '常见':  '🐟', '少见': '🐠', '稀有': '🐡',
  '史诗':  '🦈', '神秘': '🐳', '传说': '🐉'
};

// ── 公共 API ──
export const scene = {
  // 初始化：mount 到 #stage
  init(stageId = 'stage') {
    root = document.getElementById(stageId);
    if (!root) return;
    root.innerHTML = '';  // 清空旧内容
    root.style.cssText += '; position:relative; overflow:hidden; background:transparent;';

    // 天空（带渐变）
    skyEl = document.createElement('div');
    skyEl.className = 'sky';
    root.appendChild(skyEl);

    // 远景：太阳/月亮 + 云
    const far = document.createElement('div');
    far.className = 'far';
    far.innerHTML = `
      <div class="sun"></div>
      <div class="cloud c1"></div>
      <div class="cloud c2"></div>
      <div class="cloud c3"></div>
      <div class="mountain m1"></div>
      <div class="mountain m2"></div>
    `;
    root.appendChild(far);

    // 水面（带波形 SVG）
    waterEl = document.createElement('div');
    waterEl.className = 'water';
    waterEl.innerHTML = `
      <svg class="wave-bg" viewBox="0 0 100 20" preserveAspectRatio="none">
        <path d="M0 10 Q 25 5 50 10 T 100 10 V 20 H 0 Z" fill="rgba(255,255,255,.05)"/>
      </svg>
      <svg class="wave-fg" viewBox="0 0 100 10" preserveAspectRatio="none">
        <path d="M0 5 Q 25 0 50 5 T 100 5 V 10 H 0 Z" fill="rgba(255,255,255,.15)"/>
      </svg>
      <div class="ripples"></div>
    `;
    root.appendChild(waterEl);

    // 浮漂
    bobberEl = document.createElement('div');
    bobberEl.className = 'bobber';
    bobberEl.innerHTML = `
      <div class="bobber-stick"></div>
      <div class="bobber-flag">🚩</div>
      <div class="bobber-float">🔴</div>
    `;
    root.appendChild(bobberEl);

    // 鱼影容器
    fishEl = document.createElement('div');
    fishEl.className = 'fish-layer';
    root.appendChild(fishEl);

    // 水花容器
    splashEl = document.createElement('div');
    splashEl.className = 'splash-layer';
    root.appendChild(splashEl);
  },

  // 抛杆：浮漂飞向 X 位置（dist: 0~1）
  cast(dist = 0.5) {
    if (!bobberEl) return;
    bobberEl.classList.add('casting');
    const x = 20 + dist * 60;  // 20%~80%
    bobberEl.style.setProperty('--bx', `${x}%`);
    // 飞行动画
    bobberEl.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-30vh) scale(.7)' },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 600, easing: 'cubic-bezier(.5,0,.5,1)' });
  },

  // 鱼试探浮漂（轻微跳动）
  bobberNibble() {
    if (!bobberEl) return;
    bobberEl.classList.add('nibbling');
  },

  // 鱼猛咬（顿挫下沉）
  bobberBite() {
    if (!bobberEl) return;
    bobberEl.classList.remove('nibbling');
    bobberEl.classList.add('biting');
  },

  // 浮漂复位
  bobberReset() {
    if (!bobberEl) return;
    bobberEl.classList.remove('casting', 'nibbling', 'biting', 'hooked');
    bobberEl.style.removeProperty('--bx');
    fishEl.innerHTML = '';  // 清掉鱼影
  },

  // 显示鱼影在水下
  showFish(fish) {
    if (!fishEl) return fishEl;
    fishEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'fish-shadow';
    div.textContent = FISH_EMOJI[fish.rarity] || '🐟';
    div.style.color = fish.color || '#fff';
    fishEl.appendChild(div);
    return { dispose() { div.remove(); } };
  },

  // 水波涟漪
  spawnRipple() {
    if (!waterEl) return;
    const r = waterEl.querySelector('.ripples');
    if (!r) return;
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = bobberEl?.style.getPropertyValue('--bx') || '50%';
    r.appendChild(ripple);
    setTimeout(() => ripple.remove(), 2000);
  },

  // 捕获序列：鱼跳 → 落地 → 回调
  catchSequence(fish, onDone) {
    if (!bobberEl) { onDone && onDone(); return; }
    // 鱼跳出水
    bobberEl.classList.add('hooked');
    const fishDiv = document.createElement('div');
    fishDiv.className = 'fish-jump';
    fishDiv.textContent = FISH_EMOJI[fish.rarity] || '🐟';
    fishDiv.style.color = fish.color || '#fff';
    bobberEl.appendChild(fishDiv);
    // 鱼跳水动画
    fishDiv.animate([
      { transform: 'translate(-50%, 0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(-50%, -120px) rotate(-30deg)', opacity: 1, offset: 0.4 },
      { transform: 'translate(-50%, -40px) rotate(360deg) scale(.8)', opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, 20px) scale(.4)', opacity: 0 }
    ], { duration: 1600, easing: 'cubic-bezier(.4,0,.2,1)' });
    // 水花
    setTimeout(() => {
      if (!splashEl) return;
      const sp = document.createElement('div');
      sp.className = 'splash';
      sp.textContent = '💦';
      sp.style.left = bobberEl.style.getPropertyValue('--bx') || '50%';
      splashEl.appendChild(sp);
      setTimeout(() => sp.remove(), 800);
    }, 1000);
    // 完成后回调
    setTimeout(() => {
      fishDiv.remove();
      onDone && onDone();
    }, 1600);
  },

  // 改天气
  setWeather(w) {
    weatherState.type = w;
    if (!skyEl) return;
    skyEl.className = `sky weather-${w}`;
    // 改 sun/moon
    const sun = root.querySelector('.sun');
    if (sun) {
      sun.className = w === '晴' ? 'sun' : (w === '雪' || w === '雾' ? 'moon' : 'cloud-cover');
    }
    // 雨/雪粒子
    let particles = root.querySelector('.particles');
    if (!particles) {
      particles = document.createElement('div');
      particles.className = 'particles';
      root.appendChild(particles);
    }
    particles.className = `particles ${w}`;
    particles.innerHTML = '';
    if (w === '雨' || w === '雪') {
      for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = w === '雨' ? 'raindrop' : 'snowflake';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = (Math.random() * 2) + 's';
        p.style.animationDuration = (0.5 + Math.random() * 0.5) + 's';
        particles.appendChild(p);
      }
    } else if (w === '雾') {
      const f = document.createElement('div');
      f.className = 'fog';
      particles.appendChild(f);
    }
  },

  // 浮漂投影到屏幕坐标（用于飘字）
  projectBobber() {
    if (!bobberEl || !root) return { x: 0, y: 0 };
    const r = bobberEl.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - root.getBoundingClientRect().left,
      y: r.top - root.getBoundingClientRect().top
    };
  },
};
