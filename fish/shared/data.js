/* ==========================================================
   数据层
   ========================================================== */

// 鱼：emj/名字/稀有度/价值/重量区间/描述/尺寸/水域偏好/鱼饵偏好/天气偏好/时间段偏好
const FISH = [
  { id:'crucian',  emj:'🐟', name:'鲫鱼',   rarity:'常见', minKg:0.2,maxKg:0.8, base:18,
    waters:['lake','pond','river'], baits:['bread','worm','corn'], weathers:['晴','雨','雾','雪'], times:['清晨','正午','黄昏','深夜'],
    flavor:'最平凡也最亲切的鱼，炖汤一绝。新手的第一条鱼。' },
  { id:'carp',     emj:'🐠', name:'鲤鱼',   rarity:'常见', minKg:0.8,maxKg:3.0, base:35,
    waters:['lake','pond','river'], baits:['bread','corn','worm'], weathers:['晴','雨'], times:['清晨','黄昏'],
    flavor:'身披金鳞，象征好运。据说黄昏上钩最频繁。' },
  { id:'catfish',  emj:'🐡', name:'鲶鱼',   rarity:'少见', minKg:1.0,maxKg:6.0, base:70,
    waters:['lake','river'], baits:['worm','shrimp'], weathers:['雨','雾'], times:['深夜','黄昏'],
    flavor:'光滑无鳞，喜阴雨。常在浑水深处出没。' },
  { id:'bass',     emj:'🐟', name:'鲈鱼',   rarity:'少见', minKg:0.5,maxKg:2.5, base:55,
    waters:['lake','river','sea'], baits:['shrimp','lure'], weathers:['晴'], times:['清晨','正午'],
    flavor:'肉质细嫩，刺少。白天活动，肉食性，攻击假饵迅速。' },
  { id:'crucian-gold', emj:'🐠', name:'金鲫', rarity:'罕见', minKg:0.3,maxKg:1.2, base:120,
    waters:['pond','lake'], baits:['bread','corn'], weathers:['晴'], times:['清晨','黄昏'],
    flavor:'通体橙金，被视为吉祥之鱼，多见于古寺放生池。' },
  { id:'eel',      emj:'🐍', name:'鳗鱼',   rarity:'罕见', minKg:0.6,maxKg:2.0, base:140,
    waters:['river','sea'], baits:['worm','shrimp'], weathers:['雨','雾'], times:['深夜'],
    flavor:'滑不留手，常在夜间洄游。雨后水位上涨时最易出现。' },
  { id:'koi',      emj:'🐡', name:'锦鲤',   rarity:'稀有', minKg:1.0,maxKg:4.0, base:240,
    waters:['pond'], baits:['bread','corn'], weathers:['晴'], times:['正午','黄昏'],
    flavor:'色彩斑斓，传说中能带来好运的鱼。只在清澈放生池现身。' },
  { id:'sturgeon',   emj:'🐋', name:'鲟鱼', rarity:'稀有', minKg:5,maxKg:25, base:480,
    waters:['sea','river'], baits:['shrimp','worm'], weathers:['雾','雨'], times:['深夜','清晨'],
    flavor:'古老物种，可活百年。鱼子酱的来源，体型巨大。' },
  { id:'mahi',     emj:'🐟', name:'鬼头刀', rarity:'稀有', minKg:2,maxKg:12, base:380,
    waters:['sea'], baits:['lure','shrimp'], weathers:['晴'], times:['正午'],
    flavor:'海面追逐飞饵的狂飙手，速度极快，颜色会随情绪变化。' },
  { id:'tuna',     emj:'🐟', name:'金枪鱼', rarity:'史诗', minKg:10,maxKg:80, base:1200,
    waters:['sea','deepsea'], baits:['lure','shrimp'], weathers:['晴','雾'], times:['清晨','正午'],
    flavor:'远洋高速巡游者，需要极远的抛投才有机会碰到。' },
  { id:'swordfish',emj:'🗡️', name:'剑鱼', rarity:'史诗', minKg:20,maxKg:150, base:1800,
    waters:['deepsea'], baits:['lure'], weathers:['晴'], times:['正午'],
    flavor:'吻如长剑，跃出海面的瞬间令人屏息。远海王者。' },
  { id:'lantern',  emj:'🎏', name:'灯笼鱼', rarity:'神秘', minKg:0.2,maxKg:1.0, base:600,
    waters:['deepsea'], baits:['lure','worm'], weathers:['雾','雨'], times:['深夜'],
    flavor:'自带冷光的小生灵。雨雾深夜浮上近海，吸引钓者屏息。' },
  { id:'crystal',  emj:'💎', name:'水晶鳗', rarity:'神秘', minKg:0.5,maxKg:1.5, base:900,
    waters:['river','pond'], baits:['shrimp','worm'], weathers:['雾'], times:['清晨'],
    flavor:'通体半透如水晶，传说栖息在未被污染的源头溪涧。' },
  { id:'golden',   emj:'🏆', name:'金鳞龙鱼', rarity:'传说', minKg:3,maxKg:12, base:5000,
    waters:['lake','pond'], baits:['lure','shrimp'], weathers:['晴'], times:['清晨','黄昏'],
    flavor:'鳞片闪烁金光，是传说中的祥瑞。极低概率，遇见即是缘。' },
  { id:'moon',     emj:'🌙', name:'月牙银鱼', rarity:'传说', minKg:0.3,maxKg:1.0, base:4500,
    waters:['lake','river'], baits:['bread','shrimp'], weathers:['雾'], times:['深夜'],
    flavor:'满月雾气中现身的银色精灵。据说会实现三个愿望。' },
];

const BAITS = [
  { id:'bread', emj:'🍞', name:'面团', desc:'便宜好用，淡水通用。'},
  { id:'worm',  emj:'🪱', name:'蚯蚓', desc:'万能鱼饵，肉食鱼也爱。'},
  { id:'corn',  emj:'🌽', name:'玉米', desc:'清香吸引大鱼，慢节奏。'},
  { id:'shrimp',emj:'🦐', name:'河虾', desc:'腥味浓，肉食性首选。'},
  { id:'lure',  emj:'✨', name:'亮片假饵', desc:'高抛远投，吸引凶猛鱼。'},
];

const PLACES = [
  { id:'pond', name:'村边小塘', weather:['晴','雨'], time:['清晨','正午','黄昏'],
    desc:'村东头的小水塘，水浅鱼杂，适合新手。',
    req:{ lv:1 }, fishChance:[80,15,4,1,0] },
  { id:'lake', name:'青石湖',  weather:['晴','雨','雾'], time:['清晨','正午','黄昏','深夜'],
    desc:'群山环绕的湖泊，水深鱼肥，传说有金鳞龙出没。',
    req:{ lv:2 }, fishChance:[55,28,12,4,1] },
  { id:'river', name:'清溪河',  weather:['晴','雨','雾'], time:['清晨','黄昏','深夜'],
    desc:'山涧汇成的河流，水流清澈，盛产鳗鱼与水晶鳗。',
    req:{ lv:3 }, fishChance:[40,32,12,5,1] },
  { id:'sea', name:'蔚蓝海湾',  weather:['晴','雾'], time:['清晨','正午'],
    desc:'开阔的近海，金枪鱼与鬼头刀的狩猎场。',
    req:{ lv:5, money:200 }, fishChance:[25,30,25,15,5] },
  { id:'deepsea', name:'深渊之海',  weather:['晴','雾','雨'], time:['深夜','清晨','正午'],
    desc:'神秘莫测的远洋，剑鱼与灯笼鱼的舞台。',
    req:{ lv:8, money:1500 }, fishChance:[10,20,30,25,15] },
];

const WEATHERS = ['晴','雨','雾','雪'];
const TIMES    = ['清晨','正午','黄昏','深夜'];

const ACHIEVEMENTS = [
  { id:'first',    ico:'🐣', name:'初次启航', desc:'捕获第一条鱼', reward:50,
    check: s => s.totalCatch >= 1 },
  { id:'ten',      ico:'🎯', name:'小有所成', desc:'累计捕获 10 条鱼', reward:120,
    check: s => s.totalCatch >= 10 },
  { id:'fifty',    ico:'🏅', name:'渔翁之利', desc:'累计捕获 50 条鱼', reward:300,
    check: s => s.totalCatch >= 50 },
  { id:'first-rare',ico:'💎', name:'璀璨之遇', desc:'捕获 1 条稀有或更高级鱼', reward:200,
    check: s => s.totalRarity >= 1 },
  { id:'big-one',  ico:'🐳', name:'巨物猎人', desc:'捕获超过 10kg 的鱼', reward:250,
    check: s => s.biggestKg >= 10 },
  { id:'lucky',    ico:'🍀', name:'欧皇附体', desc:'捕获 1 条传说鱼', reward:1000,
    check: s => s.legend >= 1 },
  { id:'explorer', ico:'🗺', name:'足迹遍布', desc:'在所有地点各钓至少一次', reward:400,
    check: s => Object.keys(s.places).length >= PLACES.length },
  { id:'rich',     ico:'💰', name:'腰缠万贯', desc:'持有金币达到 5000', reward:0,
    check: s => s.money >= 5000 },
  { id:'codex',    ico:'📖', name:'博物学家', desc:'在图鉴中点亮 10 种鱼', reward:500,
    check: s => s.codexCount >= 10 },
  { id:'patience', ico:'🧘', name:'静水流深', desc:'完成一次完美收线（无需拉断）', reward:180,
    check: s => s.perfectReel >= 1 },
];

const SHOP = [
  { id:'rod-basic',  emj:'🎣', name:'木竹鱼竿', price:0, type:'rod', desc:'入门装备，标配。',
    effect:{}, owned:true, passive:'基础款' },
  { id:'rod-bamboo', emj:'🎋', name:'精竹鱼竿', price:300, type:'rod', desc:'更轻，咬钩判定 +10%。',
    effect:{ hookBonus:10 }, passive:'咬钩 +10%' },
  { id:'rod-carbon', emj:'🪶', name:'碳纤维竿', price:900, type:'rod', desc:'轻韧，抛投距离 +20%。',
    effect:{ rangeBonus:20 }, passive:'距离 +20%' },
  { id:'rod-magic',  emj:'✨', name:'月辉玉竿', price:2400, type:'rod', desc:'稀有的光辉竿，传说品质 +5%。',
    effect:{ legBonus:5 }, passive:'传说 +5%' },

  { id:'bait-bread',  emj:'🍞', name:'面团 ×5', price:30, type:'bait', item:'bread', amount:5, desc:'便宜大碗。' },
  { id:'bait-worm',   emj:'🪱', name:'蚯蚓 ×5', price:60, type:'bait', item:'worm',  amount:5, desc:'夜钓常备。' },
  { id:'bait-corn',   emj:'🌽', name:'玉米 ×5', price:60, type:'bait', item:'corn',  amount:5, desc:'慢节奏诱大鱼。' },
  { id:'bait-shrimp', emj:'🦐', name:'河虾 ×5', price:120, type:'bait', item:'shrimp',amount:5, desc:'腥味浓郁。' },
  { id:'bait-lure',   emj:'✨', name:'亮片假饵 ×3', price:240, type:'bait', item:'lure', amount:3, desc:'远投利器。' },
];

export { FISH, BAITS, PLACES, WEATHERS, TIMES, ACHIEVEMENTS, SHOP };
