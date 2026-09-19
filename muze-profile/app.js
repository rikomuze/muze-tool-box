const DATA=window.MUZE_PROFILE_DATA;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={member:null,visual:null,songs:[],areas:[],design:null};
const SOURCES=[
 {key:"artist",base:"https://rikomuze.github.io/mazzel-best-visual"},
 {key:"performance",base:"https://rikomuze.github.io/mazzel-best-visual-performance"}
];

function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

function fileName(n){return String(n).padStart(2,"0")+".png";}
function visualPool(member){
 const slug=member.toLowerCase(),out=[];
 SOURCES.forEach(src=>{
   for(let i=1;i<=15;i++) out.push({id:src.key+"-"+i,src:src.base+"/images/"+slug+"/"+fileName(i),cropPart:null});
   for(let p=1;p<=3;p++) out.push({id:src.key+"-new-"+p,src:src.base+"/images/new-20260918/"+slug+".jpg",cropPart:p});
 });
 return out;
}
function cropPos(p){return p===1?"top":p===2?"center":"bottom";}

function initMembers(){
 DATA.members.forEach(name=>{
   const b=document.createElement("button");b.className="member";b.textContent=name;
   b.onclick=()=>{state.member=name;state.visual=null;$$(".member").forEach(x=>x.classList.toggle("selected",x===b));renderVisuals();validate();};
   $("#memberGrid").appendChild(b);
 });
}
function renderVisuals(){
 const grid=$("#visualGrid");grid.innerHTML="";
 if(!state.member){$("#visualStatus").textContent="BIASを選択してください";return;}
 const items=visualPool(state.member);$("#visualStatus").textContent=items.length+"候補";
 items.forEach(item=>{
   const b=document.createElement("button");b.className="visual";
   if(item.cropPart){
     const d=document.createElement("div");d.className="crop";d.style.backgroundImage="url('"+item.src+"')";d.style.backgroundPosition="center "+cropPos(item.cropPart);b.appendChild(d);
   }else{
     const img=document.createElement("img");img.src=item.src;img.loading="lazy";img.alt="";b.appendChild(img);
   }
   b.onclick=()=>{state.visual=item;$$(".visual").forEach(x=>x.classList.toggle("selected",x===b));validate();};
   grid.appendChild(b);
 });
}

function initSongs(){
 renderSongs(DATA.songs);
 $("#songSearch").oninput=e=>{const q=e.target.value.trim().toLowerCase();renderSongs(DATA.songs.filter(s=>s.toLowerCase().includes(q)));};
}
function renderSongs(list){
 const wrap=$("#songList");wrap.innerHTML="";
 list.forEach(title=>{
   const b=document.createElement("button");b.className="song"+(state.songs.includes(title)?" selected":"");
   const rank=state.songs.indexOf(title)+1;
   b.innerHTML="<span>"+title+"</span><small>"+(rank?rank:"")+"</small>";
   b.onclick=()=>{
     const idx=state.songs.indexOf(title);
     if(idx>=0) state.songs.splice(idx,1);
     else if(state.songs.length<3) state.songs.push(title);
     renderSongSelected();renderSongs(list);validate();
   };
   wrap.appendChild(b);
 });
}
function renderSongSelected(){
 const wrap=$("#songSelected");wrap.innerHTML="";
 state.songs.forEach((s,i)=>{const d=document.createElement("div");d.className="song-chip";d.innerHTML="<b>"+(i+1)+"</b>"+s;wrap.appendChild(d);});
}

function initLives(){
 ["#firstLive","#nextLive"].forEach(sel=>{
   const el=$(sel);el.innerHTML='<option value="">選択してください</option>';
   DATA.lives.forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;el.appendChild(o);});
 });
 $("#firstLive").onchange=e=>toggleOther(e.target,$("#firstLiveOther"));
 $("#nextLive").onchange=e=>toggleOther(e.target,$("#nextLiveOther"));
}
function toggleOther(select,input){input.hidden=select.value!=="その他";}

function initAreas(){
 DATA.areas.forEach(a=>{
   const b=document.createElement("button");b.className="area";b.textContent=a;
   b.onclick=()=>{const i=state.areas.indexOf(a);if(i>=0)state.areas.splice(i,1);else state.areas.push(a);b.classList.toggle("selected",state.areas.includes(a));};
   $("#areaGrid").appendChild(b);
 });
}
function initDesigns(){
 const designs=[["editorial","EDITORIAL"],["photo","PHOTO"],["minimal","MINIMAL"],["soft","SOFT"]];
 designs.forEach(([key,label])=>{
  const b=document.createElement("button");b.className="design-card";b.innerHTML='<div class="design-preview '+key+'">'+label+'</div><b>'+label+'</b>';
  b.onclick=()=>{state.design=key;$$(".design-card").forEach(x=>x.classList.toggle("selected",x===b));$("#toResult").disabled=false;};
  $("#designGrid").appendChild(b);
 });
}
function validate(){$("#toDesign").disabled=!(state.member&&state.visual&&state.songs.length===3);}
$("#toDesign").onclick=()=>show("design");
$("#toResult").onclick=async()=>{await drawResult();show("result");};

function getLiveValue(sel,other){return $(sel).value==="その他"?$(other).value.trim():$(sel).value;}
function loadImage(src){return new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src;});}
function drawCover(ctx,img,item,x,y,w,h){
 if(!img){ctx.fillStyle="#ddd";ctx.fillRect(x,y,w,h);return;}
 let sx=0,sy=0,sw=img.naturalWidth,sh=img.naturalHeight;
 if(item.cropPart){sh=img.naturalHeight/3;sy=(item.cropPart-1)*sh;}
 const scale=Math.max(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
 const dx=x+(w-dw)/2,dy=item.cropPart?y+(h-dh)/2:y;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);ctx.restore();
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 const chars=[...String(text||"")];let line="",lines=[];
 chars.forEach(ch=>{const t=line+ch;if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=ch}else line=t;});
 if(line)lines.push(line);lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
}
async function drawResult(){
 const c=$("#resultCanvas"),ctx=c.getContext("2d"),theme=state.design||"editorial";
 const bg=theme==="soft"?"#f4e8e2":"#fffdf9",ink="#292724",muted="#817a70";
 ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
 const img=await loadImage(state.visual.src);
 if(theme==="photo"){
   drawCover(ctx,img,state.visual,0,0,1080,760);
   ctx.fillStyle="rgba(255,253,249,.94)";ctx.fillRect(0,720,1080,630);
 }else{
   drawCover(ctx,img,state.visual,70,160,430,560);
 }
 ctx.fillStyle=ink;ctx.textAlign="left";ctx.font='700 54px "Zen Kaku Gothic New",sans-serif';
 ctx.fillText($("#nameInput").value.trim()||"MUZE PROFILE",70,78);
 ctx.font='700 20px "Zen Kaku Gothic New",sans-serif';ctx.fillText("BIAS  "+state.member,72,118);
 if($("#xInput").value.trim()){ctx.fillStyle=muted;ctx.font='500 18px "Zen Kaku Gothic New",sans-serif';ctx.fillText($("#xInput").value.trim(),72,146);}
 const tx=theme==="photo"?70:550, top=theme==="photo"?790:190, width=theme==="photo"?940:460;
 ctx.fillStyle=muted;ctx.font='700 15px "Zen Kaku Gothic New",sans-serif';ctx.fillText("沼ポイント",tx,top);
 ctx.fillStyle=ink;ctx.font='500 24px "Zen Kaku Gothic New",sans-serif';wrapText(ctx,$("#numaInput").value.trim(),tx,top+38,width,34,3);
 let y=top+150;
 ctx.fillStyle=muted;ctx.font='700 15px "Zen Kaku Gothic New",sans-serif';ctx.fillText("好きな曲 TOP3",tx,y);
 ctx.fillStyle=ink;ctx.font='700 23px "Zen Kaku Gothic New",sans-serif';
 state.songs.forEach((s,i)=>ctx.fillText((i+1)+". "+s,tx,y+38+i*38));
 y+=180;
 const first=getLiveValue("#firstLive","#firstLiveOther"),next=getLiveValue("#nextLive","#nextLiveOther");
 ctx.fillStyle=muted;ctx.font='700 15px "Zen Kaku Gothic New",sans-serif';ctx.fillText("初現場",tx,y);
 ctx.fillStyle=ink;ctx.font='500 19px "Zen Kaku Gothic New",sans-serif';wrapText(ctx,first||"—",tx,y+34,width,28,2);
 y+=100;
 ctx.fillStyle=muted;ctx.font='700 15px "Zen Kaku Gothic New",sans-serif';ctx.fillText("次の現場",tx,y);
 ctx.fillStyle=ink;ctx.font='500 19px "Zen Kaku Gothic New",sans-serif';wrapText(ctx,next||"—",tx,y+34,width,28,2);
 y+=100;
 ctx.fillStyle=muted;ctx.font='700 15px "Zen Kaku Gothic New",sans-serif';ctx.fillText("遠征エリア",tx,y);
 ctx.fillStyle=ink;ctx.font='500 19px "Zen Kaku Gothic New",sans-serif';wrapText(ctx,state.areas.join(" / ")||"—",tx,y+34,width,28,2);
 if(theme!=="photo"){
   ctx.strokeStyle="rgba(41,39,36,.18)";ctx.beginPath();ctx.moveTo(70,770);ctx.lineTo(1010,770);ctx.stroke();
   ctx.fillStyle=muted;ctx.font='700 14px "Zen Kaku Gothic New",sans-serif';ctx.fillText("FAVORITE VISUAL",70,810);
 }
 ctx.fillStyle=muted;ctx.textAlign="right";ctx.font='500 13px "Zen Kaku Gothic New",sans-serif';ctx.fillText("created with MUZE TOOL BOX",1010,1312);
}
function dataURLtoBlob(dataURL){const [h,d]=dataURL.split(","),m=h.match(/:(.*?);/)[1],b=atob(d),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:m});}
$("#saveImage").onclick=async()=>{await drawResult();const url=$("#resultCanvas").toDataURL("image/png");try{const blob=dataURLtoBlob(url),file=new File([blob],"muze-profile.png",{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"MUZE PROFILE"});return;}const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();$("#saveStatus").textContent="画像を保存しました";}catch(e){$("#fallbackImage").src=url;$("#fallback").hidden=false;}};
$("#closeFallback").onclick=()=>$("#fallback").hidden=true;

initMembers();initSongs();initLives();initAreas();initDesigns();validate();