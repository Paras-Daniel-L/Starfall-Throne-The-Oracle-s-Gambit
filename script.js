// ─────────────────────────────────────────────
// CARD RULES — FIXED: Ace beats King, King does NOT beat Ace
// Power cycle: Ace > King > Queen/Jack, Queen > Jack/Ace, Jack > Ace
// ─────────────────────────────────────────────
const CARDS = {
  king:  {name:'King',  sym:'♚', mana:6, dmg:75,  color:'var(--kc)', beats:['queen','jack']},
  queen: {name:'Queen', sym:'♛', mana:4, dmg:100, color:'var(--qc)', beats:['jack','ace']},
  jack:  {name:'Jack',  sym:'♞', mana:3, dmg:125, color:'var(--jc)', beats:['ace']},
  ace:   {name:'Ace',   sym:'✦', mana:2, dmg:150, color:'var(--ac)', beats:['king']},
};
const TYPES=['king','queen','jack','ace'];
const ORIG={king:3,queen:3,jack:2,ace:2};
const MAX_HP=500,MAX_R=15,PASS_DMG=50,MANA_START=5,MANA_INC=3,MANA_CAP=10;

// ─────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────
(function makeStars(){
  const c=document.getElementById('stars');
  for(let i=0;i<100;i++){
    const s=document.createElement('div');s.className='star';
    const sz=Math.random()*2+.5;
    s.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${2+Math.random()*4}s;--a1:${.1+Math.random()*.3};--a2:${.5+Math.random()*.5};`;
    c.appendChild(s);
  }
})();

// ─────────────────────────────────────────────
// MUSIC — Energetic battlefield theme (Web Audio API)
// ─────────────────────────────────────────────
let audioCtx=null, musicGain=null, musicOn=false, scheduledNodes=[], drumInterval=null;

function initAudio(){
  if(audioCtx) return;
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  musicGain=audioCtx.createGain();
  musicGain.gain.value=0.12;
  musicGain.connect(audioCtx.destination);
  startBattleMusic();
}

function startBattleMusic(){
  if(!audioCtx) return;
  stopBattleMusic();

  // ─ Bass pulse (driving rhythm)
  const bassNotes=[65.4,73.4,82.4,87.3]; // C2,D2,E2,F2
  let bassStep=0;
  const bassInterval=setInterval(()=>{
    if(!musicOn){clearInterval(bassInterval);return;}
    const freq=bassNotes[bassStep%bassNotes.length];
    bassStep++;
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    const dist=audioCtx.createWaveShaper();
    // Soft distortion for gritty bass
    const curve=new Float32Array(256);
    for(let i=0;i<256;i++){const x=i*2/256-1;curve[i]=x*(3+4*Math.abs(x))/(1+4*Math.abs(x));}
    dist.curve=curve;
    o.type='sawtooth';o.frequency.value=freq;
    g.gain.setValueAtTime(0,audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.28,audioCtx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.35);
    o.connect(dist);dist.connect(g);g.connect(musicGain);
    o.start();o.stop(audioCtx.currentTime+0.4);
    scheduledNodes.push(o,g);
  },380);
  scheduledNodes.push({stop:()=>clearInterval(bassInterval)});

  // ─ Melody / horn stabs
  const melody=[523,587,659,698,784,659,587,523,440,493,523,587];
  let mStep=0;
  const melInterval=setInterval(()=>{
    if(!musicOn){clearInterval(melInterval);return;}
    // Skip some notes for syncopation
    if(Math.random()<0.25){mStep++;return;}
    const freq=melody[mStep%melody.length];
    mStep++;
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    o.type='square';o.frequency.value=freq;
    g.gain.setValueAtTime(0,audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.06,audioCtx.currentTime+0.03);
    g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.28);
    o.connect(g);g.connect(musicGain);
    o.start();o.stop(audioCtx.currentTime+0.3);
    scheduledNodes.push(o,g);
  },320);
  scheduledNodes.push({stop:()=>clearInterval(melInterval)});

  // ─ War drum (kick + snare pattern)
  let drumBeat=0;
  drumInterval=setInterval(()=>{
    if(!musicOn){clearInterval(drumInterval);return;}
    const beat=drumBeat%8;
    drumBeat++;
    // Kick on beats 0,4
    if(beat===0||beat===4){
      const o=audioCtx.createOscillator();
      const g=audioCtx.createGain();
      o.type='sine';
      o.frequency.setValueAtTime(140,audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(30,audioCtx.currentTime+0.2);
      g.gain.setValueAtTime(0.5,audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.22);
      o.connect(g);g.connect(musicGain);
      o.start();o.stop(audioCtx.currentTime+0.25);
    }
    // Snare on beats 2,6
    if(beat===2||beat===6){
      const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.18,audioCtx.sampleRate);
      const data=buf.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
      const src=audioCtx.createBufferSource();
      const g=audioCtx.createGain();
      const filt=audioCtx.createBiquadFilter();
      filt.type='highpass';filt.frequency.value=1200;
      src.buffer=buf;
      g.gain.setValueAtTime(0.18,audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.18);
      src.connect(filt);filt.connect(g);g.connect(musicGain);
      src.start();src.stop(audioCtx.currentTime+0.2);
    }
    // Hi-hat on every beat
    {
      const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*0.04,audioCtx.sampleRate);
      const data=buf.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
      const src=audioCtx.createBufferSource();
      const g=audioCtx.createGain();
      const filt=audioCtx.createBiquadFilter();
      filt.type='highpass';filt.frequency.value=8000;
      src.buffer=buf;
      g.gain.setValueAtTime(0.06,audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.04);
      src.connect(filt);filt.connect(g);g.connect(musicGain);
      src.start();src.stop(audioCtx.currentTime+0.05);
    }
  },190); // ~158 BPM 16th notes
  scheduledNodes.push({stop:()=>clearInterval(drumInterval)});

  // ─ Sustained brass pad
  const padFreqs=[130.8,164.8,196];
  padFreqs.forEach((f,i)=>{
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    const lfo=audioCtx.createOscillator();
    const lfoG=audioCtx.createGain();
    o.type='sawtooth';o.frequency.value=f;
    g.gain.value=0.04-i*0.008;
    lfo.frequency.value=5+i*0.5;lfoG.gain.value=0.01;
    lfo.connect(lfoG);lfoG.connect(g.gain);
    o.connect(g);g.connect(musicGain);
    o.start();lfo.start();
    scheduledNodes.push(o,g,lfo,lfoG);
  });
}

function stopBattleMusic(){
  scheduledNodes.forEach(n=>{
    try{if(n.stop)n.stop();}catch(e){}
  });
  scheduledNodes=[];
}

function toggleMusic(){
  const btn=document.getElementById('musicBtn');
  if(!musicOn){
    initAudio();
    if(audioCtx.state==='suspended') audioCtx.resume();
    musicOn=true;
    btn.textContent='🔊 Music On';
    btn.classList.add('active');
    startBattleMusic();
  } else {
    musicOn=false;
    stopBattleMusic();
    if(audioCtx) audioCtx.suspend();
    btn.textContent='🎵 Music';
    btn.classList.remove('active');
  }
}

function playSFX(type){
  if(!audioCtx||audioCtx.state==='suspended') return;
  const ctx=audioCtx;
  const g=ctx.createGain();g.connect(ctx.destination);
  const o=ctx.createOscillator();o.connect(g);o.start();
  if(type==='win'){
    o.frequency.setValueAtTime(440,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+.15);
    g.gain.setValueAtTime(.18,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
    o.stop(ctx.currentTime+.35);
  } else if(type==='lose'){
    o.type='sawtooth';
    o.frequency.setValueAtTime(220,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(100,ctx.currentTime+.25);
    g.gain.setValueAtTime(.1,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.35);
    o.stop(ctx.currentTime+.35);
  } else if(type==='select'){
    o.frequency.setValueAtTime(660,ctx.currentTime);
    g.gain.setValueAtTime(.06,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.08);
    o.stop(ctx.currentTime+.1);
  } else if(type==='pass'){
    o.type='triangle';
    o.frequency.setValueAtTime(330,ctx.currentTime);
    g.gain.setValueAtTime(.08,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.25);
    o.stop(ctx.currentTime+.25);
  }
}

function toggleGuide(){document.getElementById('guideOverlay').classList.toggle('hidden');}

function spawnParticles(x,y,type){
  const emojis=type==='win'?['⚔️','✨','💫','🌟']:type==='lose'?['💀','🔥','💥']:['🌀'];
  for(let i=0;i<4;i++){
    const p=document.createElement('div');p.className='particle';
    p.textContent=emojis[Math.floor(Math.random()*emojis.length)];
    p.style.left=(x+Math.random()*40-20)+'px';
    p.style.top=(y+Math.random()*20-10)+'px';
    p.style.animationDelay=Math.random()*.2+'s';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),1400);
  }
}

// ─────────────────────────────────────────────
// DECK
// ─────────────────────────────────────────────
function makeFixedDeck(){
  const a=['king','king','king','queen','queen','queen','jack','jack','ace','ace'];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

let G={};

function startGame(){
  document.getElementById('startScreen').classList.add('hidden');
  const pd=makeFixedDeck(),ed=makeFixedDeck();
  G={
    round:1,pHP:MAX_HP,eHP:MAX_HP,
    pMana:MANA_START,eMana:MANA_START,
    pHand:pd.slice(0,5),pRes:pd.slice(5),
    eHand:ed.slice(0,5),eRes:ed.slice(5),
    eDumped:{king:0,queen:0,jack:0,ace:0},
    sel:null,waiting:false,
  };
  renderAll();
  lg('<span class="kw">[Oracle Eye]</span> Enemy deck sealed: 3K · 3Q · 2J · 2A.');
  lg('<span class="wn">[System]</span> Round 1. Choose your card wisely.');
}

function addMana(){
  G.pMana=Math.min(MANA_CAP,G.pMana+MANA_INC);
  G.eMana=Math.min(MANA_CAP,G.eMana+MANA_INC);
}

// ─────────────────────────────────────────────
// ATTRITION (symmetric)
// ─────────────────────────────────────────────
function applyLoss(who){
  if(who==='p'){
    if(G.pRes.length>0){
      const d=G.pRes.pop();G.pHand.push(d);
      lg(`<span class="wn">[Reserve]</span> ${CARDS[d].name} from reserve → hand:${G.pHand.length} R:${G.pRes.length}`);
    } else {
      lg(`<span class="bd">[Attrition]</span> Reserve empty! Hand shrinks to ${G.pHand.length}.`);
    }
  } else {
    if(G.eRes.length>0){G.eHand.push(G.eRes.pop());}
  }
}

function applyPassPenalty(who){
  if(who==='p'){
    G.pHP=Math.max(0,G.pHP-PASS_DMG);
    lg(`<span class="bd">[Pass]</span> You passed → −${PASS_DMG} HP · Tower: ${G.pHP}`);
  } else {
    G.eHP=Math.max(0,G.eHP-PASS_DMG);
    lg(`<span class="wn">[Pass]</span> Oracle passed → −${PASS_DMG} HP · Oracle: ${G.eHP}`);
  }
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function renderAll(){renderTrack();renderHUD();renderHand();renderEnemyProbs();renderInfoPanels();}

function renderTrack(){
  const t=document.getElementById('rtrack');t.innerHTML='';
  for(let i=1;i<=MAX_R;i++){
    const d=document.createElement('div');
    d.className='rnode'+(i<G.round?' done':i===G.round?' active':'');
    d.textContent=i;t.appendChild(d);
  }
}

function renderHUD(){
  document.getElementById('eHp').textContent=Math.max(0,G.eHP);
  document.getElementById('pHp').textContent=Math.max(0,G.pHP);
  document.getElementById('eBar').style.width=(Math.max(0,G.eHP)/MAX_HP*100)+'%';
  document.getElementById('pBar').style.width=(Math.max(0,G.pHP)/MAX_HP*100)+'%';
  document.getElementById('eMana').textContent=G.eMana;
  document.getElementById('pMana').textContent=G.pMana;
  document.getElementById('rndLbl').textContent='ROUND '+G.round;
  document.getElementById('eCount').textContent=`H:${G.eHand.length} R:${G.eRes.length}`;
  document.getElementById('pCount').textContent=`H:${G.pHand.length} R:${G.pRes.length}`;
  document.getElementById('handSub').textContent=`${G.pHand.length} cards · ${G.pRes.length} reserve`;
  document.getElementById('eTowerBlock').classList.toggle('danger',G.eHP<150);
  document.getElementById('pTowerBlock').classList.toggle('danger',G.pHP<150);
  document.getElementById('eTowerImg').textContent=G.eHP<150?'💀':'🏰';
  document.getElementById('pTowerImg').textContent=G.pHP<150?'🩸':'🗼';
}

function renderInfoPanels(){
  const ed=document.getElementById('eDumpedDisp');ed.innerHTML='';
  let anyE=false;
  TYPES.forEach(t=>{
    if(G.eDumped[t]>0){anyE=true;
      const s=document.createElement('span');s.className='ptag';
      s.style.borderColor=CARDS[t].color;s.style.color=CARDS[t].color;
      s.textContent=`${CARDS[t].sym}×${G.eDumped[t]}`;ed.appendChild(s);
    }
  });
  if(!anyE)ed.innerHTML='<span style="font-size:9px;color:var(--tdd);">None yet</span>';

  const ph=document.getElementById('pHandDisp');ph.innerHTML='';
  const cnt={king:0,queen:0,jack:0,ace:0};G.pHand.forEach(t=>cnt[t]++);
  let anyP=false;
  TYPES.forEach(t=>{
    if(cnt[t]>0){anyP=true;
      const s=document.createElement('span');s.className='ptag';
      s.style.borderColor=CARDS[t].color;s.style.color=CARDS[t].color;
      s.textContent=`${CARDS[t].sym}×${cnt[t]}`;ph.appendChild(s);
    }
  });
  if(!anyP)ph.innerHTML='<span style="font-size:9px;color:var(--tdd);">Empty</span>';
}

function renderHand(){
  const row=document.getElementById('hr');row.innerHTML='';
  if(G.pHand.length===0){
    row.innerHTML='<div style="font-family:Cinzel,serif;font-size:9px;color:var(--tdd);padding:10px 0;width:100%;text-align:center;">No cards — you must pass.</div>';
    document.getElementById('playBtn').disabled=true;return;
  }
  G.pHand.forEach((t,i)=>{
    const c=CARDS[t],ca=G.pMana<c.mana,sel=G.sel===i;
    const div=document.createElement('div');
    div.className=`hcard ${t}${ca?' dis':''}${sel?' sel':''}`;
    div.innerHTML=`
      ${sel?'<div class="sel-glow"></div>':''}
      <div class="hcs" style="color:${c.color}">${c.sym}</div>
      <div class="hcn" style="color:${c.color}">${c.name}</div>
      <div class="hcm">${c.mana}✦</div>
      <div class="hcd">${c.dmg}dmg</div>
      ${ca?`<div class="hce">Need ${c.mana}</div>`:''}`;
    if(!ca&&!G.waiting) div.onclick=()=>selCard(i);
    row.appendChild(div);
  });
  document.getElementById('playBtn').disabled=G.sel===null||G.waiting;
  document.getElementById('passBtn').disabled=G.waiting;
}

function selCard(i){
  if(G.waiting)return;
  playSFX('select');
  G.sel=G.sel===i?null:i;
  renderHand();
  document.getElementById('playBtn').disabled=G.sel===null;
  if(G.sel!==null) previewCard(G.pHand[G.sel]);
  else resetBF();
}

function previewCard(t){
  const c=CARDS[t];
  document.getElementById('bfContent').innerHTML=`
    <div class="cslot">
      <div class="ccard empty-slot">
        <div class="csym" style="color:var(--tdd);opacity:.3;">?</div>
        <div class="cname" style="color:var(--tdd);">HIDDEN</div>
      </div>
      <div class="clbl">ORACLE</div>
    </div>
    <div class="cvs-wrap"><div class="cvs">VS</div></div>
    <div class="cslot">
      <div class="ccard ${t}" style="animation:fi .3s ease;">
        <div class="csym" style="color:${c.color}">${c.sym}</div>
        <div class="cname" style="color:${c.color}">${c.name}</div>
        <div class="cmana">${c.mana} mana</div>
        <div class="cdmg">${c.dmg} dmg</div>
      </div>
      <div class="clbl">YOUR PICK</div>
    </div>`;
  document.getElementById('smsg').textContent=`${c.name} selected — press Play!`;
}

function resetBF(){
  document.getElementById('bfContent').innerHTML=`
    <div class="cslot">
      <div class="ccard empty-slot">
        <div class="csym" style="color:var(--tdd);opacity:.3;">?</div>
        <div class="cname" style="color:var(--tdd);">WAITING</div>
      </div>
      <div class="clbl">ORACLE</div>
    </div>
    <div class="cvs-wrap"><div class="cvs">VS</div></div>
    <div class="cslot">
      <div class="ccard empty-slot">
        <div class="csym" style="color:var(--tdd);opacity:.3;">?</div>
        <div class="cname" style="color:var(--tdd);">SELECT</div>
      </div>
      <div class="clbl">YOU</div>
    </div>`;
  document.getElementById('smsg').textContent='Choose a card from your hand to play...';
}

// ─────────────────────────────────────────────
// VARIABLE ELIMINATION (Oracle's Eye)
// ─────────────────────────────────────────────
function computeEnemyProbs(){
  let pool={};
  TYPES.forEach(t=>{pool[t]=Math.max(0,ORIG[t]-G.eDumped[t]);});
  TYPES.forEach(t=>{if(CARDS[t].mana>G.eMana)pool[t]=0;});
  if(G.eHand.length===0)return{king:0,queen:0,jack:0,ace:0,pass:100};
  const hr=G.eHP/MAX_HP;
  let w={};
  TYPES.forEach(t=>{
    let v=pool[t];if(!v){w[t]=0;return;}
    // HP aggression weighting
    if(hr<0.35){if(t==='ace')v*=1.5;if(t==='jack')v*=1.3;}
    if(hr>0.65){if(t==='king')v*=1.3;if(t==='queen')v*=1.15;}
    w[t]=v;
  });
  let passW=0.15;
  if(G.eMana<3)passW=1.5;if(G.eMana<2)passW=3.0;
  const tot=TYPES.reduce((s,t)=>s+w[t],0)+passW;
  if(tot<=0)return{king:0,queen:0,jack:0,ace:0,pass:100};
  let pr={};
  TYPES.forEach(t=>{pr[t]=Math.round(w[t]/tot*100);});
  pr.pass=Math.round(passW/tot*100);
  let sum=TYPES.reduce((s,t)=>s+pr[t],0)+pr.pass;
  if(sum!==100){const diff=100-sum;const best=[...TYPES,'pass'].filter(t=>pr[t]>0).sort((a,b)=>pr[b]-pr[a]);if(best.length)pr[best[0]]+=diff;}
  return pr;
}

function renderEnemyProbs(){
  const pr=computeEnemyProbs();
  const grid=document.getElementById('pgrid');grid.innerHTML='';
  [...TYPES,'pass'].forEach(t=>{
    const pct=pr[t]||0;
    let sym,name,colr,note,barC;
    if(t==='pass'){
      sym='—';name='PASS';barC='#888888';
      colr=pct>=80?'#1abc9c':pct>=50?'#f39c12':'#888888';
      note=`−${PASS_DMG}HP`;
    } else {
      sym=CARDS[t].sym;name=CARDS[t].name.toUpperCase();colr=CARDS[t].color;barC=CARDS[t].color;
      const canA=CARDS[t].mana<=G.eMana;
      const rem=Math.max(0,ORIG[t]-G.eDumped[t]);
      note=!canA?`no mana`:`${rem} left`;
    }
    // intensity: dim if 0%, bright if high
    const alpha = pct===0 ? 0.08 : 0.15 + (pct/100)*0.6;
    const barBg = `rgba(${hexToRgb(barC)},${alpha})`;
    const div=document.createElement('div');
    div.className='pc';
    div.style.setProperty('--pc-color', barC);
    div.style.borderColor = pct>50 ? `${barC}55` : pct>25 ? `${barC}33` : 'rgba(155,89,182,.12)';
    if(pct>50) div.style.boxShadow=`0 0 16px ${barC}22, inset 0 0 20px ${barC}08`;
    div.innerHTML=`
      <div class="ps" style="color:${colr};filter:drop-shadow(0 0 6px ${colr})">${sym}</div>
      <div class="pn">${name}</div>
      <div class="pbb">
        <div class="pbf" style="height:${pct}%;background:linear-gradient(180deg,${barC}ff,${barC}99);box-shadow:0 0 10px ${barC},0 0 4px ${barC};"></div>
      </div>
      <div class="pp" style="color:${colr}">${pct}<span style="font-size:9px;opacity:.7;">%</span></div>
      <div class="ppl">${note}</div>`;
    grid.appendChild(div);
  });
}

function hexToRgb(hex){
  const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r?`${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`:'155,89,182';
}

function lg(msg){
  const b=document.getElementById('lbox');
  b.innerHTML+=msg+'<br>';b.scrollTop=b.scrollHeight;
}

// ─────────────────────────────────────────────
// SMARTER ENEMY AI
// Strategy: Try to counter what player likely has, while being unpredictable ~25% of time
// ─────────────────────────────────────────────
function enemyPick(){
  const avail=G.eHand.filter(t=>CARDS[t].mana<=G.eMana);
  if(!avail.length) return 'pass';

  // 25% random chance (prevents easy reads / keeps it challenging but not unbeatable)
  if(Math.random()<0.25){
    // Weighted random among affordable cards
    return avail[Math.floor(Math.random()*avail.length)];
  }

  // Smart play: try to WIN a clash by playing what beats player's most likely card
  // We don't know player's card, but we can guess based on player's hand composition
  // (We DO know player hand composition since the info panel shows it)
  const pHandCnt={king:0,queen:0,jack:0,ace:0};
  G.pHand.forEach(t=>pHandCnt[t]++);
  const pTotal=G.pHand.length;
  if(pTotal===0) return avail[Math.floor(Math.random()*avail.length)];

  // Estimate player's most likely play (weighted by remaining cards)
  // Also factor: player tends to play high-value counters when they can
  let playerWeights={};
  TYPES.forEach(t=>{
    let w=pHandCnt[t]/pTotal;
    if(CARDS[t].mana>G.pMana)w=0; // player can't afford it
    playerWeights[t]=w;
  });

  // For each available card enemy can play, score it:
  // +3 if it beats a likely player card, -2 if it loses to a likely player card, 0 for draw
  let best=null,bestScore=-Infinity;
  avail.forEach(ec=>{
    let score=0;
    TYPES.forEach(pt=>{
      const pw=playerWeights[pt];
      if(pw<=0)return;
      if(CARDS[ec].beats.includes(pt)) score+=3*pw;          // we beat their card
      else if(CARDS[pt].beats.includes(ec)) score-=2.5*pw;   // they beat our card
      else score+=0.5*pw;                                     // draw, slight positive
    });
    // Bias toward high damage cards when enemy is losing
    const hr=G.eHP/MAX_HP;
    if(hr<0.4) score+=CARDS[ec].dmg/100; // desperate — prefer damage
    // Small random noise to avoid predictability
    score+=Math.random()*0.6;
    if(score>bestScore){bestScore=score;best=ec;}
  });

  return best||avail[Math.floor(Math.random()*avail.length)];
}

// ─────────────────────────────────────────────
// CLASH — Uses fixed card rules (Ace beats King)
// ─────────────────────────────────────────────
function clash(pC,eC){
  if(pC==='pass'&&eC==='pass')return{res:'bp',pDmg:0,eDmg:0,pL:false,eL:false,pP:true,eP:true,msg:`Both passed! Both −${PASS_DMG} HP.`};
  if(pC==='pass')return{res:'pp',pDmg:0,eDmg:0,pL:false,eL:false,pP:true,eP:false,msg:`You passed. −${PASS_DMG} HP to you.`};
  if(eC==='pass')return{res:'ep',pDmg:0,eDmg:0,pL:false,eL:false,pP:false,eP:true,msg:`Oracle passed. −${PASS_DMG} HP to Oracle.`};
  if(pC==='ace'&&eC==='ace')return{res:'mir',pDmg:200,eDmg:200,pL:true,eL:true,pP:false,eP:false,msg:`Ace vs Ace — Mirror Kill! Both −200 HP!`};
  if(pC===eC)return{res:'sd',pDmg:0,eDmg:0,pL:false,eL:false,pP:false,eP:false,msg:`${CARDS[pC].name} vs ${CARDS[eC].name} — Standoff! Both return.`};
  const pc=CARDS[pC],ec=CARDS[eC];
  // Check player wins
  if(pc.beats.includes(eC))return{res:'pw',pDmg:0,eDmg:pc.dmg,pL:false,eL:true,pP:false,eP:false,msg:`Your ${pc.name} defeats Oracle's ${ec.name}! Oracle −${pc.dmg} HP!`};
  // Check enemy wins
  if(ec.beats.includes(pC))return{res:'ew',pDmg:ec.dmg,eDmg:0,pL:true,eL:false,pP:false,eP:false,msg:`Oracle's ${ec.name} defeats your ${pc.name}! You −${ec.dmg} HP!`};
  // Fallback draw (shouldn't happen with correct beats tables)
  return{res:'sd',pDmg:0,eDmg:0,pL:false,eL:false,pP:false,eP:false,msg:`Standoff — no damage.`};
}

// ─────────────────────────────────────────────
// EXECUTE ROUND
// ─────────────────────────────────────────────
function playSelected(){if(G.waiting||G.sel===null)return;executeRound(G.pHand[G.sel],G.sel);}
function playPass(){if(G.waiting)return;playSFX('pass');executeRound('pass',null);}

function executeRound(pC,pIdx){
  G.waiting=true;
  document.getElementById('playBtn').disabled=true;
  document.getElementById('passBtn').disabled=true;
  document.getElementById('eyePupil').classList.add('tk');

  let pRemoved=false;
  if(pC!=='pass'){G.pMana-=CARDS[pC].mana;G.pHand.splice(pIdx,1);pRemoved=true;}

  const pr=computeEnemyProbs();
  const top=Object.entries(pr).sort((a,b)=>b[1]-a[1])[0];
  lg(`<span class="kw">[Oracle Eye]</span> Enemy mana:${G.eMana} → prediction: <span class="vl">${top[0].toUpperCase()} ${top[1]}%</span>`);

  const eC=enemyPick();
  let eRemoved=false;
  if(eC!=='pass'){G.eMana-=CARDS[eC].mana;const ei=G.eHand.indexOf(eC);if(ei!==-1){G.eHand.splice(ei,1);eRemoved=true;}}

  const res=clash(pC,eC);
  G.pHP=Math.max(0,G.pHP-res.pDmg);
  G.eHP=Math.max(0,G.eHP-res.eDmg);
  if(res.pP)applyPassPenalty('p');
  if(res.eP)applyPassPenalty('e');

  // Card movements (symmetric rules)
  if(res.res==='pw'){G.pHand.push(pC);G.eDumped[eC]++;applyLoss('e');}
  else if(res.res==='ew'){G.eHand.push(eC);applyLoss('p');}
  else if(res.res==='mir'){applyLoss('p');applyLoss('e');}
  else if(res.res==='sd'){if(pRemoved)G.pHand.push(pC);if(eRemoved)G.eHand.push(eC);}
  else if(res.res==='bp'){if(pRemoved)G.pHand.push(pC);if(eRemoved)G.eHand.push(eC);}
  else if(res.res==='pp'){if(eRemoved)G.eHand.push(eC);}
  else if(res.res==='ep'){if(pRemoved)G.pHand.push(pC);}

  renderBF(pC,eC,res);
  const cls=res.res==='pw'?'vl':res.res==='ew'?'bd':'wn';
  lg(`<span class="${cls}">[R${G.round}]</span> ${res.msg}`);
  document.getElementById('smsg').textContent=res.msg;
  renderHUD();renderInfoPanels();
  document.getElementById('eyePupil').classList.remove('tk');

  const bfEl=document.getElementById('bf');
  const rect=bfEl.getBoundingClientRect();
  if(res.res==='pw'){playSFX('win');spawnParticles(rect.left+rect.width/2,rect.top,'win');}
  else if(res.res==='ew'||res.res==='mir'){playSFX('lose');spawnParticles(rect.left+rect.width/2,rect.top,'lose');}

  setTimeout(()=>{
    if(G.pHP<=0||G.eHP<=0||G.round>=MAX_R){endGame();return;}
    G.round++;addMana();G.sel=null;G.waiting=false;
    resetBF();renderAll();
    document.getElementById('smsg').textContent=`Round ${G.round} — Your mana: ${G.pMana} · Oracle: ${G.eMana}.`;
    lg(`<span class="wn">[System]</span> Round ${G.round} — +${MANA_INC} mana · You:${G.pMana} Oracle:${G.eMana}`);
  },2400);
}

function renderBF(pC,eC,res){
  const pc=pC==='pass'?null:CARDS[pC];
  const ec=eC==='pass'?null:CARDS[eC];
  const bc=res.res==='pw'?'win':res.res==='ew'?'lose':'draw';
  const pAnim=res.res==='pw'?' clash-win':res.res==='ew'?' clash-lose':res.res==='mir'?' clash-lose':'';
  const eAnim=res.res==='ew'?' clash-win':res.res==='pw'?' clash-lose':res.res==='mir'?' clash-lose':'';
  const dt=res.pDmg>0&&res.eDmg>0?`Both −${res.pDmg}HP`:res.pDmg>0?`You −${res.pDmg}HP`:res.eDmg>0?`Oracle −${res.eDmg}HP`:res.pP||res.eP?`Pass −${PASS_DMG}HP`:'No damage';

  document.getElementById('bfContent').innerHTML=`
    <div class="cslot">
      <div class="ccard ${eC!=='pass'?eC:'empty-slot'}${eAnim}">
        <div class="csym" style="color:${ec?ec.color:'var(--tdd)'}">${ec?ec.sym:'—'}</div>
        <div class="cname" style="color:${ec?ec.color:'var(--tdd)'}">${ec?ec.name:'PASS'}</div>
        ${ec?`<div class="cmana">${ec.mana}m</div><div class="cdmg">${ec.dmg}dmg</div>`:''}
      </div>
      <div class="clbl">ORACLE</div>
    </div>
    <div class="cvs-wrap">
      <div class="cvs">⚔</div>
      <div class="rbn ${bc}" style="margin-top:3px;">${dt}</div>
    </div>
    <div class="cslot">
      <div class="ccard ${pC!=='pass'?pC:'empty-slot'}${pAnim}">
        <div class="csym" style="color:${pc?pc.color:'var(--tdd)'}">${pc?pc.sym:'—'}</div>
        <div class="cname" style="color:${pc?pc.color:'var(--tdd)'}">${pc?pc.name:'PASS'}</div>
        ${pc?`<div class="cmana">${pc.mana}m</div><div class="cdmg">${pc.dmg}dmg</div>`:''}
      </div>
      <div class="clbl">YOU</div>
    </div>`;
}

function endGame(){
  const pW=G.pHP>G.eHP,eD=G.eHP<=0,pD=G.pHP<=0;
  let ti,su;
  if(eD&&!pD){ti='Victory! 🏆';su='The Oracle\'s tower crumbles. The kingdoms are free.';}
  else if(pD&&!eD){ti='Defeated 💀';su='The Oracle foresaw your every move. Try again.';}
  else if(pD&&eD){ti='Mutual Ruin 💥';su='Both towers fall. No victor rises.';}
  else if(pW){ti='Victory on Points! ⚔️';su='15 rounds. Your tower stands taller.';}
  else if(!pW&&G.eHP>G.pHP){ti='Oracle Wins 👁️';su='15 rounds. The Oracle held more HP.';}
  else{ti='Perfect Draw ⚖️';su='Both towers equal after 15 rounds.';}
  document.getElementById('endTitle').textContent=ti;
  document.getElementById('endTitle').style.color=(eD&&!pD)||pW?'var(--tl)':'var(--rl)';
  document.getElementById('endSub').textContent=su;
  document.getElementById('endStats').innerHTML=
    `Your Tower: <strong>${Math.max(0,G.pHP)} HP</strong> &nbsp;·&nbsp; Oracle: <strong>${Math.max(0,G.eHP)} HP</strong><br>
     Your reserve: <strong>${G.pRes.length}</strong> · Oracle dumped: <strong>${Object.values(G.eDumped).reduce((a,b)=>a+b,0)}</strong><br>
     Rounds played: <strong>${G.round}</strong> / ${MAX_R}`;
  setTimeout(()=>document.getElementById('endScreen').classList.remove('hidden'),600);
}

// Init prob grid on load
window.addEventListener('load',()=>{
  const grid=document.getElementById('pgrid');grid.innerHTML='';
  [...TYPES,'pass'].forEach(t=>{
    const c=t==='pass'?{sym:'—',color:'var(--tdd)'}:CARDS[t];
    const div=document.createElement('div');div.className='pc';
    div.innerHTML=`<div class="ps" style="color:${c.color}">${c.sym}</div>
      <div class="pn">${t==='pass'?'PASS':CARDS[t].name.toUpperCase()}</div>
      <div class="pbb"><div class="pbf" style="width:0%"></div></div>
      <div class="pp" style="color:${c.color}">—</div><div class="ppl">—</div>`;
    grid.appendChild(div);
  });
});
