const MEMBERS=["KAIRYU","NAOYA","RAN","SEITO","RYUKI","TAKUTO","HAYATO","EIKI"];
const SOURCES=[
  {key:"artist",base:"https://rikomuze.github.io/mazzel-best-visual"},
  {key:"performance",base:"https://rikomuze.github.io/mazzel-best-visual-performance"}
];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={member:null,pool:[],rounds:[],roundIndex:0,matchIndex:0,history:[],winner:null,finalist:null,finalFour:[]};

function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function memberSlug(){return state.member.toLowerCase();}
function fileName(num){return String(num).padStart(2,"0")+".png";}

function sourcePool(member){
  const slug=member.toLowerCase(),items=[];
  SOURCES.forEach(source=>{
    for(let i=1;i<=15;i++){
      items.push({
        id:source.key+"-"+slug+"-"+i,
        member,
        source:source.key,
        src:source.base+"/images/"+slug+"/"+fileName(i),
        cropPart:null
      });
    }
    for(let part=1;part<=3;part++){
      items.push({
        id:source.key+"-"+slug+"-new-"+part,
        member,
        source:source.key,
        src:source.base+"/images/new-20260918/"+slug+".jpg",
        cropPart:part
      });
    }
  });
  return items;
}

function initMembers(){
  MEMBERS.forEach(name=>{
    const b=document.createElement("button");
    b.className="member";b.textContent=name;
    b.onclick=()=>{state.member=name;$$(".member").forEach(x=>x.classList.toggle("selected",x===b));$("#toBattle").disabled=false;};
    $("#memberGrid").appendChild(b);
  });
}
$("#toBattle").onclick=()=>startDraft();

function startDraft(){
  const selected=shuffle(sourcePool(state.member)).slice(0,8);
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
function cropPosition(part){return part===1?"top":part===2?"center":"bottom";}
function renderChoice(item){
  const media=item.cropPart
    ? '<div class="choice-media crop-part" style="background-image:url(\''+item.src+'\');background-position:center '+cropPosition(item.cropPart)+'"></div>'
    : '<img class="choice-media" src="'+item.src+'" alt="'+item.member+'の衣装" loading="eager">';
  return media+'<span class="choice-label">この衣装を選ぶ</span>';
}
function renderBattle(){
  const r=currentRound(),m=currentMatch();
  $("#roundLabel").textContent=r.name;
  $("#battleCount").textContent=r.name==="FINAL"?"FINAL":(state.matchIndex+1)+" / "+r.matches.length;
  $("#totalProgress").textContent=(state.history.length+1)+" / 7";
  $("#undoBtn").disabled=state.history.length===0;
  const wrap=$("#battlePair");wrap.innerHTML="";
  m.forEach(item=>{
    const b=document.createElement("button");
    b.className="choice";b.innerHTML=renderChoice(item);b.onclick=()=>choose(item);
    wrap.appendChild(b);
  });
}
function snapshot(){return JSON.stringify({rounds:state.rounds,roundIndex:state.roundIndex,matchIndex:state.matchIndex,winner:state.winner,finalist:state.finalist,finalFour:state.finalFour});}
function choose(item){
  state.history.push(snapshot());
  const r=currentRound(),loser=currentMatch().find(x=>x.id!==item.id);r.winners.push(item);
  if(r.name==="SEMI FINAL") state.finalFour.push(loser);
  if(r.name==="FINAL"){state.winner=item;state.finalist=loser;finish();return;}
  state.matchIndex++;
  if(state.matchIndex>=r.matches.length){
    if(state.roundIndex===0) state.rounds[1].matches=[[r.winners[0],r.winners[1]],[r.winners[2],r.winners[3]]];
    else if(state.roundIndex===1) state.rounds[2].matches=[[r.winners[0],r.winners[1]]];
    state.roundIndex++;state.matchIndex=0;
  }
  renderBattle();
}
$("#undoBtn").onclick=()=>{
  const prev=state.history.pop();if(!prev)return;
  const p=JSON.parse(prev);state.rounds=p.rounds;state.roundIndex=p.roundIndex;state.matchIndex=p.matchIndex;state.winner=p.winner;state.finalist=p.finalist;state.finalFour=p.finalFour;renderBattle();
};

function loadImage(src){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>resolve(null);
    img.src=src;
  });
}
function drawCover(ctx,img,item,x,y,w,h){
  if(!img){ctx.fillStyle="#e7e1d8";ctx.fillRect(x,y,w,h);return;}
  let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
  if(item.cropPart){
    sh=img.naturalHeight/3;
    sy=(item.cropPart-1)*sh;
  }
  const scale=Math.max(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
  const dx=x+(w-dw)/2,dy=y+(h-dh)/2;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);ctx.restore();
}
async function drawCard(ctx,item,x,y,w,h,label){
  ctx.fillStyle="#fff";ctx.fillRect(x-5,y-5,w+10,h+10);
  const img=item?await loadImage(item.src):null;
  drawCover(ctx,img,item||{},x,y,w,h);
  if(label){
    const tagW=w*.48,tagH=48,tagX=x+(w-tagW)/2,tagY=y+h-24;
    ctx.fillStyle="#fffdf9";ctx.fillRect(tagX,tagY,tagW,tagH);
    ctx.fillStyle="#292724";ctx.textAlign="center";ctx.font='700 20px "Zen Kaku Gothic New",sans-serif';ctx.fillText(label,x+w/2,tagY+31);
  }
}
async function finish(){await drawResult();show("result");}
async function drawResult(){
  const c=$("#resultCanvas"),ctx=c.getContext("2d");
  ctx.fillStyle="#fffdf9";ctx.fillRect(0,0,1080,1080);
  ctx.fillStyle="#292724";ctx.textAlign="left";ctx.font='700 56px "Zen Kaku Gothic New",sans-serif';ctx.fillText(state.member,64,76);
  ctx.font='700 26px "Zen Kaku Gothic New",sans-serif';ctx.fillText("OUTFIT DRAFT",66,114);
  await drawCard(ctx,state.winner,120,165,840,500,"WINNER");
  ctx.font='700 18px "Zen Kaku Gothic New",sans-serif';ctx.fillStyle="#292724";ctx.textAlign="left";ctx.fillText("FINALIST",80,720);ctx.fillText("FINAL FOUR",560,720);
  await drawCard(ctx,state.finalist,80,745,360,230,"");
  await drawCard(ctx,state.finalFour[0],560,745,190,230,"");
  await drawCard(ctx,state.finalFour[1],770,745,190,230,"");
  ctx.fillStyle="#817a70";ctx.textAlign="right";ctx.font='500 14px "Zen Kaku Gothic New",sans-serif';ctx.fillText("created with MUZE TOOL BOX",1016,1045);
}
function dataURLtoBlob(dataURL){const [h,d]=dataURL.split(","),m=h.match(/:(.*?);/)[1],b=atob(d),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:m});}
$("#saveImage").onclick=async()=>{
  await drawResult();const url=$("#resultCanvas").toDataURL("image/png");
  try{
    const blob=dataURLtoBlob(url),file=new File([blob],memberSlug()+"-outfit-draft.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"OUTFIT DRAFT"});return;}
    const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();$("#saveStatus").textContent="画像を保存しました";
  }catch(e){$("#fallbackImage").src=url;$("#fallback").hidden=false;}
};
$("#closeFallback").onclick=()=>$("#fallback").hidden=true;
$("#retryBtn").onclick=()=>startDraft();
$("#changeMemberBtn").onclick=()=>show("member");
initMembers();