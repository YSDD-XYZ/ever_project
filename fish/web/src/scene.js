// scene.js —— Three.js 3D 场景（依赖全局 THREE，由 importmap + ESM 注入）
// 顶部 import * as THREE 既保证拿到 THREE 单例（用命名空间访问），也把它挂到 window，
// 方便模块内大量 `new THREE.Xxx(...)` 调用保持原写法。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { Reflector } from 'three/addons/Reflector.js';
// 把 addons 挂到 THREE 上，保留 `new THREE.Reflector / new OrbitControls` 等原有写法
THREE.OrbitControls = OrbitControls;
THREE.Reflector = Reflector;
window.THREE = THREE;
window.OrbitControls = OrbitControls;
window.Reflector = Reflector;

const scene = (() => {
  /* ---------- 程序化纹理工厂 ---------- */
  // 不依赖外部文件，在 <canvas> 上画 normal / roughness / wood 等贴图
  function makeWoodNormalTexture(){
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    // 基础色 = 中性法线 (128, 128, 255)
    const img = ctx.createImageData(256, 256);
    const data = img.data;
    for (let y=0; y<256; y++){
      for (let x=0; x<256; x++){
        // 木纹：横向正弦扰动
        const ring = Math.sin((x + y*0.4) * 0.08) * 8 + Math.sin(x*0.02)*4;
        const nx = 128 + ring;
        const ny = 128 + Math.sin(y*0.05 + x*0.01)*4;
        const nz = 255;
        const i = (y*256 + x)*4;
        data[i]=nx; data[i+1]=ny; data[i+2]=nz; data[i+3]=255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 6);
    return t;
  }
  function makeWoodRoughTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(128, 128); const data = img.data;
    for (let i=0;i<128*128;i++){
      const v = 180 + Math.floor(Math.random()*40);
      data[i*4]=data[i*4+1]=data[i*4+2]=v; data[i*4+3]=255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 6);
    return t;
  }
  function makeFishNormalTexture(){
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(256, 256); const data = img.data;
    for (let y=0; y<256; y++){
      for (let x=0; x<256; x++){
        // 鳞片点阵：每个点位置算高度差 → 法线
        const cx = x % 32, cy = y % 32;
        const dx = cx - 16, dy = cy - 16;
        const d = Math.sqrt(dx*dx + dy*dy);
        const h = Math.max(0, 1 - d/16);
        const gx = -dx/16 * h * 60;
        const gy = -dy/16 * h * 60;
        const i = (y*256 + x)*4;
        data[i]=128+gx; data[i+1]=128+gy; data[i+2]=255; data[i+3]=255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  const woodNormalTex = makeWoodNormalTexture();
  const woodRoughTex = makeWoodRoughTexture();
  const fishNormalTex = makeFishNormalTexture();

  const canvas = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const stageEl = document.getElementById('stage');
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 3.2, 9);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Scene();
  root.background = null;
  root.fog = new THREE.Fog(0x0a1e36, 18, 60);

  /* ---------- OrbitControls ---------- */
  // 拖拽旋转、滚轮缩放、触摸 pinch 缩放与单指旋转全部由它处理
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;             // 禁用平移（保持角色站在岸上）
  controls.minDistance = 4;
  controls.maxDistance = 18;
  controls.minPolarAngle = Math.PI*0.22;  // 不能抬头看天
  controls.maxPolarAngle = Math.PI*0.46;  // 不能转到水面下
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  /* ---------- 镜头震动 ---------- */
  const shake = { amp:0, t:0, dur:0, freq:30, offX:0, offY:0 };
  function triggerShake(amp=0.3, dur=0.4, freq=30){
    shake.amp = amp; shake.t = 0; shake.dur = dur; shake.freq = freq;
  }
  function applyShake(dt){
    if (shake.amp <= 0) return;
    shake.t += dt;
    const k = Math.min(shake.t / shake.dur, 1);
    const a = shake.amp * (1 - k);
    const tt = shake.t * shake.freq;
    shake.offX = (Math.sin(tt*1.1)+Math.sin(tt*2.3))*a*0.08;
    shake.offY = (Math.cos(tt*1.7))*a*0.06;
    if (k >= 1){ shake.amp = 0; shake.offX = 0; shake.offY = 0; }
  }

  /* ---------- 灯光 ---------- */
  const amb = new THREE.AmbientLight(0xb6d4ff, 0.55);
  const sun = new THREE.DirectionalLight(0xfff0c8, 1.1);
  sun.position.set(6, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;   sun.shadow.camera.bottom = -10;
  const hemi = new THREE.HemisphereLight(0x9bc5ff, 0x15355a, 0.5);
  root.add(amb, sun, hemi);

  /* ---------- 水面（Reflector + 波纹叠层） ---------- */
  // 镜面倒影：实时渲染场景镜像
  const reflector = new Reflector(new THREE.PlaneGeometry(120, 60), {
    clipBias: 0.003,
    textureWidth: window.innerWidth * Math.min(window.devicePixelRatio, 2),
    textureHeight: window.innerHeight * Math.min(window.devicePixelRatio, 2),
    color: 0x1a4a78,
  }) : null;
  if (reflector){
    reflector.rotation.x = -Math.PI/2;
    reflector.position.y = 0;
    root.add(reflector);
  }
  // 玻璃层（带顶点波纹，让水面看起来在动）
  const waterGeo = new THREE.PlaneGeometry(120, 60, 64, 32);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0e3a66,
    metalness: 0.3, roughness: 0.2,
    transparent:true, opacity: 0.35,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI/2;
  water.position.y = 0.001;     // 微抬避免与倒影 z-fight
  water.receiveShadow = true;
  root.add(water);

  // 水面下暗色底盘（增强深度）
  const seabed = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 60),
    new THREE.MeshBasicMaterial({ color:0x051426 })
  );
  seabed.rotation.x = -Math.PI/2;
  seabed.position.y = -0.6;
  root.add(seabed);

  /* ---------- 远景山 ---------- */
  function makeMountain(z, scale, color){
    const g = new THREE.ConeGeometry(6*scale, 5*scale, 4);
    const m = new THREE.MeshStandardMaterial({ color, flatShading:true, roughness:0.95 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set((Math.random()-.5)*20, 1.5*scale, z);
    mesh.rotation.y = Math.random()*Math.PI;
    return mesh;
  }
  for (let i=0;i<10;i++){
    const z = -22 - Math.random()*15;
    const s = 1 + Math.random()*1.4;
    const col = new THREE.Color().setHSL(0.58, 0.25 + Math.random()*0.1, 0.18 + Math.random()*0.1);
    root.add(makeMountain(z, s, col));
  }

  /* ---------- 月亮 ---------- */
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 32, 32),
    new THREE.MeshBasicMaterial({ color:0xfff2cf })
  );
  moon.position.set(14, 8, -18);
  // 加柔光晕
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 32, 32),
    new THREE.MeshBasicMaterial({ color:0xfff2cf, transparent:true, opacity:0.18 })
  );
  halo.position.copy(moon.position);
  root.add(moon, halo);

  /* ---------- 鱼杆（跟随鼠标） ---------- */
  const rodGroup = new THREE.Group();
  const rodMat = new THREE.MeshStandardMaterial({ color:0xcaa477, roughness:0.7 });
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 4.5, 12),
    new THREE.MeshStandardMaterial({ color:0xcaa477, roughness:0.8, normalMap:woodNormalTex, normalScale:new THREE.Vector2(0.6,0.6), roughnessMap:woodRoughTex })
  );
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.8, 8), rodMat);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12), new THREE.MeshStandardMaterial({color:0x3b2a1a}));
  rodGroup.add(rod, tip, grip);
  root.add(rodGroup);

  // 鱼杆默认角度（沿 Z 平面向上倾斜）
  const ROD_REST_ANGLE = -Math.PI/3.6;
  const ROD_PIVOT = new THREE.Vector3(-2, 0.9, 0);
  function setRodAngle(angle, twistZ=0){
    rod.position.set(0, 2.25, 0);                  // 局部：竿身从中心向上
    rod.rotation.set(0, 0, angle);
    const tipDist = 4.7;
    tip.position.set(Math.cos(angle)*tipDist, Math.sin(angle)*tipDist, 0);
    tip.rotation.set(0, 0, angle);
    grip.position.set(0, -2.25, 0);
    grip.rotation.set(0, 0, angle);
    rodGroup.rotation.z = twistZ;                  // 鼠标 X → 整体水平摆动
  }
  setRodAngle(ROD_REST_ANGLE);

  // 鼠标 → 鱼杆水平摆动 + 鼠标 Y → 略微抬起/压低
  const rodAim = { z:0, y:0 };     // 目标
  const rodCur = { z:0, y:0 };     // 实际（带阻尼）
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;     // 0..1
    const ny = (e.clientY - r.top)  / r.height;    // 0..1
    rodAim.z = (nx - 0.5) * 0.35;                  // 水平摆动 ±0.35 rad
    rodAim.y = (0.5 - ny) * 0.20;                  // 上下 ±0.20 rad
  });
  // 移动端触摸也跟随手指
  canvas.addEventListener('touchmove', e => {
    if (!e.touches.length) return;
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    const nx = (t.clientX - r.left) / r.width;
    const ny = (t.clientY - r.top)  / r.height;
    rodAim.z = (nx - 0.5) * 0.35;
    rodAim.y = (0.5 - ny) * 0.20;
  }, { passive:true });

  /* ---------- 鱼线（动态） ---------- */
  const lineMat = new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:0.55 });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const lineObj = new THREE.Line(lineGeo, lineMat);
  root.add(lineObj);

  /* ---------- 浮漂 ---------- */
  const bobber = new THREE.Group();
  const bobTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI*2, 0, Math.PI/2),
    new THREE.MeshStandardMaterial({ color:0xff5b5b, roughness:0.4 })
  );
  const bobBot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.35, 16),
    new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.4 })
  );
  bobBot.position.y = -0.18;
  bobber.add(bobTop, bobBot);
  bobber.visible = false;
  root.add(bobber);

  // 浮漂基础位置（左前）
  const bobberBase = new THREE.Vector3(-1.5, 0, 2);
  function setBobberTarget(dist01){
    // 沿鱼线方向延伸
    const tx = -1.5 + dist01*5.0;   // 越远越向右
    const tz =  2.0 - dist01*1.4;   // 越远越向相机外（即更靠水里）
    bobber.position.set(tx, 0.05, tz);
    updateLine();
  }

  function updateLine(){
    const tipPos = new THREE.Vector3();
    tip.getWorldPosition(tipPos);
    const bp = bobber.position;
    const pts = [
      new THREE.Vector3(tipPos.x, tipPos.y-0.2, tipPos.z),
      new THREE.Vector3(bp.x, bp.y+0.2, bp.z)
    ];
    lineGeo.setFromPoints(pts);
    lineGeo.attributes.position.needsUpdate = true;
    // 让线稍微下垂：插一个中点
    const mid = new THREE.Vector3().addVectors(pts[0], pts[1]).multiplyScalar(0.5);
    mid.y -= 0.15;
    lineGeo.setFromPoints([pts[0], mid, pts[1]]);
    lineGeo.attributes.position.needsUpdate = true;
  }

  /* ---------- 涟漪池 ---------- */
  const ripples = [];
  function spawnRipple(){
    const g = new THREE.RingGeometry(0.05, 0.08, 32);
    const m = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.9, side:THREE.DoubleSide });
    const r = new THREE.Mesh(g, m);
    r.rotation.x = -Math.PI/2;
    r.position.set(bobber.position.x, 0.02, bobber.position.z);
    r.userData.t = 0;
    root.add(r);
    ripples.push(r);
  }
  function updateRipples(dt){
    for (let i=ripples.length-1; i>=0; i--){
      const r = ripples[i];
      r.userData.t += dt;
      const t = r.userData.t;
      if (t > 1.4){ root.remove(r); r.geometry.dispose(); r.material.dispose(); ripples.splice(i,1); continue; }
      const s = 1 + t*16;
      r.scale.set(s, s, s);
      r.material.opacity = 0.9*(1 - t/1.4);
    }
  }

  /* ---------- 鱼 ---------- */
  let fishMesh = null;
  function makeFishMesh(emj){
    const g = new THREE.Group();
    const fishBodyMat = new THREE.MeshStandardMaterial({
      color:0x9ad1ff, metalness:0.35, roughness:0.45,
      normalMap: fishNormalTex, normalScale: new THREE.Vector2(0.8, 0.8),
    });
    const fishTailMat = new THREE.MeshStandardMaterial({
      color:0x6fa8d6, metalness:0.3, roughness:0.55,
      normalMap: fishNormalTex, normalScale: new THREE.Vector2(0.5, 0.5),
    });
    // 鱼身：胶囊
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), fishBodyMat);
    body.rotation.z = Math.PI/2;
    // 鱼尾：三角形
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.35, 4), fishTailMat);
    tail.rotation.z = -Math.PI/2;
    tail.position.set(-0.5, 0, 0);
    // 鱼鳍
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 3), fishTailMat);
    fin.position.set(0, 0.22, 0);
    g.add(body, tail, fin);
    g.position.set(bobber.position.x + 0.6, -0.35, bobber.position.z + 0.4);
    return g;
  }

  function showFish(fish){
    if (fishMesh) { root.remove(fishMesh); fishMesh = null; }
    fishMesh = makeFishMesh(fish.emj);
    root.add(fishMesh);
    fishMesh.userData._t = 0;
    return {
      dispose(){ if (fishMesh){ root.remove(fishMesh); fishMesh=null; } }
    };
  }

  /* ---------- 水花粒子系统 ---------- */
  const splashes = [];
  function spawnSplash(pos, color=0x9ec5ff, count=24, power=1){
    for (let i=0;i<count;i++){
      const g = new THREE.SphereGeometry(0.05, 6, 6);
      const m = new THREE.MeshBasicMaterial({ color, opacity:1, transparent:true });
      const s = new THREE.Mesh(g, m);
      s.position.copy(pos);
      s.position.y = 0.05;
      const ang = Math.random()*Math.PI*2;
      const sp = (1.2 + Math.random()*1.4) * power;
      s.userData = {
        vx: Math.cos(ang)*sp,
        vy: 1.5 + Math.random()*2.0*power,
        vz: Math.sin(ang)*sp,
        t:0, life: 0.8 + Math.random()*0.4
      };
      root.add(s);
      splashes.push(s);
    }
  }
  function updateSplashes(dt){
    for (let i=splashes.length-1;i>=0;i--){
      const s = splashes[i];
      s.userData.t += dt;
      const u = s.userData;
      u.vy -= 6 * dt;                    // 重力
      s.position.x += u.vx * dt;
      s.position.y += u.vy * dt;
      s.position.z += u.vz * dt;
      const k = u.t / u.life;
      s.material.opacity = Math.max(0, 1 - k);
      s.scale.setScalar(Math.max(0.2, 1 - k*0.6));
      if (s.position.y < 0 || u.t > u.life){
        root.remove(s); s.geometry.dispose(); s.material.dispose();
        splashes.splice(i,1);
      }
    }
  }

  /* ---------- 捕获序列：鱼跃出 + 收线 + 展示 ---------- */
  // 由外层调用 catchSequence(fish, onDone)；动画结束后回调
  const catchAnim = { active:false, t:0, fish:null, mesh:null, startPos:new THREE.Vector3(), peakY:0, onDone:null };
  function catchSequence(fish, onDone){
    if (!fishMesh){
      // 没在水面下看到鱼，先创建一个浮窗版本
      const m = makeFishMesh(fish.emj);
      m.position.set(bobber.position.x, 0.2, bobber.position.z);
      root.add(m);
      fishMesh = m;
    }
    catchAnim.active = true;
    catchAnim.t = 0;
    catchAnim.fish = fish;
    catchAnim.mesh = fishMesh;
    catchAnim.startPos.copy(fishMesh.position);
    catchAnim.peakY = 2.2 + Math.random()*0.6;
    catchAnim.onDone = onDone;
    // 同时触发水花 + 镜头震
    spawnSplash(fishMesh.position, 0x9ec5ff, 28, 1.3);
    triggerShake(0.45, 0.5, 35);
    // Cinematic：禁用 OrbitControls 用户输入，相机 target 跟鱼
    catchAnim._origTarget = controls.target.clone();
    catchAnim._origEnabled = controls.enabled;
    controls.enabled = false;
  }
  function updateCatchSequence(dt){
    if (!catchAnim.active) return;
    catchAnim.t += dt;
    const k = catchAnim.t / 1.6;            // 总长 1.6s
    const m = catchAnim.mesh;
    if (!m){ catchAnim.active = false; return; }
    if (k < 0.4){
      // 跃出水面（抛物线）
      const u = k / 0.4;
      m.position.y = catchAnim.startPos.y + (-2 - catchAnim.startPos.y) * (1 - (1-u)*(1-u)) * (-1) * 0
                    + (catchAnim.peakY - catchAnim.startPos.y) * (4*u*(1-u));
      m.position.x = catchAnim.startPos.x;
      m.position.z = catchAnim.startPos.z;
      m.rotation.z = Math.sin(u*Math.PI) * 0.6;
    } else if (k < 0.7){
      // 在空中挣扎
      m.position.y = catchAnim.peakY - (k-0.4)/0.3 * (catchAnim.peakY - 0.8);
      m.rotation.z = Math.sin((k-0.4)*30)*0.4;
    } else if (k < 1.0){
      // 收线：飞向镜头前
      const u = (k-0.7)/0.3;
      const target = new THREE.Vector3(-0.3, 1.2, 4.5); // 镜头前右下
      m.position.lerpVectors(new THREE.Vector3(m.position.x, m.position.y, m.position.z), target, u*0.3 + 0.05);
      m.scale.setScalar(1 + u*0.6);
      m.rotation.z *= (1 - u);
    } else {
      // 收尾：缩小到 0，移除
      const u = Math.min((k-1.0)/0.4, 1);
      m.scale.setScalar(Math.max(0, 1.6*(1-u)));
      if (k >= 1.4){
        root.remove(m); m.traverse(o=>{ if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        if (fishMesh === m) fishMesh = null;
        catchAnim.active = false;
        const cb = catchAnim.onDone; catchAnim.onDone = null;
        // Cinematic 收尾：缓动回原 target，恢复用户输入
        catchAnim._recover = { t:0, dur:0.6 };
        if (cb) cb();
      }
    }
    // Cinematic：controls.target 跟鱼位置（弱跟随，让画面更聚焦）
    if (m){
      const follow = new THREE.Vector3(m.position.x*0.6 + catchAnim._origTarget.x*0.4,
                                    m.position.y*0.5 + 0.3,
                                    m.position.z*0.6 + catchAnim._origTarget.z*0.4);
      controls.target.lerp(follow, Math.min(1, dt*4));
    }
  }
  function updateCinematicRecover(dt){
    if (!catchAnim._recover) return;
    catchAnim._recover.t += dt;
    const u = Math.min(catchAnim._recover.t / catchAnim._recover.dur, 1);
    const ease = 1 - Math.pow(1-u, 3);
    controls.target.lerp(catchAnim._origTarget, ease);
    if (u >= 1){
      controls.enabled = catchAnim._origEnabled;
      catchAnim._recover = null;
    }
  }

  /* ---------- 天气视觉（GPU 实例化粒子） ---------- */
  let weatherObj = null;
  const weatherState = { type:'none', N:0, speed:0, size:0, color:0, mesh:null };
  const _m4 = new THREE.Matrix4();
  const _q  = new THREE.Quaternion();
  const _v3 = new THREE.Vector3();
  const _s3 = new THREE.Vector3(1,1,1);

  function _disposeWeather(){
    if (weatherObj){
      root.remove(weatherObj);
      weatherObj.geometry.dispose();
      weatherObj.material.dispose();
      weatherObj = null;
    }
  }
  function setWeather(w){
    _disposeWeather();
    weatherState.type = w;
    if (w === '雪'){
      const N = 400;
      const g = new THREE.PlaneGeometry(0.12, 0.12);
      const m = new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.85, depthWrite:false });
      const inst = new THREE.InstancedMesh(g, m, N);
      inst.frustumCulled = false;
      inst.userData.pos = new Float32Array(N*3);
      inst.userData.rot = new Float32Array(N);          // 每片当前 yaw
      inst.userData.spin = new Float32Array(N);         // 每片旋转速度
      for (let i=0;i<N;i++){
        inst.userData.pos[i*3+0] = (Math.random()-0.5)*40;
        inst.userData.pos[i*3+1] = Math.random()*12;
        inst.userData.pos[i*3+2] = (Math.random()-0.5)*20-5;
        inst.userData.rot[i] = Math.random()*Math.PI*2;
        inst.userData.spin[i] = (Math.random()-0.5)*1.4;
      }
      weatherObj = inst;
      weatherState.N = N; weatherState.speed = 0.8; weatherState.size = 1; weatherState.color = 0xffffff;
      root.add(weatherObj);
    } else if (w === '雨'){
      const N = 600;
      const g = new THREE.PlaneGeometry(0.02, 0.4);     // 雨丝细长
      const m = new THREE.MeshBasicMaterial({ color:0x9ec5ff, transparent:true, opacity:0.7, depthWrite:false, side:THREE.DoubleSide });
      const inst = new THREE.InstancedMesh(g, m, N);
      inst.frustumCulled = false;
      inst.userData.pos = new Float32Array(N*3);
      for (let i=0;i<N;i++){
        inst.userData.pos[i*3+0] = (Math.random()-0.5)*40;
        inst.userData.pos[i*3+1] = Math.random()*12;
        inst.userData.pos[i*3+2] = (Math.random()-0.5)*20-5;
      }
      weatherObj = inst;
      weatherState.N = N; weatherState.speed = 6.0; weatherState.size = 1; weatherState.color = 0x9ec5ff;
      root.add(weatherObj);
    } else if (w === '雾'){
      root.fog = new THREE.Fog(0xb8c8d8, 8, 30);
    } else {
      root.fog = new THREE.Fog(0x0a1e36, 18, 60);
    }
  }
  function updateWeather(dt){
    const ws = weatherState;
    if (!weatherObj || ws.type === 'none' || ws.type === '雾') return;
    const pos = weatherObj.userData.pos;
    const N = ws.N;
    const fall = ws.speed * dt;
    for (let i=0;i<N;i++){
      pos[i*3+1] -= fall;
      if (pos[i*3+1] < -0.5){ pos[i*3+1] = 12; }
      if (ws.type === '雪'){
        weatherObj.userData.rot[i] += weatherObj.userData.spin[i] * dt;
      }
    }
    // 一次性写入所有 instance matrix
    if (ws.type === '雪'){
      for (let i=0;i<N;i++){
        _v3.set(pos[i*3], pos[i*3+1], pos[i*3+2]);
        _q.setFromEuler(new THREE.Euler(0, 0, weatherObj.userData.rot[i]));
        _m4.compose(_v3, _q, _s3);
        weatherObj.setMatrixAt(i, _m4);
      }
    } else { // 雨：雨丝朝向竖直，让 plane 看向相机即可
      for (let i=0;i<N;i++){
        _v3.set(pos[i*3], pos[i*3+1], pos[i*3+2]);
        // 让 plane 朝向相机：取相机正前方单位向量作为 z
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        _q.setFromUnitVectors(new THREE.Vector3(0,1,0), new THREE.Vector3(0,1,0)); // 不旋转，依靠 plane 默认朝 +Z + camera.getWorldDirection
        // 简单做法：让 plane 一直面向相机（lookAt）
        const look = new THREE.Matrix4().lookAt(_v3, camera.position, new THREE.Vector3(0,1,0));
        _m4.compose(_v3, new THREE.Quaternion().setFromRotationMatrix(look), _s3);
        weatherObj.setMatrixAt(i, _m4);
      }
    }
    weatherObj.instanceMatrix.needsUpdate = true;
  }

  /* ---------- 浮漂动画状态机 ---------- */
  let bobberMode = 'idle'; // idle | cast | nibble | bite
  let bobberT = 0;
  let bobberAmp = 0;
  function cast(dist01){
    bobber.visible = true;
    bobberMode = 'cast';
    bobberT = 0;
    setBobberTarget(dist01);
    spawnRipple();
  }
  function bobberNibble(){
    bobberMode = 'nibble'; bobberT = 0; bobberAmp = 0.18;
  }
  function bobberBite(){
    bobberMode = 'bite'; bobberT = 0; bobberAmp = 0.5;
    triggerShake(0.25, 0.25, 40);
  }
  function bobberReset(){
    bobberMode = 'idle'; bobberAmp = 0; bobber.visible = false;
  }

  /* ---------- 投影（飘字定位） ---------- */
  function projectBobber(){
    const v = new THREE.Vector3();
    bobber.getWorldPosition(v);
    v.y += 0.3;
    v.project(camera);
    const rect = canvas.getBoundingClientRect();
    const stageRect = stageEl.getBoundingClientRect();
    return {
      x: (v.x*0.5+0.5)*rect.width + rect.left - stageRect.left,
      y: (-v.y*0.5+0.5)*rect.height + rect.top - stageRect.top,
    };
  }

  /* ---------- 主循环 ---------- */
  const clock = new THREE.Clock();
  function tick(){
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    // 水面波动
    const pos = waterGeo.attributes.position;
    for (let i=0;i<pos.count;i++){
      const x = pos.getX(i), y = pos.getY(i);
      const h = Math.sin(x*0.5 + t*1.3)*0.06 + Math.sin(y*0.4 + t*0.9)*0.05 + Math.sin((x+y)*0.3 + t*1.7)*0.03;
      pos.setZ(i, h);
    }
    pos.needsUpdate = true;
    waterGeo.computeVertexNormals();

    // 浮漂动画
    bobberT += dt;
    if (bobberMode === 'idle'){
      bobber.position.y = 0.05 + Math.sin(t*2.0)*0.04;
    } else if (bobberMode === 'cast'){
      // 抛物线落地
      const dur = 0.8;
      const k = Math.min(bobberT/dur, 1);
      const drop = -2.4*k*(1-k)*0.6;
      bobber.position.y = 0.3 + drop;
      if (k >= 1){ bobberMode = 'idle'; bobberAmp = 0; }
    } else if (bobberMode === 'nibble'){
      bobber.position.y = 0.05 + Math.sin(bobberT*22)*bobberAmp*(1 - Math.min(bobberT/1.2,1));
      if (bobberT > 1.2){ bobberMode = 'idle'; bobberAmp = 0; }
    } else if (bobberMode === 'bite'){
      const k = Math.min(bobberT/0.6, 1);
      bobber.position.y = 0.05 - 0.35*k*Math.sin(k*Math.PI);
      if (bobberT > 0.6){ bobberMode = 'idle'; bobberAmp = 0; }
    }

    // 鱼动画：缓慢游弋 + 上下漂浮
    if (fishMesh){
      fishMesh.userData._t += dt;
      const ft = fishMesh.userData._t;
      fishMesh.position.y = -0.35 + Math.sin(ft*2.2)*0.08;
      fishMesh.rotation.y = Math.sin(ft*1.1)*0.4;
      fishMesh.position.x = bobber.position.x + 0.6 + Math.sin(ft*0.7)*0.3;
      fishMesh.position.z = bobber.position.z + 0.4 + Math.cos(ft*0.7)*0.3;
    }

    // 月亮微动
    moon.position.y = 8 + Math.sin(t*0.1)*0.4;
    halo.position.copy(moon.position);

    // 天气粒子下落（GPU 实例化粒子）
    updateWeather(dt);

    // 鱼杆平滑跟随鼠标
    rodCur.z += (rodAim.z - rodCur.z) * Math.min(1, dt * 6);
    rodCur.y += (rodAim.y - rodCur.y) * Math.min(1, dt * 6);
    setRodAngle(ROD_REST_ANGLE + rodCur.y, rodCur.z);
    // 把鱼杆支点放到岸边
    rodGroup.position.copy(ROD_PIVOT);

    // 水花/鱼跃/捕获序列推进
    updateSplashes(dt);
    updateCatchSequence(dt);
    updateCinematicRecover(dt);

    controls.update();                 // 旋转/缩放阻尼
    applyShake(dt);                    // 镜头震动叠加
    camera.position.x += shake.offX;
    camera.position.y += shake.offY;

    updateLine();
    updateRipples(dt);

    // 更新 DoF 参数（基于相机与对焦点的距离 → 强度自适应）
    const dist = camera.position.length();
    dofState.blur = clamp(0.35 + (dist - dofState.focusDist) * 0.12, 0, 1.4);
    postMat.uniforms.uBlur.value = dofState.blur;
    postMat.uniforms.uTexel.value.set(1/(stageEl.clientWidth||1), 1/(stageEl.clientHeight||1));

    // 计算水面在世界 y=0 处的屏幕 vUv.y（驱动 SSR 水线）
    {
      const wp = new THREE.Vector3(0, 0, 0).project(camera);
      postMat.uniforms.uWaterY.value = clamp(wp.y*0.5 + 0.5, 0.1, 0.9);
    }

    // 1) 把场景渲染到 RT
    renderer.setRenderTarget(sceneRT);
    renderer.render(root, camera);
    // 2) 用 ShaderPass 画到屏幕
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCam);

    requestAnimationFrame(tick);
  }

  /* ---------- 自适应尺寸 ---------- */
  function resize(){
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // 同步 Reflector 的渲染目标尺寸（避免模糊/撕裂）
    if (reflector && reflector.getRenderTarget){
      const dpr = Math.min(window.devicePixelRatio, 2);
      reflector.getRenderTarget().setSize(w*dpr, h*dpr);
    }
    // 同步 DoF RT
    if (sceneRT) sceneRT.setSize(w, h);
  }

  /* ---------- DoF 后处理（双 Pass 模糊） ---------- */
  // 渲染场景到 sceneRT，然后用模糊 ShaderPass 画到屏幕
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat });
  const dofState = { enabled:true, focusDist: 9, range: 8, blur: 0.7 };
  const postScene = new THREE.Scene();
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: sceneRT.texture },
      uTexel: { value: new THREE.Vector2(1/1024, 1/1024) },
      uBlur:  { value: dofState.blur },
      uWaterY: { value: 0.55 },
      uSsrStrength: { value: 0.55 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: `
      precision highp float;
      uniform sampler2D tDiffuse;
      uniform vec2 uTexel;
      uniform float uBlur;
      uniform float uWaterY;       // 水面在屏幕空间的 Y（0..1）
      uniform float uSsrStrength;  // 反射强度
      varying vec2 vUv;

      vec4 dofSample(vec2 uv){
        if (uBlur <= 0.001) return texture2D(tDiffuse, uv);
        vec2 off1 = vec2(1.3846153846) * uTexel * uBlur;
        vec2 off2 = vec2(3.2307692308) * uTexel * uBlur;
        vec4 c = vec4(0.0);
        c += texture2D(tDiffuse, uv) * 0.2270270270;
        c += texture2D(tDiffuse, uv + off1) * 0.3162162162;
        c += texture2D(tDiffuse, uv - off1) * 0.3162162162;
        c += texture2D(tDiffuse, uv + off2) * 0.0702702703;
        c += texture2D(tDiffuse, uv - off2) * 0.0702702703;
        vec2 dir = uv - vec2(0.5);
        c += texture2D(tDiffuse, uv + dir * 0.04 * uBlur) * 0.15;
        c += texture2D(tDiffuse, uv - dir * 0.04 * uBlur) * 0.15;
        return c;
      }

      void main(){
        vec4 base = dofSample(vUv);

        // 屏幕空间近似反射：仅在水线以下采样镜像
        if (vUv.y < uWaterY && uSsrStrength > 0.001){
          // 镜像采样：y 距离水线越远，扰动越大（模拟波纹）
          float dy = uWaterY - vUv.y;                  // 0..uWaterY
          float t = dy / max(uWaterY, 0.001);          // 0..1
          // 镜像点：把 vUv 的 y 翻折到水线之上
          vec2 mirrorUv = vec2(vUv.x + sin(vUv.y*60.0 + vUv.x*30.0)*0.003, uWaterY + dy);
          mirrorUv.y = clamp(mirrorUv.y, 0.0, 1.0);
          // 多 tap 让反射有水面波纹扰动
          vec3 col = vec3(0.0);
          float wsum = 0.0;
          for (int i = -2; i <= 2; i++){
            vec2 uv = mirrorUv + vec2(float(i)*0.0025, float(i)*0.0015);
            col += dofSample(uv).rgb * (1.0 - abs(float(i))/3.0);
            wsum += (1.0 - abs(float(i))/3.0);
          }
          col /= max(wsum, 0.0001);
          // 距离水线越远反射越弱（避免画面全反射）
          float fres = pow(1.0 - t, 1.4);
          base.rgb = mix(base.rgb, base.rgb * 0.65 + col * 0.55, fres * uSsrStrength);
        }

        gl_FragColor = vec4(base.rgb, 1.0);
      }
    `,
  });
  const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
  postScene.add(postQuad);
  window.addEventListener('resize', resize);
  resize();

  // 初始
  setWeather('晴');
  tick();

  // API
  return {
    cast,
    bobberNibble,
    bobberBite,
    bobberReset,
    showFish,
    spawnRipple,
    projectBobber,
    setWeather,
    catchSequence,
    spawnSplash,
    triggerShake,
    controls,                 // 暴露给需要时调用 reset()
  };
})();


export { scene };
