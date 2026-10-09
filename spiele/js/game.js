
const HIGH_SCORE_PREFIX='ratKingHighscore_';
let highScore=0;
const memoryStorageFallback=new Map();
function readStoredValue(key){
  if(memoryStorageFallback.has(key))return memoryStorageFallback.get(key);
  try{return window.localStorage.getItem(key)}catch(e){return null}
}
function writeStoredValue(key,value){
  const stored=String(value);
  try{
    window.localStorage.setItem(key,stored);
    memoryStorageFallback.delete(key);
  }catch(e){memoryStorageFallback.set(key,stored)}
}
let gameMode='classic',classicMap='living',hardPointsThisRun=0;
const TUTORIAL_SEEN_KEY='ratKingTutorialSeenV1';

const DAILY_CHALLENGE_STORAGE_KEY='ratKingDailyChallengesV1';
const DAILY_CHALLENGE_CATALOG=[
  {id:'collector',title:'Vorratsratte',description:'Sammle 12 Leckerbissen in einer Runde.',matches:stats=>stats.collected>=12},
  {id:'sweetTooth',title:'Naschkatze',description:'Sammle 4 Süßigkeiten in einer Runde.',matches:stats=>stats.sweetCount>=4},
  {id:'noBoost',title:'Ruhige Pfoten',description:'Erreiche 50 Punkte ohne Boost.',matches:stats=>stats.score>=50&&!stats.usedBoost},
  {id:'fullPaws',title:'Volle Pfoten',description:'Sammle alle 20 Leckerbissen einer Runde.',matches:stats=>stats.collected>=20},
  {id:'ratTunnels',title:'Tunnelprofi',description:'Benutze 3 Ratentunnel in einer Runde.',matches:stats=>stats.ratTunnelsUsed>=3}
];

function getLocalDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getChallengesForDay(dayKey){
  let seed=2166136261;
  for(let i=0;i<dayKey.length;i++){
    seed^=dayKey.charCodeAt(i);
    seed=Math.imul(seed,16777619)>>>0;
  }
  if(seed===0)seed=0x9e3779b9;
  const random=()=>{
    seed^=seed<<13;
    seed^=seed>>>17;
    seed^=seed<<5;
    return (seed>>>0)/4294967296;
  };
  const shuffled=[...DAILY_CHALLENGE_CATALOG];
  for(let i=shuffled.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  return shuffled.slice(0,3);
}

function loadDailyChallengeState(){
  const fallback={date:'',completedIds:[],totalBadges:0};
  try{
    const saved=JSON.parse(readStoredValue(DAILY_CHALLENGE_STORAGE_KEY)||'null');
    if(!saved||typeof saved!=='object')return fallback;
    return {
      date:typeof saved.date==='string'?saved.date:'',
      completedIds:Array.isArray(saved.completedIds)?saved.completedIds.filter(id=>typeof id==='string'):[],
      totalBadges:Number.isSafeInteger(saved.totalBadges)&&saved.totalBadges>=0?saved.totalBadges:0
    };
  }catch(e){return fallback}
}

let dailyChallengeState=loadDailyChallengeState();
let dailyRunStats={collected:0,sweetCount:0,score:0,usedBoost:false,ratTunnelsUsed:0};
let dailyChallengeRunDate=getLocalDateKey();

function saveDailyChallengeState(){
  try{writeStoredValue(DAILY_CHALLENGE_STORAGE_KEY,JSON.stringify(dailyChallengeState))}catch(e){}
}

function ensureDailyChallengeDay(dayKey=getLocalDateKey()){
  const activeIds=new Set(getChallengesForDay(dayKey).map(challenge=>challenge.id));
  const previousIds=dailyChallengeState.completedIds;
  const completedIds=dailyChallengeState.date===dayKey?previousIds.filter(id=>activeIds.has(id)):[];
  const changed=dailyChallengeState.date!==dayKey||completedIds.length!==previousIds.length;
  if(changed){
    dailyChallengeState={...dailyChallengeState,date:dayKey,completedIds};
    saveDailyChallengeState();
  }
  return changed;
}

function recordDailyChallengeResults(stats,dayKey){
  ensureDailyChallengeDay(dayKey);
  const challenges=getChallengesForDay(dayKey);
  const completedBefore=new Set(dailyChallengeState.completedIds);
  const wasAllComplete=challenges.every(challenge=>completedBefore.has(challenge.id));
  const newlyCompleted=[];
  for(const challenge of challenges){
    if(!completedBefore.has(challenge.id)&&challenge.matches(stats)){
      completedBefore.add(challenge.id);
      newlyCompleted.push(challenge.id);
    }
  }
  dailyChallengeState.completedIds=[...completedBefore];
  const allComplete=challenges.every(challenge=>completedBefore.has(challenge.id));
  const badgeAwarded=allComplete&&!wasAllComplete;
  if(badgeAwarded)dailyChallengeState.totalBadges++;
  if(newlyCompleted.length||badgeAwarded)saveDailyChallengeState();
  return {newlyCompleted,badgeAwarded};
}

function renderDailyChallenges(){
  const list=document.getElementById('dailyChallengeList');
  const badgeCount=document.getElementById('dailyChallengeBadgeCount');
  if(!list||!badgeCount)return;
  list.replaceChildren();
  badgeCount.textContent=String(dailyChallengeState.totalBadges);
  const completed=new Set(dailyChallengeState.completedIds);
  for(const challenge of getChallengesForDay(dailyChallengeState.date||getLocalDateKey())){
    const item=document.createElement('li');
    const isComplete=completed.has(challenge.id);
    item.classList.toggle('completed',isComplete);
    item.setAttribute('aria-label',`${challenge.title}: ${challenge.description} ${isComplete?'Erledigt':'Offen'}`);
    const copy=document.createElement('span');
    const title=document.createElement('strong');
    title.textContent=challenge.title;
    const description=document.createElement('span');
    description.textContent=challenge.description;
    copy.append(title,document.createElement('br'),description);
    item.append(copy);
    list.append(item);
  }
}

ensureDailyChallengeDay(getLocalDateKey());

function getHighscoreKey(){
  return gameMode==='timed' ? HIGH_SCORE_PREFIX+'timed_carnival_'+difficulty : HIGH_SCORE_PREFIX+currentMap;
}

function loadHighScore(){
  highScore=Number(readStoredValue(getHighscoreKey())||0);
  const hs=document.getElementById('highscore');
  if(hs)hs.textContent=highScore;
  const rhs=document.getElementById('resultHighValue');
  if(rhs)rhs.textContent=highScore;
}

const TIMED_LEADERBOARD_PREFIX='ratKingTimedTop5_';
const DIFFICULTY_LABELS={easy:'Leicht',normal:'Normal',hard:'Schwer'};
function loadTimedLeaderboard(level=difficulty){
  try{
    const saved=JSON.parse(readStoredValue(TIMED_LEADERBOARD_PREFIX+level)||'[]');
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
  writeStoredValue(TIMED_LEADERBOARD_PREFIX+difficulty,JSON.stringify(scores.slice(0,5)));
  renderTimedLeaderboards();
}

const HARD_WINS_KEY='ratKingHardWins';
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
  const saved=Number(readStoredValue(HARD_WINS_KEY));
  hardWins=Number.isSafeInteger(saved)&&saved>0?saved:0;
  updateHardWinsDisplay();
}
function recordHardWin(points=1){
  if(hardWinRecorded&&gameMode!=='timed')return false;
  hardWinRecorded=true;
  hardWins+=points;
  writeStoredValue(HARD_WINS_KEY,String(hardWins));
  updateHardWinsDisplay();
  return points;
}
loadHardWins();

const RAT_SKIN_STORAGE_KEY='ratKingSelectedSkin';
const OWNED_SKINS_STORAGE_KEY='ratKingOwnedSkins';
const SKIN_PRICE_MIGRATION_KEY='ratKingSkinPricesV1';
const COLLECTION_STORAGE_KEY='ratKingFoodBooksV1';
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
    const saved=JSON.parse(readStoredValue(COLLECTION_STORAGE_KEY)||'{}');
    for(const book of FOOD_BOOKS){const count=Number(saved?.[book.id]);foodBookCounts[book.id]=Number.isSafeInteger(count)&&count>0?count:0;}
  }catch(e){foodBookCounts=Object.fromEntries(FOOD_BOOKS.map(book=>[book.id,0]));}
}
function saveFoodBookCounts(){writeStoredValue(COLLECTION_STORAGE_KEY,JSON.stringify(foodBookCounts));}
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
  {id:'deepSeaMole',name:'Tiefsee-Maulwurf im Taucheranzug',description:'Taucher aus den tiefsten Tunneln',animal:'deepSeaMole',achievementKey:'tunnelMaster',body:'#594b50',belly:'#9e8c87',ear:'#b47780',nose:'#e78396',shade:'#332b33'},
  {id:'demonRat',name:'Dämonen-Ratte',description:'Herrscherin über 50 gewonnene Runden',animal:'demonRat',achievementKey:'classicChampion',body:'#4b254d',belly:'#b34a54',ear:'#e46e72',nose:'#f05a4f',shade:'#24142d'},
  {id:'furnitureOctopus',name:'Möbelhaus-Oktopus mit Kompass',description:'Bezwingt jeden Raum auf Schwer',animal:'furnitureOctopus',achievementKey:'hardCartographer',body:'#c16b54',belly:'#f0b879',ear:'#e9a08a',nose:'#523b68',shade:'#713f58'},
  {id:'discoCrab',name:'Disco-Krabbe im Narrenkostüm',description:'Feiert 25 schwere Karnevalssiege',animal:'discoCrab',achievementKey:'carnivalLegend',body:'#e75077',belly:'#ffb361',ear:'#ff9aa7',nose:'#743e86',shade:'#98365d'}
];
let ownedRatSkins=new Set(RAT_SKINS.filter(skin=>skin.cost===0).map(skin=>skin.id));
let selectedRatSkin='classic';
function loadRatSkinProgress(){
  let previousOwned=[];
  try{
    const savedOwned=JSON.parse(readStoredValue(OWNED_SKINS_STORAGE_KEY)||'[]');
    if(Array.isArray(savedOwned))previousOwned=savedOwned.filter(id=>RAT_SKINS.some(skin=>skin.id===id));
    for(const id of previousOwned)ownedRatSkins.add(id);
    const savedSelected=readStoredValue(RAT_SKIN_STORAGE_KEY);
    if(ownedRatSkins.has(savedSelected))selectedRatSkin=savedSelected;
  }catch(e){ownedRatSkins=new Set(RAT_SKINS.filter(skin=>skin.cost===0).map(skin=>skin.id));selectedRatSkin='classic'}
  if(readStoredValue(SKIN_PRICE_MIGRATION_KEY)!=='done'){
    const refunds={caramel:5,cream:10,pigeon:12,frog:15,raccoon:17,flamingo:20};
    const refund=previousOwned.reduce((total,id)=>total+(refunds[id]||0),0);
    if(refund){hardWins+=refund;writeStoredValue(HARD_WINS_KEY,String(hardWins))}
    writeStoredValue(SKIN_PRICE_MIGRATION_KEY,'done');
    updateHardWinsDisplay();
  }
}
function saveRatSkinProgress(){
  writeStoredValue(OWNED_SKINS_STORAGE_KEY,JSON.stringify([...ownedRatSkins]));
  writeStoredValue(RAT_SKIN_STORAGE_KEY,selectedRatSkin);
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
    floor:{background:'#d5c6af',surface:'#b18b67',line:'#86684d',border:'#554238',pattern:'plain'},
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
    floor:{background:'#e2d4bd',surface:'#9d7857',line:'#70553e',border:'#513d30',pattern:'plain',borderWidth:8},
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
    floor:{background:'#c8c4b7',surface:'#96958b',line:'#73766f',border:'#555a56',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#454943',inner:'#777465',label:'#e3dccb'},
    makeObstacles:({worldW,worldH})=>{
      const row=fraction=>140+fraction*(worldH-378);
      return [
        {x:70,y:row(0),w:430,h:100,label:'REGAL'},
        {x:worldW*.39,y:row(.01),w:300,h:100,label:'KISTEN'},
        {x:worldW-500,y:row(0),w:430,h:100,label:'REGAL'},
        {x:70,y:row(.23),w:350,h:95,label:'WERKBANK'},
        {x:worldW*.44,y:row(.23),w:300,h:110,label:'KARTONS'},
        {x:worldW-430,y:row(.23),w:320,h:110,label:'SCHRANK'},
        {x:70,y:row(.46),w:430,h:100,label:'REGAL'},
        {x:worldW*.39,y:row(.46),w:300,h:110,label:'KISTEN'},
        {x:worldW-500,y:row(.46),w:430,h:100,label:'REGAL'},
        {x:70,y:row(.69),w:280,h:100,label:'SCHRANK'},
        {x:worldW*.42,y:row(.69),w:300,h:100,label:'KARTONS'},
        {x:worldW-430,y:row(.69),w:350,h:95,label:'WERKBANK'},
        {x:70,y:row(.92),w:430,h:100,label:'REGAL'},
        {x:worldW*.39,y:row(.92),w:300,h:100,label:'KISTEN'},
        {x:worldW-500,y:row(.92),w:430,h:100,label:'REGAL'}
      ];
    }
  },
  bathroom:{
    label:'🚽 Badezimmer',
    floor:{background:'#d7dedb',surface:'#c3d1d0',line:'#a8b7b4',border:'#637774',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#586967',inner:'#b1c4c2',label:'#f3f4ed'},
    makeObstacles:({worldW,worldH})=>[
      {x:70,y:135,w:worldW*.31,h:116,label:'BADEWANNE'},
      {x:worldW*.40,y:145,w:190,h:95,label:'WASCHBECKEN'},
      {x:worldW-390,y:135,w:320,h:105,label:'SCHRANK'},
      {x:80,y:worldH*.33,w:150,h:145,label:'TOILETTE'},
      {x:worldW*.34,y:worldH*.34,w:320,h:95,label:'UNTERSCHRANK'},
      {x:worldW-410,y:worldH*.34,w:340,h:95,label:'REGAL'},
      {x:75,y:worldH*.56,w:worldW*.27,h:90,label:'SCHRANK'},
      {x:worldW*.39,y:worldH*.57,w:190,h:135,label:'WASCHMASCHINE'},
      {x:worldW-390,y:worldH*.56,w:320,h:90,label:'REGAL'},
      {x:worldW*.12,y:worldH*.78,w:190,h:90,label:'KARTONS'},
      {x:worldW*.40,y:worldH*.77,w:300,h:85,label:'UNTERSCHRANK'},
      {x:worldW-250,y:worldH*.77,w:180,h:90,label:'SCHRANK'}
    ]
  },
  bedroom:{
    label:'🛏️ Schlafzimmer',
    floor:{background:'#dfd4c2',surface:'#bda587',line:'#967b60',border:'#594739',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#584537',inner:'#9b795b',label:'#f2e6d2'},
    makeObstacles:({worldW,worldH})=>{
      const bedW=worldW*.31,bedX=(worldW-bedW)/2,bedY=worldH*.34;
      return [
        {x:70,y:140,w:worldW*.22,h:100,label:'KLEIDERSCHRANK'},
        {x:worldW-70-worldW*.22,y:140,w:worldW*.22,h:100,label:'KLEIDERSCHRANK'},
        {x:bedX,y:bedY,w:bedW,h:worldH*.27,label:'BETT'},
        {x:bedX-125,y:bedY+15,w:82,h:100,label:'NACHTTISCH'},
        {x:bedX+bedW+43,y:bedY+15,w:82,h:100,label:'NACHTTISCH'},
        {x:90,y:worldH*.69,w:worldW*.24,h:88,label:'KOMMODE'},
        {x:worldW-90-worldW*.24,y:worldH*.69,w:worldW*.24,h:95,label:'TRUHE'}
      ];
    }
  },
  dining:{
    label:'🍽️ Esszimmer',
    floor:{background:'#e1d4c1',surface:'#bca183',line:'#927454',border:'#614832',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#573b27',inner:'#9a7048',label:'#f3e3c9'},
    makeObstacles:({worldW,worldH})=>{
      const tableW=worldW*.31,tableH=worldH*.24,tableX=(worldW-tableW)/2,tableY=worldH*.36;
      const chair=74;
      return [
        {x:70,y:140,w:worldW*.23,h:92,label:'ANRICHTE'},
        {x:worldW-70-worldW*.23,y:140,w:worldW*.23,h:92,label:'ANRICHTE'},
        {x:tableX,y:tableY,w:tableW,h:tableH,label:'ESSTISCH'},
        {x:tableX-chair-45,y:tableY+tableH*.34,w:chair,h:chair,label:'STUHL'},
        {x:tableX+tableW+45,y:tableY+tableH*.34,w:chair,h:chair,label:'STUHL'},
        {x:tableX+tableW*.43,y:tableY-chair-24,w:chair,h:chair,label:'STUHL'},
        {x:tableX+tableW*.43,y:tableY+tableH+24,w:chair,h:chair,label:'STUHL'},
        {x:85,y:worldH*.72,w:worldW*.22,h:88,label:'SIDEBOARD'},
        {x:worldW-85-worldW*.22,y:worldH*.72,w:worldW*.22,h:88,label:'VITRINE'}
      ];
    }
  },
  attic:{
    label:'📦 Dachboden',
    floor:{background:'#d2c2a8',surface:'#a58d6d',line:'#795f42',border:'#543e2c',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#503b2b',inner:'#8a6948',label:'#eddbbd'},
    makeObstacles:({worldW,worldH})=>[
      {x:70,y:worldH*.13,w:worldW*.19,h:100,label:'KISTEN'},
      {x:worldW-70-worldW*.19,y:worldH*.13,w:worldW*.19,h:100,label:'KISTEN'},
      {x:worldW*.34,y:worldH*.26,w:worldW*.18,h:118,label:'TRUHE'},
      {x:worldW*.61,y:worldH*.27,w:worldW*.17,h:108,label:'KARTONS'},
      {x:75,y:worldH*.45,w:worldW*.22,h:88,label:'REGAL'},
      {x:worldW-75-worldW*.22,y:worldH*.45,w:worldW*.22,h:88,label:'REGAL'},
      {x:worldW*.36,y:worldH*.63,w:worldW*.28,h:84,label:'DACHBALKEN'},
      {x:worldW*.12,y:worldH*.77,w:worldW*.20,h:92,label:'KISTEN'},
      {x:worldW*.68,y:worldH*.77,w:worldW*.20,h:92,label:'KISTEN'}
    ]
  },
  cellar:{
    label:'🪜 Keller',
    floor:{background:'#b9b8b1',surface:'#797c77',line:'#5c625e',border:'#404744',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#414641',inner:'#74746b',label:'#e1d8c7'},
    makeObstacles:({worldW,worldH})=>[
      {x:70,y:worldH*.14,w:worldW*.24,h:88,label:'REGAL'},
      {x:worldW-70-worldW*.24,y:worldH*.14,w:worldW*.24,h:88,label:'REGAL'},
      {x:worldW*.08,y:worldH*.34,w:190,h:145,label:'WASCHMASCHINE'},
      {x:worldW*.79,y:worldH*.34,w:190,h:145,label:'TROCKNER'},
      {x:worldW*.40,y:worldH*.31,w:worldW*.20,h:105,label:'KISTEN'},
      {x:worldW*.58,y:worldH*.53,w:worldW*.24,h:88,label:'REGAL'},
      {x:worldW*.08,y:worldH*.69,w:worldW*.23,h:88,label:'REGAL'},
      {x:worldW-70-worldW*.24,y:worldH*.70,w:worldW*.24,h:88,label:'WEINREGAL'}
    ]
  },
  garden:{
    label:'🌳 Garten',
    floor:{background:'#bdc58f',surface:'#829958',line:'#698044',border:'#45603d',pattern:'plain',borderWidth:8},
    obstacle:{outer:'#49613c',inner:'#79914f',label:'#f3edcf'},
    makeObstacles:({worldW,worldH})=>[
      {x:75,y:worldH*.14,w:worldW*.25,h:105,label:'BLUMENBEET'},
      {x:worldW-75-worldW*.25,y:worldH*.14,w:worldW*.25,h:105,label:'GEMÜSEBEET'},
      {x:75,y:worldH*.43,w:worldW*.25,h:100,label:'BLUMENBEET'},
      {x:worldW-75-worldW*.25,y:worldH*.43,w:worldW*.25,h:100,label:'GEMÜSEBEET'},
      {x:worldW*.37,y:worldH*.31,w:worldW*.26,h:190,label:'GARTENTISCH'},
      {x:worldW*.09,y:worldH*.68,w:worldW*.24,h:112,label:'GARTENSCHUPPEN'},
      {x:worldW-75-worldW*.24,y:worldH*.69,w:worldW*.24,h:105,label:'GARTENBANK'}
    ]
  },
  carnival:{
    label:'🎭 Karneval',
    floor:{background:'#d9c4a1',surface:'#936b57',line:'#78548d',border:'#d9ad53',pattern:'plain',borderWidth:10},
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
const ACHIEVEMENT_STORAGE_KEY='ratKingAchievementsV1';
const ACHIEVEMENTS=[
  {id:'boostMaster',title:'Turbogeladen',description:'Setze den Boost 500-mal ein.',goal:500,skinId:'rocketSnail',progress:state=>state.boostUses},
  {id:'tunnelMaster',title:'Unterirdisch legendär',description:'Benutze 100 Ratentunnel.',goal:100,skinId:'deepSeaMole',progress:state=>state.tunnelsUsed},
  {id:'classicChampion',title:'König der Runden',description:'Gewinne 50 klassische Runden.',goal:50,skinId:'demonRat',progress:state=>state.classicWins},
  {id:'hardCartographer',title:'Kein Raum zu schwer',description:'Gewinne auf jeder der 10 Karten eine klassische Runde auf Schwer.',goal:MAP_ORDER.length,skinId:'furnitureOctopus',progress:state=>state.hardMapWins.length},
  {id:'carnivalLegend',title:'Letzte Runde, großes Finale',description:'Beende 25 Karnevalsrunden auf Schwer bis zum Zeitende.',goal:25,skinId:'discoCrab',progress:state=>state.hardCarnivalFinishes}
];
function loadAchievementProgress(){
  const fallback={boostUses:0,tunnelsUsed:0,classicWins:0,hardMapWins:[],hardCarnivalFinishes:0};
  try{
    const saved=JSON.parse(readStoredValue(ACHIEVEMENT_STORAGE_KEY)||'null');
    if(!saved||typeof saved!=='object')return fallback;
    const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
    return {
      boostUses:count(saved.boostUses),
      tunnelsUsed:count(saved.tunnelsUsed),
      classicWins:count(saved.classicWins),
      hardMapWins:Array.isArray(saved.hardMapWins)?[...new Set(saved.hardMapWins.filter(id=>MAP_ORDER.includes(id)))]:[],
      hardCarnivalFinishes:count(saved.hardCarnivalFinishes)
    };
  }catch(e){return fallback}
}
let achievementProgress=loadAchievementProgress();
let achievementUnlocksThisRun=[];
function saveAchievementProgress(){
  writeStoredValue(ACHIEVEMENT_STORAGE_KEY,JSON.stringify(achievementProgress));
}
function getAchievementProgress(achievement){
  return Math.min(achievement.goal,achievement.progress(achievementProgress));
}
function refreshAchievementUnlocks(){
  const unlocked=[];
  for(const achievement of ACHIEVEMENTS){
    if(getAchievementProgress(achievement)>=achievement.goal&&!ownedRatSkins.has(achievement.skinId)){
      ownedRatSkins.add(achievement.skinId);
      unlocked.push(achievement.id);
    }
  }
  if(unlocked.length){
    saveRatSkinProgress();
    const skinModal=document.getElementById('skinModal');
    if(skinModal&&!skinModal.classList.contains('hidden'))renderRatSkinPicker();
  }
  return unlocked;
}
function recordAchievementProgress(key){
  const achievementIds={boostUses:'boostMaster',tunnelsUsed:'tunnelMaster',classicWins:'classicChampion',hardCarnivalFinishes:'carnivalLegend'};
  const achievement=ACHIEVEMENTS.find(entry=>entry.id===achievementIds[key]);
  if(!achievement||achievementProgress[key]>=achievement.goal)return [];
  achievementProgress[key]++;
  saveAchievementProgress();
  const newlyUnlocked=refreshAchievementUnlocks();
  achievementUnlocksThisRun.push(...newlyUnlocked);
  return newlyUnlocked;
}
function recordAchievementRound(win,reason){
  if(gameMode==='classic'&&win){
    recordAchievementProgress('classicWins');
    if(difficulty==='hard'&&!achievementProgress.hardMapWins.includes(currentMap)){
      achievementProgress.hardMapWins.push(currentMap);
      saveAchievementProgress();
      const newlyUnlocked=refreshAchievementUnlocks();
      achievementUnlocksThisRun.push(...newlyUnlocked);
    }
  }
  if(gameMode==='timed'&&difficulty==='hard'&&reason==='time'){
    recordAchievementProgress('hardCarnivalFinishes');
  }
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
refreshAchievementUnlocks();
const UNLOCK_KEY='ratKingUnlocks';

function loadUnlocks(){
  const fallback={
    maps:Object.fromEntries(MAP_ORDER.map(id=>[id,id==='living'])),
    hard:Object.fromEntries(MAP_ORDER.map(id=>[id,false]))
  };
  try{
    const saved=JSON.parse(readStoredValue(UNLOCK_KEY)||'null');
    return {
      maps:{...fallback.maps,...(saved?.maps||{})},
      hard:{...fallback.hard,...(saved?.hard||{})}
    };
  }catch(e){ return fallback; }
}
let unlocks=loadUnlocks();

function saveUnlocks(){
  writeStoredValue(UNLOCK_KEY,JSON.stringify(unlocks));
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
    if(skin.achievementKey){
      const achievement=ACHIEVEMENTS.find(entry=>entry.id===skin.achievementKey);
      if(achievement)detail.textContent=`${skin.description} · ${getAchievementProgress(achievement)}/${achievement.goal}`;
      else detail.textContent=skin.description;
    }else if(skin.bookKey){
      const book=FOOD_BOOKS.find(entry=>entry.id===skin.bookKey);
      if(book)detail.textContent=`${skin.description} · ${book.name}: ${Math.min(foodBookCounts[book.id],book.goal)}/${book.goal}`;
      else detail.textContent=`${skin.description} · Alle vier Bücher vervollständigen`;
    }else detail.textContent=skin.cost===0?`${skin.description} · Kostenlos`:`${skin.description} · ${skin.cost} Schwer-Punkte`;
    info.appendChild(detail);row.appendChild(info);
    const action=document.createElement('button');action.type='button';action.className='skinAction';
    if(selected){action.textContent='AUSGEWÄHLT';action.disabled=true}
    else if(owned){action.textContent='AUSWÄHLEN';action.classList.add('secondary')}
    else if(skin.achievementKey){action.textContent='🔒 ERFOLG';action.disabled=true}
    else if(skin.bookKey){action.textContent='🔒 GESPERRT';action.disabled=true}
    else if(hardWins>=skin.cost)action.textContent='KAUFEN';
    else{action.textContent='🔒 GESPERRT';action.disabled=true}
    action.addEventListener('click',()=>{
      if(ownedRatSkins.has(skin.id))selectedRatSkin=skin.id;
      else if(hardWins>=skin.cost){hardWins-=skin.cost;ownedRatSkins.add(skin.id);selectedRatSkin=skin.id;writeStoredValue(HARD_WINS_KEY,String(hardWins))}
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
function openAchievementModal(){
  renderAchievements();
  document.getElementById('achievementModal').classList.remove('hidden');
}
function closeAchievementModal(){
  document.getElementById('achievementModal').classList.add('hidden');
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
      if(playing&&gameMode==='classic')dailyRunStats.ratTunnelsUsed++;

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
function start(){cancelAnimationFrame(raf);dailyChallengeRunDate=getLocalDateKey();ensureDailyChallengeDay(dailyChallengeRunDate);renderDailyChallenges();dailyRunStats={collected:0,sweetCount:0,score:0,usedBoost:false,ratTunnelsUsed:0};achievementUnlocksThisRun=[];buildRoom();loadHighScore();hardWinRecorded=false;hardPointsThisRun=0;paused=false;playing=true;time=gameMode==='timed'?300:60;score=0;collected=0;comboStreak=0;comboClock=0;comboBonus=0;updateComboBadge();boost=0;catHitCooldown=0;ratFacing=1;ratSlow=0;ratFast=0;catSlow=0;catFlee=0;fartClouds=[];keys={x:0,y:0};ratHoles=[];catTunnelBoost=0;createRatHoles();spawn();scoreEl.textContent=0;document.getElementById('collected').textContent=0;timeEl.textContent=displayTime(time);document.getElementById('effect').style.display='none';document.getElementById('effect').textContent='';menu.classList.add('hidden');over.classList.add('hidden');controls.classList.remove('hidden');document.getElementById('menuBtn').classList.remove('hidden');const pauseBtn=document.getElementById('pauseBtn');pauseBtn.classList.remove('hidden');pauseBtn.textContent='PAUSE';last=performance.now();raf=requestAnimationFrame(loop)}
function end(win,reason='time'){
  playing=false;paused=false;
  const dailyResult=gameMode==='classic'?recordDailyChallengeResults(dailyRunStats,dailyChallengeRunDate):null;
  recordAchievementRound(win,reason);
  controls.classList.add('hidden');
  document.getElementById('menuBtn').classList.add('hidden');
  document.getElementById('pauseBtn').classList.add('hidden');
  document.getElementById('overMenu').classList.remove('hidden');
  over.classList.remove('hidden');
  if(score>highScore){
    highScore=score;
    writeStoredValue(getHighscoreKey(),String(highScore));
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
  renderDailyChallenges();
  const challengeResult=document.getElementById('dailyChallengeResult');
  if(challengeResult){
    const completed=dailyResult?.newlyCompleted.map(id=>getChallengesForDay(dailyChallengeRunDate).find(challenge=>challenge.id===id)?.title).filter(Boolean)||[];
    const messages=[];
    if(completed.length)messages.push(`🎯 Geschafft: ${completed.join(', ')}`);
    if(dailyResult?.badgeAwarded)messages.push(`🏅 Tagesabzeichen verdient! Gesamt: ${dailyChallengeState.totalBadges}`);
    challengeResult.textContent=messages.join(' · ');
    challengeResult.classList.toggle('hidden',messages.length===0);
  }
  const achievementResult=document.getElementById('achievementResult');
  if(achievementResult){
    const unlocked=[...new Set(achievementUnlocksThisRun)].map(id=>{
      const achievement=ACHIEVEMENTS.find(entry=>entry.id===id);
      const skin=achievement&&RAT_SKINS.find(entry=>entry.id===achievement.skinId);
      return skin?.name;
    }).filter(Boolean);
    achievementResult.textContent=unlocked.length?`🏅 Erfolg geschafft! Neue Figur: ${unlocked.join(', ')}`:'';
    achievementResult.classList.toggle('hidden',!unlocked.length);
  }
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
        dailyRunStats.collected++;
        if(FOOD_BOOKS.find(book=>book.id==='sweets').items.includes(it.type))dailyRunStats.sweetCount++;
        comboStreak=comboClock>0?comboStreak+1:1;
        comboClock=2;
        comboBonus=Math.min(3,Math.floor(comboStreak/3));
        score+=it.value+comboBonus;
        dailyRunStats.score=score;
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
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,16,18,2.6,0,0,Math.PI*2);target.fill();
  // Compact sheep body covered by distinct wool curls.
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,4,17,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(0,1,15,10,0,0,Math.PI*2);target.arc(-10,-4,6,0,Math.PI*2);target.arc(-3,-8,6,0,Math.PI*2);target.arc(5,-7,6,0,Math.PI*2);target.arc(11,-3,6,0,Math.PI*2);target.arc(5,6,6,0,Math.PI*2);target.arc(-5,7,6,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff88';target.lineWidth=1.15;target.beginPath();target.arc(-10,-4,4.2,Math.PI*1.05,Math.PI*1.8);target.arc(-3,-8,4.1,Math.PI*1.08,Math.PI*1.8);target.arc(5,-7,4.1,Math.PI*1.1,Math.PI*1.8);target.arc(11,-3,4,Math.PI*1.1,Math.PI*1.8);target.stroke();
  // Face, floppy ears and pink muzzle sit at the front of the fleece.
  target.fillStyle='#70564c';target.beginPath();target.ellipse(-15,-6,7,8,-.15,0,Math.PI*2);target.fill();
  target.fillStyle='#d9999b';target.beginPath();target.ellipse(-20,-12,5,2.3,-.35,0,Math.PI*2);target.ellipse(-10,-12,5,2.3,.35,0,Math.PI*2);target.fill();
  target.fillStyle='#f2c9c0';target.beginPath();target.ellipse(-20,-5,4.2,2.8,-.2,0,Math.PI*2);target.fill();target.fillStyle='#241b15';target.beginPath();target.arc(-17,-8,1,0,Math.PI*2);target.arc(-12,-8,1,0,Math.PI*2);target.fill();target.fillStyle='#4d3934';target.beginPath();target.ellipse(-23,-5,1.3,1,0,0,Math.PI*2);target.fill();
  drawTrotFeet(target,[-8,1,10],15,phase,moving,'#5b4a42',2.2,2);
  target.fillStyle=skin.body;target.beginPath();target.arc(16,0,3.5,0,Math.PI*2);target.fill();target.restore();
}
function drawSugarHamsterSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';target.lineCap='round';
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,16,17,2.7,0,0,Math.PI*2);target.fill();
  drawTrotFeet(target,[-8,5],14,phase,moving,'#83586a',1.8,1.8);
  // A round hamster silhouette with tiny ears and cheek pouches.
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,4,17,12,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(1,1,16,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.ear;target.beginPath();target.arc(-13,-9,5.3,0,Math.PI*2);target.arc(-2,-11,5,0,Math.PI*2);target.fill();target.fillStyle='#ffe0e6';target.beginPath();target.arc(-13,-9,2.7,0,Math.PI*2);target.arc(-2,-11,2.5,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(5,7,9,5,0,0,Math.PI*2);target.fill();
  target.fillStyle='#f7b3c6';target.beginPath();target.ellipse(-17,2,5,4,0,0,Math.PI*2);target.ellipse(-5,3,5,4,0,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff88';target.lineWidth=1;target.beginPath();target.ellipse(-17,1,3,1.5,-.2,Math.PI*1.1,Math.PI*1.8);target.ellipse(-5,2,3,1.5,-.2,Math.PI*1.1,Math.PI*1.8);target.stroke();
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
  target.strokeStyle='#77746d';target.lineWidth=1;target.beginPath();target.moveTo(11,2);target.bezierCurveTo(18,-2,23,7,28,2);target.stroke();
  // Cape attaches at the shoulders and trails behind the body, not below the rump.
  target.fillStyle='#b93236';target.beginPath();target.moveTo(-7,-7);target.quadraticCurveTo(3,-10,10,-8);target.quadraticCurveTo(17,-5,19,-1);target.lineTo(11,1);target.quadraticCurveTo(4,-2,-3,-2);target.closePath();target.fill();
  target.strokeStyle='#ef796c';target.lineWidth=1;target.beginPath();target.moveTo(0,-7);target.quadraticCurveTo(8,-7,15,-3);target.stroke();
  target.fillStyle='#df4a47';target.beginPath();target.moveTo(-8,-8);target.lineTo(-3,-11);target.lineTo(2,-8);target.lineTo(-3,-4);target.closePath();target.fill();
  target.fillStyle='#66645f';target.beginPath();target.ellipse(0,3,15,10,0,0,Math.PI*2);target.fill();target.fillStyle='#e6ddcd';target.beginPath();target.ellipse(3,6,8,4,0,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff48';target.lineWidth=1;target.beginPath();target.ellipse(-1,-1,9,4,-.1,Math.PI*1.1,Math.PI*1.8);target.stroke();
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
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,14,23,2.4,0,0,Math.PI*2);target.fill();
  // One continuous silhouette carries the long back into the sloped dachshund neck.
  target.fillStyle='#71372b';target.beginPath();target.moveTo(19,-2);target.quadraticCurveTo(23,1,18,8);target.quadraticCurveTo(2,13,-12,8);target.quadraticCurveTo(-17,6,-16,1);target.quadraticCurveTo(-19,-2,-24,-2);target.quadraticCurveTo(-28,-4,-26,-8);target.quadraticCurveTo(-23,-11,-18,-9);target.quadraticCurveTo(-13,-12,-9,-7);target.quadraticCurveTo(4,-9,16,-5);target.closePath();target.fill();
  target.fillStyle='#b34f36';target.beginPath();target.moveTo(17,-3);target.quadraticCurveTo(20,0,16,5);target.quadraticCurveTo(1,10,-11,6);target.quadraticCurveTo(-15,4,-14,0);target.quadraticCurveTo(-17,-3,-22,-3);target.quadraticCurveTo(-25,-5,-23,-8);target.quadraticCurveTo(-20,-10,-16,-7);target.quadraticCurveTo(-12,-10,-8,-5);target.quadraticCurveTo(4,-7,17,-3);target.closePath();target.fill();
  // Sausage casing shine and a wavy mustard stripe.
  target.strokeStyle='#f5a36c';target.lineWidth=1.2;target.beginPath();target.moveTo(-5,-5);target.quadraticCurveTo(5,-8,14,-4);target.stroke();target.strokeStyle='#f5dc58';target.lineWidth=2.2;target.beginPath();target.moveTo(-7,-1);target.quadraticCurveTo(-3,-5,1,-1);target.quadraticCurveTo(5,3,9,-1);target.quadraticCurveTo(12,-4,15,-1);target.stroke();
  target.strokeStyle='#ffd19a';target.lineWidth=.8;target.beginPath();target.moveTo(-3,5);target.quadraticCurveTo(6,8,14,4);target.stroke();
  drawTrotFeet(target,[-6,3,12],13,phase,moving,'#56382f',2.5,2);
  target.strokeStyle='#71372b';target.lineWidth=2;target.beginPath();target.moveTo(18,-1);target.quadraticCurveTo(24,-5,25,-1);target.stroke();
  target.fillStyle='#77382e';target.beginPath();target.ellipse(-17,-5,3.2,6,-.35,0,Math.PI*2);target.fill();
  target.fillStyle='#e9b9a4';target.beginPath();target.ellipse(-22,-5,3.5,2.2,0,0,Math.PI*2);target.fill();target.fillStyle='#25211f';target.beginPath();target.arc(-17,-9,1.2,0,Math.PI*2);target.fill();target.ellipse(-25,-5,1.4,1,0,0,Math.PI*2);target.fill();
  target.restore();
}
function drawTrashDragonSprite(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle='#00000020';target.beginPath();target.ellipse(2,16,20,2.8,0,0,Math.PI*2);target.fill();
  target.fillStyle='#345f43';target.beginPath();target.moveTo(4,2);target.quadraticCurveTo(19,8,26,0);target.lineTo(32,-4);target.lineTo(29,5);target.lineTo(22,8);target.quadraticCurveTo(13,13,4,9);target.closePath();target.fill();
  target.fillStyle='#4c8a56';target.beginPath();target.ellipse(0,3,16,10,-.05,0,Math.PI*2);target.fill();target.fillStyle='#a8bd78';target.beginPath();target.ellipse(-1,7,10,4,0,0,Math.PI*2);target.fill();
  // A webbed shoulder wing sits over the back, with curved scallops between its fingers.
  target.fillStyle='#315e43';target.beginPath();target.moveTo(-8,-3);target.quadraticCurveTo(-15,-14,-15,-24);target.quadraticCurveTo(-10,-23,-4,-14);target.lineTo(-1,-29);target.quadraticCurveTo(7,-25,11,-15);target.quadraticCurveTo(16,-8,8,0);target.quadraticCurveTo(0,1,-8,-3);target.closePath();target.fill();
  target.strokeStyle='#234b36';target.lineWidth=1.2;target.stroke();
  target.strokeStyle='#b2cb7f';target.lineWidth=1.1;target.beginPath();target.moveTo(-8,-3);target.quadraticCurveTo(-11,-13,-13,-21);target.moveTo(-7,-3);target.quadraticCurveTo(-4,-13,-1,-27);target.moveTo(-6,-3);target.quadraticCurveTo(3,-10,10,-14);target.stroke();
  drawTrotFeet(target,[-8,3,10],14,phase,moving,'#31583e',3,2.3);
  const neckSway=moving?Math.sin(phase)*.06:0;target.save();target.translate(-9,0);target.rotate(neckSway);target.translate(9,0);
  target.fillStyle='#579b5e';target.beginPath();target.moveTo(-9,-1);target.quadraticCurveTo(-13,-13,-18,-17);target.lineTo(-25,-15);target.quadraticCurveTo(-30,-12,-25,-7);target.lineTo(-17,-6);target.lineTo(-13,1);target.closePath();target.fill();
  target.strokeStyle='#a9ce83';target.lineWidth=.9;target.beginPath();target.moveTo(-15,-14);target.quadraticCurveTo(-18,-10,-16,-7);target.stroke();
  target.fillStyle='#e1c164';target.beginPath();target.moveTo(-21,-15);target.lineTo(-23,-23);target.lineTo(-17,-17);target.closePath();target.moveTo(-14,-16);target.lineTo(-11,-23);target.lineTo(-10,-15);target.closePath();target.fill();target.fillStyle='#f0d18c';target.beginPath();target.ellipse(-24,-9,4,2.3,0,0,Math.PI*2);target.fill();target.fillStyle='#22261f';target.beginPath();target.arc(-19,-12,1.4,0,Math.PI*2);target.fill();target.restore();
  // The metal bin lid and ribbed can armor connect the dragon to its reward theme.
  target.fillStyle='#687b56';target.beginPath();target.roundRect(-3,2,12,9,2);target.fill();target.fillStyle='#a4bd76';target.fillRect(-4,0,14,3);target.fillStyle='#596b50';target.fillRect(-1,4,1.5,5);target.fillRect(4,4,1.5,5);target.fillRect(8,4,1.5,5);target.fillStyle='#ded5b6';target.fillRect(-1,-1,7,1.5);target.restore();
}
function drawAchievementCreature(target,x,y,skin,direction,scale,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';target.lineCap='round';
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,16,19,2.8,0,0,Math.PI*2);target.fill();
  if(skin.animal==='rocketSnail'){
    drawTrotFeet(target,[-7,6],15,phase,moving,'#426a7b',2.2,2.5);
    target.fillStyle='#314d64';target.beginPath();target.moveTo(8,-3);target.lineTo(23,-10);target.lineTo(20,-2);target.lineTo(27,1);target.lineTo(18,3);target.lineTo(22,10);target.lineTo(8,6);target.closePath();target.fill();
    target.fillStyle='#e64f3d';target.beginPath();target.moveTo(19,-5);target.lineTo(30,-2);target.lineTo(22,1);target.lineTo(32,5);target.lineTo(17,4);target.closePath();target.fill();
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,5,18,8,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(0,3,16,7,0,0,Math.PI*2);target.fill();
    target.fillStyle='#d88e52';target.beginPath();target.arc(4,-7,12,0,Math.PI*2);target.fill();target.fillStyle='#edbd74';target.beginPath();target.arc(4,-8,9,0,Math.PI*2);target.fill();target.strokeStyle='#9a573e';target.lineWidth=2;target.beginPath();target.arc(6,-8,5,.4,Math.PI*1.8);target.stroke();target.strokeStyle='#f5d49c';target.lineWidth=1;target.beginPath();target.arc(6,-8,2,.4,Math.PI*1.7);target.stroke();
    target.fillStyle=skin.body;target.beginPath();target.ellipse(-14,-2,7,7,0,0,Math.PI*2);target.fill();target.strokeStyle=skin.shade;target.lineWidth=2.2;target.beginPath();target.moveTo(-14,-3);target.quadraticCurveTo(-16,-10,-18,-12);target.moveTo(-8,-3);target.quadraticCurveTo(-9,-11,-10,-13);target.stroke();
    target.fillStyle='#272534';target.beginPath();target.arc(-18,-13,2.2,0,Math.PI*2);target.arc(-10,-14,2.2,0,Math.PI*2);target.fill();target.fillStyle='#fff';target.beginPath();target.arc(-18.5,-13.5,.7,0,Math.PI*2);target.arc(-10.5,-14.5,.7,0,Math.PI*2);target.fill();target.fillStyle=skin.nose;target.beginPath();target.ellipse(-20,1,2,1.5,0,0,Math.PI*2);target.fill();target.restore();return;
  }
  if(skin.animal==='deepSeaMole'){
    const gait=moving?Math.sin(phase)*1.2:0;
    target.fillStyle='#8b9a8438';target.beginPath();target.ellipse(0,16,20,2.5,0,0,Math.PI*2);target.fill();
    target.strokeStyle='#42394c';target.lineWidth=3;target.beginPath();target.moveTo(7,5);target.quadraticCurveTo(7+gait,10,8+gait,13);target.moveTo(13,4);target.quadraticCurveTo(13-gait,9,14-gait,12);target.stroke();
    target.fillStyle='#d9a8a0';target.beginPath();target.ellipse(8+gait,13,2.5,1.3,0,0,Math.PI*2);target.ellipse(14-gait,12,2.5,1.3,0,0,Math.PI*2);target.fill();
    target.fillStyle=skin.shade;target.beginPath();target.moveTo(-25,0);target.quadraticCurveTo(-23,-8,-14,-10);target.quadraticCurveTo(-2,-13,10,-10);target.quadraticCurveTo(18,-8,19,-2);target.quadraticCurveTo(20,6,12,10);target.quadraticCurveTo(0,13,-13,9);target.quadraticCurveTo(-22,7,-25,0);target.closePath();target.fill();
    target.fillStyle=skin.body;target.beginPath();target.moveTo(-24,-1);target.quadraticCurveTo(-21,-7,-13,-8);target.quadraticCurveTo(-2,-11,10,-8);target.quadraticCurveTo(16,-6,17,-1);target.quadraticCurveTo(18,5,11,8);target.quadraticCurveTo(0,11,-12,7);target.quadraticCurveTo(-20,5,-24,-1);target.closePath();target.fill();
    target.fillStyle=skin.belly;target.beginPath();target.ellipse(4,5,7,3,0,0,Math.PI*2);target.fill();
    // A mole has just two small rear feet and one shovel-shaped hand on each forelimb.
    target.strokeStyle='#493d53';target.lineWidth=4;target.beginPath();target.moveTo(-8,1);target.quadraticCurveTo(-10,4,-13,7+gait);target.moveTo(-5,2);target.quadraticCurveTo(-7,6,-9,9-gait);target.stroke();
    target.fillStyle='#b78598';target.beginPath();target.ellipse(-16,8+gait,6.5,4.2,-.35,0,Math.PI*2);target.ellipse(-8,10-gait,6,4,-.3,0,Math.PI*2);target.fill();
    target.strokeStyle='#f0d5bf';target.lineWidth=1;target.beginPath();target.moveTo(-20,7+gait);target.lineTo(-23,4+gait);target.moveTo(-17,9+gait);target.lineTo(-20,12+gait);target.moveTo(-13,10+gait);target.lineTo(-14,14+gait);target.moveTo(-8,11-gait);target.lineTo(-7,15-gait);target.stroke();
    target.fillStyle='#e7c7b0';target.beginPath();target.moveTo(-17,-4);target.quadraticCurveTo(-23,-5,-28,-1);target.quadraticCurveTo(-23,2,-17,1);target.closePath();target.fill();
    target.fillStyle='#e87589';target.beginPath();target.ellipse(-28,-1,1.7,1.35,0,0,Math.PI*2);target.fill();
    target.fillStyle='#302b42';target.beginPath();target.arc(-18,-5,1,0,Math.PI*2);target.fill();
    target.strokeStyle='#f1d6c3';target.lineWidth=.6;target.beginPath();target.moveTo(-23,-1);target.lineTo(-27,1);target.moveTo(-23,-3);target.lineTo(-27,-4);target.stroke();
    target.fillStyle='#48cde080';target.beginPath();target.ellipse(-19,-5,3.2,2.6,0,0,Math.PI*2);target.ellipse(-12,-5,3.2,2.6,0,0,Math.PI*2);target.fill();
    target.strokeStyle='#332e43';target.lineWidth=2;target.beginPath();target.ellipse(-19,-5,3.8,3.2,0,0,Math.PI*2);target.ellipse(-12,-5,3.8,3.2,0,0,Math.PI*2);target.moveTo(-15.2,-5);target.lineTo(-15.8,-5);target.stroke();
    target.strokeStyle='#e4b54f';target.lineWidth=.8;target.beginPath();target.ellipse(-19,-5,4.2,3.6,0,0,Math.PI*2);target.ellipse(-12,-5,4.2,3.6,0,0,Math.PI*2);target.stroke();
    target.strokeStyle='#4a4056';target.lineWidth=1.1;target.beginPath();target.moveTo(-9,-5);target.lineTo(-6,-5);target.stroke();
    target.strokeStyle='#f0a746';target.lineWidth=1.8;target.beginPath();target.moveTo(-8,-6);target.bezierCurveTo(-5,-10,-7,-19,-3,-21);target.lineTo(0,-21);target.stroke();
    target.strokeStyle='#fff0a8';target.lineWidth=.8;target.beginPath();target.moveTo(-6,-9);target.bezierCurveTo(-4,-13,-5,-18,-3,-19);target.stroke();
    target.restore();return;
  }
  if(skin.animal==='demonRat'){
    const gait=moving?Math.sin(phase)*1.2:0;
    target.fillStyle='#21162b';target.beginPath();target.moveTo(3,-3);target.quadraticCurveTo(4,-13,8,-20);target.quadraticCurveTo(10,-25,14,-28);target.quadraticCurveTo(15,-21,13,-17);target.quadraticCurveTo(20,-22,25,-21);target.quadraticCurveTo(24,-15,20,-12);target.quadraticCurveTo(27,-13,30,-10);target.quadraticCurveTo(24,-3,16,1);target.closePath();target.fill();
    target.fillStyle='#963b5c';target.beginPath();target.moveTo(6,-4);target.quadraticCurveTo(7,-13,10,-20);target.quadraticCurveTo(12,-24,13,-25);target.quadraticCurveTo(15,-19,12,-15);target.quadraticCurveTo(19,-20,23,-19);target.quadraticCurveTo(22,-13,17,-10);target.quadraticCurveTo(24,-11,27,-9);target.quadraticCurveTo(21,-3,15,-1);target.closePath();target.fill();
    target.strokeStyle='#ed9aa0';target.lineWidth=1;target.beginPath();target.moveTo(8,-4);target.quadraticCurveTo(12,-12,13,-23);target.moveTo(12,-3);target.quadraticCurveTo(16,-10,22,-17);target.moveTo(15,-2);target.quadraticCurveTo(19,-7,26,-9);target.stroke();
    target.fillStyle='#261932';target.beginPath();target.moveTo(-1,-4);target.quadraticCurveTo(-3,-13,-1,-20);target.quadraticCurveTo(3,-27,7,-18);target.lineTo(10,-23);target.quadraticCurveTo(16,-18,15,-8);target.lineTo(7,-3);target.closePath();target.fill();
    target.fillStyle='#74334f';target.beginPath();target.moveTo(0,-5);target.quadraticCurveTo(-1,-13,1,-19);target.quadraticCurveTo(4,-23,7,-16);target.lineTo(10,-20);target.quadraticCurveTo(13,-16,13,-9);target.lineTo(7,-5);target.closePath();target.fill();
    target.strokeStyle='#d8878f';target.lineWidth=.8;target.beginPath();target.moveTo(0,-20);target.quadraticCurveTo(4,-12,5,-3);target.moveTo(7,-17);target.quadraticCurveTo(7,-10,5,-3);target.moveTo(11,-19);target.quadraticCurveTo(10,-11,5,-3);target.stroke();
    target.fillStyle='#21162b';target.beginPath();target.moveTo(1,-4);target.quadraticCurveTo(1,-16,6,-25);target.quadraticCurveTo(11,-21,13,-15);target.lineTo(18,-19);target.quadraticCurveTo(22,-11,18,-5);target.lineTo(8,0);target.closePath();target.fill();
    target.fillStyle='#853b5a';target.beginPath();target.moveTo(2,-5);target.quadraticCurveTo(3,-15,7,-22);target.quadraticCurveTo(11,-19,13,-12);target.lineTo(17,-16);target.quadraticCurveTo(19,-10,16,-6);target.lineTo(8,-2);target.closePath();target.fill();
    target.strokeStyle='#e0929d';target.lineWidth=.9;target.beginPath();target.moveTo(6,-23);target.quadraticCurveTo(8,-13,8,-2);target.moveTo(12,-14);target.quadraticCurveTo(10,-8,8,-2);target.moveTo(18,-17);target.quadraticCurveTo(12,-9,8,-2);target.stroke();
    target.strokeStyle=skin.shade;target.lineWidth=2.6;target.beginPath();target.moveTo(10,4);target.bezierCurveTo(20,0,23,13,31,7);target.stroke();
    target.fillStyle='#ef5849';target.beginPath();target.arc(31,7,2,0,Math.PI*2);target.fill();
    target.strokeStyle='#21162b';target.lineWidth=1.5;target.beginPath();target.moveTo(7,5);target.lineTo(7+gait,13);target.moveTo(12,5);target.lineTo(12-gait,13);target.stroke();
    target.fillStyle='#f3c5a9';target.beginPath();target.ellipse(7+gait,13,2.5,1.2,0,0,Math.PI*2);target.ellipse(12-gait,13,2.5,1.2,0,0,Math.PI*2);target.fill();
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(1,2,17,10,0,0,Math.PI*2);target.fill();
    target.fillStyle=skin.body;target.beginPath();target.ellipse(0,0,15,8.5,-.05,0,Math.PI*2);target.fill();
    target.fillStyle=skin.belly;target.beginPath();target.ellipse(3,5,8,3.5,0,0,Math.PI*2);target.fill();
    target.fillStyle='#30203b';target.beginPath();target.ellipse(-13,-6,8,6.5,0,0,Math.PI*2);target.fill();
    target.fillStyle='#f1b6a1';target.beginPath();target.ellipse(-15,-7,4.5,3.4,0,0,Math.PI*2);target.fill();
    target.fillStyle='#672d49';target.beginPath();target.moveTo(-7,-10);target.quadraticCurveTo(-7,-14,-4,-16);target.quadraticCurveTo(0,-14,-1,-10);target.closePath();target.fill();
    target.fillStyle='#d7758c';target.beginPath();target.moveTo(-6,-11);target.lineTo(-4,-14);target.quadraticCurveTo(-2,-12,-3,-10);target.closePath();target.fill();
    target.fillStyle='#30203b';target.beginPath();target.moveTo(-10,-10);target.quadraticCurveTo(-8,-16,-4,-19);target.quadraticCurveTo(-4,-13,-6,-9);target.closePath();target.fill();
    target.fillStyle='#d7758c';target.beginPath();target.moveTo(-9,-11);target.lineTo(-6,-16);target.quadraticCurveTo(-6,-12,-7,-10);target.closePath();target.fill();
    target.fillStyle='#efb4a0';target.beginPath();target.moveTo(-16,-5);target.quadraticCurveTo(-22,-5,-27,-2);target.quadraticCurveTo(-23,1,-16,0);target.closePath();target.fill();
    target.fillStyle='#ed5c4d';target.beginPath();target.ellipse(-27,-2,1.7,1.3,0,0,Math.PI*2);target.fill();
    target.strokeStyle='#f4c7ae';target.lineWidth=.65;target.beginPath();target.moveTo(-22,-1);target.lineTo(-28,1);target.moveTo(-22,-3);target.lineTo(-28,-4);target.stroke();
    target.fillStyle='#fa5548';target.beginPath();target.arc(-16,-7,1.7,0,Math.PI*2);target.arc(-10,-7,1.3,0,Math.PI*2);target.fill();
    target.fillStyle='#fff1da';target.beginPath();target.arc(-16.5,-7.5,.5,0,Math.PI*2);target.fill();
    target.fillStyle='#f4d4a0';target.beginPath();target.moveTo(-17,-10);target.quadraticCurveTo(-22,-15,-21,-23);target.quadraticCurveTo(-16,-20,-14,-12);target.closePath();target.moveTo(-10,-10);target.quadraticCurveTo(-8,-16,-5,-22);target.quadraticCurveTo(-3,-15,-5,-10);target.closePath();target.fill();
    target.fillStyle='#d95258';target.beginPath();target.moveTo(-17,-11);target.quadraticCurveTo(-20,-15,-20,-20);target.quadraticCurveTo(-16,-17,-15,-12);target.closePath();target.moveTo(-9,-11);target.lineTo(-5,-19);target.quadraticCurveTo(-4,-14,-6,-11);target.closePath();target.fill();
    target.strokeStyle='#fff0d1';target.lineWidth=.8;target.beginPath();target.moveTo(-20,-17);target.lineTo(-17,-12);target.moveTo(-7,-16);target.lineTo(-7,-12);target.stroke();
    target.restore();return;
  }
  if(skin.animal==='furnitureOctopus'){
    for(let i=0;i<6;i++){const side=i<3?-1:1,index=i%3,x0=-10+i*4.2,sway=moving?Math.sin(phase+index*.9+(side<0?0:Math.PI))*(2+index):0;target.strokeStyle=skin.shade;target.lineWidth=4.2;target.beginPath();target.moveTo(x0,4);target.bezierCurveTo(x0+side*7,8,x0+side*(12+sway),11,x0+side*(18+index*2),16+sway);target.stroke();target.strokeStyle=skin.body;target.lineWidth=2;target.beginPath();target.moveTo(x0,4);target.bezierCurveTo(x0+side*7,8,x0+side*(12+sway),11,x0+side*(18+index*2),16+sway);target.stroke();for(let cup=0;cup<3;cup++){const cx=x0+side*(7+cup*3+index),cy=8+cup*2+sway*.25;target.fillStyle='#f4d8ad';target.beginPath();target.arc(cx,cy,1.15,0,Math.PI*2);target.fill()}}
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(0,2,16,12,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(-2,-2,14,10,0,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(-3,5,9,5,0,0,Math.PI*2);target.fill();
    target.fillStyle='#fff1d2';target.beginPath();target.arc(-10,-6,4,0,Math.PI*2);target.arc(-2,-7,4,0,Math.PI*2);target.fill();target.fillStyle='#28243e';target.beginPath();target.arc(-11,-6,1.5,0,Math.PI*2);target.arc(-3,-7,1.5,0,Math.PI*2);target.fill();
    target.fillStyle='#57466d';target.beginPath();target.moveTo(-13,-11);target.lineTo(-8,-19);target.lineTo(-2,-12);target.closePath();target.fill();target.fillStyle='#e7bd62';target.beginPath();target.arc(-8,-18,1.6,0,Math.PI*2);target.fill();
    target.strokeStyle='#f4d56c';target.lineWidth=2;target.beginPath();target.arc(12,-12,7,0,Math.PI*2);target.moveTo(12,-12);target.lineTo(12+5*Math.cos(phase*.25),-12+5*Math.sin(phase*.25));target.stroke();target.fillStyle='#f4d56c';target.beginPath();target.arc(12,-12,1.5,0,Math.PI*2);target.fill();
    target.fillStyle='#8c674b';target.fillRect(3,8,11,5);target.fillStyle='#d4a56c';target.fillRect(4,9,9,3);target.restore();return;
  }
  if(skin.animal==='discoCrab'){
    target.lineCap='round';target.lineJoin='round';
    for(let i=0;i<4;i++)for(const side of [-1,1]){
      const y=-2+i*3.5,step=moving?Math.sin(phase+i*Math.PI*.65+(side>0?Math.PI:0))*1.5:0;
      const hip=side*7,knee=side*(12+step),foot=side*(18+step);
      target.strokeStyle=skin.shade;target.lineWidth=2.1;target.beginPath();target.moveTo(hip,y);target.lineTo(knee,y+3);target.lineTo(foot,y+2);target.stroke();
      target.fillStyle='#f1b081';target.beginPath();target.arc(knee,y+3,1,0,Math.PI*2);target.fill();
    }
    target.strokeStyle=skin.shade;target.lineWidth=3.5;target.beginPath();target.moveTo(-8,-1);target.quadraticCurveTo(-14,-5,-19,-7);target.moveTo(-8,4);target.quadraticCurveTo(-14,6,-18,7);target.stroke();
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(-20,-8,6,5,-.35,0,Math.PI*2);target.ellipse(-19,8,5.5,4.5,-.25,0,Math.PI*2);target.fill();
    target.fillStyle=skin.body;target.beginPath();target.moveTo(-18,-10);target.quadraticCurveTo(-23,-17,-29,-14);target.quadraticCurveTo(-30,-9,-22,-5);target.closePath();target.moveTo(-22,-3);target.quadraticCurveTo(-28,0,-29,5);target.quadraticCurveTo(-23,4,-18,1);target.closePath();target.fill();
    target.strokeStyle=skin.shade;target.lineWidth=1;target.beginPath();target.moveTo(-18,-10);target.quadraticCurveTo(-23,-17,-29,-14);target.quadraticCurveTo(-30,-9,-22,-5);target.moveTo(-22,-3);target.quadraticCurveTo(-28,0,-29,5);target.quadraticCurveTo(-23,4,-18,1);target.stroke();
    target.strokeStyle='#ffe0a6';target.lineWidth=1.1;target.beginPath();target.moveTo(-27,-13);target.quadraticCurveTo(-23,-10,-20,-8);target.moveTo(-27,4);target.quadraticCurveTo(-23,3,-20,1);target.stroke();
    target.strokeStyle=skin.shade;target.lineWidth=1.6;target.beginPath();target.moveTo(-10,-4);target.quadraticCurveTo(-11,-9,-11,-11);target.moveTo(-5,-5);target.quadraticCurveTo(-5,-9,-5,-11);target.stroke();
    target.fillStyle='#fff0d7';target.beginPath();target.arc(-11,-12,2.2,0,Math.PI*2);target.arc(-5,-12,2.2,0,Math.PI*2);target.fill();
    target.fillStyle='#29233c';target.beginPath();target.arc(-11.5,-12,1,0,Math.PI*2);target.arc(-5.5,-12,1,0,Math.PI*2);target.fill();
    target.fillStyle=skin.shade;target.beginPath();target.moveTo(-1,-8);target.quadraticCurveTo(-12,-14,-16,-5);target.quadraticCurveTo(-18,2,-11,7);target.quadraticCurveTo(-2,11,9,7);target.quadraticCurveTo(17,4,18,-3);target.quadraticCurveTo(13,-10,4,-9);target.closePath();target.fill();
    target.fillStyle=skin.body;target.beginPath();target.moveTo(-1,-8);target.quadraticCurveTo(-12,-13,-15,-5);target.quadraticCurveTo(-16,2,-10,6);target.quadraticCurveTo(-2,9,9,6);target.quadraticCurveTo(15,3,16,-3);target.quadraticCurveTo(12,-9,4,-8);target.closePath();target.fill();
    target.strokeStyle='#ffd78a';target.lineWidth=.9;target.beginPath();target.moveTo(-8,-5);target.quadraticCurveTo(-1,-9,9,-6);target.moveTo(-7,0);target.quadraticCurveTo(0,-2,11,0);target.stroke();
    target.strokeStyle=skin.shade;target.lineWidth=2;target.beginPath();target.moveTo(-10,-7);target.quadraticCurveTo(-11,-12,-11,-15);target.moveTo(-4,-7);target.quadraticCurveTo(-4,-13,-4,-15);target.stroke();
    target.fillStyle='#fff0d7';target.beginPath();target.arc(-11,-16,2.4,0,Math.PI*2);target.arc(-4,-16,2.4,0,Math.PI*2);target.fill();
    target.fillStyle='#29233c';target.beginPath();target.arc(-11.5,-16,1.1,0,Math.PI*2);target.arc(-4.5,-16,1.1,0,Math.PI*2);target.fill();
    target.strokeStyle=skin.shade;target.lineWidth=2.6;target.beginPath();target.moveTo(-10,-1);target.quadraticCurveTo(-17,-4,-21,-7);target.moveTo(-10,4);target.quadraticCurveTo(-17,7,-21,8);target.stroke();
    target.fillStyle=skin.shade;target.beginPath();target.ellipse(-25,-8,5.2,4.2,-.4,0,Math.PI*2);target.ellipse(-25,8,5.2,4.2,.35,0,Math.PI*2);target.fill();
    target.fillStyle=skin.body;target.beginPath();target.moveTo(-22,-10);target.quadraticCurveTo(-28,-14,-31,-10);target.quadraticCurveTo(-29,-7,-24,-6);target.closePath();target.moveTo(-22,-5);target.quadraticCurveTo(-29,-3,-31,0);target.quadraticCurveTo(-29,3,-23,2);target.closePath();target.moveTo(-22,1);target.quadraticCurveTo(-28,5,-30,9);target.quadraticCurveTo(-26,11,-21,6);target.closePath();target.fill();
    target.strokeStyle=skin.shade;target.lineWidth=1;target.beginPath();target.moveTo(-22,-10);target.quadraticCurveTo(-28,-14,-31,-10);target.quadraticCurveTo(-29,-7,-24,-6);target.moveTo(-22,-5);target.quadraticCurveTo(-29,-3,-31,0);target.quadraticCurveTo(-29,3,-23,2);target.moveTo(-22,1);target.quadraticCurveTo(-28,5,-30,9);target.quadraticCurveTo(-26,11,-21,6);target.stroke();
    target.strokeStyle='#ffd78a';target.lineWidth=.8;target.beginPath();target.moveTo(-11,-5);target.quadraticCurveTo(-3,-9,7,-6);target.moveTo(-6,-3);target.quadraticCurveTo(-3,0,-4,4);target.moveTo(3,-4);target.quadraticCurveTo(5,0,4,5);target.stroke();
    target.fillStyle=skin.belly;target.beginPath();target.moveTo(-8,4);target.quadraticCurveTo(-4,7,2,7);target.lineTo(0,9);target.quadraticCurveTo(-5,9,-9,6);target.closePath();target.fill();
    target.strokeStyle='#f7d6a2';target.lineWidth=.8;target.beginPath();target.moveTo(9,-7);target.quadraticCurveTo(13,-1,10,4);target.stroke();
    target.fillStyle='#fff0d7';target.beginPath();target.moveTo(9,-7);target.lineTo(13,-15);target.quadraticCurveTo(16,-16,18,-14);target.lineTo(16,-7);target.closePath();target.fill();
    target.fillStyle='#e74d78';target.beginPath();target.moveTo(11,-8);target.lineTo(14,-14);target.lineTo(16,-8);target.closePath();target.fill();
    target.fillStyle='#efcc4f';target.beginPath();target.arc(16,-15,1.4,0,Math.PI*2);target.fill();
    target.strokeStyle='#73d8d1';target.lineWidth=.8;target.beginPath();target.moveTo(10,-7);target.lineTo(17,-7);target.stroke();
    target.restore();return;
  }
  target.fillStyle=skin.shade;target.strokeStyle=skin.shade;target.lineWidth=3;
  for(let i=0;i<3;i++){const legY=3+i*4;target.beginPath();target.moveTo(5,legY);target.lineTo(14,legY+4);target.lineTo(17,legY+2);target.stroke()}
  target.beginPath();target.ellipse(0,3,15,11,0,0,Math.PI*2);target.fill();target.fillStyle=skin.body;target.beginPath();target.ellipse(-1,1,13,9,0,0,Math.PI*2);target.fill();target.fillStyle=skin.belly;target.beginPath();target.ellipse(-2,6,8,4,0,0,Math.PI*2);target.fill();
  for(const clawY of [-7,11]){target.beginPath();target.moveTo(-8,0);target.quadraticCurveTo(-16,clawY,-22,clawY-2);target.stroke();target.beginPath();target.arc(-23,clawY-2,5,0,Math.PI*2);target.fill()}
  target.fillStyle='#fff2ca';target.beginPath();target.arc(-9,-5,3.5,0,Math.PI*2);target.arc(-2,-6,3.5,0,Math.PI*2);target.fill();target.fillStyle='#46304e';target.beginPath();target.arc(-10,-5,1.4,0,Math.PI*2);target.arc(-3,-6,1.4,0,Math.PI*2);target.fill();
  target.fillStyle='#fff1d7';target.beginPath();target.moveTo(-9,-8);target.lineTo(-4,-19);target.lineTo(1,-8);target.closePath();target.fill();target.fillStyle='#e74d78';target.fillRect(-8,-11,7,2);target.fillStyle='#efcc4f';target.beginPath();target.arc(-4,-18,1.6,0,Math.PI*2);target.fill();target.restore();
}
function drawRatSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineCap='round';target.lineJoin='round';
  const step=moving?Math.sin(phase):0,oppositeStep=moving?Math.sin(phase+Math.PI):0;
  const bellyShade=skin.belly;
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,15,19,3.2,0,0,Math.PI*2);target.fill();
  target.strokeStyle=skin.shade;target.lineWidth=2.2;target.beginPath();target.moveTo(13,5);target.bezierCurveTo(22,4,25,14,31,8);target.stroke();
  target.strokeStyle=skin.nose;target.lineWidth=1;target.beginPath();target.moveTo(14,5);target.bezierCurveTo(22,5,24,12,29,8);target.stroke();
  const drawLeg=(legX,swing,front=false)=>{
    target.strokeStyle=skin.shade;target.lineWidth=4.2;target.beginPath();target.moveTo(legX,5);target.quadraticCurveTo(legX+swing*.55,9,legX+swing,13);target.stroke();
    target.strokeStyle=skin.body;target.lineWidth=2.4;target.beginPath();target.moveTo(legX,5);target.quadraticCurveTo(legX+swing*.55,9,legX+swing,12.5);target.stroke();
    target.fillStyle=front?skin.belly:skin.shade;target.beginPath();target.ellipse(legX+swing-1,13,3.4,1.9,0,0,Math.PI*2);target.fill();
    target.strokeStyle=skin.nose;target.lineWidth=.75;target.beginPath();target.moveTo(legX+swing-1,13);target.lineTo(legX+swing+.8,13);target.stroke();
  };
  drawLeg(-6,oppositeStep*2,false);drawLeg(9,step*2,false);
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(2,2,18,12,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(1,0,16,10.5,-.04,0,Math.PI*2);target.fill();
  target.fillStyle=bellyShade;target.beginPath();target.ellipse(5,5.5,9,5.2,-.12,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff45';target.lineWidth=1.1;target.beginPath();target.ellipse(-1,-4,10,4.5,-.12,Math.PI*1.08,Math.PI*1.84);target.stroke();
  drawLeg(-8,step*2.4,true);drawLeg(7,oppositeStep*2.4,true);
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(-11,-5,10,9,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.ear;target.beginPath();target.ellipse(-16,-13,5.1,6.2,-.35,0,Math.PI*2);target.fill();target.fillStyle='#f3c1b8';target.beginPath();target.ellipse(-16,-13,2.7,3.8,-.35,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-11,-6,9.2,8.2,-.08,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff50';target.lineWidth=.9;target.beginPath();target.ellipse(-12,-9,4.8,2.1,-.2,Math.PI*1.05,Math.PI*1.85);target.stroke();
  target.fillStyle=skin.ear;target.beginPath();target.ellipse(-7,-12,4.8,5.6,-.2,0,Math.PI*2);target.fill();target.fillStyle='#f3c1b8';target.beginPath();target.ellipse(-7,-12,2.4,3.3,-.2,0,Math.PI*2);target.fill();
  target.fillStyle='#f1c8ae';target.beginPath();target.ellipse(-18,-3.5,5.8,3.8,-.15,0,Math.PI*2);target.fill();
  target.fillStyle='#241b15';target.beginPath();target.ellipse(-13,-8,1.65,2,0,0,Math.PI*2);target.fill();target.fillStyle='#fff';target.beginPath();target.arc(-13.5,-8.8,.65,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-20,-4,4,2.8,0,0,Math.PI*2);target.fill();target.fillStyle=skin.nose;target.beginPath();target.ellipse(-23,-4.2,2,1.5,-.15,0,Math.PI*2);target.fill();
  target.strokeStyle='#f3e3d0';target.lineWidth=.65;target.beginPath();target.moveTo(-20,-3);target.quadraticCurveTo(-25,-1, -29,0);target.moveTo(-20,-4);target.quadraticCurveTo(-25,-4,-29,-4);target.moveTo(-20,-5);target.quadraticCurveTo(-25,-7,-28,-8);target.stroke();
  target.restore();
}
function drawPigeonSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';target.lineCap='round';
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,14,17,2.6,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.shade;target.beginPath();target.moveTo(12,1);target.quadraticCurveTo(22,-4,28,-5);target.lineTo(20,3);target.lineTo(18,9);target.closePath();target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(2,2,16,11,-.12,0,Math.PI*2);target.fill();
  target.strokeStyle=skin.shade;target.lineWidth=1.15;target.beginPath();target.ellipse(2,2,16,11,-.12,Math.PI*1.1,Math.PI*1.83);target.stroke();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(-1,5,9,6,-.2,0,Math.PI*2);target.fill();
  // Layered wing feathers keep the pigeon broad-bodied rather than round like a ball.
  target.fillStyle='#727983';target.beginPath();target.moveTo(-6,-4);target.quadraticCurveTo(0,-10,8,-6);target.quadraticCurveTo(13,-2,9,5);target.quadraticCurveTo(2,2,-5,5);target.closePath();target.fill();
  target.strokeStyle='#aeb2b5';target.lineWidth=.85;
  for(let i=0;i<3;i++){target.beginPath();target.moveTo(-3+i*3,-4);target.quadraticCurveTo(2+i*2,0,6+i,3);target.stroke()}
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-7,-3,6,6,-.25,0,Math.PI*2);target.fill();
  const headSway=moving?Math.sin(phase)*.055:0;target.save();target.translate(-4,-2);target.rotate(headSway);target.translate(4,2);
  target.fillStyle=skin.shade;target.beginPath();target.arc(-10,-7,7.8,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.arc(-10,-7.5,7.1,0,Math.PI*2);target.fill();
  target.fillStyle=skin.nose;target.beginPath();target.moveTo(-16,-7);target.quadraticCurveTo(-20,-7,-24,-5);target.lineTo(-16,-3);target.closePath();target.fill();
  target.fillStyle='#efbf70';target.beginPath();target.ellipse(-17,-5,2.4,1.8,0,0,Math.PI*2);target.fill();
  target.fillStyle='#222';target.beginPath();target.arc(-12,-9,1.4,0,Math.PI*2);target.fill();target.fillStyle='#fff';target.beginPath();target.arc(-12.4,-9.5,.55,0,Math.PI*2);target.fill();target.restore();
  drawTrotFeet(target,[-4,5],16,phase,moving,skin.nose,2,2.2);
  target.restore();
}
function drawFrogSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle='#00000020';target.beginPath();target.ellipse(1,15,19,3,0,0,Math.PI*2);target.fill();
  const frogStep=moving?Math.sin(phase)*2.5:0;
  target.strokeStyle=skin.shade;target.lineWidth=4;target.lineCap='round';
  target.beginPath();target.moveTo(7,7);target.quadraticCurveTo(15,8,19+frogStep,12);target.moveTo(-4,8);target.quadraticCurveTo(-12,10,-16-frogStep,13);target.stroke();
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(19+frogStep,13,5,2,0,0,Math.PI*2);target.ellipse(-16-frogStep,14,5,2,0,0,Math.PI*2);target.fill();
  target.strokeStyle=skin.shade;target.lineWidth=1;target.beginPath();target.moveTo(16+frogStep,13);target.lineTo(15+frogStep,15);target.moveTo(20+frogStep,13);target.lineTo(20+frogStep,15);target.moveTo(-19-frogStep,14);target.lineTo(-20-frogStep,16);target.stroke();
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(4,5,17,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(2,1,16,11,0,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff45';target.lineWidth=1;target.beginPath();target.ellipse(1,-2,10,5,-.1,Math.PI*1.1,Math.PI*1.8);target.stroke();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(-1,6,9,5,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(-8,-8,13,9,0,0,Math.PI*2);target.fill();
  for(const eyeX of [-16,-2]){
    target.fillStyle=skin.shade;target.beginPath();target.arc(eyeX,-15,5.5,0,Math.PI*2);target.fill();
    target.fillStyle='#fff4d4';target.beginPath();target.arc(eyeX,-15,4.3,0,Math.PI*2);target.fill();
    target.fillStyle='#24351f';target.beginPath();target.arc(eyeX-1,-15,2,0,Math.PI*2);target.fill();
    target.fillStyle='#fff';target.beginPath();target.arc(eyeX-1.5,-16,.7,0,Math.PI*2);target.fill();
  }
  target.strokeStyle=skin.shade;target.lineWidth=1.5;target.beginPath();target.moveTo(-20,-5);target.quadraticCurveTo(-12,-1,-4,-5);target.stroke();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(14,8,7,5,-.3,0,Math.PI*2);target.ellipse(-8,11,6,3,.2,0,Math.PI*2);target.fill();
  target.restore();
}
function drawRaccoonSprite(target,x,y,skin,direction=-1,scale=1,phase=0,moving=false){
  target.save();target.translate(x,y);target.scale(direction*scale,scale);target.lineJoin='round';
  target.fillStyle=skin.shade;target.beginPath();target.moveTo(10,0);target.bezierCurveTo(19,-5,24,10,31,4);target.bezierCurveTo(24,18,15,7,9,8);target.closePath();target.fill();
  target.strokeStyle='#d6d0c3';target.lineWidth=3;for(const tx of [18,24]){target.beginPath();target.moveTo(tx,4);target.quadraticCurveTo(tx+2,7,tx+4,8);target.stroke()}
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(2,2,16,11,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(1,0,14,9,0,0,Math.PI*2);target.fill();
  target.strokeStyle='#ffffff45';target.lineWidth=1;target.beginPath();target.ellipse(0,-3,8,3,-.15,Math.PI*1.1,Math.PI*1.8);target.stroke();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(3,5,8,4,0,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.arc(-10,-6,8,0,Math.PI*2);target.fill();
  target.fillStyle=skin.shade;target.beginPath();target.moveTo(-17,-9);target.lineTo(-17,-17);target.lineTo(-9,-12);target.closePath();target.fill();
  target.beginPath();target.moveTo(-5,-12);target.lineTo(-2,-18);target.lineTo(1,-10);target.closePath();target.fill();
  target.fillStyle='#d69a9a';target.beginPath();target.moveTo(-15,-11);target.lineTo(-15,-15);target.lineTo(-11,-12);target.closePath();target.fill();
  target.beginPath();target.moveTo(-4,-12);target.lineTo(-2,-16);target.lineTo(-1,-11);target.closePath();target.fill();
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
  target.strokeStyle=skin.shade;target.lineWidth=3.2;target.beginPath();target.moveTo(-4,2);target.lineTo(-4,8);target.lineTo(-6+flamingoStep,19);target.moveTo(6,2);target.lineTo(6,8);target.lineTo(8-flamingoStep,18);target.stroke();
  target.strokeStyle=skin.nose;target.lineWidth=2;target.beginPath();target.moveTo(-8+flamingoStep,19);target.lineTo(-14+flamingoStep,19);target.moveTo(6-flamingoStep,18);target.lineTo(13-flamingoStep,18);target.stroke();
  target.strokeStyle='#f7d2a8';target.lineWidth=1;target.beginPath();target.moveTo(-5,4);target.lineTo(-5,8);target.moveTo(5,4);target.lineTo(5,8);target.stroke();
  target.fillStyle=skin.shade;target.beginPath();target.ellipse(3,-7,15,9,-.2,0,Math.PI*2);target.fill();
  target.fillStyle=skin.body;target.beginPath();target.ellipse(2,-9,13,7,-.2,0,Math.PI*2);target.fill();
  target.fillStyle=skin.belly;target.beginPath();target.ellipse(-1,-6,7,4,-.3,0,Math.PI*2);target.fill();
  target.strokeStyle='#fff0e4';target.lineWidth=1;target.beginPath();target.ellipse(1,-12,8,2,-.2,Math.PI*1.1,Math.PI*1.8);target.stroke();
  const neckSway=moving?Math.sin(phase)*.05:0;target.save();target.translate(-4,-14);target.rotate(neckSway);target.translate(4,14);
  target.strokeStyle=skin.body;target.lineWidth=5;target.beginPath();target.moveTo(-4,-14);target.bezierCurveTo(-7,-23,-2,-29,-11,-31);target.bezierCurveTo(-17,-33,-17,-39,-15,-42);target.stroke();
  target.fillStyle=skin.body;target.beginPath();target.arc(-15,-41,6,0,Math.PI*2);target.fill();
  target.fillStyle=skin.nose;target.beginPath();target.moveTo(-19,-41);target.lineTo(-29,-38);target.lineTo(-20,-36);target.closePath();target.fill();
  target.fillStyle='#24201f';target.beginPath();target.moveTo(-20,-38);target.lineTo(-29,-38);target.lineTo(-20,-37);target.closePath();target.fill();
  target.fillStyle='#241b15';target.beginPath();target.arc(-16,-43,1.3,0,Math.PI*2);target.fill();target.fillStyle='#fff';target.beginPath();target.arc(-16.4,-43.5,.5,0,Math.PI*2);target.fill();target.restore();
  target.restore();
}
function drawLivingFurniture(o){
  const {x,y,w,h,label}=o;
  ctx.save();
  ctx.lineJoin='round';
  ctx.fillStyle='#39291f44';roundRect(x+8,y+11,w-6,h-5,12);

  if(label==='SOFA'){
    ctx.fillStyle='#563b34';roundRect(x,y,w,h,15);
    ctx.fillStyle='#84584b';roundRect(x+4,y+4,w-8,h-8,12);
    ctx.fillStyle='#9c6c5b';roundRect(x+12,y+8,w-24,h-16,9);
    ctx.fillStyle='#70483f';roundRect(x+13,y+11,18,h-22,7);roundRect(x+w-31,y+11,18,h-22,7);
    const cushionW=(w-66)/2;
    for(let i=0;i<2;i++){
      const cx=x+34+i*(cushionW+3);
      const shade=ctx.createLinearGradient(cx,y+12,cx,y+h-12);shade.addColorStop(0,'#bd8b73');shade.addColorStop(.55,'#a97866');shade.addColorStop(1,'#8f6255');
      ctx.fillStyle=shade;roundRect(cx,y+12,cushionW,h-24,8);
      ctx.strokeStyle='#d3a18a88';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx+8,y+17);ctx.quadraticCurveTo(cx+cushionW/2,y+20,cx+cushionW-8,y+17);ctx.stroke();
      ctx.fillStyle='#d9b996';roundRect(cx+8,y+17,24,18,5);
      ctx.strokeStyle='#956858';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+13,y+20);ctx.lineTo(cx+27,y+32);ctx.moveTo(cx+27,y+20);ctx.lineTo(cx+13,y+32);ctx.stroke();
    }
    ctx.strokeStyle='#dfb49a';ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(x+5,y+5,w-10,h-10,11);ctx.stroke();
    ctx.fillStyle='#604239';for(const lx of [x+18,x+w-24])roundRect(lx,y+h-3,6,8,2);
  }else if(label==='KÜHLSCHRANK'){
    const steel=ctx.createLinearGradient(x,y,x+w,y);steel.addColorStop(0,'#aeb4b2');steel.addColorStop(.22,'#eef0eb');steel.addColorStop(.62,'#c8cdca');steel.addColorStop(1,'#969d9c');
    fill(x,y,w,h,'#575d5c',8);fill(x+4,y+4,w-8,h-8,steel,6);
    ctx.strokeStyle='#8e9694';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+7,y+h*.25);ctx.lineTo(x+w-7,y+h*.25);ctx.stroke();
    fill(x+w-15,y+17,4,h*.19,'#737b79',2);fill(x+w-15,y+h*.30,4,h*.50,'#737b79',2);
    ctx.fillStyle='#f7f7f2';ctx.beginPath();ctx.ellipse(x+w*.35,y+h*.52,8,14,-.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d36f55';ctx.beginPath();ctx.arc(x+w*.33,y+h*.49,2.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#75927e';ctx.beginPath();ctx.arc(x+w*.39,y+h*.54,2.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#e8ece7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+8,y+h*.26);ctx.lineTo(x+w-8,y+h*.26);ctx.stroke();
  }else if(label==='SCHRANK'){
    const wood=ctx.createLinearGradient(x,y,x,y+h);wood.addColorStop(0,'#b48a60');wood.addColorStop(.5,'#8b6446');wood.addColorStop(1,'#704d39');
    ctx.fillStyle='#503a2c';roundRect(x,y,w,h,9);ctx.fillStyle=wood;roundRect(x+4,y+4,w-8,h-8,6);
    ctx.strokeStyle='#d6b386';ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,h-16,4);ctx.stroke();
    ctx.strokeStyle='#684b36';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w/2,y+9);ctx.lineTo(x+w/2,y+h-9);ctx.stroke();
    ctx.fillStyle='#ddc18f';roundRect(x+w*.46,y+h*.43,4,9,2);roundRect(x+w*.53,y+h*.43,4,9,2);
    ctx.strokeStyle='#d9b78a88';ctx.lineWidth=1;for(let yy=y+17;yy<y+h-8;yy+=13){ctx.beginPath();ctx.moveTo(x+12,yy);ctx.quadraticCurveTo(x+w*.28,yy-2,x+w*.46-6,yy);ctx.moveTo(x+w*.54+6,yy);ctx.quadraticCurveTo(x+w*.76,yy+2,x+w-12,yy);ctx.stroke()}
  }else if(label==='TISCH'){
    ctx.fillStyle='#513b2a';roundRect(x+18,y+18,15,h-20,4);roundRect(x+w-33,y+18,15,h-20,4);
    const top=ctx.createLinearGradient(x,y,x,y+h);top.addColorStop(0,'#c39867');top.addColorStop(.25,'#a8794d');top.addColorStop(1,'#805537');
    ctx.fillStyle='#5e402d';roundRect(x+1,y+3,w-2,h-12,10);ctx.fillStyle=top;roundRect(x+6,y+6,w-12,h-18,7);
    ctx.strokeStyle='#dbb17c';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+10,y+10,w-20,h-25,5);ctx.stroke();
    ctx.strokeStyle='#79533388';ctx.lineWidth=1;for(let yy=y+17;yy<y+h-13;yy+=9){ctx.beginPath();ctx.moveTo(x+13,yy);ctx.bezierCurveTo(x+w*.35,yy-2,x+w*.65,yy+2,x+w-13,yy);ctx.stroke()}
    ctx.fillStyle='#f2d8a244';roundRect(x+13,y+9,w-26,3,2);
    ctx.save();ctx.translate(x+w*.22,y+h*.53);ctx.rotate(-.08);ctx.fillStyle='#6e463b';roundRect(-20,-12,40,24,2);ctx.fillStyle='#e7d3ad';roundRect(-17,-10,34,20,1);ctx.strokeStyle='#9a7658';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.moveTo(-14,-5);ctx.lineTo(-3,-5);ctx.moveTo(3,-5);ctx.lineTo(14,-5);ctx.stroke();ctx.restore();
    ctx.fillStyle='#d8c49d';ctx.beginPath();ctx.arc(x+w*.79,y+h*.53,10,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#815e42';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+w*.79,y+h*.53,7,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#eee0c6';ctx.beginPath();ctx.arc(x+w*.79,y+h*.53,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eee0c6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+w*.79+7,y+h*.53,3,-Math.PI/2,Math.PI/2);ctx.stroke();
  }else if(label==='KISTE'){
    const wood=ctx.createLinearGradient(x,y,x+w,y+h);wood.addColorStop(0,'#bd8b55');wood.addColorStop(.5,'#98683e');wood.addColorStop(1,'#714a32');
    ctx.fillStyle='#563a27';roundRect(x,y+4,w,h-4,8);ctx.fillStyle=wood;roundRect(x+5,y+8,w-10,h-13,5);
    ctx.strokeStyle='#70492e';ctx.lineWidth=2;for(let yy=y+17;yy<y+h-4;yy+=15){ctx.beginPath();ctx.moveTo(x+8,yy);ctx.lineTo(x+w-8,yy);ctx.stroke()}
    ctx.strokeStyle='#d2a36b';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+10,y+12);ctx.lineTo(x+w-10,y+12);ctx.stroke();
    ctx.strokeStyle='#e0b77b99';ctx.lineWidth=1;for(let xx=x+18;xx<x+w-10;xx+=43){ctx.beginPath();ctx.moveTo(xx,y+19);ctx.lineTo(xx,y+h-8);ctx.stroke()}
    ctx.fillStyle='#523925';roundRect(x+w*.44,y+9,w*.12,5,2);
  }else if(label==='REGAL'){
    ctx.fillStyle='#4e392c';roundRect(x,y,w,h,7);ctx.fillStyle='#9b704c';roundRect(x+4,y+4,w-8,h-8,4);
    const shelfYs=[y+h*.44,y+h*.76];ctx.fillStyle='#654731';for(const sy of shelfYs)roundRect(x+7,sy,w-14,5,2);
    const bookColors=['#9b5142','#60776b','#c59a5e','#596b86','#a86645','#82749a'];
    for(let row=0;row<2;row++){
      const top=row===0?y+9:y+h*.49, available=w-24, bookCount=Math.max(5,Math.floor(available/27));
      for(let i=0;i<bookCount;i++){
        const bw=available/bookCount-3,bx=x+12+i*available/bookCount,bh=h*(row===0?.26:.21)-(i%3)*2;
        ctx.fillStyle='#533b2e';roundRect(bx+1,top+2,bw,bh,2);ctx.fillStyle=bookColors[(i+row*2)%bookColors.length];roundRect(bx,top,bw,bh,2);
        ctx.fillStyle='#ffffff35';roundRect(bx+2,top+3,2,bh-6,1);
        ctx.fillStyle='#e0c18b';roundRect(bx+3,top+bh-6,bw-6,1.5,1);
      }
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
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#eadfc9');wall.addColorStop(1,'#cdb99b');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.strokeStyle='#b49d7d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(worldW,16);ctx.moveTo(0,74);ctx.lineTo(worldW,74);ctx.stroke();
  for(let x=38;x<worldW;x+=118){ctx.strokeStyle='#c1ab8c55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x,72);ctx.stroke()}
  const wx=worldW*.18,wy=22,ww=270,wh=48;
  ctx.fillStyle='#7d6048';roundRect(wx-7,wy-6,ww+14,wh+13,5);
  const glass=ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);glass.addColorStop(0,'#91b4b4');glass.addColorStop(.55,'#c7d5c4');glass.addColorStop(1,'#7fa0a0');
  ctx.fillStyle=glass;roundRect(wx,wy,ww,wh,2);
  ctx.fillStyle='#879d75';ctx.beginPath();ctx.moveTo(wx+4,wy+wh-13);ctx.quadraticCurveTo(wx+60,wy+wh-32,wx+120,wy+wh-15);ctx.quadraticCurveTo(wx+190,wy+wh-34,wx+ww-4,wy+wh-12);ctx.lineTo(wx+ww-4,wy+wh-3);ctx.lineTo(wx+4,wy+wh-3);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#76583f';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(wx+ww/2,wy+1);ctx.lineTo(wx+ww/2,wy+wh-1);ctx.moveTo(wx,wy+wh/2);ctx.lineTo(wx+ww,wy+wh/2);ctx.stroke();
  ctx.fillStyle='#a45f50';roundRect(wx-17,wy-2,10,wh+3,3);roundRect(wx+ww+7,wy-2,10,wh+3,3);
  ctx.fillStyle='#f4ead4';ctx.fillRect(0,80,worldW,12);ctx.fillStyle='#886b50';ctx.fillRect(0,89,worldW,7);

  const floor=ctx.createLinearGradient(0,floorTop,worldW,floorBottom);floor.addColorStop(0,'#c49c72');floor.addColorStop(.48,'#b88d65');floor.addColorStop(1,'#a77d5a');
  ctx.fillStyle=floor;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  const sun=ctx.createLinearGradient(wx+ww*.4,floorTop,wx+ww*1.25,floorTop+floorBottom*.68);sun.addColorStop(0,'#fff0c322');sun.addColorStop(1,'#fff0c300');
  ctx.fillStyle=sun;ctx.beginPath();ctx.moveTo(wx+18,floorTop);ctx.lineTo(wx+ww-10,floorTop);ctx.lineTo(wx+ww*1.7,floorBottom);ctx.lineTo(wx-ww*.7,floorBottom);ctx.closePath();ctx.fill();
  for(let row=0,y=floorTop+4;y<floorBottom;row++,y+=54){
    ctx.fillStyle=row%2?'#805c3b0b':'#f4d8ad0d';ctx.fillRect(0,y,worldW,54);
    ctx.strokeStyle='#694c3440';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    const shift=row%2?82:0;
    for(let x=shift+95;x<worldW;x+=188){ctx.strokeStyle='#694c3438';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+54);ctx.stroke()}
    for(let plank=0,x=shift+55;x<worldW;x+=188,plank++){
      const gx=x+((row*37+plank*19)%45),gy=y+14+((row+plank)%3)*12;
      ctx.strokeStyle='#805b3b38';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(gx,gy);ctx.quadraticCurveTo(gx+20,gy-2,gx+43,gy+1);ctx.stroke();
      ctx.fillStyle='#76553855';ctx.beginPath();ctx.ellipse(gx+58,gy+18,1.6,1,0,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.fillStyle='#e8ddc8';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);
  ctx.fillStyle='#8b6b4d';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#d7c5a9';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.strokeStyle='#8a694a55';ctx.lineWidth=1;for(let x=36;x<worldW;x+=118){ctx.beginPath();ctx.moveTo(x,floorBottom+18);ctx.lineTo(x,floorBottom+42);ctx.stroke()}

  const x=worldW*.30,y=worldH*.40,w=worldW*.40,h=worldH*.23;
  ctx.fillStyle='#49352845';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2+12,w*.53,h*.61,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#765347';roundRect(x-3,y-3,w+6,h+6,24);
  ctx.fillStyle='#805d51';roundRect(x,y,w,h,22);
  ctx.save();ctx.beginPath();ctx.roundRect(x+17,y+17,w-34,h-34,14);ctx.clip();
  for(let yy=y+18;yy<y+h-12;yy+=9){ctx.strokeStyle=yy%2?'#d4b29b18':'#412e2918';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+16,yy);ctx.lineTo(x+w-16,yy);ctx.stroke()}
  for(let xx=x+22;xx<x+w-12;xx+=13){ctx.strokeStyle='#e3c8ad0c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(xx,y+18);ctx.lineTo(xx,y+h-18);ctx.stroke()}
  ctx.restore();
  ctx.strokeStyle='#d5b782';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,h-16,16);ctx.stroke();
  ctx.strokeStyle='#c69b70';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+17,y+17,w-34,h-34,12);ctx.stroke();
  ctx.strokeStyle='#d9b98c';ctx.lineWidth=2;
  for(const cx of [x+42,x+w-42])for(const cy of [y+42,y+h-42]){
    ctx.beginPath();ctx.moveTo(cx,cy-12);ctx.lineTo(cx+12,cy);ctx.lineTo(cx,cy+12);ctx.lineTo(cx-12,cy);ctx.closePath();ctx.stroke();
  }
  ctx.strokeStyle='#d8bb8e';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,34,20,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+w/2,y+h/2-13);ctx.lineTo(x+w/2+8,y+h/2);ctx.lineTo(x+w/2,y+h/2+13);ctx.lineTo(x+w/2-8,y+h/2);ctx.closePath();ctx.stroke();
  ctx.restore();
}
function drawKitchenFurniture(o){
  const {x,y,w,h,label}=o;
  const fill=(xx,yy,ww,hh,color,r=5)=>{ctx.fillStyle=color;roundRect(xx,yy,ww,hh,r)};
  ctx.save();ctx.lineJoin='round';
  ctx.fillStyle='#28252135';roundRect(x+7,y+9,w,h,8);
  if(label==='KÜCHENZEILE'){
    const leftSide=x<worldW/2;
    const top=ctx.createLinearGradient(x,y,x,y+25);top.addColorStop(0,'#f7f2e7');top.addColorStop(.45,'#d9d1c2');top.addColorStop(1,'#aaa294');
    fill(x,y+12,w,h-12,'#62594f',7);fill(x+5,y+20,w-10,h-22,'#c9c0b1',5);
    for(let i=0;i<4;i++){
      const doorW=(w-18)/4,dx=x+7+i*(doorW+1);
      fill(dx,y+25,doorW-2,h-31,['#d9d2c5','#c9c0b1'][i%2],3);
      ctx.strokeStyle='#f5f0e5';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(dx+4,y+30,doorW-10,h-42,2);ctx.stroke();
      fill(dx+doorW-11,y+h*.56,3,8,'#8c806d',2);
      if(i%2===0){ctx.strokeStyle='#b6ac9b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(dx+7,y+38);ctx.lineTo(dx+doorW-9,y+38);ctx.stroke()}
    }
    fill(x-3,y+7,w+6,19,top,5);ctx.strokeStyle='#fffdf7';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+4,y+9);ctx.lineTo(x+w-4,y+9);ctx.stroke();
    fill(x+5,y+24,w-10,3,'#776b5d',1);
    if(leftSide){
      fill(x+w*.60,y+9,w*.28,15,'#858c87',4);fill(x+w*.615,y+10,w*.25,11,'#7ca1a0',3);
      ctx.strokeStyle='#d6e2dc';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x+w*.74,y+15,w*.105,5,0,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='#777f7b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w*.74,y+9);ctx.quadraticCurveTo(x+w*.75,y+2,x+w*.80,y+4);ctx.stroke();
      fill(x+w*.17,y+11,31,9,'#c8bda8',3);fill(x+w*.19,y+9,27,3,'#e5dbc8',2);
    }else{
      fill(x+w*.12,y+9,w*.27,16,'#6c6861',4);fill(x+w*.135,y+11,w*.24,12,'#282b2b',3);
      for(let i=0;i<4;i++){ctx.strokeStyle='#b8b1a2';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x+w*.17+i*(w*.055),y+17,3.3,0,Math.PI*2);ctx.stroke()}
      fill(x+w*.72,y+10,31,10,'#d8cfbd',3);fill(x+w*.75,y+7,25,4,'#f1ebdc',2);
    }
  }else if(label==='SCHRANK'){
    const metal=ctx.createLinearGradient(x,y,x+w,y);metal.addColorStop(0,'#dedbd3');metal.addColorStop(.5,'#bdbab3');metal.addColorStop(1,'#8f918e');
    fill(x,y,w,h,'#565856',7);fill(x+4,y+4,w-8,h-8,metal,5);
    fill(x+7,y+8,w-14,h*.14,'#777a77',3);
    ctx.fillStyle='#d6d5ce';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.58,w*.34,h*.33,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#a8b7b2';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.58,w*.28,h*.27,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#eff0eb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+w/2,y+h*.58,w*.30,.15,Math.PI*1.8);ctx.stroke();
    fill(x+w*.77,y+h*.22,5,h*.48,'#f0eee7',2);fill(x+w*.75,y+h*.18,9,6,'#8e918d',3);
    ctx.strokeStyle='#a9aaa5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+8,y+h-7);ctx.lineTo(x+w-8,y+h-7);ctx.stroke();
  }else if(label==='INSEL'){
    fill(x+12,y+18,w-24,h-12,'#666055',10);
    const stone=ctx.createLinearGradient(x,y,x+w,y+h);stone.addColorStop(0,'#eee8db');stone.addColorStop(.5,'#d2c9b8');stone.addColorStop(1,'#b9ae9c');
    fill(x,y+4,w,h*.45,stone,12);ctx.strokeStyle='#faf6ec';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+5,y+8,w-10,h*.45-8,9);ctx.stroke();
    for(let i=0;i<3;i++){const dx=x+14+i*(w-28)/3;fill(dx,y+h*.55,(w-35)/3,h*.34,'#d8d0c3',4);ctx.strokeStyle='#b6ac9d';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(dx+4,y+h*.59,(w-35)/3-8,h*.25,3);ctx.stroke();fill(dx+(w-35)/6-2,y+h*.70,4,4,'#777064',2)}
    fill(x+28,y+11,82,30,'#856748',4);fill(x+33,y+14,72,24,'#cfad78',3);
    ctx.strokeStyle='#6b5740';ctx.lineWidth=1;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(x+40+i*18,y+16);ctx.lineTo(x+40+i*18,y+34);ctx.stroke()}
    fill(x+w-69,y+11,42,29,'#f0eee5',20);ctx.fillStyle='#9f8063';ctx.beginPath();ctx.arc(x+w-48,y+25,5,0,Math.PI*2);ctx.fill();
  }else if(label==='ESSTISCH'){
    fill(x+19,y+25,w-38,h-38,'#644832',8);
    const wood=ctx.createLinearGradient(x,y,x,y+h);wood.addColorStop(0,'#bb8a58');wood.addColorStop(.5,'#9b6d45');wood.addColorStop(1,'#805537');
    fill(x+3,y+4,w-6,h-29,wood,12);ctx.strokeStyle='#d5ad79';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+8,y+8,w-16,h-38,8);ctx.stroke();
    for(let yy=y+17;yy<y+h-31;yy+=11){ctx.strokeStyle='#6c493044';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+15,yy);ctx.bezierCurveTo(x+w*.4,yy-2,x+w*.7,yy+2,x+w-15,yy);ctx.stroke()}
    const plate=(px,py)=>{ctx.fillStyle='#efe9dc';ctx.beginPath();ctx.ellipse(px,py,18,12,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b7a994';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(px,py,13,8,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#d0c5b2';ctx.beginPath();ctx.ellipse(px,py,8,4.5,0,0,Math.PI*2);ctx.stroke()};
    plate(x+w*.25,y+h*.39);plate(x+w*.75,y+h*.39);
    ctx.fillStyle='#faf5e9';for(const px of [x+w*.25,x+w*.75]){ctx.beginPath();ctx.arc(px,y+h*.69,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d0c6b6';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(px,y+h*.69,5,5,0,0,Math.PI*2);ctx.stroke()}
  }else if(label==='STUHL'){
    fill(x+8,y+5,w-16,h-10,'#684c34',8);fill(x+11,y+8,w-22,h*.58,'#ad8050',6);
    ctx.strokeStyle='#d4ad77';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+16,y+13);ctx.lineTo(x+w-16,y+13);ctx.moveTo(x+16,y+19);ctx.lineTo(x+w-16,y+19);ctx.stroke();
    fill(x+6,y+h*.63,w-12,h*.22,'#8f6741',5);
    ctx.strokeStyle='#59432f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+12,y+h*.78);ctx.lineTo(x+10,y+h-3);ctx.moveTo(x+w-12,y+h*.78);ctx.lineTo(x+w-10,y+h-3);ctx.stroke();
  }else if(label==='VORRAT'){
    fill(x,y,w,h,'#6d5540',8);fill(x+5,y+5,w-10,h-10,'#d4c7ae',5);
    ctx.fillStyle='#eee5d4';for(let shelf=0;shelf<2;shelf++){const sy=y+12+shelf*27;fill(x+8,sy,w-16,3,'#795a3e',1);for(let i=0;i<5;i++){const bx=x+15+i*(w-34)/5,bh=11+(i%2)*4;fill(bx,sy-bh,Math.max(9,(w-48)/5),bh,['#9a6345','#b69a64','#75846a','#ad6d56'][i%4],2);fill(bx+2,sy-bh+3,Math.max(5,(w-48)/5-4),2,'#ead9b9',1)}}
    fill(x+w*.43,y+h*.69,w*.14,5,'#8b6846',2);
  }
  ctx.restore();
}
function drawKitchenFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#f0eee7');wall.addColorStop(1,'#d5d0c5');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.strokeStyle='#aaa59a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,14);ctx.lineTo(worldW,14);ctx.moveTo(0,82);ctx.lineTo(worldW,82);ctx.stroke();
  for(let x=40;x<worldW;x+=135){ctx.strokeStyle='#c7c2b8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,81);ctx.stroke()}
  for(let x=27;x<worldW;x+=70){
    ctx.fillStyle='#8c9690';ctx.beginPath();ctx.arc(x,48,3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fffdf7';ctx.beginPath();ctx.arc(x-1,47,1.2,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#c8beb0';ctx.fillRect(0,floorTop-4,worldW,12);
  const tile=ctx.createLinearGradient(0,floorTop,worldW,floorBottom);tile.addColorStop(0,'#dedbd2');tile.addColorStop(.5,'#d3d0c6');tile.addColorStop(1,'#c5c2b9');
  ctx.fillStyle=tile;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let y=floorTop;y<floorBottom;y+=74){
    ctx.fillStyle='#ffffff18';ctx.fillRect(0,y,worldW,74);
    for(let x=0;x<worldW;x+=82){
      const inset=5,shade=(Math.floor(x/82)+Math.floor(y/74))%2?'#b8b6ae18':'#ffffff17';
      ctx.fillStyle=shade;roundRect(x+inset,y+inset,72,64,2);
      ctx.strokeStyle='#8f918b45';ctx.lineWidth=1;ctx.strokeRect(x+inset+.5,y+inset+.5,71,63);
      ctx.strokeStyle='#ffffff70';ctx.beginPath();ctx.moveTo(x+inset+3,y+inset+2);ctx.lineTo(x+inset+68,y+inset+2);ctx.moveTo(x+inset+2,y+inset+3);ctx.lineTo(x+inset+2,y+inset+60);ctx.stroke();
    }
  }
  const light=ctx.createRadialGradient(worldW*.48,worldH*.36,20,worldW*.48,worldH*.36,worldW*.55);light.addColorStop(0,'#fff5d51c');light.addColorStop(1,'#fff5d500');ctx.fillStyle=light;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  ctx.fillStyle='#eeeae1';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#85847e';ctx.fillRect(0,floorBottom,worldW,7);ctx.fillStyle='#f5f1e7';ctx.fillRect(0,floorBottom+7,worldW,8);
  ctx.strokeStyle='#9c999055';ctx.lineWidth=1;for(let x=32;x<worldW;x+=82){ctx.beginPath();ctx.moveTo(x,floorBottom+18);ctx.lineTo(x,floorBottom+43);ctx.stroke()}
  ctx.restore();
}
function drawHallwayFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#eee5d4');wall.addColorStop(1,'#cbbb9f');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#e8decb';ctx.fillRect(0,13,worldW,58);
  ctx.strokeStyle='#b49d7e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(worldW,15);ctx.moveTo(0,69);ctx.lineTo(worldW,69);ctx.stroke();
  for(let x=24;x<worldW;x+=160){ctx.strokeStyle='#b8a28455';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,17);ctx.lineTo(x,67);ctx.stroke()}
  const mx=worldW*.48,my=22,mw=92,mh=43;
  ctx.fillStyle='#5b4433';roundRect(mx-5,my-4,mw+10,mh+8,5);
  const mirror=ctx.createLinearGradient(mx,my,mx+mw,my+mh);mirror.addColorStop(0,'#b6c9c4');mirror.addColorStop(.48,'#e1e4db');mirror.addColorStop(1,'#96aaa8');
  ctx.fillStyle=mirror;roundRect(mx,my,mw,mh,3);
  ctx.strokeStyle='#efe1c5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx+6,my+5);ctx.lineTo(mx+mw-6,my+5);ctx.moveTo(mx+7,my+8);ctx.lineTo(mx+7,my+mh-7);ctx.stroke();
  ctx.fillStyle='#bda77f';ctx.beginPath();ctx.arc(mx+mw/2,my+mh+7,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#876b4d';ctx.fillRect(0,80,worldW,12);ctx.fillStyle='#e9dfcd';ctx.fillRect(0,82,worldW,7);

  const planks=ctx.createLinearGradient(0,floorTop,worldW,floorBottom);planks.addColorStop(0,'#b68c63');planks.addColorStop(.45,'#a87b53');planks.addColorStop(1,'#936a49');
  ctx.fillStyle=planks;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let row=0,y=floorTop+3;y<floorBottom;row++,y+=48){
    ctx.fillStyle=row%2?'#513a290b':'#f8d7a40d';ctx.fillRect(0,y,worldW,48);
    ctx.strokeStyle='#573e2e4c';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    const offset=row%2?72:0;
    for(let x=offset+72;x<worldW;x+=148){ctx.strokeStyle='#543b2c4d';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+48);ctx.stroke()}
    for(let plank=0,x=offset+38;x<worldW;x+=148,plank++){
      const gx=x+((row*23+plank*17)%36),gy=y+12+(plank%2)*17;
      ctx.strokeStyle='#68492f50';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(gx,gy);ctx.quadraticCurveTo(gx+16,gy-3,gx+34,gy);ctx.stroke();
      ctx.fillStyle='#5b402c55';ctx.beginPath();ctx.ellipse(gx+48,gy+8,1.4,.8,0,0,Math.PI*2);ctx.fill();
    }
  }
  const rugX=worldW*.38,rugY=145,rugW=worldW*.24,rugH=worldH*.62;
  ctx.fillStyle='#46332655';ctx.beginPath();ctx.ellipse(rugX+rugW/2,rugY+rugH/2+12,rugW*.65,rugH*.54,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#4f382d';roundRect(rugX-5,rugY-3,rugW+10,rugH+6,16);
  const rug=ctx.createLinearGradient(rugX,rugY,rugX+rugW,rugY+rugH);rug.addColorStop(0,'#7c5948');rug.addColorStop(.5,'#956e57');rug.addColorStop(1,'#74503f');
  ctx.fillStyle=rug;roundRect(rugX,rugY,rugW,rugH,13);
  ctx.save();ctx.beginPath();ctx.roundRect(rugX+18,rugY+18,rugW-36,rugH-36,8);ctx.clip();
  for(let y=rugY+18;y<rugY+rugH-12;y+=12){ctx.strokeStyle=y%2?'#e5c69b22':'#3f2c2526';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(rugX+15,y);ctx.lineTo(rugX+rugW-15,y);ctx.stroke()}
  for(let y=rugY+32;y<rugY+rugH-22;y+=62){
    ctx.strokeStyle='#e4c39a';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(rugX+rugW*.28,y);ctx.lineTo(rugX+rugW/2,y-15);ctx.lineTo(rugX+rugW*.72,y);ctx.lineTo(rugX+rugW/2,y+15);ctx.closePath();ctx.stroke();
    ctx.fillStyle='#d8b486';ctx.beginPath();ctx.arc(rugX+rugW/2,y,2.2,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle='#d9b98d';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(rugX+9,rugY+9,rugW-18,rugH-18,9);ctx.stroke();
  ctx.strokeStyle='#bc9168';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(rugX+15,rugY+15,rugW-30,rugH-30,6);ctx.stroke();
  for(let i=0;i<9;i++){
    const x=rugX+12+i*(rugW-24)/8;
    ctx.strokeStyle='#e1c39d';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,rugY+2);ctx.lineTo(x,rugY-4);ctx.moveTo(x,rugY+rugH-2);ctx.lineTo(x,rugY+rugH+4);ctx.stroke();
  }
  ctx.fillStyle='#e8ddc9';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#75583f';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#d1bea0';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.strokeStyle='#80634466';ctx.lineWidth=1;for(let x=30;x<worldW;x+=148){ctx.beginPath();ctx.moveTo(x,floorBottom+17);ctx.lineTo(x,floorBottom+42);ctx.stroke()}
  ctx.restore();
}
function drawStorageFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#d2d0c5');wall.addColorStop(1,'#a8aaa0');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#bbbcb1';ctx.fillRect(0,14,worldW,58);
  ctx.strokeStyle='#8d928a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(worldW,15);ctx.moveTo(0,72);ctx.lineTo(worldW,72);ctx.stroke();
  for(let x=36;x<worldW;x+=210){ctx.strokeStyle='#888e8644';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,17);ctx.lineTo(x,70);ctx.stroke()}
  ctx.fillStyle='#727a73';ctx.fillRect(0,80,worldW,12);ctx.fillStyle='#c4c4b8';ctx.fillRect(0,82,worldW,6);
  ctx.strokeStyle='#656e68';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(18,26);ctx.lineTo(worldW-18,26);ctx.lineTo(worldW-18,64);ctx.stroke();
  ctx.fillStyle='#777c73';roundRect(worldW*.78,31,47,31,4);
  ctx.fillStyle='#aeb3a5';roundRect(worldW*.78+4,35,39,23,2);
  ctx.fillStyle='#666d63';ctx.fillRect(worldW*.78+9,40,10,8);ctx.fillRect(worldW*.78+25,40,12,3);ctx.fillRect(worldW*.78+25,47,12,3);
  const concrete=ctx.createLinearGradient(0,floorTop,0,floorBottom);concrete.addColorStop(0,'#a6a69b');concrete.addColorStop(.5,'#92938a');concrete.addColorStop(1,'#85877f');
  ctx.fillStyle=concrete;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  const light=ctx.createRadialGradient(worldW*.52,worldH*.45,25,worldW*.52,worldH*.45,worldW*.5);
  light.addColorStop(0,'#dfddc522');light.addColorStop(1,'#3d433e20');ctx.fillStyle=light;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let row=0,y=floorTop; y<floorBottom; row++,y+=104){
    const offset=row%2?105:0;
    ctx.strokeStyle='#555b554d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=offset;x<worldW;x+=210){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+104);ctx.stroke()}
    for(let i=0;i<18;i++){
      const x=(row*137+i*193+47)%worldW,yy=y+14+(i*29)%78;
      ctx.fillStyle=i%3?'#e0dfd322':'#444a4430';ctx.beginPath();ctx.ellipse(x,yy,2+(i%3),1.2,((i%4)-2)*.12,0,Math.PI*2);ctx.fill();
    }
  }
  for(let i=0;i<9;i++){
    const x=worldW*.18+i*worldW*.08,y=floorTop+80+(i%3)*35;
    ctx.strokeStyle='#55594e24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+16,y+3,x+31,y-1);ctx.stroke();
  }
  const drainX=worldW*.52,drainY=floorBottom-62;
  ctx.fillStyle='#565b55';ctx.beginPath();ctx.ellipse(drainX,drainY,27,18,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#9b9e93';ctx.beginPath();ctx.ellipse(drainX,drainY-2,21,12,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#666c65';ctx.lineWidth=2;
  for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(drainX-13,drainY+i*4);ctx.lineTo(drainX+13,drainY+i*4);ctx.stroke()}
  ctx.fillStyle='#d0cec1';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#656d66';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#b6b8ad';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawRoomFurniture(o){
  if(currentMap==='living'){drawLivingFurniture(o);return}
  if(currentMap==='kitchen'){drawKitchenFurniture(o);return}
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
    storage:{dark:'#3e443e',mid:'#697065',top:'#aa936e',light:'#d3c29e',cloth:'#718078',metal:'#aeb2a2',green:'#77815f',soil:'#66523c'},
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
  }else if(label==='ESSTISCH'&&currentMap==='dining'){
    ctx.fillStyle='#30291f45';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2+13,w*.52,h*.52,.02,0,Math.PI*2);ctx.fill();
    for(const [lx,ly] of [[x+18,y+18],[x+w-34,y+18],[x+18,y+h-34],[x+w-34,y+h-34]])fill(lx,ly,16,18,p.dark,4);
    fill(x+7,y+7,w-14,h-14,p.dark,15);
    const tabletop=ctx.createLinearGradient(x,y,x+w,y+h);tabletop.addColorStop(0,'#c18d5b');tabletop.addColorStop(.5,'#ad794a');tabletop.addColorStop(1,'#91623c');
    ctx.fillStyle=tabletop;roundRect(x+13,y+13,w-26,h-26,12);
    for(let i=0;i<7;i++){const yy=y+24+i*(h-48)/6;ctx.strokeStyle=i%2?'#f1c78a35':'#57382045';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x+22,yy);ctx.quadraticCurveTo(x+w*.5,yy-2,x+w-22,yy);ctx.stroke()}
    fill(x+w*.45,y+20,w*.10,h-40,'#eee0c5',8);
    for(const [px,py] of [[x+w*.27,y+h*.27],[x+w*.73,y+h*.27],[x+w*.27,y+h*.73],[x+w*.73,y+h*.73]]){
      ctx.fillStyle='#614731';ctx.beginPath();ctx.ellipse(px+2,py+3,w*.071,h*.104,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#d4c6ae';ctx.beginPath();ctx.ellipse(px,py,w*.071,h*.104,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#a57a4e';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,py,w*.058,h*.084,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#f4eddd';ctx.beginPath();ctx.ellipse(px,py,w*.047,h*.068,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b78b58';ctx.beginPath();ctx.ellipse(px,py,w*.025,h*.035,0,0,Math.PI*2);ctx.fill();
    }
    fill(x+w*.47,y+h*.44,w*.06,8,'#f1e4cd',4);
    ctx.fillStyle='#73905c';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.46,12,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#d79b6b';ctx.beginPath();ctx.moveTo(x+w/2-9,y+h*.43);ctx.lineTo(x+w/2-6,y+h*.35);ctx.lineTo(x+w/2+6,y+h*.35);ctx.lineTo(x+w/2+9,y+h*.43);ctx.closePath();ctx.fill();
  }else if(label==='GARTENTISCH'){
    ctx.fillStyle='#30291f40';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.56+9,w*.48,h*.42,0,0,Math.PI*2);ctx.fill();
    fill(x+24,y+25,18,h-45,p.dark,5);fill(x+w-42,y+25,18,h-45,p.dark,5);
    fill(x+8,y+8,w-16,h-16,p.dark,13);
    const top=ctx.createLinearGradient(x,y,x+w,y+h);top.addColorStop(0,'#bc9162');top.addColorStop(.52,'#a7794d');top.addColorStop(1,'#875d3d');
    ctx.fillStyle=top;roundRect(x+14,y+14,w-28,h-28,10);
    for(let i=0;i<6;i++){const yy=y+25+i*(h-50)/5;ctx.strokeStyle=i%2?'#f1d1a044':'#573c2b44';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+22,yy);ctx.quadraticCurveTo(x+w*.5,yy+2,x+w-22,yy);ctx.stroke()}
    fill(x+w*.41,y+h*.40,w*.18,h*.20,'#d8c7a0',7);
    ctx.fillStyle='#587d43';ctx.beginPath();ctx.ellipse(x+w/2,y+h*.45,w*.055,h*.07,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#84a653';ctx.beginPath();ctx.ellipse(x+w*.47,y+h*.38,w*.04,h*.08,-.5,0,Math.PI*2);ctx.ellipse(x+w*.54,y+h*.38,w*.04,h*.08,.5,0,Math.PI*2);ctx.fill();
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
      if(label==='GARDEROBE'&&currentMap==='hallway'){
        const coatColors=['#697b70','#9a5547','#d2a85f'];
        for(let i=0;i<3;i++){
          const hx=x+43+i*((w-86)/2),hy=y+35;
          ctx.strokeStyle=p.metal;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hy-13);ctx.quadraticCurveTo(hx,hy-20,hx+5,hy-20);ctx.quadraticCurveTo(hx+10,hy-20,hx+10,hy-14);ctx.stroke();
          ctx.strokeStyle='#e5d0aa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx-5,hy-13);ctx.lineTo(hx+15,hy-13);ctx.stroke();
          ctx.fillStyle=coatColors[i];ctx.beginPath();ctx.moveTo(hx-5,hy-12);ctx.lineTo(hx-10,hy-7);ctx.lineTo(hx-7,hy-3);ctx.lineTo(hx-5,hy+17);ctx.quadraticCurveTo(hx+5,hy+21,hx+15,hy+17);ctx.lineTo(hx+15,hy-3);ctx.lineTo(hx+19,hy-7);ctx.lineTo(hx+15,hy-12);ctx.lineTo(hx+10,hy-8);ctx.lineTo(hx+5,hy-12);ctx.closePath();ctx.fill();
          ctx.strokeStyle='#f0d9b577';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(hx+2,hy-7);ctx.lineTo(hx+2,hy+14);ctx.moveTo(hx+8,hy-7);ctx.lineTo(hx+8,hy+14);ctx.stroke();
        }
        fill(x+10,y+h-14,w-20,6,p.dark,3);
      }
      if(label==='VITRINE'){
        ctx.strokeStyle='#d9e7d8';ctx.lineWidth=2;ctx.strokeRect(x+12,y+12,w-24,h-24);
        ctx.fillStyle=p.light;ctx.beginPath();ctx.arc(x+w*.3,y+h*.35,5,0,Math.PI*2);ctx.arc(x+w*.65,y+h*.35,5,0,Math.PI*2);ctx.fill();
      }
    }
  }
  ctx.restore();
}
function drawBathroomFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#f0eee3');wall.addColorStop(1,'#c6d1cd');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#d8e0dc';ctx.fillRect(0,59,worldW,33);
  ctx.strokeStyle='#aab8b3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,60);ctx.lineTo(worldW,60);ctx.moveTo(0,90);ctx.lineTo(worldW,90);ctx.stroke();
  for(let x=0;x<worldW;x+=82){ctx.strokeStyle='#ffffff4a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,59);ctx.stroke()}
  const tiles=ctx.createLinearGradient(0,floorTop,worldW,floorBottom);tiles.addColorStop(0,'#dce4df');tiles.addColorStop(.55,'#c5d2cf');tiles.addColorStop(1,'#b4c4c1');
  ctx.fillStyle=tiles;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let y=floorTop;y<floorBottom;y+=82){
    ctx.fillStyle='#f5f5ed22';ctx.fillRect(0,y,worldW,41);
    ctx.strokeStyle='#788f8d66';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=(Math.floor((y-floorTop)/82)%2)*41;x<worldW;x+=82){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+82);ctx.stroke()}
    for(let x=41;x<worldW;x+=164){
      ctx.fillStyle='#ffffff32';ctx.beginPath();ctx.arc(x+((y-floorTop)%164),y+12,2.5,0,Math.PI*2);ctx.fill();
    }
  }
  const matX=worldW*.40,matY=worldH*.72,matW=worldW*.20,matH=70;
  ctx.fillStyle='#465b5940';ctx.beginPath();ctx.ellipse(matX+matW/2,matY+matH/2+8,matW*.62,matH*.55,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#526e6c';roundRect(matX-4,matY-3,matW+8,matH+6,12);
  const mat=ctx.createLinearGradient(matX,matY,matX+matW,matY+matH);mat.addColorStop(0,'#8daaa5');mat.addColorStop(.5,'#b2c5bb');mat.addColorStop(1,'#78938e');
  ctx.fillStyle=mat;roundRect(matX,matY,matW,matH,10);
  ctx.strokeStyle='#e3e8dc';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(matX+9,matY+9,matW-18,matH-18,7);ctx.stroke();
  for(let y=matY+17;y<matY+matH-8;y+=9){ctx.strokeStyle='#ffffff35';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(matX+14,y);ctx.lineTo(matX+matW-14,y);ctx.stroke()}
  ctx.fillStyle='#e2e5dc';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#718580';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#becbc4';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawBedroomFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#eee5d7');wall.addColorStop(1,'#cbbb9f');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#e7ddcc';ctx.fillRect(0,14,worldW,60);
  ctx.strokeStyle='#ad987e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(worldW,15);ctx.moveTo(0,73);ctx.lineTo(worldW,73);ctx.stroke();
  for(let x=32;x<worldW;x+=190){ctx.strokeStyle='#b39d8040';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,17);ctx.lineTo(x,71);ctx.stroke()}
  ctx.fillStyle='#634d3c';ctx.fillRect(0,82,worldW,10);ctx.fillStyle='#e2d4be';ctx.fillRect(0,84,worldW,5);
  const boards=ctx.createLinearGradient(0,floorTop,worldW,floorBottom);boards.addColorStop(0,'#c19a70');boards.addColorStop(.5,'#ae845e');boards.addColorStop(1,'#9b7554');
  ctx.fillStyle=boards;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let row=0,y=floorTop; y<floorBottom; row++,y+=54){
    ctx.fillStyle=row%2?'#4a33230a':'#ffe2b20d';ctx.fillRect(0,y,worldW,54);
    ctx.strokeStyle='#60483250';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=row%2?80:0;x<worldW;x+=168){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+54);ctx.stroke()}
    for(let i=0;i<11;i++){
      const x=(row*173+i*211+63)%worldW,yy=y+12+(i*23)%34;
      ctx.strokeStyle='#694b3450';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy);ctx.quadraticCurveTo(x+18,yy-2,x+34,yy);ctx.stroke();
    }
  }
  const x=worldW*.32,y=worldH*.31,w=worldW*.36,h=worldH*.46;
  ctx.fillStyle='#49362c48';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2+12,w*.60,h*.57,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#54403c';roundRect(x-5,y-3,w+10,h+6,18);
  const rug=ctx.createLinearGradient(x,y,x+w,y+h);rug.addColorStop(0,'#86646a');rug.addColorStop(.5,'#a47b78');rug.addColorStop(1,'#75545c');
  ctx.fillStyle=rug;roundRect(x,y,w,h,15);
  ctx.save();ctx.beginPath();ctx.roundRect(x+26,y+26,w-52,h-52,10);ctx.clip();
  for(let yy=y+25;yy<y+h-15;yy+=14){ctx.strokeStyle=yy%2?'#f2d9bd22':'#45343e2a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+15,yy);ctx.lineTo(x+w-15,yy);ctx.stroke()}
  for(let yy=y+48;yy<y+h-35;yy+=76){
    ctx.strokeStyle='#e9cba6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+w/2,yy-19);ctx.lineTo(x+w*.67,yy);ctx.lineTo(x+w/2,yy+19);ctx.lineTo(x+w*.33,yy);ctx.closePath();ctx.stroke();
    ctx.fillStyle='#e7c59f';ctx.beginPath();ctx.arc(x+w/2,yy,3,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle='#ddbe99';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(x+10,y+10,w-20,h-20,11);ctx.stroke();
  ctx.fillStyle='#e2d8c6';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#69523f';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#c1ad91';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawDiningFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#f0e6d6');wall.addColorStop(1,'#cfbea3');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#e6d8c1';ctx.fillRect(0,14,worldW,57);
  ctx.strokeStyle='#ad9271';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(worldW,15);ctx.moveTo(0,70);ctx.lineTo(worldW,70);ctx.stroke();
  for(let x=25;x<worldW;x+=175){ctx.strokeStyle='#a4876540';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,17);ctx.lineTo(x,68);ctx.stroke()}
  ctx.fillStyle='#705239';ctx.fillRect(0,81,worldW,11);ctx.fillStyle='#e4d5bc';ctx.fillRect(0,83,worldW,5);
  const boards=ctx.createLinearGradient(0,floorTop,0,floorBottom);boards.addColorStop(0,'#c59b6b');boards.addColorStop(.5,'#ad8053');boards.addColorStop(1,'#976c46');
  ctx.fillStyle=boards;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let row=0,y=floorTop; y<floorBottom; row++,y+=58){
    ctx.fillStyle=row%2?'#5138210b':'#ffdda40e';ctx.fillRect(0,y,worldW,58);
    ctx.strokeStyle='#593e2955';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=row%2?84:0;x<worldW;x+=176){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+58);ctx.stroke()}
    for(let i=0;i<9;i++){const x=(row*119+i*239+38)%worldW,yy=y+20+(i*17)%24;ctx.strokeStyle='#6b492d40';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy);ctx.quadraticCurveTo(x+14,yy-2,x+29,yy);ctx.stroke()}
  }
  const x=worldW*.25,y=worldH*.30,w=worldW*.50,h=worldH*.42;
  ctx.fillStyle='#46322445';ctx.beginPath();ctx.ellipse(x+w/2,y+h/2+12,w*.58,h*.56,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#63452f';roundRect(x-5,y-3,w+10,h+6,20);
  const rug=ctx.createLinearGradient(x,y,x+w,y+h);rug.addColorStop(0,'#805e49');rug.addColorStop(.5,'#a17a5b');rug.addColorStop(1,'#78553f');
  ctx.fillStyle=rug;roundRect(x,y,w,h,16);
  ctx.save();ctx.beginPath();ctx.roundRect(x+22,y+22,w-44,h-44,10);ctx.clip();
  ctx.strokeStyle='#e3c69e';ctx.lineWidth=2;ctx.beginPath();
  for(let i=-h;i<w;i+=26){ctx.moveTo(x+i,y);ctx.lineTo(x+i+h,y+h);ctx.moveTo(x+i,y+h);ctx.lineTo(x+i+h,y)}
  ctx.stroke();ctx.restore();
  ctx.strokeStyle='#e4c69a';ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(x+9,y+9,w-18,h-18,12);ctx.stroke();
  ctx.strokeStyle='#c79e70';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(x+16,y+16,w-32,h-32,9);ctx.stroke();
  ctx.fillStyle='#e4d7c4';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#71543b';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#c7b496';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawAtticFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#e1d1b6');wall.addColorStop(1,'#a98c68');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#76583e';ctx.beginPath();ctx.moveTo(0,91);ctx.lineTo(worldW*.5,12);ctx.lineTo(worldW,91);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#4d3928';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(0,88);ctx.lineTo(worldW*.5,10);ctx.lineTo(worldW,88);ctx.stroke();
  ctx.strokeStyle='#c5a77c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,85);ctx.lineTo(worldW*.5,18);ctx.lineTo(worldW,85);ctx.stroke();
  for(let i=1;i<7;i++){const x=worldW*i/8;ctx.strokeStyle='#674d344d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,88);ctx.lineTo(x,Math.max(22,88-Math.min(x,worldW-x)*.16));ctx.stroke()}
  const boards=ctx.createLinearGradient(0,floorTop,worldW,floorBottom);boards.addColorStop(0,'#b18b5f');boards.addColorStop(.5,'#9a744e');boards.addColorStop(1,'#815f41');
  ctx.fillStyle=boards;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let row=0,y=floorTop; y<floorBottom; row++,y+=53){
    ctx.fillStyle=row%2?'#412e1f12':'#f8d6a10d';ctx.fillRect(0,y,worldW,53);
    ctx.strokeStyle='#4e39284f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=row%2?78:0;x<worldW;x+=158){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+53);ctx.stroke()}
    for(let i=0;i<12;i++){const x=(row*143+i*181+29)%worldW,yy=y+10+(i*19)%37;ctx.strokeStyle='#513a2755';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy);ctx.quadraticCurveTo(x+14,yy-3,x+30,yy);ctx.stroke()}
  }
  for(let x=50;x<worldW;x+=240){
    ctx.fillStyle='#5a432c';ctx.fillRect(x,floorTop,13,floorBottom-floorTop);
    ctx.fillStyle='#c09b6d';ctx.fillRect(x+3,floorTop,5,floorBottom-floorTop);
  }
  ctx.fillStyle='#ded0b9';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#58422e';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#b59a73';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawCellarFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#a9aaa3');wall.addColorStop(1,'#626a66');
  ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
  for(let row=0,y=0;y<92;row++,y+=30){
    const offset=row%2?55:0;
    ctx.strokeStyle='#414a466c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=offset;x<worldW;x+=110){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+30);ctx.stroke()}
  }
  ctx.strokeStyle='#333d39';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(15,24);ctx.lineTo(worldW-15,24);ctx.moveTo(worldW*.82,24);ctx.lineTo(worldW*.82,86);ctx.stroke();
  ctx.strokeStyle='#89908a';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(15,21);ctx.lineTo(worldW-15,21);ctx.moveTo(worldW*.82,21);ctx.lineTo(worldW*.82,84);ctx.stroke();
  ctx.fillStyle='#858a80';roundRect(worldW*.18,34,82,20,6);ctx.fillStyle='#d0c39d';roundRect(worldW*.18+7,39,68,10,3);
  const stone=ctx.createLinearGradient(0,floorTop,0,floorBottom);stone.addColorStop(0,'#989b93');stone.addColorStop(.5,'#858982');stone.addColorStop(1,'#70766f');
  ctx.fillStyle=stone;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  for(let row=0,y=floorTop; y<floorBottom; row++,y+=58){
    const offset=row%2?62:0;
    ctx.strokeStyle='#424a4559';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
    for(let x=offset;x<worldW;x+=124){
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+58);ctx.stroke();
      ctx.fillStyle=(row+x/124)%2?'#d5d5ca14':'#292f2c18';ctx.beginPath();ctx.ellipse(x+34,y+19,7,3,.2,0,Math.PI*2);ctx.fill();
    }
  }
  const damp=ctx.createRadialGradient(worldW*.53,floorBottom*.72,12,worldW*.53,floorBottom*.72,worldW*.36);
  damp.addColorStop(0,'#c0c4ad26');damp.addColorStop(1,'#272e2b1c');ctx.fillStyle=damp;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
  ctx.fillStyle='#b9b9af';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#404945';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#858980';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawGardenFloorDetails(){
  const floorTop=92,floorBottom=worldH-113;
  ctx.save();
  const grass=ctx.createLinearGradient(0,0,worldW,floorBottom);grass.addColorStop(0,'#b8c486');grass.addColorStop(.45,'#89a45d');grass.addColorStop(1,'#718c4e');
  ctx.fillStyle=grass;ctx.fillRect(0,0,worldW,worldH);
  ctx.fillStyle='#d7d0b4';ctx.fillRect(0,0,worldW,92);
  ctx.fillStyle='#9d9274';ctx.fillRect(0,76,worldW,16);
  ctx.strokeStyle='#5e7146';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,91);ctx.lineTo(worldW,91);ctx.stroke();
  for(let i=0;i<190;i++){
    const x=(i*197+53)%worldW,y=floorTop+((i*131+29)%(floorBottom-floorTop));
    const color=i%4===0?'#e2d6a655':(i%3===0?'#455d3535':'#f2e8c52a');
    ctx.strokeStyle=color;ctx.lineWidth=i%5===0?2:1;
    ctx.beginPath();ctx.moveTo(x,y+4);ctx.quadraticCurveTo(x+((i%7)-3),y-2,x+((i%9)-4),y-7);ctx.stroke();
  }
  for(let y=floorTop+22;y<floorBottom-15;y+=118){
    for(let x=65+(Math.floor(y/118)%2)*55;x<worldW-30;x+=170){
      const r=7+(Math.floor(x+y)%5);
      ctx.fillStyle='#50683b24';ctx.beginPath();ctx.ellipse(x+3,y+5,r+4,r*.7,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#c4cb8b35';ctx.beginPath();ctx.ellipse(x,y,r,r*.55,-.15,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.strokeStyle='#dfd2a055';ctx.lineWidth=3;ctx.beginPath();
  for(let y=floorTop+40;y<floorBottom-30;y+=70){
    const x=worldW*.51+(Math.floor(y/70)%2?26:-26);
    ctx.ellipse(x,y,19,11,-.2,0,Math.PI*2);
  }
  ctx.stroke();
  ctx.fillStyle='#ded6bc';ctx.fillRect(0,floorBottom,worldW,worldH-floorBottom);ctx.fillStyle='#526344';ctx.fillRect(0,floorBottom,worldW,8);ctx.fillStyle='#a9a17d';ctx.fillRect(0,floorBottom+8,worldW,7);
  ctx.restore();
}
function drawRoomFloorDetails(){
  if(currentMap==='bathroom'){drawBathroomFloorDetails();return}
  if(currentMap==='bedroom'){drawBedroomFloorDetails();return}
  if(currentMap==='dining'){drawDiningFloorDetails();return}
  if(currentMap==='attic'){drawAtticFloorDetails();return}
  if(currentMap==='cellar'){drawCellarFloorDetails();return}
  if(currentMap==='garden'){drawGardenFloorDetails();return}
  if(currentMap==='carnival'){
    ctx.save();
    const floorTop=92,floorBottom=worldH-113;
    const wall=ctx.createLinearGradient(0,0,0,92);wall.addColorStop(0,'#50365f');wall.addColorStop(1,'#302344');
    ctx.fillStyle=wall;ctx.fillRect(0,0,worldW,92);
    ctx.fillStyle='#684663';ctx.fillRect(0,15,worldW,56);
    for(let x=24;x<worldW;x+=150){ctx.strokeStyle='#f2ce7650';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,17);ctx.lineTo(x,69);ctx.stroke()}
    ctx.strokeStyle='#efbf4f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,15);ctx.lineTo(worldW,15);ctx.moveTo(0,70);ctx.lineTo(worldW,70);ctx.stroke();
    const boards=ctx.createLinearGradient(0,floorTop,0,floorBottom);boards.addColorStop(0,'#a7775e');boards.addColorStop(.5,'#8d5e4e');boards.addColorStop(1,'#754b43');
    ctx.fillStyle=boards;ctx.fillRect(0,floorTop,worldW,floorBottom-floorTop);
    for(let row=0,y=floorTop; y<floorBottom; row++,y+=56){
      ctx.fillStyle=row%2?'#3a21300d':'#ffe0a00d';ctx.fillRect(0,y,worldW,56);
      ctx.strokeStyle='#472d315c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(worldW,y);ctx.stroke();
      for(let x=row%2?85:0;x<worldW;x+=172){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+56);ctx.stroke()}
      for(let i=0;i<8;i++){const x=(row*137+i*223+51)%worldW,yy=y+14+(i*27)%35;ctx.strokeStyle='#522f2d66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,yy);ctx.quadraticCurveTo(x+15,yy-2,x+31,yy);ctx.stroke()}
    }
    // A softly lit parade route and gold edging frame the dance floor.
    ctx.strokeStyle='#edc66b26';ctx.lineWidth=38;ctx.beginPath();ctx.roundRect(worldW*.12,worldH*.24,worldW*.76,worldH*.53,92);ctx.stroke();
    ctx.strokeStyle='#f4d27c88';ctx.lineWidth=3;ctx.setLineDash([15,13]);ctx.beginPath();ctx.roundRect(worldW*.12,worldH*.24,worldW*.76,worldH*.53,92);ctx.stroke();ctx.setLineDash([]);
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
    drawPuffCloud('#e96742','#8e3442');
    ctx.fillStyle='#ffd36a';ctx.beginPath();ctx.moveTo(-15,9);ctx.quadraticCurveTo(-11,1,-15,-5);ctx.quadraticCurveTo(-5,0,-7,9);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff0b0';ctx.beginPath();ctx.moveTo(-5,7);ctx.quadraticCurveTo(0,0,-2,-7);ctx.quadraticCurveTo(7,0,3,8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#c9f2f3';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,-4);ctx.lineTo(22,-9);ctx.moveTo(13,3);ctx.lineTo(25,3);ctx.stroke();drawSparkle(20,-13,4,'#fff2a6');
  }else if(animal==='deepSeaMole'){
    drawPuffCloud('#577d9b','#344d70');
    ctx.strokeStyle='#c5f5f0';ctx.lineWidth=1.6;
    for(const [x,y,r] of [[-14,-9,3],[9,-11,4],[17,5,2.5],[-8,10,2]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke()}
    ctx.fillStyle='#f5d76e';ctx.beginPath();ctx.arc(-17,-1,2,0,Math.PI*2);ctx.arc(3,8,1.7,0,Math.PI*2);ctx.fill();
  }else if(animal==='demonRat'){
    drawPuffCloud('#662d5b','#321d3d');
    ctx.fillStyle='#ed633f';ctx.beginPath();ctx.moveTo(-18,8);ctx.quadraticCurveTo(-12,-2,-15,-10);ctx.quadraticCurveTo(-4,-3,-8,8);ctx.moveTo(7,9);ctx.quadraticCurveTo(15,-1,12,-10);ctx.quadraticCurveTo(23,-3,17,9);ctx.fill();
    drawSparkle(-9,-9,3,'#ffce59');drawSparkle(12,-8,3,'#ffce59');ctx.fillStyle='#f6b64c';ctx.beginPath();ctx.arc(0,1,2,0,Math.PI*2);ctx.fill();
  }else if(animal==='furnitureOctopus'){
    drawPuffCloud('#b9855e','#72503f');
    ctx.strokeStyle='#efd0a1';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-17,-7);ctx.lineTo(-5,-3);ctx.lineTo(2,-10);ctx.moveTo(-7,7);ctx.lineTo(1,0);ctx.lineTo(14,4);ctx.stroke();
    ctx.fillStyle='#f4d56c';ctx.beginPath();ctx.moveTo(12,-13);ctx.lineTo(8,-4);ctx.lineTo(17,-8);ctx.closePath();ctx.fill();ctx.fillStyle='#f3e8cb';ctx.fillRect(-16,5,6,5);
  }else if(animal==='discoCrab'){
    drawPuffCloud('#db3976','#76285f');
    for(const [x,y,color] of [[-15,-10,'#ffda55'],[-2,-13,'#73e2dd'],[12,-9,'#a98bff'],[18,5,'#fff0a6'],[-10,11,'#80e58b']]){
      ctx.save();ctx.translate(x,y);ctx.rotate((x+y)*.03);ctx.fillStyle=color;ctx.fillRect(-2.3,-4,4.6,8);ctx.restore();
    }
    drawSparkle(-21,-4,4,'#fff2a6');drawSparkle(5,11,3,'#f4f4ff');
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
  else if(currentMap==='kitchen')drawKitchenFloorDetails();
  else if(currentMap==='hallway')drawHallwayFloorDetails();
  else if(currentMap==='storage')drawStorageFloorDetails();
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
renderDailyChallenges();
setInterval(()=>{
  if(!playing&&!menu.classList.contains('hidden')&&ensureDailyChallengeDay(getLocalDateKey()))renderDailyChallenges();
},30_000);
document.getElementById('classicMode').onclick=()=>setGameMode('classic');
document.getElementById('timedMode').onclick=()=>setGameMode('timed');
document.getElementById('start').onclick=start;document.getElementById('again').onclick=start;
document.getElementById('openRatSkins').addEventListener('click',()=>{refreshCollectionUnlocks();renderRatSkinPicker();document.getElementById('skinModal').classList.remove('hidden')});
document.getElementById('closeSkinModal').addEventListener('click',()=>document.getElementById('skinModal').classList.add('hidden'));
document.getElementById('openCollections').addEventListener('click',()=>{renderCollectionBook();document.getElementById('collectionModal').classList.remove('hidden')});
document.getElementById('closeCollections').addEventListener('click',()=>document.getElementById('collectionModal').classList.add('hidden'));
document.getElementById('openAchievements').addEventListener('click',openAchievementModal);
document.getElementById('closeAchievements').addEventListener('click',closeAchievementModal);
const tutorialDialog=document.getElementById('tutorialDialog');
function openTutorial(){
  if(!tutorialDialog.open)tutorialDialog.showModal();
}
function closeTutorial(){
  if(tutorialDialog.open)tutorialDialog.close();
}
document.getElementById('openTutorial').addEventListener('click',openTutorial);
document.getElementById('closeTutorial').addEventListener('click',closeTutorial);
document.getElementById('closeTutorialAction').addEventListener('click',closeTutorial);
tutorialDialog.addEventListener('close',()=>writeStoredValue(TUTORIAL_SEEN_KEY,'true'));
if(readStoredValue(TUTORIAL_SEEN_KEY)!=='true')openTutorial();
function setJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,max=48,d=Math.hypot(dx,dy)||1;if(d>max){dx=dx/d*max;dy=dy/d*max}knob.style.transform=`translate(${dx}px,${dy}px)`;keys.x=dx/max;keys.y=dy/max}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(joyId);setJoy(e)});joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)setJoy(e)});function resetJoy(){joyId=null;knob.style.transform='translate(0,0)';keys.x=0;keys.y=0}joy.addEventListener('pointerup',resetJoy);joy.addEventListener('pointercancel',resetJoy);function triggerBoost(){
  if(playing&&!paused)recordAchievementProgress('boostUses');
  if(playing&&gameMode==='classic')dailyRunStats.usedBoost=true;
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
  ensureDailyChallengeDay(getLocalDateKey());
  renderDailyChallenges();
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
