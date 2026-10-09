/* ==========================================================
   数据层
   ========================================================== */

// 鱼：emj/名字/稀有度/价值/重量区间/描述/尺寸/水域偏好/鱼饵偏好/天气偏好/时间段偏好
const NEW_FISH = [
  // ── 河/溪 ──
  { id:'trout',    emj:'🐟', name:'虹鳟',   rarity:'常见', minKg:0.3,maxKg:1.5, base:25,
    waters:['river','lake'], baits:['worm','lure','shrimp'], weathers:['晴','雨'], times:['清晨','黄昏'],
    flavor:'冷水鱼，肉粉嫩。清流中跳跃闪银光，被誉为"溪流精灵"。' },
  { id:'pike',     emj:'🐊', name:'白斑狗鱼', rarity:'少见', minKg:2.0,maxKg:8.0, base:120,
    waters:['river','lake'], baits:['lure','shrimp','worm'], weathers:['晴','雾'], times:['清晨','黄昏'],
    flavor:'伪装大师，水草中伏击。牙齿锋利，垂钓者要小心。' },
  { id:'crayfish', emj:'🦞', name:'小龙虾',  rarity:'常见', minKg:0.05,maxKg:0.3, base:8,
    waters:['river','pond'], baits:['worm','shrimp','corn'], weathers:['晴','雨'], times:['黄昏','深夜'],
    flavor:'夏季夜市之王。麻辣十三香是它的宿命。钳子越大越肥。' },
  { id:'perch',    emj:'🐠', name:'河鲈',   rarity:'常见', minKg:0.2,maxKg:1.0, base:30,
    waters:['river','lake','sea'], baits:['worm','shrimp','lure'], weathers:['晴','雨'], times:['清晨','正午','黄昏'],
    flavor:'条纹醒目，群居性。找到一条往往意味着附近一群。' },

  // ── 深海 ──
  { id:'mackerel', emj:'🐟', name:'鲭鱼',   rarity:'常见', minKg:0.4,maxKg:1.5, base:30,
    waters:['sea','deepsea'], baits:['lure','shrimp','worm'], weathers:['晴','雨'], times:['清晨','黄昏'],
    flavor:'远洋洄游鱼，肉味鲜美，富含 Omega-3。' },
  { id:'squid',    emj:'🦑', name:'鱿鱼',   rarity:'少见', minKg:0.2,maxKg:2.0, base:80,
    waters:['sea','deepsea','abyss'], baits:['shrimp','lure'], weathers:['晴','雾'], times:['深夜','黄昏'],
    flavor:'夜行软体，墨汁是它逃跑的武器。钓它要用亮片假饵。' },
  { id:'tuna',     emj:'🐟', name:'金枪鱼', rarity:'稀有', minKg:5.0,maxKg:30, base:500,
    waters:['deepsea','abyss'], baits:['lure','shrimp'], weathers:['晴'], times:['清晨'],
    flavor:'海洋顶级掠食者，速度 70 km/h。寿司之王。' },
  { id:'swordfish',emj:'🗡', name:'剑鱼',   rarity:'史诗', minKg:10,maxKg:80, base:1500,
    waters:['deepsea','abyss'], baits:['lure','shrimp'], weathers:['晴'], times:['清晨','正午'],
    flavor:'海中刺客。剑喙能刺穿渔船底板。' },
  { id:'anglerfish',emj:'💡',name:'鮟鱇鱼', rarity:'神秘', minKg:0.5,maxKg:5.0, base:3000,
    waters:['abyss'], baits:['lure','shrimp'], weathers:['雾','雪'], times:['深夜'],
    flavor:'深渊发光诱饵，第一根背鳍就是钓竿。雌雄寄生。' },

  // ── 雪原/冰湖 ──
  { id:'whitefish',emj:'🐟', name:'白鲑',   rarity:'少见', minKg:0.5,maxKg:2.0, base:60,
    waters:['glacier'], baits:['worm','shrimp','lure'], weathers:['雪','雾'], times:['清晨','正午'],
    flavor:'极地冰湖特产。肉质雪白细腻，俄罗斯鱼子酱原料之一。' },
  { id:'arctic-char',emj:'🐠',name:'北极红点鲑',rarity:'稀有',minKg:1.0,maxKg:5.0, base:280,
    waters:['glacier'], baits:['lure','shrimp','worm'], weathers:['雪'], times:['清晨','黄昏'],
    flavor:'冰岛国鱼。粉橘鱼肉，质如三文鱼。' },

  // ── 雨林/沼泽 ──
  { id:'arapaima',emj:'🐟', name:'巨骨舌鱼', rarity:'史诗', minKg:30,maxKg:200, base:3000,
    waters:['swamp'], baits:['lure','worm','shrimp'], weathers:['雨','雾'], times:['清晨','黄昏'],
    flavor:'亚马逊巨兽。需 30+ 力量拉起。活化石，已存在 1 亿年。' },
  { id:'electric-eel',emj:'⚡',name:'电鳗',  rarity:'神秘', minKg:5.0,maxKg:20, base:5000,
    waters:['swamp'], baits:['lure','shrimp','worm'], weathers:['雨'], times:['深夜'],
    flavor:'可释放 800 伏电压。需用绝缘装备。钓到后请立即松线。' },

  // ── 季节限定（每个季节一种稀有）──
  { id:'spring-koi',emj:'🐠',name:'春之锦鲤',  rarity:'稀有', minKg:1.5,maxKg:5.0, base:400,
    waters:['pond','lake'], baits:['bread','corn'], weathers:['晴'], times:['清晨','正午','黄昏','深夜'],
    flavor:'春分前后现身。鳞片金红交织如彩霞。' },
  { id:'summer-dolphin',emj:'🐬',name:'夏之海豚',rarity:'史诗', minKg:20,maxKg:80, base:5000,
    waters:['sea','deepsea'], baits:['lure','shrimp'], weathers:['晴'], times:['正午'],
    flavor:'夏至时群跃出海面。象征海洋的快乐精灵。' },
  { id:'autumn-carp',emj:'🐠',name:'秋之红鲤',rarity:'稀有', minKg:2.0,maxKg:6.0, base:600,
    waters:['lake','pond'], baits:['bread','corn','worm'], weathers:['晴','雾'], times:['清晨','黄昏'],
    flavor:'秋分时鳞转深红。寓意年年有余。' },
  { id:'winter-cod',emj:'🐟', name:'冬之鳕鱼',  rarity:'稀有', minKg:1.0,maxKg:8.0, base:350,
    waters:['glacier','sea'], baits:['shrimp','worm','lure'], weathers:['雪','雾'], times:['深夜','清晨'],
    flavor:'冬至前后游近冰层。肝油是维 D 之王。' },

  // ── BOSS / 传说 ──
  { id:'koi-emperor',emj:'👑',name:'锦鲤王',rarity:'传说',minKg:5.0,maxKg:15, base:10000,
    waters:['pond','lake'], baits:['corn','bread'], weathers:['晴'], times:['清晨','黄昏'],
    flavor:'百年一遇。三色鳞片组成王冠图案。钓到者一生好运。' },
  { id:'sea-dragon',emj:'🐉',name:'海龙',    rarity:'传说', minKg:50,maxKg:200, base:20000,
    waters:['abyss','deepsea'], baits:['lure'], weathers:['雾','雪'], times:['深夜'],
    flavor:'传说中的海渊之主。据说见过的人会获得一整年大丰收。' },
  { id:'rainbow-fish',emj:'🌈',name:'彩虹鱼',  rarity:'传说', minKg:0.5,maxKg:3.0, base:8000,
    waters:['lake','river','pond'], baits:['bread','lure'], weathers:['晴','雨'], times:['清晨','黄昏'],
    flavor:'每片鳞闪不同颜色。传说把它们都集齐能看到天堂的颜色。' },
  { id:'phoenix-fish',emj:'🔥',name:'凤尾鱼',  rarity:'传说', minKg:2.0,maxKg:8.0, base:15000,
    waters:['lava','abyss'], baits:['lure','shrimp'], weathers:['晴'], times:['黄昏','深夜'],
    flavor:'尾巴像火焰。百年才回游一次近海，被认为是凤的化身。' },
];

// ============= 新地点（5 现有 + 4 新增 = 9）=============
const NEW_PLACES = [
  { id:'swamp',   name:'雨林沼泽', weather:['雨','雾'], time:['清晨','黄昏'],
    desc:'亚马逊风格的红树林沼泽，水色深褐。能钓到电鳗和巨骨舌鱼。',
    req:{ lv:5, money:200 }, fishChance:[50,30,15,4,0.8,0.18,0.02,0.0] },
  { id:'glacier', name:'雪原冰湖', weather:['雪','雾'], time:['清晨','正午'],
    desc:'永冻冰层下的清冽湖水，氧气充足。极地鱼种活跃。',
    req:{ lv:4, money:300 }, fishChance:[40,35,18,5,1.5,0.45,0.05,0.0] },
  { id:'lava',    name:'熔岩海岸', weather:['晴'], time:['黄昏','深夜'],
    desc:'海底火山口的奇景。温度极高，只有火属性鱼类能生存。',
    req:{ lv:8, money:2000 }, fishChance:[20,25,30,15,7,2,0.9,0.1] },
  { id:'abyss',   name:'深渊海沟', weather:['雾','雪'], time:['深夜'],
    desc:'阳光永远到达不了的地方。传说级鱼类偶尔出没。',
    req:{ lv:7, money:1500 }, fishChance:[15,25,28,18,8,4,1.5,0.5] },
];

// ============= 新鱼竿（4 现有 + 2 新增 = 6）=============
const NEW_RODS = [
  { id:'rod-glass',  emj:'🪞', name:'玻璃钢竿', price:6000, type:'rod', desc:'碳纤维混合，强度高，传说鱼出现率 +8%。',
    effect:{ legBonus:8, hookBonus:5 }, passive:'传说 +8%' },
  { id:'rod-stellar',emj:'✨', name:'星辉玉竿', price:12000, type:'rod', desc:'镶嵌星辰碎片的传说竿。传说鱼出现率 +15%，抛投距离 +35%。',
    effect:{ legBonus:15, hookBonus:10, rangeBonus:35 }, passive:'传说 +15% 距离 +35%' },
];

// ============= 新鱼饵（5 现有 + 3 新增 = 8）=============
const NEW_BAITS = [
  { id:'bait-bug',    emj:'🪲', name:'红虫 ×5', price:90, type:'bait', item:'bug', amount:5,
    desc:'腥味浓，肉食鱼和稀有鱼都爱。溪流湖泊通用。' },
  { id:'bait-dough',  emj:'🥟', name:'发酵饵 ×3', price:150, type:'bait', item:'dough', amount:3,
    desc:'老面发酵，散发独特酸味，狡猾的鱼放松警惕。' },
  { id:'bait-live',   emj:'🐟', name:'活小鱼 ×2', price:240, type:'bait', item:'live', amount:2,
    desc:'活鱼在水中游动，吸引大型掠食者。海/深水专属。' },
];

// ============= 新成就（10 现有 + 12 新增 = 22）=============
const NEW_ACHIEVEMENTS = [
  // 新增
  { id:'hundred',     ico:'🏆', name:'百鱼斩', desc:'累计捕获 100 条鱼', reward:800, check: s => s.totalCatch >= 100 },
  { id:'fifty-kg',    ico:'⚖', name:'半吨渔夫', desc:'捕获单条超过 50kg 的鱼', reward:1500, check: s => s.biggestKg >= 50 },
  { id:'collector-15',ico:'⭐', name:'初级收藏家', desc:'图鉴达到 15 种鱼', reward:300, check: s => s.codexCount >= 15 },
  { id:'collector-30',ico:'🌟', name:'资深收藏家', desc:'图鉴达到 30 种鱼（全收集）', reward:3000, check: s => s.codexCount >= 30 },
  { id:'collector-50',ico:'💎', name:'传说收藏家', desc:'捕获 50 条传说鱼', reward:5000, check: s => s.legend >= 50 },
  { id:'night-fisher',ico:'🌙', name:'夜行者', desc:'在深夜时段捕获 20 条鱼', reward:400, check: s => s.nightCatch >= 20 },
  { id:'rain-master',ico:'🌧', name:'雨师', desc:'在雨天捕获 30 条鱼', reward:350, check: s => s.rainCatch >= 30 },
  { id:'perfect-10', ico:'✨', name:'完美十次', desc:'完成 10 次完美收线（不停在绿色区）', reward:500, check: s => s.perfectReel >= 10 },
  { id:'rod-collector',ico:'🎋', name:'竿架满堂', desc:'拥有所有 6 款鱼竿', reward:600, check: s => s.ownedRods >= 6 },
  { id:'bait-collector',ico:'🪱', name:'饵料大师', desc:'使用过所有 8 种鱼饵', reward:200, check: s => s.usedBaits >= 8 },
  { id:'no-escape',   ico:'🎯', name:'百发百中', desc:'连续 10 次抛杆不跑鱼', reward:500, check: s => s.noEscapeStreak >= 10 },
  { id:'season-master',ico:'🌸',name:'四季渔夫', desc:'捕获 4 种季节限定鱼', reward:800, check: s => s.seasonFish >= 4 },
];

// ============= 新每日任务 =============
const DAILY_QUESTS = [
  { id:'q-cast-5',   name:'今日出竿',  desc:'今天抛竿 5 次',  target:'totalCast', goal:5, reward:50 },
  { id:'q-catch-3',  name:'今日丰收',  desc:'今天捕获 3 条鱼', target:'totalCatch', goal:3, reward:80 },
  { id:'q-perfect-1',name:'今日一搏',  desc:'今天完成 1 次完美收线', target:'perfectReel', goal:1, reward:100 },
  { id:'q-earn-200', name:'今日收益',  desc:'今天赚取 200 金币', target:'todayEarn', goal:200, reward:120 },
  { id:'q-rare-1',   name:'今日寻宝',  desc:'今天捕获 1 条稀有或更高级鱼', target:'todayRare', goal:1, reward:200 },
];

// ============= 鱼图鉴段位 =============
const COLLECTION_TIERS = [
  { min:0,  max:4,  tier:'初识',  color:'#9fb1c6' },
  { min:5,  max:9,  tier:'入门',  color:'#7be39c' },
  { min:10, max:14, tier:'熟练',  color:'#7ad7ff' },
  { min:15, max:19, tier:'资深',  color:'#ffd166' },
  { min:20, max:24, tier:'专家',  color:'#ff7a59' },
  { min:25, max:29, tier:'大师',  color:'#cc88ff' },
  { min:30, max:30, tier:'宗师',  color:'#ffd166' },
];

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
  // ── 扩展鱼（见文件下方 NEW_FISH）──
  ...NEW_FISH
];

const BAITS = [
  { id:'bread', emj:'🍞', name:'面团', desc:'便宜好用，淡水通用。'},
  { id:'worm',  emj:'🪱', name:'蚯蚓', desc:'万能鱼饵，肉食鱼也爱。'},
  { id:'corn',  emj:'🌽', name:'玉米', desc:'清香吸引大鱼，慢节奏。'},
  { id:'shrimp',emj:'🦐', name:'河虾', desc:'腥味浓，肉食性首选。'},
  { id:'lure',  emj:'✨', name:'亮片假饵', desc:'高抛远投，吸引凶猛鱼。'},
  { id:'bug',   emj:'🪲', name:'红虫', desc:'腥味浓烈，钓鲶鱼/鲈鱼首选。'},
  { id:'dough', emj:'🥟', name:'发酵饵', desc:'酸味独特，狡猾的鱼放松警惕。'},
  { id:'live',  emj:'🐟', name:'活小鱼', desc:'在水中游动，吸引大型掠食者。海/深水专属。'},
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
  // ── 扩展地点（见 NEW_PLACES）──
  ...NEW_PLACES
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
  // ── 扩展成就（见 NEW_ACHIEVEMENTS）──
  ...NEW_ACHIEVEMENTS
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
  // ── 扩展商品（见 NEW_RODS / NEW_BAITS）──
  ...NEW_RODS, ...NEW_BAITS
];

// ============= 合并：扩展数据 =============
// 新鱼（追加到 FISH 后面）
// 额外数据：扩展现有 15 鱼、5 地点、4 竿、5 饵
// 按现有 ID 命名风格延续

// ============= 新鱼（15 现有 + 15 新增 = 30）=============
export { FISH, BAITS, PLACES, WEATHERS, TIMES, ACHIEVEMENTS, SHOP, DAILY_QUESTS, COLLECTION_TIERS };
