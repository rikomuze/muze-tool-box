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
  const selected=shuffle(sourcePool(state.member)).slice(0,16);
  state.pool=selected;state.history=[];state.roundIndex=0;state.matchIndex=0;state.winner=null;state.finalist=null;state.finalFour=[];
  state.rounds=[
    {name:"ROUND OF 16",matches:[
      [selected[0],selected[1]],[selected[2],selected[3]],[selected[4],selected[5]],[selected[6],selected[7]],
      [selected[8],selected[9]],[selected[10],selected[11]],[selected[12],selected[13]],[selected[14],selected[15]]
    ],winners:[]},
    {name:"QUARTER FINAL",matches:[],winners:[]},
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
  $("#totalProgress").textContent=(state.history.length+1)+" / 15";
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
    if(state.roundIndex===0){
      state.rounds[1].matches=[
        [r.winners[0],r.winners[1]],[r.winners[2],r.winners[3]],
        [r.winners[4],r.winners[5]],[r.winners[6],r.winners[7]]
      ];
    }else if(state.roundIndex===1){
      state.rounds[2].matches=[[r.winners[0],r.winners[1]],[r.winners[2],r.winners[3]]];
    }else if(state.roundIndex===2){
      state.rounds[3].matches=[[r.winners[0],r.winners[1]]];
    }
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
  const dx=x+(w-dw)/2;
  // 通常写真は顔が切れにくいよう上寄せ。3分割素材は選択済みの領域内で中央寄せ。
  const dy=item.cropPart ? y+(h-dh)/2 : y;
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);ctx.restore();
}
async function drawCard(ctx,item,x,y,w,h){
  ctx.fillStyle="#fff";ctx.fillRect(x-6,y-6,w+12,h+12);
  const img=item?await loadImage(item.src):null;
  drawCover(ctx,img,item||{},x,y,w,h);
}
async function finish(){await drawResult();show("result");}
async function drawResult(){
  const c=$("#resultCanvas"),ctx=c.getContext("2d");
  ctx.clearRect(0,0,1080,1080);
  ctx.fillStyle="#fffdf9";ctx.fillRect(0,0,1080,1080);

  // Header
  ctx.fillStyle="#292724";ctx.textAlign="left";
  ctx.font='700 58px "Zen Kaku Gothic New",sans-serif';ctx.fillText(state.member,64,74);
  ctx.font='700 22px "Zen Kaku Gothic New",sans-serif';ctx.fillText("OUTFIT DRAFT",66,108);

  // Winner
  ctx.textAlign="center";ctx.font='700 18px "Zen Kaku Gothic New",sans-serif';
  ctx.fillStyle="#817a70";ctx.fillText("WINNER",540,151);
  await drawCard(ctx,state.winner,260,174,560,548);

  // thin divider
  ctx.strokeStyle="rgba(41,39,36,.18)";ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(64,766);ctx.lineTo(1016,766);ctx.stroke();

  // Finalist / Final Four
  ctx.textAlign="left";ctx.fillStyle="#817a70";ctx.font='700 16px "Zen Kaku Gothic New",sans-serif';
  ctx.fillText("FINALIST",70,801);
  ctx.fillText("FINAL FOUR",410,801);

  await drawCard(ctx,state.finalist,70,820,260,188);
  await drawCard(ctx,state.finalFour[0],410,820,260,188);
  await drawCard(ctx,state.finalFour[1],750,820,260,188);

  // Footer
  ctx.fillStyle="#817a70";ctx.textAlign="right";ctx.font='500 13px "Zen Kaku Gothic New",sans-serif';
  ctx.fillText("created with MUZE TOOL BOX",1016,1048);
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