# 📚 shared/ — 跨 web/mobile 复用模块

> 9 个核心模块。**所有逻辑都在这里**，web 与 mobile 只通过各自的 `main.js` / `ui.js` 适配层调用。

## 模块清单

| 模块 | 行数 | 职责 |
|---|---|---|
| [`state.js`](./state.js) | ~95 | state binding + `load/save/resetState/applyImportedState` |
| [`validate.js`](./validate.js) | ~160 | 字段白名单 / 类型 / 范围校验（修复坏数据） |
| [`util.js`](./util.js) | ~80 | DOM helper：`$` / `el` / `clamp` / `toast` / `rand` |
| [`data.js`](./data.js) | ~280 | 常量：`FISH` / `BAITS` / `PLACES` / `SHOP` / `ACHIEVEMENTS` |
| [`audio.js`](./audio.js) | ~190 | WebAudio BGM + 音效（cast/splash/reel/click/...） |
| [`scene.js`](./scene.js) | ~820 | Three.js 3D 场景：水面、浮漂、捕获序列、天气粒子 |
| [`game.js`](./game.js) | ~340 | 玩法逻辑：`cast` / `tryBite` / `reel` / `miniReelGame` / `captureFish` |
| [`savecode.js`](./savecode.js) | ~95 | 离线存档码 `LK1.<b64>.<crc32>`：编码 / 解码 / CRC32 |
| [`slots.js`](./slots.js) | ~110 | 多存档槽管理：localStorage 列表 + 自动重建索引 |

> 端点（`web/src/main.js` + `mobile/src/main.js`）只负责：DOM 事件绑定 / 屏幕适配 / 触屏行为差异化。
>
> 业务规则（抛竿成功率、收线判定、鱼价、升级曲线、成就触发）全部在 `shared/`。

## 📦 数据流

```
[localStorage]
   ↓ load()
[validateState()] ──→ [state] ──→ [renderHUD/renderPlaces/...]
   ↑ save()                              ↓
   └────────── [cast/reel/buyItem/...] ───┘
                                  ↓
                            [game:state-changed]
                            [game:bait-changed]
                            [game:caught]
```

## 🔄 同步

`shared/` 是单一真源。每次修改后跑：

```bash
bash scripts/sync-shared.sh
```

把以下文件同步到 `web/src/`、`mobile/src/`、`vendor/`：

```
shared/state.js     → web/src/state.js     → mobile/src/state.js
shared/util.js      → web/src/util.js      → mobile/src/util.js
shared/data.js      → web/src/data.js      → mobile/src/data.js
shared/audio.js     → web/src/audio.js     → mobile/src/audio.js
shared/game.js      → web/src/game.js      → mobile/src/game.js
shared/scene.js     → web/src/scene.js     → mobile/src/scene.js
shared/savecode.js  → web/src/savecode.js  → mobile/src/savecode.js
shared/slots.js     → web/src/slots.js     → mobile/src/slots.js
shared/validate.js  → web/src/validate.js  → mobile/src/validate.js
```

## 🔁 依赖图（无环）

```
audio.js      ──(叶)
data.js       ──(叶)
util.js       ──(叶)
validate.js   → data.js
state.js      → util.js, audio.js, validate.js
slots.js      ──(叶)
savecode.js   ──(叶)
scene.js      → util.js
game.js       → state, util, data, audio, scene
```

ui.js 不 import game.js（避免共享模块循环）；game.js 不 import ui.js（保持端点无关）。

## 📜 License

MIT
