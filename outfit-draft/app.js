const MEMBERS=["KAIRYU","NAOYA","RAN","SEITO","RYUKI","TAKUTO","HAYATO","EIKI"];
const OUTFIT_COUNT=16;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={member:null,pool:[],rounds:[],roundIndex:0,matchIndex:0,history:[],winner:null,finalist:null,finalFour:[]};

function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

function placeholderOutfits(member){
  return Array.from({length:OUTFIT_COUNT},(_,i)=>({id:member+"-"+(i+1),member,label:"LOOK "+String(i+1).padStart(2,"0"),src:null}));
}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function initMembers(){
  MEMBERS.forEach(name=>{const b=document.createElement("button");b.className="member";b.textContent=name;b.onclick=()=>{state.member=name;$$(".member").forEach(x=>x.classList.toggle("selected",x===b));$("#toBattle").disabled=false;};$("#memberGrid").appendChild(b);});
}
$("#toBattle").onclick=()=>startDraft();

function startDraft(){
  const selected=shuffle(placeholderOutfits(state.member)).slice(0,8);
  state.pool=selected;state.history=[];state.roundIndex=0;state.matchIndex=0;state.winner=null;state.finalist=null;state.finalFour=[];
  state.rounds=[
    {name:"QUARTER FINAL",matches:[[selected[0],selected[1]],[selected[2],selected[3]],[selected[4],selected[5]],[selected[6],selected[7]]],winners:[]},
    {name:"SEMI FINAL",matches:[],winners:[]},
    {name:"FINAL",matches:[],winners:[]}
  ];
  show("battle");renderBattle();
}

function currentRound(){return state.rounds[state.roundIndex];}
function currentMatch(){return currentRound().matches[state.matchIndex];}
function renderBattle(){
  const r=currentRound(),m=currentMatch();
  $("#roundLabel").textContent=r.name;$("#battleCount").textContent=r.name==="FINAL"?"FINAL":(state.matchIndex+1)+" / "+r.matches.length;
  $("#totalProgress").textContent=(state.history.length+1)+" / 7";
  $("#undoBtn").disabled=state.history.length===0;
  const wrap=$("#battlePair");wrap.innerHTML="";
  m.forEach(item=>{const b=document.createElement("button");b.className="choice";b.innerHTML=renderChoice(item);b.onclick=()=>choose(item);wrap.appendChild(b);});
}
function renderChoice(item){
  if(item.src)return '<img class="choice-art" src="'+item.src+'" alt=""><span class="choice-label">'+item.label+'</span>';
  return '<div class="choice-art"><div><strong>'+item.label+'</strong><small>'+item.member+'</small></div></div><span class="choice-label">この衣装を選ぶ</span>';
}
function snapshot(){return JSON.stringify({rounds:state.rounds,roundIndex:state.roundIndex,matchIndex:state.matchIndex,winner:state.winner,finalist:state.finalist,finalFour:state.finalFour});}
function choose(item){
  state.history.push(snapshot());
  const r=currentRound(),loser=currentMatch().find(x=>x.id!==item.id);r.winners.push(item);
  if(r.name==="SEMI FINAL") state.finalFour.push(loser);
  if(r.name==="FINAL"){state.winner=item;state.finalist=loser;finish();return;}
  state.matchIndex++;
  if(state.matchIndex>=r.matches.length){
    if(state.roundIndex===0){state.rounds[1].matches=[[r.winners[0],r.winners[1]],[r.winners[2],r.winners[3]]];}
    else if(state.roundIndex===1){state.rounds[2].matches=[[r.winners[0],r.winners[1]]];}
    state.roundIndex++;state.matchIndex=0;
  }
  renderBattle();
}
$("#undoBtn").onclick=()=>{const prev=state.history.pop();if(!prev)return;const p=JSON.parse(prev);state.rounds=p.rounds;state.roundIndex=p.roundIndex;state.matchIndex=p.matchIndex;state.winner=p.winner;state.finalist=p.finalist;state.finalFour=p.finalFour;renderBattle();};

async function finish(){await drawResult();show("result");}
function drawCard(ctx,item,x,y,w,h,label){
  ctx.fillStyle="#f0ebe4";ctx.fillRect(x,y,w,h);ctx.strokeStyle="#292724";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#292724";ctx.textAlign="center";ctx.font='700 '+Math.max(24,Math.floor(w*.1))+'px "Klee One",sans-serif';ctx.fillText(item?item.label:"—",x+w/2,y+h/2);
  if(label){ctx.fillStyle="#fffdf9";ctx.fillRect(x+w*.15,y+h-32,w*.7,42);ctx.fillStyle="#292724";ctx.font='700 19px "Zen Kaku Gothic New",sans-serif';ctx.fillText(label,x+w/2,y+h-5);}
}
async function drawResult(){
  const c=$("#resultCanvas"),ctx=c.getContext("2d");ctx.fillStyle="#fffdf9";ctx.fillRect(0,0,1080,1080);
  ctx.fillStyle="#292724";ctx.textAlign="left";ctx.font='700 56px "Zen Kaku Gothic New",sans-serif';ctx.fillText(state.member,64,76);
  ctx.font='700 26px "Zen Kaku Gothic New",sans-serif';ctx.fillText("OUTFIT DRAFT",66,114);
  drawCard(ctx,state.winner,120,165,840,500,"WINNER");
  ctx.font='700 18px "Zen Kaku Gothic New",sans-serif';ctx.fillStyle="#292724";ctx.textAlign="left";ctx.fillText("FINALIST",80,720);ctx.fillText("FINAL FOUR",560,720);
  drawCard(ctx,state.finalist,80,745,360,230,"");
  drawCard(ctx,state.finalFour[0],560,745,190,230,"");drawCard(ctx,state.finalFour[1],770,745,190,230,"");
  ctx.fillStyle="#817a70";ctx.textAlign="right";ctx.font='500 14px "Zen Kaku Gothic New",sans-serif';ctx.fillText("created with MUZE TOOL BOX",1016,1045);
}
function dataURLtoBlob(dataURL){const [h,d]=dataURL.split(","),m=h.match(/:(.*?);/)[1],b=atob(d),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:m});}
$("#saveImage").onclick=async()=>{await drawResult();const url=$("#resultCanvas").toDataURL("image/png");try{const blob=dataURLtoBlob(url),file=new File([blob],state.member.toLowerCase()+"-outfit-draft.png",{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"OUTFIT DRAFT"});return;}const a=document.createElement("a");a.href=url;a.download=file.name;a.click();$("#saveStatus").textContent="画像を保存しました";}catch(e){$("#fallbackImage").src=url;$("#fallback").hidden=false;}};
$("#closeFallback").onclick=()=>$("#fallback").hidden=true;
$("#retryBtn").onclick=()=>startDraft();
$("#changeMemberBtn").onclick=()=>show("member");
initMembers();