
const HIGH_SCORE_PREFIX='ratKingAllAnimalsTestHighscore_';
let highScore=0;
let gameMode='classic',classicMap='living',hardPointsThisRun=0;

function getHighscoreKey(){
  return gameMode==='timed' ? HIGH_SCORE_PREFIX+'timed_carnival_'+difficulty : HIGH_SCORE_PREFIX+currentMap;
}

function loadHighScore(){
  highScore=Number(localStorage.getItem(getHighscoreKey())||0);
  const hs=document.getElementById('highscore');
  if(hs)hs.textContent=highScore;
  const rhs=document.getElementById('resultHighValue');
  if(rhs)rhs.textContent=highScore;
}

const TIMED_LEADERBOARD_PREFIX='ratKingAllAnimalsTestTimedTop5_';
const DIFFICULTY_LABELS={easy:'Leicht',normal:'Normal',hard:'Schwer'};
function loadTimedLeaderboard(level=difficulty){
  try{
    const saved=JSON.parse(localStorage.getItem(TIMED_LEADERBOARD_PREFIX+level)||'[]');
    return Array.isArray(saved)?saved.filter(entry=>Number.isFinite(entry.score)).sort((a,b)=>b.score-a.score).slice(0,5):[];
  }catch(e){return []}
}
function renderLeaderboardList(listId,level){
  const list=document.getElementById(listId);if(!list)return;
  list.innerHTML='';
  const scores=loadTimedLeaderboard(level);
  if(!scores.length){const empty=document.createElement('li');empty.textContent='Noch keine Zeitläufe';list.appendChild(empty);return;}
  scores.forEach((entry,index)=>{
    const row=document.createElement('li');
    const rank=document.createElement('span');rank.textContent=(index+1)+'. '+entry.score+' Punkte';
    const date=document.createElement('span');date.textContent=entry.date?new Date(entry.date).toLocaleDateString('de-DE'):'';
    row.append(rank,date);list.appendChild(row);
  });
}
function renderTimedLeaderboards(){
  const label=DIFFICULTY_LABELS[difficulty]||'Leicht';
  document.getElementById('menuLeaderboardDifficulty').textContent=label;
  document.getElementById('resultLeaderboardDifficulty').textContent=label;
  renderLeaderboardList('menuLeaderboardList',difficulty);
  renderLeaderboardList('resultLeaderboardList',difficulty);
  document.getElementById('menuLeaderboardPanel').classList.toggle('hidden',gameMode!=='timed');
  document.getElementById('resultLeaderboardPanel').classList.toggle('hidden',gameMode!=='timed');
}
function saveTimedScore(){
  const scores=loadTimedLeaderboard(difficulty);
  scores.push({score,date:new Date().toISOString()});
  scores.sort((a,b)=>b.score-a.score);
  localStorage.setItem(TIMED_LEADERBOARD_PREFIX+difficulty,JSON.stringify(scores.slice(0,5)));
  renderTimedLeaderboards();
}

const HARD_WINS_KEY='ratKingAllAnimalsTestHardWins';
let hardWins=0;
function updateHardWinsDisplay(){
  const menuValue=document.getElementById('hardWins');
  const resultValue=document.getElementById('resultHardWins');
  const skinValue=document.getElementById('skinPoints');
  if(menuValue)menuValue.textContent=hardWins;
  if(resultValue)resultValue.textContent=hardWins;
  if(skinValue)skinValue.textContent=hardWins;
}
function loadHardWins(){
  const saved=Number(localStorage.getItem(HARD_WINS_KEY));
  hardWins=Number.isSafeInteger(saved)&&saved>0?saved:0;
  updateHardWinsDisplay();
}
function recordHardWin(points=1){
  if(hardWinRecorded&&gameMode!=='timed')return false;
  hardWinRecorded=true;
  hardWins+=points;
  localStorage.setItem(HARD_WINS_KEY,String(hardWins));
  updateHardWinsDisplay();
  return points;
}
loadHardWins();

const RAT_SKIN_STORAGE_KEY='ratKingAllAnimalsTestSelectedSkin';
const OWNED_SKINS_STORAGE_KEY='ratKingAllAnimalsTestOwnedSkins';
const SKIN_PRICE_MIGRATION_KEY='ratKingAllAnimalsTestSkinPricesV1';
const COLLECTION_STORAGE_KEY='ratKingAllAnimalsTestFoodBooksV1';
const FOOD_BOOKS=[
  {id:'vegetarian',name:'Vegetarierbuch',goal:500,reward:'Schaf',skinId:'broccoliKing',items:['🍞','🥨','🧀','🍎','🍌','🥕','🍿','🍟','🍓','🍇','🍉','🥚']},
  {id:'sweets',name:'Süßigkeitenbuch',goal:250,reward:'Zuckerschock-Hamster',skinId:'sugarAxolotl',items:['🍪','🍰','🍩','🍦','🥞','🍫','🥧']},
  {id:'meals',name:'Mahlzeitenbuch',goal:250,reward:'Superhelden-Waschbär',skinId:'heroRaccoon',items:['🍕','🍔','🌮','🥪','🌭','🍣','🌯']},
  {id:'meat',name:'Fleischfresserbuch',goal:300,reward:'Wurst-Dackel',skinId:'grillLlama',items:['🥓','🍗','🍖','🥩']}
];
const ALL_EATER_SKIN_ID='trashDragon';
let foodBookCounts=Object.fromEntries(FOOD_BOOKS.map(book=>[book.id,0]));
function loadFoodBookCounts(){
  try{
    const saved=JSON.parse(localStorage.getItem(COLLECTION_STORAGE_KEY)||'{}');
    for(const book of FOOD_BOOKS){const count=Number(saved?.[book.id]);foodBookCounts[book.id]=Number.isSafeInteger(count)&&count>0?count:0;}
  }catch(e){foodBookCounts=Object.fromEntries(FOOD_BOOKS.map(book=>[book.id,0]));}
}
function saveFoodBookCounts(){localStorage.setItem(COLLECTION_STORAGE_KEY,JSON.stringify(foodBookCounts));}
function recordFoodCollection(foodType){
  const book=FOOD_BOOKS.find(candidate=>candidate.items.includes(foodType));
  if(!book)return;
  foodBookCounts[book.id]++;
  saveFoodBookCounts();
  refreshCollectionUnlocks();
  const modal=document.getElementById('collectionModal');
  if(modal&&!modal.classList.contains('hidden'))renderCollectionBook();
}
loadFoodBookCounts();
for(const book of FOOD_BOOKS)foodBookCounts[book.id]=book.goal;
saveFoodBookCounts();
const RAT_SKINS=[
  {id:'classic',name:'Klassische Ratte',description:'Die vertraute graue Ratte',animal:'rat',cost:0,body:'#858585',belly:'#c9c0af',ear:'#dc9b94',nose:'#d98988',shade:'#55525b'},
  {id:'caramel',name:'Karamell-Ratte',description:'Warmes braunes Fell',animal:'rat',cost:0,body:'#9a6541',belly:'#e6c29a',ear:'#cc8c7c',nose:'#d88680',shade:'#62412f'},
  {id:'cream',name:'Creme-Ratte',description:'Helles cremefarbenes Fell',animal:'rat',cost:0,body:'#d8cbaa',belly:'#f3e7c8',ear:'#dda7a0',nose:'#da8b89',shade:'#8f8061'},
  {id:'pigeon',name:'Taube',description:'Ein flatternder Eindringling',animal:'pigeon',cost:3,body:'#8b929b',belly:'#d8d6d0',ear:'#adb3ba',nose:'#e3a04b',shade:'#535a63'},
  {id:'frog',name:'Frosch',description:'Hüpft gedanklich zumindest',animal:'frog',cost:5,body:'#70a74c',belly:'#d6df8e',ear:'#93c761',nose:'#6e9c48',shade:'#446c35'},
  {id:'raccoon',name:'Waschbär',description:'Nimmt alles sehr ernst',animal:'raccoon',cost:8,body:'#92918b',belly:'#e1d8c8',ear:'#c5b8a5',nose:'#363636',shade:'#55534f'},
  {id:'flamingo',name:'Flamingo',description:'Eleganz im falschen Haus',animal:'flamingo',cost:10,body:'#e9879c',belly:'#f5bdc7',ear:'#ee9cad',nose:'#f0c75a',shade:'#bd5e79'},
  {id:'broccoliKing',name:'Schaf',description:'Ein flauschiges Schaf mit kleinen Hufen',animal:'sheep',bookKey:'vegetarian',body:'#f0eadc',belly:'#fff9ed',ear:'#d99a9d',nose:'#624a45',shade:'#b7ab98'},
  {id:'sugarAxolotl',name:'Zuckerschock-Hamster',description:'Rund, rosig und mit riesigen Zuckerrausch-Augen',animal:'sugarHamster',bookKey:'sweets',body:'#eaa4c4',belly:'#fff0da',ear:'#f5b2c7',nose:'#c64d83',shade:'#ac718d'},
  {id:'heroRaccoon',name:'Superhelden-Waschbär',description:'Mit Umhang, Maske und Teller-Schild',animal:'heroRaccoon',bookKey:'meals',body:'#92918b',belly:'#e1d8c8',ear:'#c5b8a5',nose:'#363636',shade:'#55534f'},
  {id:'grillLlama',name:'Wurst-Dackel',description:'Langer Dackel mit Wurstkörper und Senfstreifen',animal:'sausageDachshund',bookKey:'meat',body:'#a74932',belly:'#d46b42',ear:'#704137',nose:'#332523',shade:'#77362b'},
  {id:'trashDragon',name:'Mülltonnen-Drache',description:'Frisst wirklich alles',animal:'trashDragon',bookKey:'allEater',body:'#538b53',belly:'#a8bd78',ear:'#78ab63',nose:'#536b42',shade:'#34583b'},
  {id:'rocketSnail',name:'Raketen-Schnecke',description:'Zündet bei jedem Boost den Turbo',animal:'rocketSnail',achievementKey:'boostMaster',body:'#79c6db',belly:'#c3e8dd',ear:'#e99a7d',nose:'#ef8e71',shade:'#3d738a'},
  {id:'deepSeaMole',name:'Tiefsee-Maulwurf im Taucheranzug',description:'Taucher aus den tiefsten Tunneln',animal:'deepSeaMole',achievementKey:'tunnelMaster',body:'#61537d',belly:'#b4a6ca',ear:'#9c79a6',nose:'#e78396',shade:'#39304f'},
  {id:'demonRat',name:'Dämonen-Ratte',description:'Herrscherin über 50 gewonnene Runden',animal:'demonRat',achievementKey:'classicChampion',body:'#4b254d',belly:'#b34a54',ear:'#e46e72',nose:'#f05a4f',shade:'#24142d'},
  {id:'furnitureOctopus',name:'Möbelhaus-Oktopus mit Kompass',description:'Bezwingt jeden Raum auf Schwer',animal:'furnitureOctopus',achievementKey:'hardCartographer',body:'#c16b54',belly:'#f0b879',ear:'#e9a08a',nose:'#523b68',shade:'#713f58'},
  {id:'discoCrab',name:'Disco-Krabbe im Narrenkostüm',description:'Feiert 25 schwere Karnevalssiege',animal:'discoCrab',achievementKey:'carnivalLegend',body:'#e75077',belly:'#ffb361',ear:'#ff9aa7',nose:'#743e86',shade:'#98365d'}
];
let ownedRatSkins=new Set(RAT_SKINS.map(skin=>skin.id));
let selectedRatSkin='classic';
function loadRatSkinProgress(){
  let previousOwned=[];
  try{
    const savedOwned=JSON.parse(localStorage.getItem(OWNED_SKINS_STORAGE_KEY)||'[]');
    if(Array.isArray(savedOwned))previousOwned=savedOwned.filter(id=>RAT_SKINS.some(skin=>skin.id===id));
    for(const id of previousOwned)ownedRatSkins.add(id);
    const savedSelected=localStorage.getItem(RAT_SKIN_STORAGE_KEY);
    if(ownedRatSkins.has(savedSelected))selectedRatSkin=savedSelected;
  }catch(e){ownedRatSkins=new Set(RAT_SKINS.filter(skin=>skin.cost===0).map(skin=>skin.id));selectedRatSkin='classic'}
  if(localStorage.getItem(SKIN_PRICE_MIGRATION_KEY)!=='done'){
    const refunds={caramel:5,cream:10,pigeon:12,frog:15,raccoon:17,flamingo:20};
    const refund=previousOwned.reduce((total,id)=>total+(refunds[id]||0),0);
    if(refund){hardWins+=refund;localStorage.setItem(HARD_WINS_KEY,String(hardWins))}
    localStorage.setItem(SKIN_PRICE_MIGRATION_KEY,'done');
    updateHardWinsDisplay();
  }
}
function saveRatSkinProgress(){
  localStorage.setItem(OWNED_SKINS_STORAGE_KEY,JSON.stringify([...ownedRatSkins]));
  localStorage.setItem(RAT_SKIN_STORAGE_KEY,selectedRatSkin);
}
function refreshCollectionUnlocks(){
  if(typeof ownedRatSkins==='undefined')return;
  let changed=false;
  for(const book of FOOD_BOOKS){if(foodBookCounts[book.id]>=book.goal&&!ownedRatSkins.has(book.skinId)){ownedRatSkins.add(book.skinId);changed=true;}}
  if(FOOD_BOOKS.every(book=>foodBookCounts[book.id]>=book.goal)&&!ownedRatSkins.has(ALL_EATER_SKIN_ID)){ownedRatSkins.add(ALL_EATER_SKIN_ID);changed=true;}
  if(changed)saveRatSkinProgress();
}
loadRatSkinProgress();
refreshCollectionUnlocks();

const MAX_COLLECTED = 20;
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),scoreEl=document.getElementById('score'),timeEl=document.getElementById('time');
let difficulty='easy';
document.querySelectorAll('.diff[data-diff]').forEach(btn=>btn.addEventListener('click',()=>{
  if(btn.dataset.diff==='hard'&&gameMode!=='timed'&&!unlocks.hard[currentMap])return;
  difficulty=btn.dataset.diff;
  document.querySelectorAll('.diff[data-diff]').forEach(b=>b.classList.toggle('active',b===btn));
  renderDifficultyButtons();renderTimedLeaderboards();
}));
const menu=document.getElementById('menu'),over=document.getElementById('over'),controls=document.getElementById('controls'),joy=document.getElementById('joy'),knob=document.getElementById('knob');
let W,H,dpr,playing=false,paused=false,last=0,time=60,score=0,collected=0,comboStreak=0,comboClock=0,comboBonus=0,items=[],ratHoles=[],cat={},rat={},ratFacing=-1,keys={x:0,y:0},boost=0,catTunnelBoost=0,raf,joyId=null,catHitCooldown=0,hardWinRecorded=false;
let currentMap='living';
const MAPS={
  living:{
    label:'🛋️ Wohnzimmer',
    floor:{background:'#b99569',surface:'#b99569',line:'#a98057',border:'#5e402d',pattern:'horizontal',spacing:46},
    obstacle:{outer:'#68452f',inner:'#8b6144',label:'#d7c09d'},
    makeObstacles:({worldW,worldH})=>[
      {x:55,y:145,w:250,h:72,label:'SOFA'},
      {x:worldW-355,y:150,w:285,h:72,label:'SCHRANK'},
      {x:worldW*.38,y:280,w:300,h:58,label:'TISCH'},
      {x:130,y:worldH-285,w:330,h:58,label:'KISTE'},
      {x:worldW-430,y:worldH-315,w:310,h:78,label:'REGAL'},
      {x:worldW*.18,y:worldH*.48,w:180,h:55,label:'BANK'},
      {x:worldW*.63,y:worldH*.48,w:230,h:55,label:'SCHRANK'},
      {x:worldW*.42,y:worldH*.72,w:260,h:55,label:'TISCH'},
      {x:worldW*.78,y:worldH*.70,w:150,h:55,label:'KISTE'}
    ]
  },
  kitchen:{
    label:'🍳 Küche',
    floor:{background:'#e4e0d6',surface:'#e4e0d6',line:'#c9c4b8',border:'#777066',pattern:'grid',spacing:64},
    obstacle:{outer:'#72533b',inner:'#a67b52',label:'#f0e6d3'},
    makeObstacles:({worldW})=>[
      {x:55,y:135,w:390,h:78,label:'KÜCHENZEILE'},
      {x:55,y:213,w:90,h:315,label:'SCHRANK'},
      {x:worldW-445,y:135,w:390,h:78,label:'KÜCHENZEILE'},
      {x:worldW-145,y:213,w:90,h:300,label:'KÜHLSCHRANK'},
      {x:worldW*.37,y:265,w:300,h:85,label:'INSEL'},
      {x:worldW*.38,y:545,w:320,h:145,label:'ESSTISCH'},
      {x:worldW*.28,y:510,w:55,h:55,label:'STUHL'},
      {x:worldW*.73,y:510,w:55,h:55,label:'STUHL'},
      {x:worldW*.28,y:700,w:55,h:55,label:'STUHL'},
      {x:worldW*.73,y:700,w:55,h:55,label:'STUHL'},
      {x:worldW*.68,y:780,w:230,h:70,label:'VORRAT'}
    ]
  },
  hallway:{
    label:'🚪 Flur',
    floor:{background:'#d8cbb9',surface:'#9a8065',line:'#806b55',border:'#6d5947',pattern:'vertical',spacing:80,lineWidth:4,borderWidth:8},
    obstacle:{outer:'#594a3c',inner:'#876f59',label:'#eadfce'},
    makeObstacles:({worldW})=>[
      {x:70,y:145,w:240,h:75,label:'GARDEROBE'},
      {x:70,y:290,w:170,h:65,label:'BANK'},
      {x:worldW-310,y:145,w:240,h:75,label:'SCHRANK'},
      {x:worldW-240,y:315,w:170,h:65,label:'KOMMODE'},
      {x:70,y:500,w:220,h:70,label:'SCHRANK'},
      {x:worldW-300,y:520,w:230,h:70,label:'REGAL'},
      {x:70,y:735,w:260,h:75,label:'BANK'},
      {x:worldW-330,y:755,w:260,h:75,label:'SCHRANK'}
    ]
  },
  storage:{
    label:'🧹 Kammer',
    floor:{background:'#b8b09f',surface:'#8f8879',line:'#777064',border:'#625d53',pattern:'grid',spacing:70},
    obstacle:{outer:'#514b43',inner:'#756a5a',label:'#e0d5c1'},
    makeObstacles:()=>[
      {x:65,y:135,w:280,h:72,label:'REGAL'},
      {x:430,y:125,w:145,h:88,label:'KISTEN'},
      {x:670,y:135,w:270,h:72,label:'REGAL'},
      {x:65,y:285,w:145,h:88,label:'WERKBANK'},
      {x:300,y:300,w:170,h:72,label:'KARTONS'},
      {x:650,y:285,w:155,h:95,label:'SCHRANK'},
      {x:845,y:300,w:95,h:88,label:'KISTEN'},
      {x:75,y:465,w:250,h:72,label:'REGAL'},
      {x:430,y:450,w:150,h:88,label:'KISTEN'},
      {x:700,y:465,w:240,h:72,label:'REGAL'},
      {x:115,y:610,w:145,h:88,label:'SCHRANK'},
      {x:350,y:620,w:190,h:72,label:'KARTONS'},
      {x:700,y:600,w:190,h:88,label:'WERKBANK'},
      {x:175,y:770,w:260,h:72,label:'REGAL'},
      {x:610,y:765,w:270,h:72,label:'REGAL'}
    ]
  },
  bathroom:{
    label:'🚽 Badezimmer',
    floor:{background:'#dfe5e7',surface:'#b9d0d5',line:'#a5bcc1',border:'#71888e',pattern:'grid',spacing:58},
    obstacle:{outer:'#7f9295',inner:'#c8d7d8',label:'#eef4f4'},
    makeObstacles:()=>[
      {x:65,y:135,w:300,h:105,label:'BADEWANNE'},
      {x:470,y:130,w:130,h:85,label:'WASCHBECKEN'},
      {x:730,y:135,w:180,h:100,label:'SCHRANK'},
      {x:75,y:315,w:115,h:130,label:'TOILETTE'},
      {x:300,y:300,w:190,h:75,label:'UNTERSCHRANK'},
      {x:650,y:300,w:250,h:75,label:'REGAL'},
      {x:75,y:505,w:270,h:72,label:'SCHRANK'},
      {x:445,y:470,w:150,h:105,label:'WASCHMASCHINE'},
      {x:700,y:505,w:210,h:72,label:'REGAL'},
      {x:160,y:660,w:180,h:85,label:'KARTONS'},
      {x:455,y:650,w:250,h:72,label:'UNTERSCHRANK'},
      {x:780,y:660,w:130,h:90,label:'SCHRANK'}
    ]
  },
  bedroom:{
    label:'🛏️ Schlafzimmer',
    floor:{background:'#d9c9b3',surface:'#c3ae91',line:'#ad9476',border:'#725b45',pattern:'horizontal',spacing:62},
    obstacle:{outer:'#695442',inner:'#96775a',label:'#f0e4d4'},
    makeObstacles:({worldW})=>[
      {x:75,y:145,w:300,h:95,label:'KLEIDERSCHRANK'},
      {x:worldW-375,y:145,w:300,h:95,label:'KLEIDERSCHRANK'},
      {x:520,y:320,w:560,h:245,label:'BETT'},
      {x:420,y:335,w:78,h:88,label:'NACHTTISCH'},
      {x:1100,y:335,w:78,h:88,label:'NACHTTISCH'},
      {x:110,y:505,w:255,h:75,label:'KOMMODE'},
      {x:worldW-390,y:680,w:280,h:90,label:'TRUHE'}
    ]
  },
  dining:{
    label:'🍽️ Esszimmer',
    floor:{background:'#dfd2bf',surface:'#c4ad8e',line:'#b29a79',border:'#725b42',pattern:'grid',spacing:82},
    obstacle:{outer:'#65472f',inner:'#98704b',label:'#f0dfc9'},
    makeObstacles:({worldW})=>[
      {x:85,y:145,w:300,h:90,label:'ANRICHTE'},
      {x:worldW-385,y:145,w:300,h:90,label:'ANRICHTE'},
      {x:575,y:345,w:450,h:245,label:'ESSTISCH'},
      {x:475,y:420,w:70,h:70,label:'STUHL'},
      {x:1055,y:420,w:70,h:70,label:'STUHL'},
      {x:765,y:250,w:70,h:70,label:'STUHL'},
      {x:765,y:615,w:70,h:70,label:'STUHL'},
      {x:120,y:680,w:270,h:80,label:'SIDEBOARD'},
      {x:worldW-390,y:680,w:270,h:80,label:'VITRINE'}
    ]
  },
  attic:{
    label:'📦 Dachboden',
    floor:{background:'#bca98e',surface:'#a58f72',line:'#89765e',border:'#5f4e3c',pattern:'horizontal',spacing:72},
    obstacle:{outer:'#5c4937',inner:'#8b6b4b',label:'#e8d5ba'},
    makeObstacles:({worldW})=>[
      {x:100,y:145,w:285,h:100,label:'KISTEN'},
      {x:worldW-385,y:145,w:285,h:100,label:'KISTEN'},
      {x:460,y:290,w:210,h:115,label:'TRUHE'},
      {x:930,y:300,w:210,h:110,label:'KARTONS'},
      {x:120,y:470,w:300,h:82,label:'REGAL'},
      {x:worldW-420,y:475,w:300,h:82,label:'REGAL'},
      {x:610,y:665,w:360,h:78,label:'DACHBALKEN'},
      {x:190,y:770,w:260,h:85,label:'KISTEN'},
      {x:worldW-450,y:770,w:260,h:85,label:'KISTEN'}
    ]
  },
  cellar:{
    label:'🪜 Keller',
    floor:{background:'#aaa69e',surface:'#85827b',line:'#706d67',border:'#504e49',pattern:'grid',spacing:76},
    obstacle:{outer:'#4c4944',inner:'#706a60',label:'#e2d9ca'},
    makeObstacles:({worldW})=>[
      {x:75,y:145,w:300,h:82,label:'REGAL'},
      {x:worldW-375,y:145,w:300,h:82,label:'REGAL'},
      {x:105,y:335,w:185,h:145,label:'WASCHMASCHINE'},
      {x:worldW-295,y:335,w:185,h:145,label:'TROCKNER'},
      {x:560,y:305,w:220,h:88,label:'KISTEN'},
      {x:850,y:520,w:260,h:82,label:'REGAL'},
      {x:135,y:650,w:285,h:82,label:'REGAL'},
      {x:worldW-420,y:675,w:300,h:82,label:'WEINREGAL'}
    ]
  },
  garden:{
    label:'🌳 Garten',
    floor:{background:'#9aaf72',surface:'#83a45e',line:'#6d8c50',border:'#46643c',pattern:'plain',spacing:0},
    obstacle:{outer:'#536d3d',inner:'#799850',label:'#f2edcf'},
    makeObstacles:({worldW})=>[
      {x:85,y:145,w:300,h:100,label:'BLUMENBEET'},
      {x:worldW-385,y:145,w:300,h:100,label:'GEMÜSEBEET'},
      {x:105,y:455,w:310,h:90,label:'BLUMENBEET'},
      {x:worldW-415,y:455,w:310,h:90,label:'GEMÜSEBEET'},
      {x:620,y:320,w:360,h:185,label:'GARTENTISCH'},
      {x:110,y:710,w:295,h:105,label:'GARTENSCHUPPEN'},
      {x:worldW-405,y:710,w:295,h:105,label:'GARTENBANK'}
    ]
  },
  carnival:{
    label:'🎭 Karneval',
    floor:{background:'#30204c',surface:'#624174',line:'#78548d',border:'#efbf4f',pattern:'grid',spacing:88,lineWidth:2,borderWidth:10},
    obstacle:{outer:'#653d75',inner:'#bc4f69',label:'#fff1b8'},
    makeObstacles:({worldW,worldH})=>[
      {x:75,y:145,w:290,h:90,label:'KOSTÜMSTAND'},
      {x:worldW-365,y:145,w:290,h:90,label:'KONFETTI'},
      {x:worldW*.37,y:285,w:340,h:110,label:'KARUSSELL'},
      {x:95,y:480,w:270,h:100,label:'SÜSSIGKEITEN'},
      {x:worldW-365,y:480,w:270,h:100,label:'LUFTBALLONS'},
      {x:worldW*.32,y:worldH-285,w:270,h:90,label:'BÜHNE'},
      {x:worldW*.62,y:worldH-285,w:270,h:90,label:'MUSIK'}
    ]
  }
};
const MAP_ORDER=Object.keys(MAPS).filter(id=>id!=='carnival');
const ACHIEVEMENT_STORAGE_KEY='ratKingAllAnimalsTestAchievementsV1';
const ACHIEVEMENTS=[
  {id:'boostMaster',title:'Turbogeladen',description:'Setze den Boost 500-mal ein.',goal:500,skinId:'rocketSnail',progress:state=>state.boostUses},
  {id:'tunnelMaster',title:'Unterirdisch legendär',description:'Benutze 100 Ratentunnel.',goal:100,skinId:'deepSeaMole',progress:state=>state.tunnelsUsed},
  {id:'classicChampion',title:'König der Runden',description:'Gewinne 50 klassische Runden.',goal:50,skinId:'demonRat',progress:state=>state.classicWins},
  {id:'hardCartographer',title:'Kein Raum zu schwer',description:'Gewinne auf jeder der 10 Karten eine klassische Runde auf Schwer.',goal:10,skinId:'furnitureOctopus',progress:state=>state.hardMapWins.length},
  {id:'carnivalLegend',title:'Letzte Runde, großes Finale',description:'Beende 25 Karnevalsrunden auf Schwer bis zum Zeitende.',goal:25,skinId:'discoCrab',progress:state=>state.hardCarnivalFinishes}
];
function loadAchievementProgress(){
  const fallback={boostUses:0,tunnelsUsed:0,classicWins:0,hardMapWins:[],hardCarnivalFinishes:0};
  try{
    const saved=JSON.parse(localStorage.getItem(ACHIEVEMENT_STORAGE_KEY)||'null');
    if(!saved||typeof saved!=='object')return fallback;
    const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
    return {
      boostUses:count(saved.boostUses),
      tunnelsUsed:count(saved.tunnelsUsed),
      classicWins:count(saved.classicWins),
      hardMapWins:Array.isArray(saved.hardMapWins)?[...new Set(saved.hardMapWins.filter(id=>MAP_ORDER.includes(id)))]:[],
      hardCarnivalFinishes:count(saved.hardCarnivalFinishes)
    };
  }catch(e){console.warn('Test-Erfolgsfortschritt konnte nicht geladen werden.',e);return fallback}
}
let achievementProgress=loadAchievementProgress();
let achievementUnlocksThisRun=[];
function saveAchievementProgress(){
  localStorage.setItem(ACHIEVEMENT_STORAGE_KEY,JSON.stringify(achievementProgress));
}
function getAchievementProgress(achievement){
  return Math.min(achievement.goal,achievement.progress(achievementProgress));
}
function recordAchievementProgress(key){
  const achievementIds={boostUses:'boostMaster',tunnelsUsed:'tunnelMaster',classicWins:'classicChampion',hardCarnivalFinishes:'carnivalLegend'};
  const achievement=ACHIEVEMENTS.find(entry=>entry.id===achievementIds[key]);
  if(!achievement||achievementProgress[key]>=achievement.goal)return;
  achievementProgress[key]++;
  if(achievementProgress[key]===achievement.goal){
    const skin=RAT_SKINS.find(candidate=>candidate.id===achievement.skinId);
    achievementUnlocksThisRun.push(skin?.name||achievement.title);
  }
  saveAchievementProgress();
  renderAchievementsIfOpen();
}
function recordAchievementRound(win,reason){
  if(gameMode==='classic'&&win){
    recordAchievementProgress('classicWins');
    if(difficulty==='hard'&&MAP_ORDER.includes(currentMap)&&!achievementProgress.hardMapWins.includes(currentMap)){
      achievementProgress.hardMapWins.push(currentMap);
      const mapAchievement=ACHIEVEMENTS.find(entry=>entry.id==='hardCartographer');
      if(mapAchievement&&getAchievementProgress(mapAchievement)>=mapAchievement.goal){
        const skin=RAT_SKINS.find(candidate=>candidate.id===mapAchievement.skinId);
        achievementUnlocksThisRun.push(skin?.name||mapAchievement.title);
      }
      saveAchievementProgress();
    }
  }
  if(gameMode==='timed'&&difficulty==='hard'&&reason==='time')recordAchievementProgress('hardCarnivalFinishes');
}
function renderAchievementsIfOpen(){
  const modal=document.getElementById('achievementModal');
  if(modal&&!modal.classList.contains('hidden'))renderAchievements();
}
function renderAchievements(){
  const list=document.getElementById('achievementList');
  if(!list)return;
  list.replaceChildren();
  for(const achievement of ACHIEVEMENTS){
    const progress=getAchievementProgress(achievement);
    const complete=progress>=achievement.goal;
    const skin=RAT_SKINS.find(candidate=>candidate.id===achievement.skinId);
    const row=document.createElement('article');row.className='achievementRow'+(complete?' complete':'');
    const top=document.createElement('div');top.className='achievementRowTop';
    const preview=document.createElement('canvas');preview.width=128;preview.height=112;
    if(skin)drawRatPreview(preview,skin);
    top.appendChild(preview);
    const info=document.createElement('div');
    const title=document.createElement('strong');title.textContent=achievement.title;info.appendChild(title);
    const description=document.createElement('small');description.textContent=achievement.description;info.appendChild(description);
    const reward=document.createElement('small');reward.textContent=`Belohnung: ${skin?.name||'Figur'}`;info.appendChild(reward);
    top.appendChild(info);row.appendChild(top);
    const status=document.createElement('div');status.className='achievementStatus';
    status.textContent=complete?'✓ Erfolg geschafft · Figur freigeschaltet':`${progress}/${achievement.goal}`;
    row.appendChild(status);
    const bar=document.createElement('div');bar.className='collectionBar';
    const fill=document.createElement('span');fill.style.width=`${progress/achievement.goal*100}%`;bar.appendChild(fill);row.appendChild(bar);
    list.appendChild(row);
  }
}
function openAchievementModal(){renderAchievements();document.getElementById('achievementModal').classList.remove('hidden')}
function closeAchievementModal(){document.getElementById('achievementModal').classList.add('hidden')}
const UNLOCK_KEY='ratKingAllAnimalsTestUnlocks';

function loadUnlocks(){
  const fallback={
    maps:Object.fromEntries(MAP_ORDER.map(id=>[id,id==='living'])),
    hard:Object.fromEntries(MAP_ORDER.map(id=>[id,false]))
  };
  try{
    const saved=JSON.parse(localStorage.getItem(UNLOCK_KEY)||'null');
    return {
      maps:{...fallback.maps,...(saved?.maps||{})},
      hard:{...fallback.hard,...(saved?.hard||{})}
    };
  }catch(e){ return fallback; }
}
let unlocks=loadUnlocks();

function saveUnlocks(){
  localStorage.setItem(UNLOCK_KEY,JSON.stringify(unlocks));
}

function unlockProgress(){
  if(gameMode==='timed')return;
  // Nur 50 Punkte auf NORMAL zählen.
  if(difficulty!=='normal' || score<50) return;

  unlocks.hard[currentMap]=true;

  const i=MAP_ORDER.indexOf(currentMap);
  if(i>=0 && i<MAP_ORDER.length-1){
    unlocks.maps[MAP_ORDER[i+1]]=true;
  }
  saveUnlocks();
}

function renderMapButtons(){
  const wrap=document.querySelector('.maps');
  if(!wrap)return;
  wrap.innerHTML='';
  MAP_ORDER.forEach(map=>{
    const label=MAPS[map].label;
    const b=document.createElement('button');
    const locked=!unlocks.maps[map];
    b.className='mapBtn'+(map===currentMap?' active':'')+(locked?' locked':'');
    b.dataset.map=map;

    if(locked){
      b.innerHTML='<span>🔒 '+label+'</span><small>50 🏆 auf Normal</small>';
    }else{
      b.textContent=label;
    }

    b.disabled=locked;
    b.addEventListener('click',()=>{
      if(!unlocks.maps[map])return;
      currentMap=map;classicMap=map;
      buildRoom();
      loadHighScore();
      renderMapButtons();
      renderDifficultyButtons();
    });
    wrap.appendChild(b);
  });
}

function setGameMode(mode){
  const previousMode=gameMode;
  gameMode=mode;
  document.getElementById('classicMode').classList.toggle('active',mode==='classic');
  document.getElementById('timedMode').classList.toggle('active',mode==='timed');
  document.querySelector('.maps').classList.toggle('hidden',mode==='timed');
  document.getElementById('mapHeading').classList.toggle('hidden',mode==='timed');
  document.getElementById('collectedGoal').classList.toggle('hidden',mode==='timed');
  document.querySelector('.unlockHint').classList.toggle('hidden',mode==='timed');
  if(mode==='timed'){
    if(previousMode!=='timed')classicMap=currentMap==='carnival'?'living':currentMap;
    currentMap='carnival';
    document.querySelector('#menu .card>p').textContent='Sammle fünf Minuten lang ohne Rundenlimit. Für einen abgeschlossenen schweren Zeitlauf bekommst du 2 Schwer-Punkte!';
    document.querySelectorAll('#menu .card>p.small')[0].innerHTML='Karneval · 5 Minuten · endlos sammeln<br>Joystick/WASD zum Laufen · 💨 kurz sprinten';
  }else{
    currentMap=classicMap==='carnival'?'living':classicMap;
    document.querySelector('#menu .card>p').textContent='Klau dir in 60 Sekunden so viele Leckerbissen wie möglich. Jedes Essen ist unterschiedlich viele Punkte wert – aber pass auf die Katze auf.';
    document.querySelectorAll('#menu .card>p.small')[0].innerHTML='Große Wohnung · 30 Leckerbissen · 60 Sekunden<br>Joystick/WASD zum Laufen · 💨 kurz sprinten';
  }
  if(mode==='classic'&&difficulty==='hard'&&!unlocks.hard[currentMap])difficulty='easy';
  buildRoom();loadHighScore();renderMapButtons();renderDifficultyButtons();renderTimedLeaderboards();
}

function renderDifficultyButtons(){
  document.querySelectorAll('.diff').forEach(b=>{
    if(!b.dataset.diff)return;
    const hardLocked=gameMode!=='timed'&&b.dataset.diff==='hard'&&!unlocks.hard[currentMap];
    b.disabled=hardLocked;
    b.classList.toggle('locked',hardLocked);
    b.classList.toggle('active',b.dataset.diff===difficulty);
    if(b.dataset.diff==='hard') b.textContent=hardLocked?'🔒 Schwer':'🔴 Schwer';
  });
}
function drawRatPreview(canvasEl,skin){
  if(!canvasEl)return;
  const previewCtx=canvasEl.getContext('2d');
  previewCtx.clearRect(0,0,canvasEl.width,canvasEl.height);
  const isTall=['flamingo','trashDragon'].includes(skin.animal);
  const scale=isTall?.95:1.25;
  const y=isTall?canvasEl.height*.72:canvasEl.height/2;
  drawCharacterSprite(previewCtx,canvasEl.width/2,y,skin,-1,scale);
}
function renderRatSkinPicker(){
  const list=document.getElementById('skinList');
  if(!list)return;
  list.innerHTML='';
  const previewSkin=RAT_SKINS.find(skin=>skin.id===selectedRatSkin)||RAT_SKINS[0];
  drawRatPreview(document.getElementById('menuRatPreview'),previewSkin);
  const selectedName=document.getElementById('selectedRatName');
  if(selectedName)selectedName.textContent=previewSkin.name;
  const pointDisplay=document.getElementById('skinPoints');
  if(pointDisplay)pointDisplay.textContent=hardWins;

  for(const skin of RAT_SKINS){
    const owned=ownedRatSkins.has(skin.id),selected=selectedRatSkin===skin.id;
    const row=document.createElement('div');
    row.className='skinOption'+(selected?' selected':'');
    const preview=document.createElement('canvas');preview.width=96;preview.height=72;
    drawRatPreview(preview,skin);row.appendChild(preview);
    const info=document.createElement('div');info.className='skinInfo';
    const name=document.createElement('strong');name.textContent=skin.name;info.appendChild(name);
    const detail=document.createElement('small');
    if(skin.bookKey){
      const book=FOOD_BOOKS.find(entry=>entry.id===skin.bookKey);
      if(book)detail.textContent=`${skin.description} · ${book.name}: ${Math.min(foodBookCounts[book.id],book.goal)}/${book.goal}`;
      else detail.textContent=`${skin.description} · Alle vier Bücher vervollständigen`;
    }else if(skin.achievementKey)detail.textContent=`${skin.description} · Im Test freigeschaltet`;
    else detail.textContent=skin.cost===0?`${skin.description} · Kostenlos`:`${skin.description} · ${skin.cost} Schwer-Punkte`;
    info.appendChild(detail);row.appendChild(info);
    const action=document.createElement('button');action.type='button';action.className='skinAction';
    if(selected){action.textContent='AUSGEWÄHLT';action.disabled=true}
    else if(owned){action.textContent='AUSWÄHLEN';action.classList.add('secondary')}
    else if(skin.bookKey){action.textContent='🔒 GESPERRT';action.disabled=true}
    else if(hardWins>=skin.cost)action.textContent='KAUFEN';
    else{action.textContent='🔒 GESPERRT';action.disabled=true}
    action.addEventListener('click',()=>{
      if(ownedRatSkins.has(skin.id))selectedRatSkin=skin.id;
      else if(hardWins>=skin.cost){hardWins-=skin.cost;ownedRatSkins.add(skin.id);selectedRatSkin=skin.id;localStorage.setItem(HARD_WINS_KEY,String(hardWins))}
      saveRatSkinProgress();updateHardWinsDisplay();renderRatSkinPicker();
    });
    row.appendChild(action);list.appendChild(row);
  }
}
function renderCollectionBook(){
  const list=document.getElementById('collectionList');if(!list)return;
  list.innerHTML='';
  const entries=FOOD_BOOKS.map(book=>({book,skin:RAT_SKINS.find(skin=>skin.id===book.skinId),count:foodBookCounts[book.id],goal:book.goal,reward:book.reward}));
  const allDone=FOOD_BOOKS.every(book=>foodBookCounts[book.id]>=book.goal);
  entries.push({book:null,skin:RAT_SKINS.find(skin=>skin.id===ALL_EATER_SKIN_ID),count:allDone?1:0,goal:1,reward:'Mülltonnen-Drache',allEater:true});
  for(const entry of entries){
    const row=document.createElement('div');row.className='collectionRow';
    const top=document.createElement('div');top.className='collectionRowTop';
    const preview=document.createElement('canvas');preview.width=128;preview.height=112;
    if(entry.skin)drawRatPreview(preview,entry.skin);
    top.appendChild(preview);
    const info=document.createElement('div');
    const title=document.createElement('strong');title.textContent=entry.book?entry.book.name:'Allesfresserbuch';info.appendChild(title);
    const details=document.createElement('small');
    if(entry.allEater)details.textContent=allDone?'Vervollständigt · Belohnung freigeschaltet':'Wird mit allen vier anderen Büchern freigeschaltet';
    else details.textContent=`${entry.reward} · ${Math.min(entry.count,entry.goal)}/${entry.goal}`;
    info.appendChild(details);top.appendChild(info);row.appendChild(top);
    const bar=document.createElement('div');bar.className='collectionBar';
    const fill=document.createElement('span');fill.style.width=`${Math.min(100,entry.count/entry.goal*100)}%`;bar.appendChild(fill);row.appendChild(bar);
    list.appendChild(row);
  }
}
renderMapButtons();
renderDifficultyButtons();
renderRatSkinPicker();

window.addEventListener('load',loadHighScore);
let ratSlow=0,ratFast=0,catSlow=0,catFlee=0,fartClouds=[];
let worldW=1600,worldH=1050,camX=0,camY=0,gardenPlantsLayer=null;
let obstacles=[];
function resize(){
  dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);worldW=Math.max(1600,W*1.8);worldH=Math.max(1050,H*1.45);buildRoom();buildGardenPlantsLayer();
}
addEventListener('resize',resize); resize();
function rnd(a,b){return a+Math.random()*(b-a)}
function buildRoom(){
  const map=MAPS[currentMap]||MAPS.living;
  obstacles=map.makeObstacles({worldW,worldH});
}
function blocked(x,y,r=18){return obstacles.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h)}
function safeSpot(){for(let n=0;n<500;n++){const x=rnd(45,worldW-45),y=rnd(125,worldH-165);if(!blocked(x,y,22)&&Math.hypot(x-rat.x,y-rat.y)>110)return{x,y}}return{x:worldW/2,y:worldH/2}}
function createRatHoles(){
  ratHoles=[];
  const minHoleDistance=360;
  const maxAttempts=500;

  function validHole(h){
    if(h.x<80 || h.x>worldW-80 || h.y<160 || h.y>worldH-240) return false;

    if(obstacles.some(o =>
      h.x+h.r+12>o.x && h.x-h.r-12<o.x+o.w &&
      h.y+h.r+12>o.y && h.y-h.r-12<o.y+o.h
    )) return false;

    return ratHoles.every(other =>
      Math.hypot(h.x-other.x,h.y-other.y)>=minHoleDistance
    );
  }

  let attempts=0;
  while(ratHoles.length<4 && attempts<maxAttempts){
    attempts++;
    const h={
      x:100+Math.random()*(worldW-200),
      y:170+Math.random()*(worldH-420),
      r:24,
      active:true,
      hiddenFor:0
    };
    if(validHole(h)) ratHoles.push(h);
  }

  // Falls die zufällige Suche durch eine ungünstige Möbelverteilung scheitert,
  // wird nicht einfach ein zu nahes Loch erzeugt.
  if(ratHoles.length<4){
    console.warn('Nicht genug ausreichend weit voneinander entfernte freie Plätze für 4 Rattenlöcher gefunden.');
  }
}

function drawRatHoles(){
  // Sobald ein Loch benutzt wurde, ist das gesamte Tunnelsystem
  // für die Dauer des Cooldowns gesperrt.
  const tunnelsLocked = rat.holeCooldown > 0;

  for(const h of ratHoles){
    ctx.save();
    ctx.textAlign='center';
    ctx.textBaseline='middle';

    // Das Loch selbst bleibt immer an derselben Stelle sichtbar.
    ctx.fillStyle='#24170f';
    ctx.beginPath();
    ctx.arc(h.x,h.y,h.r,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle='#5e402d';
    ctx.lineWidth=5;
    ctx.stroke();

    if(!tunnelsLocked){
      // Alle Löcher sind offen.
      ctx.font='22px system-ui';
      ctx.fillText('🕳️',h.x,h.y);
    } else {
      // Während der Sperrzeit zeigen ALLE Löcher ein X.
      ctx.strokeStyle='#d94b3d';
      ctx.lineWidth=7;
      ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(h.x-14,h.y-14);
      ctx.lineTo(h.x+14,h.y+14);
      ctx.moveTo(h.x+14,h.y-14);
      ctx.lineTo(h.x-14,h.y+14);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function updateRatHoles(dt){
  for(const h of ratHoles){
    if(h.hiddenFor>0){
      h.hiddenFor-=dt;
      if(h.hiddenFor<=0){
        h.hiddenFor=0;
        h.active=true;
      }
    }
  }
}

function useRatHole(){
  if(rat.holeCooldown>0) return;
  for(let i=0;i<ratHoles.length;i++){
    const h=ratHoles[i];
    if(!h.active) continue;

    if(Math.hypot(rat.x-h.x,rat.y-h.y)<h.r+18){
      const choices=[];
      for(let j=0;j<ratHoles.length;j++){
        if(j!==i && ratHoles[j].active) choices.push(j);
      }

      // Nur aktive andere Löcher sind mögliche Ausgänge.
      if(!choices.length) return;

      const target=choices[Math.floor(Math.random()*choices.length)];
      rat.x=ratHoles[target].x;
      rat.y=ratHoles[target].y;

      // Das benutzte Loch ist für 10 Sekunden geschlossen.
      h.active=false;
      h.hiddenFor=10;

      // Zusätzlich bleibt die Ratte 10 Sekunden vor einem erneuten Loch-Teleport geschützt.
      rat.holeCooldown=10;
      if(playing)recordAchievementProgress('tunnelsUsed');

      // Die Katze bekommt ihren kurzen Speedboost.
      catTunnelBoost=2;
      return;
    }
  }
}



function spawn(){
  // Ratte und Katze starten ausschließlich in einem freien Bereich.
  // Der Sicherheitsabstand verhindert, dass sie in Möbeln oder direkt an deren Kanten starten.
  const spawnClearance=55;

  function freeSpawnSpot(minDistanceFrom=null){
    for(let attempt=0;attempt<1000;attempt++){
      const p={
        x:70+Math.random()*(worldW-140),
        y:150+Math.random()*(worldH-310)
      };

      const blockedForSpawn=obstacles.some(o=>
        p.x+spawnClearance>o.x &&
        p.x-spawnClearance<o.x+o.w &&
        p.y+spawnClearance>o.y &&
        p.y-spawnClearance<o.y+o.h
      );
      if(blockedForSpawn) continue;

      if(minDistanceFrom &&
         Math.hypot(p.x-minDistanceFrom.x,p.y-minDistanceFrom.y)<260) continue;

      return p;
    }

    // Sicherheits-Fallback für extrem vollgestellte zukünftige Karten.
    for(let attempt=0;attempt<1000;attempt++){
      const p={
        x:100+Math.random()*(worldW-200),
        y:180+Math.random()*(worldH-360)
      };
      if(!obstacles.some(o=>
        p.x+30>o.x && p.x-30<o.x+o.w &&
        p.y+30>o.y && p.y-30<o.y+o.h
      )){
        if(!minDistanceFrom ||
           Math.hypot(p.x-minDistanceFrom.x,p.y-minDistanceFrom.y)>=180){
          return p;
        }
      }
    }

    return {x:worldW/2,y:worldH/2};
  }

  const ratStart=freeSpawnSpot();
  rat={holeCooldown:0,x:ratStart.x,y:ratStart.y};
  items=[];collected=0;
  const foods=[
    {type:'🍞',value:1},{type:'🍪',value:1},{type:'🥓',value:2},{type:'🍕',value:2},{type:'🥨',value:2},
    {type:'🧀',value:3},{type:'🍗',value:3},{type:'🍰',value:3},{type:'🍔',value:4},{type:'🍖',value:5},
    {type:'🍎',value:1},{type:'🍌',value:1},{type:'🥕',value:1},{type:'🍿',value:1},{type:'🍩',value:2},
    {type:'🌮',value:2},{type:'🥪',value:2},{type:'🍟',value:2},{type:'🌭',value:2},{type:'🍣',value:3},
    {type:'🍓',value:3},{type:'🍦',value:3},{type:'🥩',value:5},{type:'🍇',value:2},{type:'🍉',value:2},
    {type:'🥞',value:3},{type:'🌯',value:3},{type:'🥚',value:1},{type:'🍫',value:2},{type:'🥧',value:4},
    {type:'🤢',effect:'rotten'},{type:'🌶️',effect:'chili'},{type:'🐕',effect:'dog'},{type:'💀',effect:'skull'}
  ].sort(()=>Math.random()-0.5);
  for(const food of foods){
    let p;
    for(let attempt=0;attempt<500;attempt++){
      const candidate=safeSpot();
      if(items.every(it=>Math.hypot(candidate.x-it.x,candidate.y-it.y)>=58)){p=candidate;break}
    }
    if(!p) p=safeSpot();
    items.push({x:p.x,y:p.y,type:food.type,value:food.value,effect:food.effect||null,got:false,bob:Math.random()*6});
  }
  const catStart=freeSpawnSpot(ratStart);
  cat={x:catStart.x,y:catStart.y,vx:0,vy:0};
  camX=0;camY=0;
}
function updateComboBadge(){
  const badge=document.getElementById('comboBadge');if(!badge)return;
  badge.classList.toggle('hidden',comboStreak<3);
  badge.textContent=comboStreak>=3?`🔥 Serie ${comboStreak} · +${comboBonus}/Snack`:'';
}
function displayTime(seconds){
  if(gameMode!=='timed')return String(Math.ceil(seconds));
  const total=Math.ceil(seconds);return Math.floor(total/60)+':'+String(total%60).padStart(2,'0');
}
function start(){cancelAnimationFrame(raf);buildRoom();loadHighScore();achievementUnlocksThisRun=[];hardWinRecorded=false;hardPointsThisRun=0;paused=false;playing=true;time=gameMode==='timed'?300:60;score=0;collected=0;comboStreak=0;comboClock=0;comboBonus=0;updateComboBadge();boost=0;catHitCooldown=0;ratFacing=1;ratSlow=0;ratFast=0;catSlow=0;catFlee=0;fartClouds=[];keys={x:0,y:0};ratHoles=[];catTunnelBoost=0;createRatHoles();spawn();scoreEl.textContent=0;document.getElementById('collected').textContent=0;timeEl.textContent=displayTime(time);document.getElementById('effect').style.display='none';document.getElementById('effect').textContent='';document.getElementById('achievementResult').classList.add('hidden');menu.classList.add('hidden');over.classList.add('hidden');controls.classList.remove('hidden');document.getElementById('menuBtn').classList.remove('hidden');const pauseBtn=document.getElementById('pauseBtn');pauseBtn.classList.remove('hidden');pauseBtn.textContent='PAUSE';last=performance.now();raf=requestAnimationFrame(loop)}
function end(win,reason='time'){
  playing=false;paused=false;
  recordAchievementRound(win,reason);
  controls.classList.add('hidden');
  document.getElementById('menuBtn').classList.add('hidden');
  document.getElementById('pauseBtn').classList.add('hidden');
  document.getElementById('overMenu').classList.remove('hidden');
  over.classList.remove('hidden');
  if(score>highScore){
    highScore=score;
    localStorage.setItem(getHighscoreKey(),String(highScore));
  }
  if(gameMode==='timed'&&reason==='time')saveTimedScore();
  unlockProgress();
  renderMapButtons();
  renderDifficultyButtons();
  const hardWinAwarded=win&&difficulty==='hard'&&gameMode==='classic'&&recordHardWin(1);
  if(gameMode==='timed'&&difficulty==='hard'&&reason==='time'&&!hardWinRecorded){
    hardPointsThisRun=recordHardWin(2);
  }
  updateHardWinsDisplay();
  const hardWinReward=document.getElementById('hardWinReward');
  const rewardText=gameMode==='timed'&&hardPointsThisRun>0?`🏆 +${hardPointsThisRun} Schwer-Punkte in diesem Lauf!`:hardWinAwarded?'🏆 +1 Schwer-Punkt!':'';
  hardWinReward.textContent=rewardText;
  hardWinReward.classList.toggle('hidden',!rewardText);
  const hs=document.getElementById('highscore');if(hs)hs.textContent=highScore;
  const rhs=document.getElementById('resultHighValue');if(rhs)rhs.textContent=highScore;
  document.getElementById('resultIcon').textContent=win?'👑':reason==='skull'?'💀':reason==='cat'?'🐈':'🐀';
  document.getElementById('resultTitle').textContent=gameMode==='timed'&&reason==='time'?'ZEIT VORBEI':win?'RAT KING!':reason==='skull'?'PECH GEHABT!':reason==='cat'?'ERWISCHT!':'RUNDE VORBEI';
  document.getElementById('resultText').textContent=gameMode==='timed'&&reason==='time'?`Die fünf Minuten sind vorbei. Du hast ${score} Punkte erreicht.`:reason==='skull'?'Du hast den Totenkopf erwischt. Die Runde ist sofort vorbei.':reason==='cat'?`Die Katze hat dich erwischt. Du hattest ${score} Punkte.`:reason==='time'?`Die Zeit ist abgelaufen. Du hast nur ${collected}/20 Gegenstände eingesammelt.`:win&&reason==='quota'?`Du hast 20 Gegenstände eingesammelt und ${score} Punkte erreicht.`:`Du hast ${score} Punkte gesammelt.`;
  const achievementResult=document.getElementById('achievementResult');
  achievementResult.textContent=achievementUnlocksThisRun.length?`🏅 Neuer Erfolg: ${achievementUnlocksThisRun.join(', ')}!`: '';
  achievementResult.classList.toggle('hidden',!achievementUnlocksThisRun.length);
}
function moveEntity(e,dx,dy){
  const nx=Math.max(30,Math.min(worldW-30,e.x+dx)),ny=Math.max(105,Math.min(worldH-135,e.y+dy));
  if(!blocked(nx,e.y,18))e.x=nx;
  if(!blocked(e.x,ny,18))e.y=ny;
}
function updateCamera(){
  camX=Math.max(0,Math.min(worldW-W,rat.x-W/2));
  camY=Math.max(0,Math.min(worldH-H+105,rat.y-(H/2)+35));
}
function updateRatFacing(){
  if(keys.x>0.08) ratFacing=-1;
  else if(keys.x<-0.08) ratFacing=1;
}

function update(dt){updateRatFacing();
  if(rat.holeCooldown>0) rat.holeCooldown-=dt;
  if(catTunnelBoost>0) catTunnelBoost-=dt;
  updateRatHoles(dt);
  useRatHole();
  time-=dt;if(time<=0){time=0;timeEl.textContent=displayTime(0);end(false,'time');return}timeEl.textContent=displayTime(time);

  if(comboClock>0){
    comboClock-=dt;
    if(comboClock<=0){comboClock=0;comboStreak=0;comboBonus=0;updateComboBadge()}
  }
  ratSlow=Math.max(0,ratSlow-dt);
  ratFast=Math.max(0,ratFast-dt);
  catSlow=Math.max(0,catSlow-dt);

  const effectEl=document.getElementById('effect');
  if(ratFast>0) {
    effectEl.textContent='🌶️ Turbo '+ratFast.toFixed(1)+'s';
    effectEl.style.display='block';
  } else if(ratSlow>0) {
    effectEl.textContent='🥩 Langsam '+ratSlow.toFixed(1)+'s';
    effectEl.style.display='block';
  } else if(catSlow>0) {
    effectEl.textContent='🐕 Katze flieht!';
    effectEl.style.display='block';
  } else {
    effectEl.style.display='none';
  }

  const len=Math.hypot(keys.x,keys.y)||1;
  let speed=boost>0?310:195;
  if(ratSlow>0) speed*=0.55;
  if(ratFast>0) speed*=1.55;
  moveEntity(rat,keys.x/len*speed*dt,keys.y/len*speed*dt);
  boost=Math.max(0,boost-dt);
  catHitCooldown=Math.max(0,catHitCooldown-dt);

  const lead=difficulty==='hard'?0.32:difficulty==='normal'?0.10:0;
  const targetX=rat.x+keys.x*lead*180;
  const targetY=rat.y+keys.y*lead*180;
  let dx=targetX-cat.x,dy=targetY-cat.y,d=Math.hypot(dx,dy)||1;

  const baseCatSpeed=difficulty==='easy'?78:difficulty==='normal'?125:220;
  let catSpeed=score>=30?baseCatSpeed+42:score>=15?baseCatSpeed+21:baseCatSpeed;
  if(catTunnelBoost>0) catSpeed*=1.45;
  const catSmart=difficulty==='hard'?1.38:difficulty==='normal'?1.10:1.0;
  if(catSlow>0) catSpeed*=0.45;

  const catAccel=difficulty==='hard'?2.6:difficulty==='normal'?2.0:1.6;
  if(catFlee>0){
    catFlee=Math.max(0,catFlee-dt);
    // Vom Spieler weg: Richtung vom Spieler zur Katze.
    const fx=cat.x-rat.x,fy=cat.y-rat.y,fd=Math.hypot(fx,fy)||1;
    const fleeSpeed=260;
    cat.vx+=(fx/fd*fleeSpeed-cat.vx)*dt*4.5;
    cat.vy+=(fy/fd*fleeSpeed-cat.vy)*dt*4.5;
    moveEntity(cat,cat.vx*dt,cat.vy*dt);
  } else {
    cat.vx+=(dx/d*catSpeed*catSmart-cat.vx)*dt*catAccel;
    cat.vy+=(dy/d*catSpeed*catSmart-cat.vy)*dt*catAccel;
    moveEntity(cat,cat.vx*dt,cat.vy*dt);
  }

  for(const it of items){
    if(!it.got&&Math.hypot(rat.x-it.x,rat.y-it.y)<31){
      it.got=true;

      if(it.effect==='skull'){
        end(false,'skull');return;
      } else if(it.effect==='rotten'){
        ratSlow=3;
      } else if(it.effect==='chili'){
        ratFast=3;
      } else if(it.effect==='dog'){
        catSlow=4;
        catFlee=2.0;
        // Sofort einen Fluchtimpuls geben, damit der Effekt direkt sichtbar ist.
        const fx=cat.x-rat.x,fy=cat.y-rat.y,fd=Math.hypot(fx,fy)||1;
        cat.vx=fx/fd*260;
        cat.vy=fy/fd*260;
      } else {
        recordFoodCollection(it.type);
        comboStreak=comboClock>0?comboStreak+1:1;
        comboClock=2;
        comboBonus=Math.min(3,Math.floor(comboStreak/3));
        score+=it.value+comboBonus;
        collected++;
        updateComboBadge();
      }

      if(gameMode==='timed'){
        // Jedes Objekt wird an einer neuen Stelle platziert; es gibt keine Mengen- oder Rundengrenze.
        const replacement=safeSpot();it.x=replacement.x;it.y=replacement.y;it.got=false;it.bob=Math.random()*6;
        scoreEl.textContent=score;document.getElementById('collected').textContent=collected;
        continue;
      }
      if(collected>=MAX_COLLECTED){end(true,'quota');return;}
      scoreEl.textContent=score;
      document.getElementById('collected').textContent=collected;
    }
  }

  if(catHitCooldown<=0&&Math.hypot(rat.x-cat.x,rat.y-cat.y)<42){catHitCooldown=1.5;end(false,'cat');return}
  updateCamera();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawCharacterSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  const bob=moving?Math.max(0,Math.sin(phase*2))*1.2:0;
  target.save();target.translate(0,bob);
  if(skin.animal==='pigeon')drawPigeonSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='frog')drawFrogSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='raccoon')drawRaccoonSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='flamingo')drawFlamingoSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='sheep')drawSheepSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='sugarHamster')drawSugarHamsterSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='heroRaccoon')drawHeroRaccoonSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='sausageDachshund')drawSausageDachshundSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(skin.animal==='trashDragon')drawTrashDragonSprite(target,x,y,skin,direction,scale,phase,moving);
  else if(['rocketSnail','deepSeaMole','demonRat','furnitureOctopus','discoCrab'].includes(skin.animal))drawAchievementCreature(target,x,y,skin,direction,scale,phase,moving);
  else drawRatSprite(target,x,y,skin,direction,scale,phase,moving);
  target.restore();
}
function drawAchievementCreature(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';target.lineCap='round';
  if(skin.animal==='rocketSnail'){
    drawTrotFeet(target,[-7,6],15,phase,moving,'#426a7b',2.2,2.5);
    target.fillStyle='#314d64';target.beginPath();target.moveTo(8,-3);target.lineTo(23,-10);target.lineTo(20,-2);target.lineTo(27,1);target.lineTo(18,3);target.lineTo(22,10);target.lineTo(8,6);target.closePath();target.fill();
    target.fillStyle='#e64f3d';target.beginPath();target.moveTo(19,-5);target.lineTo(30,-2);target.lineTo(22,1);target.lineTo(32,5);target.lineTo(17,4);target.closePath();target.fill();
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,5,18,8,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(0,3,16,7,0,0,Math.PI*2);target.fill();
    target.fillStyle='#d88e52';target.beginPath();target.arc(2,-7,12,0,Math.PI*2);target.fill();target.fillStyle='#edbd74';target.beginPath();target.arc(2,-8,9,0,Math.PI*2);target.fill();target.strokeStyle='#9a573e';target.lineWidth=2;target.beginPath();target.arc(4,-8,5,.4,Math.PI*1.8);target.stroke();target.strokeStyle='#f5d49c';target.lineWidth=1;target.beginPath();target.arc(4,-8,2,.4,Math.PI*1.7);target.stroke();
    target.strokeStyle=skin.body;target.lineWidth=2.5;target.beginPath();target.moveTo(-10,-1);target.lineTo(-13,-9);target.moveTo(-5,-2);target.lineTo(-7,-11);target.stroke();target.fillStyle='#272534';target.beginPath();target.arc(-13,-9,2.3,0,Math.PI*2);target.arc(-7,-11,2.3,0,Math.PI*2);target.fill();target.fillStyle='#fff';target.beginPath();target.arc(-13.5,-9.5,.8,0,Math.PI*2);target.arc(-7.5,-11.5,.8,0,Math.PI*2);target.fill();target.restore();return;
  }
  if(skin.animal==='deepSeaMole'){
    drawTrotFeet(target,[-7,7],15,phase,moving,'#443a55',2.5,2.8);
    target.fillStyle='#46516d';target.beginPath();target.roundRect(8,-11,8,23,3);target.fill();target.fillStyle='#ed873d';target.fillRect(9,-9,6,4);target.fillStyle='#f5c861';target.fillRect(9,0,6,3);target.fillStyle='#d7e5e5';target.beginPath();target.ellipse(0,3,16,11,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(0,1,14,10,0,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(4,6,8,4,0,0,Math.PI*2);target.fill();
    target.fillStyle='#d4a18c';target.beginPath();target.ellipse(-11,-4,7,6,0,0,Math.PI*2);target.fill();target.fillStyle=skin.shade;target.beginPath();target.ellipse(-14,-2,8,5,0,0,Math.PI*2);target.fill();target.fillStyle='#e9c8b2';target.beginPath();target.ellipse(-21,-2,4,3,0,0,Math.PI*2);target.fill();
    target.fillStyle='#f3c64f';target.beginPath();target.arc(-7,-8,11,Math.PI,Math.PI*2);target.lineTo(4,-3);target.lineTo(-18,-3);target.closePath();target.fill();target.strokeStyle='#fff0a8';target.lineWidth=2;target.beginPath();target.arc(-7,-7,8,Math.PI,Math.PI*2);target.stroke();target.fillStyle='#bff4ff';target.beginPath();target.arc(-10,-6,2,0,Math.PI*2);target.arc(-4,-6,2,0,Math.PI*2);target.fill();target.restore();return;
  }
  if(skin.animal==='demonRat'){
    drawTrotFeet(target,[-7,7],14,phase,moving,skin.shade,2.6,2.5);
    target.strokeStyle=skin.shade;target.lineWidth=3;target.beginPath();target.moveTo(10,5);target.bezierCurveTo(23,-1,22,15,31,7);target.stroke();target.fillStyle='#e95743';target.beginPath();target.arc(31,7,2,0,Math.PI*2);target.fill();target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,2,17,11,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(0,0,15,9,0,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(3,5,8,4,0,0,Math.PI*2);target.fill();
    target.fillStyle='#e7b44e';target.beginPath();target.moveTo(-17,-8);target.quadraticCurveTo(-25,-18,-21,-23);target.quadraticCurveTo(-17,-16,-11,-12);target.closePath();target.fill();target.beginPath();target.moveTo(-7,-11);target.quadraticCurveTo(-7,-23,-1,-25);target.quadraticCurveTo(-3,-16,1,-10);target.closePath();target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(-12,-5,9,8,0,0,Math.PI*2);target.fill();target.fillStyle='#f05745';target.beginPath();target.arc(-15,-8,2,0,Math.PI*2);target.arc(-7,-8,2,0,Math.PI*2);target.fill();target.fillStyle='#fff0d4';target.beginPath();target.arc(-15.5,-8.5,.7,0,Math.PI*2);target.arc(-7.5,-8.5,.7,0,Math.PI*2);target.fill();target.fillStyle='#f5b2a5';target.beginPath();target.arc(-21,-5,2,0,Math.PI*2);target.fill();target.restore();return;
  }
  if(skin.animal==='furnitureOctopus'){
    for(let i=0;i<6;i++){const side=i<3?-1:1,index=i%3,x0=-10+i*4.2,sway=moving?Math.sin(phase+index*.9+(side<0?0:Math.PI))*(2+index):0;target.strokeStyle=skin.shade;target.lineWidth=4.2;target.beginPath();target.moveTo(x0,4);target.bezierCurveTo(x0+side*7,8,x0+side*(12+sway),11,x0+side*(18+index*2),16+sway);target.stroke();target.strokeStyle=skin.body;target.lineWidth=2;target.beginPath();target.moveTo(x0,4);target.bezierCurveTo(x0+side*7,8,x0+side*(12+sway),11,x0+side*(18+index*2),16+sway);target.stroke();for(let cup=0;cup<3;cup++){const cx=x0+side*(7+cup*3+index),cy=8+cup*2+sway*.25;target.fillStyle='#f4d8ad';target.beginPath();target.arc(cx,cy,1.15,0,Math.PI*2);target.fill()}}
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(0,2,16,12,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(-2,-2,14,10,0,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(-3,5,9,5,0,0,Math.PI*2);target.fill();
    target.fillStyle='#fff1d2';target.beginPath();target.arc(-10,-6,4,0,Math.PI*2);target.arc(-2,-7,4,0,Math.PI*2);target.fill();target.fillStyle='#28243e';target.beginPath();target.arc(-11,-6,1.5,0,Math.PI*2);target.arc(-3,-7,1.5,0,Math.PI*2);target.fill();target.strokeStyle='#f4d56c';target.lineWidth=2;target.beginPath();target.arc(12,-12,7,0,Math.PI*2);target.moveTo(12,-12);target.lineTo(17,-17);target.stroke();target.restore();return;
  }
  if(skin.animal==='discoCrab'){
    target.fillStyle=skin.shade;target.strokeStyle=skin.shade;target.lineWidth=3;
    for(let i=0;i<3;i++)for(const side of [-1,1]){const legY=-1+i*5,step=moving?Math.sin(phase+i*Math.PI*.85+(side>0?Math.PI:0))*2.2:0;target.beginPath();target.moveTo(side*7,legY);target.lineTo(side*(14+step),legY+4);target.lineTo(side*(18+step),legY+2);target.stroke();target.fillStyle='#f4b46a';target.beginPath();target.arc(side*(18+step),legY+2,1.5,0,Math.PI*2);target.fill()}
    target.beginPath();target.ellipse(0,3,16,12,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(-1,1,13.5,9,0,0,Math.PI*2);target.fill();target.fillStyle='#ffd78a';target.beginPath();target.arc(-6,-2,1.6,0,Math.PI*2);target.arc(1,-4,1.2,0,Math.PI*2);target.arc(5,1,1.4,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(4,5,7,5,0,0,Math.PI*2);target.fill();
    for(const side of [-1,1]){const clawX=side*15,clawY=-5+(side<0?0:1);target.strokeStyle=skin.shade;target.lineWidth=3;target.beginPath();target.moveTo(side*8,0);target.quadraticCurveTo(side*12,clawY-4,clawX,clawY);target.stroke();target.fillStyle=skin.shade;target.beginPath();target.arc(clawX,clawY,4.2,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.arc(clawX,clawY,2.1,0,Math.PI*2);target.fill()}
    target.strokeStyle=skin.shade;target.lineWidth=1.5;target.beginPath();target.moveTo(-7,-8);target.lineTo(-8,-14);target.moveTo(2,-8);target.lineTo(3,-14);target.stroke();target.fillStyle='#fff2ca';target.beginPath();target.arc(-8,-14,3,0,Math.PI*2);target.arc(3,-14,3,0,Math.PI*2);target.fill();target.fillStyle='#46304e';target.beginPath();target.arc(-8.5,-14,1.3,0,Math.PI*2);target.arc(2.5,-14,1.3,0,Math.PI*2);target.fill();
    target.fillStyle='#fff1d7';target.beginPath();target.moveTo(-11,-9);target.lineTo(-5,-22);target.lineTo(1,-9);target.closePath();target.fill();target.fillStyle='#e74d78';target.beginPath();target.moveTo(-9,-12);target.lineTo(-5,-20);target.lineTo(-1,-12);target.closePath();target.fill();target.fillStyle='#efcc4f';target.beginPath();target.arc(-5,-21,1.8,0,Math.PI*2);target.fill();target.fillStyle='#73d8d1';target.fillRect(-10,-11,10,2);target.restore();return;
  }
  target.fillStyle=skin.shade;target.strokeStyle=skin.shade;target.lineWidth=3;for(let i=0;i<3;i++){const legY=3+i*4,step=moving?Math.sin(phase+i*Math.PI*.85)*2:0;target.beginPath();target.moveTo(5,legY);target.lineTo(14+step,legY+4);target.lineTo(17+step,legY+2);target.stroke()}
  target.beginPath();target.ellipse(0,3,15,11,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(-1,1,13,9,0,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(-2,6,8,4,0,0,Math.PI*2);target.fill();target.fillStyle='#fff2ca';target.beginPath();target.arc(-9,-5,3.5,0,Math.PI*2);target.arc(-2,-6,3.5,0,Math.PI*2);target.fill();target.fillStyle='#46304e';target.beginPath();target.arc(-10,-5,1.4,0,Math.PI*2);target.arc(-3,-6,1.4,0,Math.PI*2);target.fill();target.restore();
}
function drawTrotFeet(target,feet,footY,phase,moving,color='#3b342f',width=2.2,footWidth=2){
  target.lineCap='round';target.lineJoin='round';target.strokeStyle=color;target.lineWidth=width;
  feet.forEach((foot,index)=>{
    const swing=moving?Math.sin(phase+(index%2)*Math.PI)*2.4:0;
    target.beginPath();target.moveTo(foot,footY-5);target.lineTo(foot+swing,footY);target.stroke();
    target.fillStyle=color;target.beginPath();target.ellipse(foot+swing,footY,footWidth,1.35,0,0,Math.PI*2);target.fill();
  });
}
function drawSheepSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  // Compact sheep body covered by distinct wool curls.
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,4,17,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(0,1,15,10,0,0,Math.PI*2);target.arc(-10,-4,6,0,Math.PI*2);target.arc(-3,-8,6,0,Math.PI*2);target.arc(5,-7,6,0,Math.PI*2);target.arc(11,-3,6,0,Math.PI*2);target.arc(5,6,6,0,Math.PI*2);target.arc(-5,7,6,0,Math.PI*2);target.fill();
  // Face, floppy ears and pink muzzle sit at the front of the fleece.
  target.fillStyle='#70564c';target.beginPath();target.ellipse(-15,-6,7,8,-.15,0,Math.PI*2);target.fill();
  target.fillStyle='#d9999b';target.beginPath();target.ellipse(-20,-12,5,2.3,-.35,0,Math.PI*2);target.ellipse(-10,-12,5,2.3,.35,0,Math.PI*2);target.fill();
  target.fillStyle='#f2c9c0';target.beginPath();target.ellipse(-20,-5,4.2,2.8,-.2,0,Math.PI*2);target.fill();target.fillStyle='#241b15';target.beginPath();target.arc(-17,-8,1,0,Math.PI*2);target.arc(-12,-8,1,0,Math.PI*2);target.fill();target.fillStyle='#4d3934';target.beginPath();target.ellipse(-23,-5,1.3,1,0,0,Math.PI*2);target.fill();
  drawTrotFeet(target,[-8,1,10],15,phase,moving,'#5b4a42',2.2,2);
  target.fillStyle=skin.body;target.beginPath();target.arc(16,0,3.5,0,Math.PI*2);target.fill();target.restore();
}
function drawSugarHamsterSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';target.lineCap='round';
  // A round hamster silhouette with tiny ears and cheek pouches.
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,4,17,12,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(1,1,16,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.ear;target.beginPath();target.arc(-13,-9,5.3,0,Math.PI*2);target.arc(-2,-11,5,0,Math.PI*2);target.fill();target.fillStyle='#ffe0e6';target.beginPath();target.arc(-13,-9,2.7,0,Math.PI*2);target.arc(-2,-11,2.5,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(5,7,9,5,0,0,Math.PI*2);target.fill();
  target.fillStyle='#f7b3c6';target.beginPath();target.ellipse(-17,2,5,4,0,0,Math.PI*2);target.ellipse(-5,3,5,4,0,0,Math.PI*2);target.fill();
  // Oversized glossy eyes, starry highlights and raised brows show the sugar rush.
  target.fillStyle='#fffaf5';target.beginPath();target.ellipse(-16,-5,5.1,6,0,0,Math.PI*2);target.ellipse(-5,-6,5.1,6,0,0,Math.PI*2);target.fill();
  target.fillStyle='#57375f';target.beginPath();target.ellipse(-15,-4,3,4.1,-.1,0,Math.PI*2);target.ellipse(-4,-5,3,4.1,-.1,0,Math.PI*2);target.fill();
  target.fillStyle='#fff';target.beginPath();target.arc(-16,-6,1.4,0,Math.PI*2);target.arc(-5,-7,1.4,0,Math.PI*2);target.arc(-13,-2,0.7,0,Math.PI*2);target.arc(-2,-3,0.7,0,Math.PI*2);target.fill();
  target.strokeStyle='#9d5675';target.lineWidth=1.2;target.beginPath();target.moveTo(-21,-12);target.quadraticCurveTo(-17,-15,-12,-12);target.moveTo(-10,-13);target.quadraticCurveTo(-5,-16,0,-12);target.stroke();
  target.fillStyle=skin.nose;target.beginPath();target.ellipse(-22,1,1.8,1.4,0,0,Math.PI*2);target.fill();
  target.strokeStyle='#784b55';target.lineWidth=.9;target.beginPath();target.moveTo(-22,2);target.quadraticCurveTo(-20,5,-18,3);target.moveTo(-20,4);target.lineTo(-20,6);target.stroke();target.fillStyle='#fffaf1';target.fillRect(-21,5,1.5,2.5);target.fillRect(-19.5,5,1.5,2.5);
  target.fillStyle='#f4c84e';target.beginPath();target.arc(8,-9,2.5,0,Math.PI*2);target.fill();target.fillStyle='#ef78ad';target.beginPath();target.arc(13,-4,1.8,0,Math.PI*2);target.fill();target.fillStyle='#fff5d3';target.beginPath();target.arc(5,-14,1.6,0,Math.PI*2);target.fill();
  // Candy wrapper tuft and sprinkles finish the confectionery look.
  target.fillStyle='#8f62be';target.beginPath();target.moveTo(-9,-12);target.lineTo(-13,-19);target.lineTo(-6,-17);target.lineTo(-2,-21);target.lineTo(1,-14);target.closePath();target.fill();
  target.strokeStyle='#fbe071';target.lineWidth=1.4;target.beginPath();target.moveTo(-3,-17);target.lineTo(-1,-15);target.moveTo(4,1);target.lineTo(6,3);target.moveTo(-8,9);target.lineTo(-6,10);target.stroke();
  drawTrotFeet(target,[-8,5],15,phase,moving,'#8c5c70',2,2);target.restore();
}
function drawHeroRaccoonSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  // Long striped tail, pointed ears and eye mask give a clear raccoon silhouette.
  target.strokeStyle='#4a4848';target.lineWidth=8;target.beginPath();target.moveTo(8,5);target.bezierCurveTo(17,-2,25,8,29,1);target.stroke();target.strokeStyle='#e5ded1';target.lineWidth=2.3;target.beginPath();target.moveTo(19,2);target.lineTo(22,5);target.moveTo(25,1);target.lineTo(28,4);target.stroke();
  // Red superhero cape behind the body.
  target.fillStyle='#c83738';target.beginPath();target.moveTo(1,-4);target.lineTo(15,-7);target.lineTo(20,12);target.lineTo(6,7);target.closePath();target.fill();
  target.fillStyle='#66645f';target.beginPath();target.ellipse(0,3,15,10,0,0,Math.PI*2);target.fill();target.fillStyle='#e6ddcd';target.beginPath();target.ellipse(3,6,8,4,0,0,Math.PI*2);target.fill();
  drawTrotFeet(target,[-7,7],15,phase,moving,'#44413d',2.3,2.5);
  target.fillStyle='#77736a';target.beginPath();target.arc(-12,-7,8,0,Math.PI*2);target.fill();target.fillStyle='#514e4b';target.beginPath();target.moveTo(-18,-10);target.lineTo(-19,-20);target.lineTo(-11,-14);target.lineTo(-5,-19);target.lineTo(-4,-9);target.closePath();target.fill();
  target.fillStyle='#f1e9db';target.beginPath();target.ellipse(-16,-6,4.8,3.1,0,0,Math.PI*2);target.fill();target.ellipse(-7,-6,4.8,3.1,0,0,Math.PI*2);target.fill();
  target.fillStyle='#242326';target.beginPath();target.ellipse(-16,-7,4.6,2.2,0,0,Math.PI*2);target.ellipse(-7,-7,4.6,2.2,0,0,Math.PI*2);target.fill();target.fillStyle='#fff3d9';target.beginPath();target.arc(-16,-7,1,0,Math.PI*2);target.arc(-7,-7,1,0,Math.PI*2);target.fill();
  target.fillStyle='#292525';target.beginPath();target.ellipse(-21,-3,2.5,1.8,0,0,Math.PI*2);target.fill();
  target.fillStyle='#f2cf66';target.beginPath();target.arc(4,-1,3.2,0,Math.PI*2);target.fill();target.fillStyle='#fff6d0';target.font='bold 5px system-ui';target.textAlign='center';target.fillText('★',4,1);
  target.fillStyle='#e8e5dd';target.beginPath();target.moveTo(17,7);target.lineTo(23,9);target.lineTo(21,17);target.lineTo(15,14);target.closePath();target.fill();target.fillStyle='#d7ab4c';target.beginPath();target.arc(19,11,1.8,0,Math.PI*2);target.fill();
  target.restore();
}
function drawSausageDachshundSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';target.lineCap='round';
  // Very long low body, short legs and drooping ears make the dachshund shape unmistakable.
  target.fillStyle='#71372b';target.beginPath();target.moveTo(-9,-1);target.quadraticCurveTo(3,-8,19,-2);target.quadraticCurveTo(23,1,18,8);target.quadraticCurveTo(2,13,-12,7);target.closePath();target.fill();
  target.fillStyle='#b34f36';target.beginPath();target.moveTo(-10,-3);target.quadraticCurveTo(2,-10,17,-4);target.quadraticCurveTo(21,-1,17,5);target.quadraticCurveTo(1,10,-11,5);target.closePath();target.fill();
  // Sausage casing shine and a wavy mustard stripe.
  target.strokeStyle='#f5a36c';target.lineWidth=1.2;target.beginPath();target.moveTo(-5,-5);target.quadraticCurveTo(5,-8,14,-4);target.stroke();target.strokeStyle='#f5dc58';target.lineWidth=2.2;target.beginPath();target.moveTo(-7,-1);target.quadraticCurveTo(-3,-5,1,-1);target.quadraticCurveTo(5,3,9,-1);target.quadraticCurveTo(12,-4,15,-1);target.stroke();
  drawTrotFeet(target,[-6,3,12],13,phase,moving,'#56382f',2.5,2);
  target.strokeStyle='#71372b';target.lineWidth=2;target.beginPath();target.moveTo(18,-1);target.quadraticCurveTo(24,-5,25,-1);target.stroke();
  target.fillStyle='#b34f36';target.beginPath();target.ellipse(-12,-4,7,6,-.1,0,Math.PI*2);target.fill();target.ellipse(-19,-6,6,5,.1,0,Math.PI*2);target.fill();
  target.fillStyle='#77382e';target.beginPath();target.ellipse(-16,-7,3,6,-.35,0,Math.PI*2);target.fill();
  target.fillStyle='#e9b9a4';target.beginPath();target.ellipse(-23,-5,4,2.5,0,0,Math.PI*2);target.fill();target.fillStyle='#25211f';target.beginPath();target.arc(-19,-10,1.2,0,Math.PI*2);target.fill();target.ellipse(-26,-5,1.4,1,0,0,Math.PI*2);target.fill();
  target.restore();
}
function drawTrashDragonSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle='#345f43';target.beginPath();target.moveTo(4,2);target.quadraticCurveTo(19,8,26,0);target.lineTo(32,-4);target.lineTo(29,5);target.lineTo(22,8);target.quadraticCurveTo(13,13,4,9);target.closePath();target.fill();
  target.fillStyle='#4c8a56';target.beginPath();target.ellipse(0,3,16,10,-.05,0,Math.PI*2);target.fill();target.fillStyle='#a8bd78';target.beginPath();target.ellipse(-1,7,10,4,0,0,Math.PI*2);target.fill();
  // Broad bat wings and ribs make the silhouette read as a dragon.
  target.fillStyle='#376947';target.beginPath();target.moveTo(1,-2);target.lineTo(4,-20);target.lineTo(11,-11);target.lineTo(18,-17);target.lineTo(18,1);target.closePath();target.fill();target.strokeStyle='#9ab66d';target.lineWidth=1;target.beginPath();target.moveTo(4,-19);target.lineTo(7,-3);target.moveTo(11,-11);target.lineTo(7,-3);target.moveTo(18,-17);target.lineTo(7,-3);target.stroke();
  drawTrotFeet(target,[-8,3,10],14,phase,moving,'#31583e',3,2.3);
  const neckSway=moving?Math.sin(phase)*.06:0;target.save();target.translate(-9,0);target.rotate(neckSway);target.translate(9,0);
  target.fillStyle='#579b5e';target.beginPath();target.moveTo(-9,-1);target.quadraticCurveTo(-13,-13,-18,-17);target.lineTo(-25,-15);target.quadraticCurveTo(-30,-12,-25,-7);target.lineTo(-17,-6);target.lineTo(-13,1);target.closePath();target.fill();
  target.fillStyle='#e1c164';target.beginPath();target.moveTo(-21,-15);target.lineTo(-23,-23);target.lineTo(-17,-17);target.closePath();target.moveTo(-14,-16);target.lineTo(-11,-23);target.lineTo(-10,-15);target.closePath();target.fill();target.fillStyle='#f0d18c';target.beginPath();target.ellipse(-24,-9,4,2.3,0,0,Math.PI*2);target.fill();target.fillStyle='#22261f';target.beginPath();target.arc(-19,-12,1.4,0,Math.PI*2);target.fill();target.restore();
  // The metal bin lid and ribbed can armor connect the dragon to its reward theme.
  target.fillStyle='#687b56';target.beginPath();target.roundRect(-3,2,12,9,2);target.fill();target.fillStyle='#a4bd76';target.fillRect(-4,0,14,3);target.fillStyle='#596b50';target.fillRect(-1,4,1.5,5);target.fillRect(4,4,1.5,5);target.fillRect(8,4,1.5,5);target.fillStyle='#ded5b6';target.fillRect(-1,-1,7,1.5);target.restore();
}
function drawRatSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineCap='round';target.lineJoin='round';
  target.strokeStyle=skin.shade;target.lineWidth=2.4;target.beginPath();target.moveTo(9,5);target.bezierCurveTo(18,1,21,16,29,8);target.stroke();
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(2,2,17,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(1,0,15,9.5,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(4,5,8,4.5,-.1,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-11,-5,9,8,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.ear;target.beginPath();target.arc(-8,-12,4.7,0,Math.PI*2);target.fill();
  target.fillStyle='#f3c1b8';target.beginPath();target.arc(-8,-12,2.3,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.arc(-18,-5,4.2,0,Math.PI*2);target.fill();
  target.fillStyle=skin.nose;target.beginPath();target.arc(-21,-5,2.1,0,Math.PI*2);target.fill();
  target.fillStyle='#241b15';target.beginPath();target.arc(-13,-8,1.5,0,Math.PI*2);target.fill();
  target.strokeStyle='#f3e3d0';target.lineWidth=.8;target.beginPath();target.moveTo(-19,-3);target.lineTo(-27,-1);target.moveTo(-19,-5);target.lineTo(-28,-6);target.stroke();
  drawTrotFeet(target,[-5,8],12,phase,moving,skin.shade,1.7,3);
  target.restore();
}
function drawPigeonSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle=skin.shade;target.beginPath();target.moveTo(13,2);target.lineTo(27,-3);target.lineTo(17,8);target.closePath();target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(2,2,16,11,-.12,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(-1,5,9,6,-.2,0,Math.PI*2);target.fill();
  target.fillStyle='#727983';target.beginPath();target.ellipse(4,0,10,7,-.35,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-7,-3,6,6,-.25,0,Math.PI*2);target.fill();
  const headSway=moving?Math.sin(phase)*.055:0;target.save();target.translate(-4,-2);target.rotate(headSway);target.translate(4,2);
  target.fillStyle=skin.body;target.beginPath();target.arc(-10,-7,7.5,0,Math.PI*2);target.fill();
  target.fillStyle=skin.nose;target.beginPath();target.moveTo(-16,-7);target.lineTo(-24,-5);target.lineTo(-16,-3);target.closePath();target.fill();
  target.fillStyle='#222';target.beginPath();target.arc(-12,-9,1.4,0,Math.PI*2);target.fill();target.restore();
  drawTrotFeet(target,[-4,5],16,phase,moving,skin.nose,2,2.2);
  target.restore();
}
function drawFrogSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(4,5,17,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(2,1,16,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(-1,6,9,5,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-8,-8,13,9,0,0,Math.PI*2);target.fill();
  for(const eyeX of [-16,-2]){
    target.fillStyle=skin.shade;target.beginPath();target.arc(eyeX,-15,5.5,0,Math.PI*2);target.fill();
    target.fillStyle='#fff4d4';target.beginPath();target.arc(eyeX,-15,4.3,0,Math.PI*2);target.fill();
    target.fillStyle='#24351f';target.beginPath();target.arc(eyeX-1,-15,2,0,Math.PI*2);target.fill();
  }
  target.strokeStyle='#365d2c';target.lineWidth=1.5;target.beginPath();target.moveTo(-20,-5);target.quadraticCurveTo(-12,-1,-4,-5);target.stroke();
  const frogStep=moving?Math.sin(phase)*2.5:0;
  target.fillStyle=skin.body;target.beginPath();target.ellipse(14+frogStep,8,7,5,-.3,0,Math.PI*2);target.ellipse(-8-frogStep,11,6,3,.2,0,Math.PI*2);target.fill();
  target.restore();
}
function drawRaccoonSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle=skin.shade;target.beginPath();target.moveTo(10,0);target.bezierCurveTo(19,-5,24,10,31,4);target.bezierCurveTo(24,18,15,7,9,8);target.closePath();target.fill();
  target.strokeStyle='#d6d0c3';target.lineWidth=3;for(const tx of [19,25]){target.beginPath();target.moveTo(tx,5);target.lineTo(tx+3,8);target.stroke()}
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(2,2,16,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(1,0,14,9,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(3,5,8,4,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.arc(-10,-6,8,0,Math.PI*2);target.fill();
  target.fillStyle=skin.shade;target.beginPath();target.moveTo(-17,-9);target.lineTo(-17,-17);target.lineTo(-9,-12);target.closePath();target.fill();
  target.beginPath();target.moveTo(-5,-12);target.lineTo(-2,-18);target.lineTo(1,-10);target.closePath();target.fill();
  target.fillStyle='#dedbd0';target.beginPath();target.ellipse(-13,-6,7,4,0,0,Math.PI*2);target.fill();
  target.fillStyle='#282724';target.beginPath();target.ellipse(-13,-8,6,2.7,0,0,Math.PI*2);target.fill();
  target.fillStyle='#f5ead5';target.beginPath();target.arc(-13,-8,1.4,0,Math.PI*2);target.fill();
  target.fillStyle='#383631';target.beginPath();target.ellipse(-19,-5,3,2,0,0,Math.PI*2);target.fill();
  drawTrotFeet(target,[-6,7],13,phase,moving,skin.shade,2.2,2.5);
  target.restore();
}
function drawFlamingoSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineCap='round';target.lineJoin='round';
  const flamingoStep=moving?Math.sin(phase)*2.5:0;
  target.strokeStyle=skin.shade;target.lineWidth=3;target.beginPath();target.moveTo(-4,2);target.lineTo(-6+flamingoStep,19);target.moveTo(6,2);target.lineTo(8-flamingoStep,18);target.stroke();
  target.strokeStyle=skin.nose;target.lineWidth=2;target.beginPath();target.moveTo(-8+flamingoStep,19);target.lineTo(-14+flamingoStep,19);target.moveTo(6-flamingoStep,18);target.lineTo(13-flamingoStep,18);target.stroke();
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(3,-7,15,9,-.2,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(2,-9,13,7,-.2,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(-1,-6,7,4,-.3,0,Math.PI*2);target.fill();
  const neckSway=moving?Math.sin(phase)*.05:0;target.save();target.translate(-4,-14);target.rotate(neckSway);target.translate(4,14);
  target.strokeStyle=skin.body;target.lineWidth=5;target.beginPath();target.moveTo(-4,-14);target.bezierCurveTo(-7,-23,-2,-29,-11,-31);target.bezierCurveTo(-17,-33,-17,-39,-15,-42);target.stroke();
  target.fillStyle=skin.body;target.beginPath();target.arc(-15,-41,6,0,Math.PI*2);target.fill();
  target.fillStyle=skin.nose;target.beginPath();target.moveTo(-19,-41);target.lineTo(-29,-38);target.lineTo(-20,-36);target.closePath();target.fill();
  target.fillStyle='#241b15';target.beginPath();target.arc(-16,-43,1.3,0,Math.PI*2);target.fill();target.restore();
  target.restore();
}
function drawLivingFurniture(o){
  const {x,y,w,h,label}=o;
  ctx.save();
  ctx.lineJoin='round';
  // A short offset shadow gives each piece some depth without blurring the mobile canvas.
  ctx.fillStyle='#49342655';roundRect(x+3,y+6,w-2,h-2,10);

  if(label==='SOFA'){
    ctx.fillStyle='#713b35';roundRect(x,y,w,h,13);
    ctx.fillStyle='#a95147';roundRect(x+7,y+6,w-14,h-12,10);
    ctx.fillStyle='#c66a59';roundRect(x+16,y+9,w-32,23,8);
    ctx.fillStyle='#d5826b';roundRect(x+16,y+37,w-32,h-46,7);
    ctx.fillStyle='#8c443e';roundRect(x+8,y+12,18,h-24,7);
    ctx.fillStyle='#8c443e';roundRect(x+w-26,y+12,18,h-24,7);
    ctx.strokeStyle='#e9a38a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+31,y+20);ctx.lineTo(x+w-31,y+20);ctx.stroke();
  }else if(label==='SCHRANK'){
    ctx.fillStyle='#60432e';roundRect(x,y,w,h,8);
    ctx.fillStyle='#a4774d';roundRect(x+5,y+5,w-10,h-10,5);
    ctx.strokeStyle='#6a4931';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+w/2,y+9);ctx.lineTo(x+w/2,y+h-9);ctx.stroke();
    ctx.fillStyle='#e1bb7d';roundRect(x+w*.43,y+h*.43,5,8,2);roundRect(x+w*.55,y+h*.43,5,8,2);
    ctx.strokeStyle='#c79861';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+12,y+12);ctx.lineTo(x+w-12,y+12);ctx.stroke();
  }else if(label==='TISCH'){
    ctx.fillStyle='#765034';roundRect(x+20,y+21,14,h-25,4);roundRect(x+w-34,y+21,14,h-25,4);
    ctx.fillStyle='#8a5b37';roundRect(x+4,y+4,w-8,h-18,9);
    ctx.fillStyle='#b98250';roundRect(x+9,y+8,w-18,Math.max(13,h-29),6);
    ctx.strokeStyle='#d4a36c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+18,y+14);ctx.lineTo(x+w-18,y+14);ctx.stroke();
  }else if(label==='KISTE'){
    ctx.fillStyle='#68472f';roundRect(x,y+5,w,h-5,7);
    ctx.fillStyle='#a87342';roundRect(x+5,y+10,w-10,h-15,4);
    ctx.strokeStyle='#71492e';ctx.lineWidth=3;
    for(let yy=y+20;yy<y+h-5;yy+=16){ctx.beginPath();ctx.moveTo(x+8,yy);ctx.lineTo(x+w-8,yy);ctx.stroke()}
    ctx.fillStyle='#d29a5a';roundRect(x+7,y+7,w-14,7,3);
    ctx.strokeStyle='#d7aa72';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+14,y+18);ctx.lineTo(x+w-14,y+h-10);ctx.stroke();
  }else if(label==='REGAL'){
    ctx.fillStyle='#543a2a';roundRect(x,y,w,h,6);
    ctx.fillStyle='#8b603d';roundRect(x+5,y+5,w-10,h-10,3);
    ctx.fillStyle='#543a2a';roundRect(x+7,y+h*.43,w-14,6,2);roundRect(x+7,y+h*.75,w-14,6,2);
    const bookColors=['#d58b50','#59766a','#d6bd7a','#9c5549','#6f83a0'];
    for(let i=0;i<5;i++){
      const bx=x+13+i*((w-30)/5),bw=Math.max(10,(w-48)/6);
      ctx.fillStyle=bookColors[i];roundRect(bx,y+12,bw,h*.27,2);
      ctx.fillStyle=bookColors[(i+2)%bookColors.length];roundRect(bx,y+h*.5,bw,h*.2,2);
    }
  }else if(label==='BANK'){
    ctx.fillStyle='#68452f';roundRect(x+12,y+8,w-24,h-18,9);
    ctx.fillStyle='#b77d4d';roundRect(x+17,y+11,w-34,h-28,7);
    ctx.fillStyle='#d29b61';roundRect(x+24,y+15,w-48,8,4);
    ctx.fillStyle='#543927';roundRect(x+20,y+h-14,10,11,3);roundRect(x+w-30,y+h-14,10,11,3);
  }
  ctx.restore();
}
function drawLivingFloorDetails(){
  // Staggered plank joints make the existing wooden floor read more clearly.
  ctx.save();ctx.strokeStyle='#76563855';ctx.lineWidth=2;
  let row=0;
  for(let y=115;y<worldH-120;y+=92,row++){
    const offset=row%2?88:0;
    for(let x=offset+120;x<worldW;x+=190){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+44);ctx.stroke()}
  }
  // A patterned rug anchors the seating area; it is decorative and has no collision.
  const x=worldW*.30,y=worldH*.40,w=worldW*.40,h=worldH*.23;
  ctx.fillStyle='#513a2d55';roundRect(x+4,y+7,w,h,22);
  ctx.fillStyle='#874d42';roundRect(x,y,w,h,22);
  ctx.strokeStyle='#d4ac71';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(x+9,y+9,w-18,h-18,16);ctx.stroke();
  ctx.strokeStyle='#c78d61';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+19,y+19,w-38,h-38,12);ctx.stroke();
  ctx.strokeStyle='#d3a66b';ctx.lineWidth=2;
  for(const cx of [x+42,x+w-42]){
    for(const cy of [y+42,y+h-42]){
      ctx.beginPath();ctx.moveTo(cx,cy-12);ctx.lineTo(cx+12,cy);ctx.lineTo(cx,cy+12);ctx.lineTo(cx-12,cy);ctx.closePath();ctx.stroke();
    }
  }
  ctx.restore();
}
function drawRoomFurniture(o){
  if(currentMap==='living'){drawLivingFurniture(o);return}
  const {x,y,w,h,label}=o;
  if(currentMap==='carnival'){
    const colors=['#ed4e73','#ffc943','#50c7b2','#8960bd','#f7e6b2'];
    const fill=(xx,yy,ww,hh,color,r=6)=>{ctx.fillStyle=color;roundRect(xx,yy,ww,hh,r)};
    const stripeCanopy=(left,top,width,height)=>{
      fill(left,top,width,height,'#fff0b0',5);
      const stripes=8,sw=width/stripes;
      for(let i=0;i<stripes;i++)fill(left+i*sw,top,sw*.55,height,colors[i%2?0:1],3);
      ctx.strokeStyle='#fff0b0';ctx.lineWidth=3;
      for(let i=0;i<=stripes;i++){ctx.beginPath();ctx.arc(left+i*sw,top+height,5,0,Math.PI);ctx.fillStyle=i%2?'#ed4e73':'#ffc943';ctx.fill()}
    };
    ctx.save();ctx.lineJoin='round';ctx.fillStyle='#160e2855';
    ctx.beginPath();ctx.ellipse(x+w/2,y+h*.88,w*.47,h*.12,0,0,Math.PI*2);ctx.fill();
    if(label==='KARUSSELL'){
      // Raised carousel platform with a gold rim.
      fill(x+18,y+h*.70,w-36,h*.22,'#402554',18);fill(x+24,y+h*.69,w-48,h*.14,'#e4aa43',14);fill(x+30,y+h*.68,w-60,h*.11,'#9b4e9a',12);
      const cx=x+w/2,cy=y+h*.42,r=Math.min(w*.31,h*.34);
      // Striped canopy sectors.
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a+Math.PI/4);ctx.closePath();ctx.fillStyle=colors[i%4];ctx.fill();
      }
      ctx.strokeStyle='#ffe7a0';ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
      fill(cx-r*.38,cy-r*.78,r*.76,12,'#efbf4f',6);
      for(let i=0;i<5;i++){
        const px=x+50+i*(w-100)/4;
        ctx.strokeStyle='#ffe7a0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,y+h*.53);ctx.lineTo(px,y+h*.76);ctx.stroke();
        ctx.font='20px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i%2?'🎠':'🐎',px,y+h*.60);
      }
      ctx.fillStyle='#fff0b0';ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fill();
    }else if(label==='LUFTBALLONS'){
      fill(x+8,y+h*.75,w-16,h*.17,'#58346e',8);fill(x+14,y+h*.75,w-28,h*.09,'#e4aa43',5);
      for(let i=0;i<6;i++){
        const bx=x+34+i*(w-68)/5,by=y+17+(i%2)*7,col=colors[i%4];
        ctx.strokeStyle='#f6dca2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(bx,by+28);ctx.quadraticCurveTo(bx+8,by+49,bx+3,y+h*.73);ctx.stroke();
        ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(bx,by+15,13,18,-.12,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#ffffff88';ctx.beginPath();ctx.ellipse(bx-4,by+9,3,6,-.35,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#fff0b0';ctx.beginPath();ctx.moveTo(bx-3,by+32);ctx.lineTo(bx+3,by+32);ctx.lineTo(bx,by+38);ctx.closePath();ctx.fill();
      }
    }else if(label==='KONFETTI'){
      fill(x+8,y+18,w-16,h*.62,'#422454',8);fill(x+14,y+24,w-28,h*.49,'#b84774',5);
      stripeCanopy(x+5,y+4,w-10,25);
      for(let i=0;i<28;i++){
        const px=x+18+(i*37)%(w-36),py=y+32+(i*23)%(h*.40);
        ctx.save();ctx.translate(px,py);ctx.rotate(i*.37);ctx.fillStyle=colors[i%4];ctx.fillRect(-3,-5,6,10);ctx.restore();
      }
      fill(x+22,y+h*.68,w-44,12,'#f0c75a',5);
    }else if(label==='BÜHNE'){
      fill(x+5,y+h*.66,w-10,h*.22,'#412452',8);fill(x+12,y+h*.67,w-24,h*.11,'#ce8c42',5);
      fill(x+10,y+8,w-20,h*.60,'#4b285d',8);
      fill(x+14,y+8,w*.20,h*.58,'#cf456f',8);fill(x+w*.76,y+8,w*.20,h*.58,'#cf456f',8);
      ctx.fillStyle='#f4d27c';ctx.beginPath();ctx.moveTo(x+12,y+9);ctx.lineTo(x+w/2,y+h*.25);ctx.lineTo(x+w-12,y+9);ctx.closePath();ctx.fill();
      for(let i=0;i<9;i++){const bx=x+18+i*(w-36)/8;ctx.fillStyle=colors[i%4];ctx.beginPath();ctx.arc(bx,y+7,4,0,Math.PI*2);ctx.fill()}
      ctx.font='24px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🎭',x+w/2,y+h*.46);
    }else if(label==='MUSIK'){
      fill(x+10,y+10,w-20,h-20,'#442653',12);fill(x+18,y+18,w-36,h-36,'#2e2042',8);
      for(let i=0;i<2;i++){
        const bx=x+30+i*(w-90);
        fill(bx,y+25,48,h-48,'#17131f',7);fill(bx+5,y+30,38,h-58,'#75458d',5);
        ctx.fillStyle='#17131f';ctx.beginPath();ctx.arc(bx+24,y+h*.52,12,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#efbf4f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(bx+24,y+h*.52,8,0,Math.PI*2);ctx.stroke();
      }
      ctx.font='25px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('♫  ♪',x+w/2,y+20);
    }else{
      // Ticket and costume booths get layered counters, striped awnings, and display props.
      fill(x+7,y+h*.53,w-14,h*.34,'#482657',8);fill(x+12,y+h*.55,w-24,h*.23,'#e3a146',5);
      fill(x+17,y+h*.58,w-34,h*.13,'#8e497e',4);
      stripeCanopy(x+3,y+4,w-6,Math.min(28,h*.30));
      for(let i=0;i<4;i++){
        const bx=x+28+i*(w-56)/3;
        if(label==='KOSTÜMSTAND'){
          ctx.font='22px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i%2?'🎩':'🎭',bx,y+h*.43);
        }else{
          ctx.strokeStyle='#fff0b0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bx,y+h*.52);ctx.lineTo(bx,y+h*.34);ctx.stroke();
          ctx.fillStyle=colors[i%4];ctx.beginPath();ctx.arc(bx,y+h*.31,7,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff0b0';ctx.beginPath();ctx.arc(bx,y+h*.31,3,0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();return;
  }
  const palettes={
    hallway:{dark:'#514033',mid:'#806044',top:'#b1875b',light:'#d6b782',cloth:'#627665',metal:'#d1b276',green:'#6c8a61',soil:'#604632'},
    storage:{dark:'#49433b',mid:'#71604b',top:'#a08058',light:'#c2a273',cloth:'#718078',metal:'#b4a47f',green:'#72815e',soil:'#574332'},
    bathroom:{dark:'#63777a',mid:'#9db7b8',top:'#e3eeee',light:'#ffffff',cloth:'#8dc7ca',metal:'#78999d',green:'#8aa88c',soil:'#849b9e'},
    bedroom:{dark:'#59443d',mid:'#87654e',top:'#b18a67',light:'#e2caa4',cloth:'#bd7770',metal:'#d2b887',green:'#788364',soil:'#604837'},
    dining:{dark:'#4f3529',mid:'#795139',top:'#b17c49',light:'#d8ae70',cloth:'#a95343',metal:'#d3ad68',green:'#71815a',soil:'#59412e'},
    attic:{dark:'#4b392b',mid:'#765a3c',top:'#a9855b',light:'#ccb184',cloth:'#9d7954',metal:'#c2a06b',green:'#687552',soil:'#58432f'},
    cellar:{dark:'#3e4241',mid:'#65645d',top:'#938571',light:'#c1b294',cloth:'#65796f',metal:'#b3a37d',green:'#71805e',soil:'#4d4439'},
    garden:{dark:'#405738',mid:'#73543b',top:'#a87648',light:'#d2ae70',cloth:'#d2915d',metal:'#d4bd82',green:'#6f9b4b',soil:'#65452e'},
    carnival:{dark:'#392250',mid:'#74438d',top:'#e2a43c',light:'#fff0b0',cloth:'#e45178',metal:'#f4cf62',green:'#5f9e68',soil:'#74474a'}
  };
  const p=palettes[currentMap]||palettes.storage;
  const fill=(xx,yy,ww,hh,color,r=6)=>{ctx.fillStyle=color;roundRect(xx,yy,ww,hh,r)};
  ctx.save();ctx.lineJoin='round';
  fill(x+3,y+6,w-2,h-2,'#30291f44',10);

  if(['BETT'].includes(label)){
    fill(x,y,w,h,p.dark,13);fill(x+7,y+7,w-14,h-14,p.mid,10);
    fill(x+15,y+15,w-30,37,p.light,8);
    fill(x+19,y+19,Math.max(20,w*.28),25,'#fff2d9',7);
    fill(x+15,y+58,w-30,h-73,p.cloth,7);
    ctx.strokeStyle=p.light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+24,y+67);ctx.lineTo(x+w-24,y+67);ctx.stroke();
  }else if(['BADEWANNE','WASCHBECKEN','TOILETTE'].includes(label)){
    fill(x,y,w,h,p.dark,13);fill(x+5,y+5,w-10,h-10,p.top,11);
    if(label==='BADEWANNE'){
      fill(x+14,y+15,w-28,h-30,p.light,20);fill(x+22,y+22,w-44,h-45,'#a9dfe1',16);
      ctx.strokeStyle='#ffffff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+28,y+27);ctx.quadraticCurveTo(x+w/2,y+18,x+w-28,y+27);ctx.stroke();
    }else if(label==='WASCHBECKEN'){
      fill(x+w*.4,y+6,w*.2,11,p.metal,5);fill(x+12,y+23,w-24,h-36,p.light,18);
      ctx.fillStyle='#b6d8da';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.58,Math.max(10,w*.31),Math.max(8,h*.19),0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=p.dark;ctx.beginPath();ctx.arc(x+w/2,y+h*.58,3,0,Math.PI*2);ctx.fill();
    }else{
      fill(x+w*.24,y+7,w*.52,h*.27,p.light,7);fill(x+w*.31,y+12,w*.38,h*.18,p.top,5);
      fill(x+w*.13,y+h*.35,w*.74,h*.51,p.light,18);fill(x+w*.24,y+h*.45,w*.52,h*.32,'#d2e6e6',15);
      ctx.strokeStyle=p.metal;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+w/2,y+h*.61,Math.min(w,h)*.19,0,Math.PI*2);ctx.stroke();
    }
  }else if(['WASCHMASCHINE','TROCKNER'].includes(label)){
    fill(x,y,w,h,p.dark,10);fill(x+5,y+5,w-10,h-10,p.top,7);
    fill(x+12,y+10,w-24,17,p.light,4);
    fill(x+w-35,y+14,7,7,p.cloth,4);fill(x+w-22,y+14,7,7,p.green,4);
    ctx.fillStyle=p.dark;ctx.beginPath();ctx.arc(x+w/2,y+h*.61,Math.min(w,h)*.31,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=label==='TROCKNER'?'#b5c9c4':'#89bdc0';ctx.beginPath();ctx.arc(x+w/2,y+h*.61,Math.min(w,h)*.25,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=p.light;ctx.lineWidth=4;ctx.beginPath();ctx.arc(x+w/2,y+h*.61,Math.min(w,h)*.28,0,Math.PI*2);ctx.stroke();
  }else if(['BLUMENBEET','GEMÜSEBEET'].includes(label)){
    fill(x,y,w,h,p.dark,8);fill(x+6,y+6,w-12,h-12,p.mid,5);fill(x+12,y+12,w-24,h-24,p.soil,4);
    const rows=3;
    for(let r=0;r<rows;r++){
      const yy=y+20+r*((h-40)/(rows-1));
      ctx.strokeStyle='#bd9661';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+16,yy+7);ctx.lineTo(x+w-16,yy+7);ctx.stroke();
      for(let i=0;i<5;i++){
        const xx=x+28+i*((w-56)/4);
        ctx.strokeStyle=p.green;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(xx,yy+8);ctx.lineTo(xx,yy-2);ctx.stroke();
        if(label==='BLUMENBEET'){
          ctx.fillStyle=['#e9bd69','#d88776','#eee2bd'][i%3];ctx.beginPath();ctx.arc(xx,yy-5,4,0,Math.PI*2);ctx.fill();
        }else{
          ctx.fillStyle=p.green;ctx.beginPath();ctx.ellipse(xx-3,yy+1,5,2,-.4,0,Math.PI*2);ctx.ellipse(xx+3,yy+1,5,2,.4,0,Math.PI*2);ctx.fill();
        }
      }
    }
  }else if(['TISCH','ESSTISCH','GARTENTISCH','INSEL','WERKBANK'].includes(label)){
    const leg=p.dark;
    fill(x+17,y+22,13,h-25,leg,4);fill(x+w-30,y+22,13,h-25,leg,4);
    if(h>100){fill(x+17,y+h-31,13,24,leg,4);fill(x+w-30,y+h-31,13,24,leg,4)}
    fill(x+3,y+4,w-6,h>100?25:h-16,p.mid,8);fill(x+8,y+7,w-16,h>100?16:Math.max(12,h-25),p.top,6);
    ctx.strokeStyle=p.light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+17,y+12);ctx.lineTo(x+w-17,y+12);ctx.stroke();
    if(label==='GARTENTISCH'){
      fill(x+w*.38,y+10,w*.24,10,p.light,5);
      ctx.fillStyle=p.green;ctx.beginPath();ctx.arc(x+w/2,y+13,5,0,Math.PI*2);ctx.fill();
    }else if(label==='WERKBANK'){
      fill(x+w*.67,y+9,22,7,p.dark,3);fill(x+w*.68,y+15,5,9,p.metal,2);fill(x+w*.79,y+15,5,9,p.metal,2);
      ctx.strokeStyle=p.light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.25,y+12);ctx.lineTo(x+w*.42,y+12);ctx.moveTo(x+w*.33,y+8);ctx.lineTo(x+w*.33,y+17);ctx.stroke();
    }
  }else if(['STUHL','BANK','GARTENBANK'].includes(label)){
    fill(x+12,y+5,w-24,Math.max(10,h*.28),p.dark,5);
    const slatW=Math.max(5,(w-36)/4);
    for(let i=0;i<3;i++)fill(x+18+i*(slatW+3),y+9,slatW,h*.17,p.top,3);
    fill(x+7,y+h*.43,w-14,h*.22,p.mid,6);fill(x+12,y+h*.46,w-24,h*.12,p.top,4);
    fill(x+14,y+h*.65,8,h*.25,p.dark,3);fill(x+w-22,y+h*.65,8,h*.25,p.dark,3);
  }else if(['REGAL','WEINREGAL'].includes(label)){
    fill(x,y,w,h,p.dark,6);fill(x+5,y+5,w-10,h-10,p.mid,3);
    const shelfYs=[.39,.70];
    for(const level of shelfYs)fill(x+7,y+h*level,w-14,6,p.dark,2);
    if(label==='WEINREGAL'){
      const n=Math.max(3,Math.floor((w-30)/28));
      for(let i=0;i<n;i++){
        const bx=x+15+i*((w-32)/n);
        ctx.fillStyle=['#7d4035','#557354','#a17445'][i%3];roundRect(bx,y+13,13,h*.22,5);
        fill(bx+4,y+7,5,9,p.light,2);ctx.fillStyle=p.light;ctx.beginPath();ctx.arc(bx+6.5,y+13,6,Math.PI,0);ctx.fill();
        ctx.fillStyle='#c7a56b';roundRect(bx,y+h*.46,13,h*.19,5);fill(bx+4,y+h*.44,5,8,p.light,2);
      }
    }else{
      const colors=[p.cloth,p.light,p.green,p.top,'#a45d50'];
      const n=Math.max(3,Math.floor((w-26)/30));
      for(let i=0;i<n;i++){
        const bx=x+12+i*((w-24)/n),bw=Math.max(8,(w-38)/n);
        fill(bx,y+11,bw,h*.24,colors[i%colors.length],3);
        fill(bx,y+h*.48,bw,h*.17,colors[(i+2)%colors.length],3);
      }
    }
  }else if(['KISTEN','KARTONS','TRUHE','DACHBALKEN','GARTENSCHUPPEN'].includes(label)){
    if(label==='DACHBALKEN'){
      fill(x,y,w,h,p.dark,7);fill(x+5,y+5,w-10,h-10,p.mid,4);
      ctx.strokeStyle=p.light;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+12,y+13);ctx.lineTo(x+w-12,y+13);ctx.moveTo(x+22,y+h-13);ctx.lineTo(x+w-22,y+h-13);ctx.stroke();
    }else if(label==='GARTENSCHUPPEN'){
      fill(x,y+10,w,h-10,p.dark,7);fill(x+7,y+20,w-14,h-27,p.mid,4);
      ctx.fillStyle=p.top;ctx.beginPath();ctx.moveTo(x-2,y+16);ctx.lineTo(x+w/2,y);ctx.lineTo(x+w+2,y+16);ctx.closePath();ctx.fill();
      fill(x+w*.39,y+h*.48,w*.22,h*.44,p.dark,4);fill(x+w*.44,y+h*.53,w*.12,h*.39,p.top,3);
    }else{
      fill(x,y+6,w,h-6,p.mid,7);fill(x+5,y+11,w-10,h-16,p.top,4);
      if(label==='KARTONS'){
        ctx.strokeStyle=p.dark;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+6,y+12);ctx.lineTo(x+w*.53,y+Math.min(26,h*.3));ctx.lineTo(x+w-6,y+12);ctx.stroke();
        ctx.strokeStyle=p.light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.53,y+12);ctx.lineTo(x+w*.53,y+h-9);ctx.stroke();
      }else{
        ctx.strokeStyle=p.dark;ctx.lineWidth=3;
        for(let yy=y+24;yy<y+h-3;yy+=18){ctx.beginPath();ctx.moveTo(x+7,yy);ctx.lineTo(x+w-7,yy);ctx.stroke()}
        fill(x+7,y+8,w-14,7,p.light,3);
        if(label==='TRUHE'){
          ctx.strokeStyle=p.light;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+14,y+18);ctx.lineTo(x+w-14,y+h-10);ctx.moveTo(x+w-14,y+18);ctx.lineTo(x+14,y+h-10);ctx.stroke();
        }
      }
    }
  }else if(label==='NACHTTISCH'){
    fill(x+5,y+5,w-10,h-10,p.mid,6);fill(x+10,y+10,w-20,h*.36,p.top,4);
    fill(x+10,y+h*.55,w-20,h*.3,p.top,4);fill(x+w/2-3,y+h*.4,6,5,p.light,3);fill(x+w/2-3,y+h*.73,6,5,p.light,3);
    ctx.fillStyle=p.light;ctx.beginPath();ctx.arc(x+w/2,y+4,Math.min(w,h)*.14,0,Math.PI*2);ctx.fill();
  }else{
    // Cabinets, dressers, counters and wardrobes share a detailed paneled finish.
    fill(x,y,w,h,p.dark,7);fill(x+5,y+5,w-10,h-10,p.mid,5);
    if(['KOMMODE','SIDEBOARD','UNTERSCHRANK','ANRICHTE','VORRAT'].includes(label)){
      const drawers=Math.max(1,Math.min(3,Math.round(h/28)));
      for(let i=0;i<drawers;i++){
        const yy=y+8+i*((h-19)/drawers);
        fill(x+10,yy,w-20,(h-22)/drawers-3,p.top,4);
        fill(x+w/2-3,yy+(h-22)/drawers/2-2,6,5,p.light,3);
      }
    }else{
      const doors=w>150?2:1;
      for(let i=0;i<doors;i++){
        const dx=x+9+i*((w-18)/doors),dw=(w-22)/doors;
        fill(dx,y+10,dw,h-20,p.top,4);
        ctx.strokeStyle=p.mid;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(dx+4,y+14,dw-8,h-28,3);ctx.stroke();
        fill(dx+dw-10,y+h*.48,4,7,p.light,2);
      }
      if(label==='GARDEROBE'){
        ctx.strokeStyle=p.metal;ctx.lineWidth=3;ctx.beginPath();
        for(let i=0;i<3;i++){const hx=x+40+i*((w-80)/2);ctx.moveTo(hx,y+12);ctx.lineTo(hx,y+25);ctx.arc(hx+5,y+25,5,Math.PI,0)}ctx.stroke();
      }
      if(label==='VITRINE'){
        ctx.strokeStyle='#d9e7d8';ctx.lineWidth=2;ctx.strokeRect(x+12,y+12,w-24,h-24);
        ctx.fillStyle=p.light;ctx.beginPath();ctx.arc(x+w*.3,y+h*.35,5,0,Math.PI*2);ctx.arc(x+w*.65,y+h*.35,5,0,Math.PI*2);ctx.fill();
      }
    }
  }
  ctx.restore();
}
function drawRoomFloorDetails(){
  if(currentMap==='carnival'){
    ctx.save();
    // A softly lit parade loop and gold edging break up the plain floor grid.
    ctx.strokeStyle='#edc66b22';ctx.lineWidth=34;ctx.beginPath();ctx.roundRect(worldW*.12,worldH*.24,worldW*.76,worldH*.53,92);ctx.stroke();
    ctx.strokeStyle='#f4d27c77';ctx.lineWidth=3;ctx.setLineDash([15,13]);ctx.beginPath();ctx.roundRect(worldW*.12,worldH*.24,worldW*.76,worldH*.53,92);ctx.stroke();ctx.setLineDash([]);
    const confetti=['#ffd34f','#f2769a','#63d1c3','#fff0b0','#aa83d1'];
    for(let i=0;i<34;i++){
      const x=(i*197+83)%worldW,y=142+(i*131+47)%(worldH-285);
      ctx.save();ctx.translate(x,y);ctx.rotate((i%5)*.31);ctx.fillStyle=confetti[i%confetti.length];
      ctx.globalAlpha=.65;ctx.fillRect(-3,-6,6,12);ctx.restore();
    }
    // Pennants and warm bulbs frame the room like a small fairground.
    for(const y of [101,worldH-119]){
      ctx.strokeStyle='#f7d783';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(35,y);ctx.quadraticCurveTo(worldW/2,y+28,worldW-35,y);ctx.stroke();
      for(let i=0;i<18;i++){
        const x=55+i*(worldW-110)/17,drop=28*Math.sin(Math.PI*i/17),py=y+drop;
        ctx.fillStyle=confetti[i%confetti.length];ctx.beginPath();ctx.moveTo(x-9,py+2);ctx.lineTo(x+9,py+2);ctx.lineTo(x,py+19);ctx.closePath();ctx.fill();
        ctx.fillStyle='#fff1b3';ctx.beginPath();ctx.arc(x,py-5,3.5,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }else if(currentMap==='hallway'||currentMap==='bedroom'||currentMap==='dining'){
    const x=currentMap==='hallway'?worldW*.38:worldW*.28;
    const y=currentMap==='hallway'?145:(currentMap==='bedroom'?510:300);
    const w=currentMap==='hallway'?worldW*.24:worldW*.44;
    const h=currentMap==='hallway'?worldH*.62:worldH*.30;
    const rug=currentMap==='hallway'?'#6b5143':(currentMap==='bedroom'?'#69505a':'#805442');
    ctx.save();ctx.fillStyle=rug;roundRect(x,y,w,h,18);
    ctx.strokeStyle='#d4b67b';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,h-16,13);ctx.stroke();
    ctx.strokeStyle='#c99e68';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+17,y+17,w-34,h-34,9);ctx.stroke();ctx.restore();
  }else if(currentMap==='attic'){
    ctx.save();ctx.lineCap='round';
    ctx.strokeStyle='#59432f';ctx.lineWidth=27;ctx.beginPath();ctx.moveTo(10,285);ctx.lineTo(worldW/2,100);ctx.lineTo(worldW-10,285);ctx.stroke();
    ctx.strokeStyle='#a8875e';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(13,280);ctx.lineTo(worldW/2,112);ctx.lineTo(worldW-13,280);ctx.stroke();
    ctx.restore();
  }else if(currentMap==='garden'){
    ctx.save();ctx.strokeStyle='#d4c08d66';ctx.lineWidth=4;
    for(let y=260;y<worldH-160;y+=66){
      const x=worldW/2+(Math.floor(y/66)%2?18:-18);
      ctx.beginPath();ctx.ellipse(x,y,17,10,-.2,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
}
function buildGardenPlantsLayer(){
  const layer=document.createElement('canvas');
  layer.width=worldW;layer.height=worldH;
  const p=layer.getContext('2d');
  const flowers=[
    {x:worldW*.30,y:335,colors:['#f4d87c','#e58c82','#fff0cf']},
    {x:worldW*.70,y:260,colors:['#f5d66e','#e3a1c1','#fff0cf']},
    {x:worldW*.28,y:625,colors:['#f4d87c','#d58ca0','#fff0cf']},
    {x:worldW*.72,y:620,colors:['#f4d87c','#e58c82','#d5e5a0']},
    {x:worldW*.85,y:345,colors:['#fff0cf','#e3a1c1','#f5d66e']}
  ];
  for(const plant of flowers){
    const {x,y,colors}=plant;
    // Terracotta pot and soil.
    p.fillStyle='#9a573d';p.beginPath();p.moveTo(x-17,y-6);p.lineTo(x+17,y-6);p.lineTo(x+13,y+13);p.lineTo(x-13,y+13);p.closePath();p.fill();
    p.fillStyle='#c47a50';p.beginPath();p.roundRect(x-19,y-9,38,6,3);p.fill();
    p.fillStyle='#65452e';p.beginPath();p.ellipse(x,y-7,15,4,0,0,Math.PI*2);p.fill();
    // Leaves, stems and three bright flower heads.
    p.strokeStyle='#52783f';p.lineWidth=3;p.lineCap='round';
    for(let i=0;i<3;i++){
      const sx=x+(i-1)*8,top=y-27-(i===1?8:0);
      p.beginPath();p.moveTo(sx,y-9);p.lineTo(sx,top+5);p.stroke();
      p.fillStyle=i%2?'#80a956':'#6f9849';
      p.beginPath();p.ellipse(sx-5,top+12,6,3,-.45,0,Math.PI*2);p.ellipse(sx+5,top+16,6,3,.45,0,Math.PI*2);p.fill();
      for(let petal=0;petal<5;petal++){
        const angle=petal*Math.PI*2/5;
        p.fillStyle=colors[i%colors.length];p.beginPath();p.arc(sx+Math.cos(angle)*5,top+Math.sin(angle)*5,3.5,0,Math.PI*2);p.fill();
      }
      p.fillStyle='#efc558';p.beginPath();p.arc(sx,top,3,0,Math.PI*2);p.fill();
    }
  }
  // A leafy shrub adds variety between the flower pots.
  const x=worldW*.50,y=790;
  p.fillStyle='#52783f';p.beginPath();
  for(const [dx,dy,r] of [[-22,0,16],[-9,-12,18],[10,-8,19],[25,1,15],[0,5,18]]){p.moveTo(x+dx+r,y+dy);p.arc(x+dx,y+dy,r,0,Math.PI*2)}
  p.fill();
  for(const [dx,dy] of [[-13,-8],[7,-15],[19,2],[-2,4]]){p.fillStyle='#a9c96e';p.beginPath();p.arc(x+dx,y+dy,2.2,0,Math.PI*2);p.fill()}
  gardenPlantsLayer=layer;
}
function updateFartClouds(dt){
  for(const f of fartClouds){
    f.life-=dt;
    f.size+=10*dt;
    
  }
  fartClouds=fartClouds.filter(f=>f.life>0);
}
function drawPuffCloud(color,outline){
  const lobes=[[-14,3,9],[-6,-4,11],[6,-5,12],[16,1,8],[-1,7,11]];
  ctx.fillStyle=outline;
  for(const [x,y,r] of lobes){ctx.beginPath();ctx.arc(x,y,r+1.5,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle=color;
  for(const [x,y,r] of lobes){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
}
function drawSparkle(x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();
  for(let i=0;i<8;i++){
    const angle=-Math.PI/2+i*Math.PI/4,rad=i%2===0?r:r*.24;
    const px=x+Math.cos(angle)*rad,py=y+Math.sin(angle)*rad;
    if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.fill();
}
function drawAnimalBoostCloud(animal){
  if(animal==='pigeon'){
    // Eine helle, fast weiße Wolke mit einem kleinen Tropfen.
    drawPuffCloud('#fffdf4','#c7c8c3');
    ctx.fillStyle='#fffdf4';ctx.beginPath();ctx.moveTo(-2,8);ctx.quadraticCurveTo(-5,14,0,15);ctx.quadraticCurveTo(5,14,2,8);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(-8,-7,3,0,Math.PI*2);ctx.fill();
  }else if(animal==='frog'){
    drawPuffCloud('#78b84e','#456e35');
    ctx.fillStyle='#a3d76b';ctx.beginPath();ctx.arc(-8,-7,3,0,Math.PI*2);ctx.arc(6,-9,2.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#527f39';ctx.beginPath();ctx.arc(13,5,2.4,0,Math.PI*2);ctx.fill();
  }else if(animal==='sheep'){
    drawPuffCloud('#fffaf0','#b9b2a7');
    // Little wool curls make this read like a puff of fleece.
    ctx.fillStyle='#fff';for(const [x,y,r] of [[-13,1,3],[-5,-7,3.5],[5,-8,3],[14,0,2.7],[1,7,3.5]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  }else if(animal==='sugarHamster'){
    drawPuffCloud('#f5a4ce','#a85291');
    // Wrapped sweets and bright sprinkles spill out of the hamster's cloud.
    for(const [x,y,color] of [[-12,-5,'#ffe16a'],[8,-7,'#8ed8e4'],[13,7,'#f6d5e9']]){
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,3.2,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x-6,y-2);ctx.lineTo(x-6,y+2);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(x+3,y);ctx.lineTo(x+6,y-2);ctx.lineTo(x+6,y+2);ctx.closePath();ctx.fill();
    }
    ctx.strokeStyle='#fff2ac';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-4,7);ctx.lineTo(-1,3);ctx.moveTo(0,-10);ctx.lineTo(3,-7);ctx.moveTo(-17,8);ctx.lineTo(-14,5);ctx.stroke();
    drawSparkle(19,-11,4,'#fff6cc');
  }else if(animal==='raccoon'||animal==='heroRaccoon'){
    drawPuffCloud('#858477','#4d514b');
    // Kleine Papier- und Verpackungsreste in der grauen Müllwolke.
    ctx.save();ctx.translate(-18,-5);ctx.rotate(-.35);ctx.fillStyle='#e7d8ad';ctx.fillRect(-4,-3,8,6);ctx.restore();
    ctx.save();ctx.translate(18,-8);ctx.rotate(.4);ctx.fillStyle='#6b9b73';ctx.fillRect(-3,-5,7,10);ctx.fillStyle='#c9d0a6';ctx.fillRect(-2,-5,5,2);ctx.restore();
    ctx.save();ctx.translate(8,12);ctx.rotate(-.25);ctx.fillStyle='#b7a398';ctx.beginPath();ctx.moveTo(-5,2);ctx.lineTo(-1,-4);ctx.lineTo(5,1);ctx.lineTo(2,5);ctx.closePath();ctx.fill();ctx.restore();
  }else if(animal==='sausageDachshund'){
    drawPuffCloud('#ad503a','#69362e');
    ctx.strokeStyle='#f2d454';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-16,0);ctx.quadraticCurveTo(-10,-7,-4,0);ctx.quadraticCurveTo(2,7,8,0);ctx.quadraticCurveTo(13,-6,18,0);ctx.stroke();
    ctx.strokeStyle='#e99567';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-8,-10);ctx.quadraticCurveTo(0,-14,8,-10);ctx.stroke();
  }else if(animal==='trashDragon'){
    // Layered orange and yellow flame tongues replace smoke for the dragon.
    ctx.fillStyle='#8f3028';ctx.beginPath();ctx.moveTo(-20,12);ctx.quadraticCurveTo(-17,1,-13,-2);ctx.quadraticCurveTo(-15,-13,-7,-19);ctx.quadraticCurveTo(-8,-8,-3,-5);ctx.quadraticCurveTo(2,-22,10,-23);ctx.quadraticCurveTo(7,-10,14,-5);ctx.quadraticCurveTo(19,-13,23,-11);ctx.quadraticCurveTo(19,-2,21,3);ctx.lineTo(16,12);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ef6330';ctx.beginPath();ctx.moveTo(-16,11);ctx.quadraticCurveTo(-14,1,-8,-3);ctx.quadraticCurveTo(-9,-10,-5,-12);ctx.quadraticCurveTo(-4,-4,1,-2);ctx.quadraticCurveTo(4,-15,9,-17);ctx.quadraticCurveTo(7,-6,14,-2);ctx.quadraticCurveTo(17,-7,19,-7);ctx.quadraticCurveTo(15,2,17,11);ctx.closePath();ctx.fill();
    ctx.fillStyle='#ffd45c';ctx.beginPath();ctx.moveTo(-8,10);ctx.quadraticCurveTo(-7,2,-2,-1);ctx.quadraticCurveTo(-1,-7,2,-9);ctx.quadraticCurveTo(2,-2,7,0);ctx.quadraticCurveTo(8,-7,11,-9);ctx.quadraticCurveTo(10,-2,14,2);ctx.lineTo(13,10);ctx.closePath();ctx.fill();
    drawSparkle(-20,-13,3,'#ffd45c');drawSparkle(22,-16,3,'#ffec9a');
  }else if(animal==='flamingo'){
    drawPuffCloud('#f08da7','#a94e69');
    ctx.fillStyle='#ffc2cf';ctx.beginPath();ctx.arc(-8,-7,3.5,0,Math.PI*2);ctx.arc(7,-9,3,0,Math.PI*2);ctx.fill();
    drawSparkle(-20,-13,5,'#fff1c9');drawSparkle(19,-12,6,'#ffe5a3');drawSparkle(14,12,4,'#fff6dc');
  }else if(animal==='rocketSnail'){
    drawPuffCloud('#e96742','#8e3442');ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.moveTo(-15,9);ctx.quadraticCurveTo(-11,1,-15,-5);ctx.quadraticCurveTo(-5,0,-7,9);ctx.closePath();ctx.fill();ctx.strokeStyle='#c9f2f3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,-4);ctx.lineTo(22,-9);ctx.moveTo(13,3);ctx.lineTo(25,3);ctx.stroke();drawSparkle(20,-13,4,'#fff2a6');
  }else if(animal==='deepSeaMole'){
    drawPuffCloud('#577d9b','#344d70');ctx.strokeStyle='#c5f5f0';ctx.lineWidth=1.6;for(const [x,y,r] of [[-14,-9,3],[9,-11,4],[17,5,2.5],[-8,10,2]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke()}
  }else if(animal==='demonRat'){
    drawPuffCloud('#662d5b','#321d3d');ctx.fillStyle='#ed633f';ctx.beginPath();ctx.moveTo(-18,8);ctx.quadraticCurveTo(-12,-2,-15,-10);ctx.quadraticCurveTo(-4,-3,-8,8);ctx.moveTo(7,9);ctx.quadraticCurveTo(15,-1,12,-10);ctx.quadraticCurveTo(23,-3,17,9);ctx.fill();drawSparkle(-9,-9,3,'#ffce59');drawSparkle(12,-8,3,'#ffce59');
  }else if(animal==='furnitureOctopus'){
    drawPuffCloud('#b9855e','#72503f');ctx.strokeStyle='#efd0a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-17,-7);ctx.lineTo(-5,-3);ctx.lineTo(2,-10);ctx.moveTo(-7,7);ctx.lineTo(1,0);ctx.lineTo(14,4);ctx.stroke();ctx.fillStyle='#f4d56c';ctx.beginPath();ctx.moveTo(12,-13);ctx.lineTo(8,-4);ctx.lineTo(17,-8);ctx.closePath();ctx.fill();
  }else if(animal==='discoCrab'){
    drawPuffCloud('#db3976','#76285f');for(const [x,y,color] of [[-15,-10,'#ffda55'],[-2,-13,'#73e2dd'],[12,-9,'#a98bff'],[18,5,'#fff0a6'],[-10,11,'#80e58b']]){ctx.fillStyle=color;ctx.fillRect(x-2,y-4,4,8)}drawSparkle(-21,-4,4,'#fff2a6');drawSparkle(5,11,3,'#f4f4ff');
  }else{
    ctx.font='34px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('💨',0,0);
  }
}
function drawFartClouds(){
  for(const f of fartClouds){
    const a=Math.max(0,f.life/.8);
    const s=1+(1-a)*.7;
    ctx.save();
    ctx.globalAlpha=a;
    ctx.translate(f.x,f.y);
    ctx.scale(f.facing*s,s);
    drawAnimalBoostCloud(f.animal);
    ctx.restore();
  }
}
function drawMap(){
  const floor=MAPS[currentMap].floor;
  ctx.fillStyle=floor.background;
  ctx.fillRect(0,0,worldW,worldH);
  ctx.fillStyle=floor.surface;
  ctx.fillRect(0,92,worldW,worldH-205);
  if(floor.pattern!=='plain'){
    ctx.strokeStyle=floor.line;
    ctx.lineWidth=floor.lineWidth||2;
    if(floor.pattern==='grid'||floor.pattern==='vertical'){
      for(let x=0;x<worldW;x+=floor.spacing){ctx.beginPath();ctx.moveTo(x,92);ctx.lineTo(x,worldH-115);ctx.stroke()}
    }
    if(floor.pattern==='grid'||floor.pattern==='horizontal'){
      const endY=floor.pattern==='horizontal'?worldH:worldH-115;
      for(let y=92;y<endY;y+=floor.spacing){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke()}
    }
  }
  if(currentMap==='living')drawLivingFloorDetails();
  else drawRoomFloorDetails();
  ctx.strokeStyle=floor.border;
  ctx.lineWidth=floor.borderWidth||8;
  ctx.strokeRect(12,92,worldW-24,worldH-205);
}
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.save();ctx.translate(-camX,-camY);
  drawMap();
  drawRatHoles();
  for(const o of obstacles){
    drawRoomFurniture(o);
  }
  if(currentMap==='garden'&&gardenPlantsLayer)ctx.drawImage(gardenPlantsLayer,0,0);
  ctx.textAlign='center';ctx.textBaseline='middle';for(const it of items)if(!it.got){
    ctx.font='28px system-ui';
    ctx.fillText(it.type,it.x,it.y+Math.sin(performance.now()/280+it.bob)*2);
    ctx.font='bold 11px system-ui';
    ctx.fillStyle='#24170b';
    if(it.effect==='rotten') ctx.fillText('LANGSAM',it.x+25,it.y-18);
    else if(it.effect==='chili') ctx.fillText('SCHNELL',it.x+25,it.y-18);
    else if(it.effect==='dog') ctx.fillText('SCHRECK',it.x+22,it.y-18);
    else if(it.effect==='skull') ctx.fillText('GEFAHR',it.x+22,it.y-18);
    else ctx.fillText('+'+it.value,it.x+18,it.y-18);
    ctx.fillStyle='#d7c09d'
  }
  if(Math.hypot(rat.x-cat.x,rat.y-cat.y)<125){ctx.strokeStyle='#d85b3f66';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cat.x,cat.y,48,0,Math.PI*2);ctx.stroke()}
  ctx.font='38px system-ui';
  ctx.fillText('🐈',cat.x,cat.y);
  ctx.save();
  const ratSkin=RAT_SKINS.find(skin=>skin.id===selectedRatSkin)||RAT_SKINS[0];
  const walking=Math.hypot(keys.x,keys.y)>.08;
  drawCharacterSprite(ctx,rat.x,rat.y,ratSkin,ratFacing,1,performance.now()*.009,walking);
  ctx.restore();
  drawFartClouds();ctx.restore();
  if(paused){
    ctx.save();ctx.fillStyle='#100b18b8';ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff0b0';ctx.font='900 42px system-ui';ctx.fillText('PAUSE',W/2,H/2-12);
    ctx.fillStyle='#f7f0df';ctx.font='600 16px system-ui';ctx.fillText('Tippe auf WEITER, wenn du bereit bist',W/2,H/2+28);ctx.restore();
  }
}
function loop(t){if(!playing||paused)return;const dt=Math.min(.033,(t-last)/1000);last=t;update(dt);updateFartClouds(dt);draw();raf=requestAnimationFrame(loop)}
renderMapButtons();
renderDifficultyButtons();
renderTimedLeaderboards();
document.getElementById('classicMode').onclick=()=>setGameMode('classic');
document.getElementById('timedMode').onclick=()=>setGameMode('timed');
document.getElementById('start').onclick=start;document.getElementById('again').onclick=start;
document.getElementById('openRatSkins').addEventListener('click',()=>{refreshCollectionUnlocks();renderRatSkinPicker();document.getElementById('skinModal').classList.remove('hidden')});
document.getElementById('closeSkinModal').addEventListener('click',()=>document.getElementById('skinModal').classList.add('hidden'));
document.getElementById('openCollections').addEventListener('click',()=>{renderCollectionBook();document.getElementById('collectionModal').classList.remove('hidden')});
document.getElementById('closeCollections').addEventListener('click',()=>document.getElementById('collectionModal').classList.add('hidden'));
document.getElementById('openAchievements').addEventListener('click',openAchievementModal);
document.getElementById('closeAchievements').addEventListener('click',closeAchievementModal);
function setJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=48,d=Math.hypot(dx,dy)||1;if(d>max){dx=dx/d*max;dy=dy/d*max}knob.style.transform=`translate(${dx}px,${dy}px)`;keys.x=dx/max;keys.y=dy/max}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(joyId);setJoy(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)setJoy(e)});function resetJoy(){joyId=null;knob.style.transform='translate(0,0)';keys.x=0;keys.y=0}joy.addEventListener('pointerup',resetJoy);joy.addEventListener('pointercancel',resetJoy);function triggerBoost(){
  if(playing&&!paused)recordAchievementProgress('boostUses');
  boost=.65;
  // Sichtbare Pupswolke direkt hinter der Ratte – rein kosmetisch.
  fartClouds.push({
    x:rat.x,
    y:rat.y+14,
    facing:ratFacing,
    animal:(RAT_SKINS.find(skin=>skin.id===selectedRatSkin)||RAT_SKINS[0]).animal,
    life:.8,
    size:10
  });
}
document.getElementById('dash').addEventListener('pointerdown',triggerBoost);


function returnToMenu(){
  playing=false;paused=false;
  document.getElementById('pauseBtn').classList.add('hidden');
  cancelAnimationFrame(raf);
  controls.classList.add('hidden');
  document.getElementById('menuBtn').classList.add('hidden');
  over.classList.add('hidden');
  document.getElementById('overMenu').classList.add('hidden');
  menu.classList.remove('hidden');
  keys={x:0,y:0};
  comboStreak=0;comboClock=0;comboBonus=0;updateComboBadge();
  boost=0;
  joyId=null;
  knob.style.transform='translate(0,0)';
  keyboard.up=keyboard.down=keyboard.left=keyboard.right=false;
}
function togglePause(){
  if(!playing)return;
  paused=!paused;
  const button=document.getElementById('pauseBtn');
  button.textContent=paused?'WEITER':'PAUSE';
  button.setAttribute('aria-label',paused?'Spiel fortsetzen':'Spiel pausieren');
  if(paused){
    controls.classList.add('hidden');
    cancelAnimationFrame(raf);resetJoy();
    keyboard.up=keyboard.down=keyboard.left=keyboard.right=false;
    draw();
  }else{
    controls.classList.remove('hidden');
    last=performance.now();raf=requestAnimationFrame(loop);
  }
}
document.getElementById('pauseBtn').addEventListener('click',togglePause);
document.getElementById('menuBtn').addEventListener('click',returnToMenu);document.getElementById('overMenu').addEventListener('click',returnToMenu);
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && (playing || !over.classList.contains('hidden'))){
    e.preventDefault();
    returnToMenu();
  }
});

// PC-Steuerung: WASD und Pfeiltasten bewegen die Ratte, Leertaste aktiviert den Boost.
const keyboard={up:false,down:false,left:false,right:false};
function updateKeyboard(){
  let x=(keyboard.right?1:0)-(keyboard.left?1:0);
  let y=(keyboard.down?1:0)-(keyboard.up?1:0);
  // Tastatur übernimmt nur dann, wenn der Touch-Joystick gerade nicht benutzt wird.
  if(joyId===null){
    const len=Math.hypot(x,y)||1;
    keys.x=x/len; keys.y=y/len;
  }
}
addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d','W','A','S','D'].includes(e.key)) e.preventDefault();
  if(e.key==='ArrowUp'||e.key==='w'||e.key==='W') keyboard.up=true;
  if(e.key==='ArrowDown'||e.key==='s'||e.key==='S') keyboard.down=true;
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') keyboard.left=true;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') keyboard.right=true;
  if(e.key===' ' && !e.repeat) triggerBoost();
  updateKeyboard();
});
addEventListener('keyup',e=>{
  if(e.key==='ArrowUp'||e.key==='w'||e.key==='W') keyboard.up=false;
  if(e.key==='ArrowDown'||e.key==='s'||e.key==='S') keyboard.down=false;
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') keyboard.left=false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') keyboard.right=false;
  updateKeyboard();
});
