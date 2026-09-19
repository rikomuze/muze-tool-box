const PRESETS = {
  safety:{name:"治安 MAP",top:"治安良",bottom:"治安悪",left:"クール",right:"色気"},
  distance:{name:"距離感 MAP",top:"彼氏感",bottom:"神々しい",left:"メロい",right:"かわいい"},
  world:{name:"世界観 MAP",top:"天使",bottom:"ヴィラン",left:"儚い",right:"強い"},
  custom:{name:"CUSTOM",top:"",bottom:"",left:"",right:""}
};

const state={preset:null,photos:[],selectedId:null};
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function show(id){
  $$(".screen").forEach(x=>x.classList.remove("is-active"));
  $("#"+id).classList.add("is-active");
  window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-next]").forEach(b=>b.onclick=()=>show(b.dataset.next));
$$("[data-back]").forEach(b=>b.onclick=()=>show(b.dataset.back));

function initPresets(){
  const list=$("#presetList");
  Object.entries(PRESETS).forEach(([key,p])=>{
    const b=document.createElement("button");
    b.className="preset";
    b.type="button";
    b.dataset.key=key;
    b.innerHTML='<strong>'+p.name+'</strong><small>'+(key==="custom"?"上下左右を自由入力":p.top+' ↕ '+p.bottom+'<br>'+p.left+' ↔ '+p.right)+'</small>';
    b.onclick=()=>selectPreset(key,b);
    list.appendChild(b);
  });
}
function selectPreset(key,button){
  state.preset=key;
  $$(".preset").forEach(x=>x.classList.remove("is-selected"));
  button.classList.add("is-selected");
  $("#customFields").hidden=key!=="custom";
  $("#toPhotos").disabled=false;
}
$("#toPhotos").onclick=()=>{
  if(state.preset==="custom"){
    const vals=["customTop","customBottom","customLeft","customRight"].map(id=>$("#"+id).value.trim());
    if(vals.some(v=>!v)){alert("CUSTOMは上下左右を入力してね");return;}
  }
  show("screen-photos");
};

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file);
  });
}
$("#photoInput").addEventListener("change",async e=>{
  const remaining=9-state.photos.length;
  const files=[...e.target.files].slice(0,remaining);
  for(const f of files){
    const src=await fileToDataURL(f);
    state.photos.push({id:crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random(),src,x:.5,y:.5,size:82,comment:""});
  }
  e.target.value="";
  renderPhotoList();
});
function renderPhotoList(){
  const list=$("#photoList"); list.innerHTML="";
  state.photos.forEach(p=>{
    const d=document.createElement("div"); d.className="photo-thumb";
    d.innerHTML='<img src="'+p.src+'" alt=""><button type="button" aria-label="削除">×</button>';
    d.querySelector("button").onclick=()=>{state.photos=state.photos.filter(x=>x.id!==p.id);renderPhotoList();};
    list.appendChild(d);
  });
  $("#toEditor").disabled=state.photos.length===0;
}
$("#toEditor").onclick=()=>{applyAxes();layoutInitial();renderMap();show("screen-editor");};

function currentAxes(){
  if(state.preset!=="custom") return PRESETS[state.preset||"safety"];
  return {name:"CUSTOM",top:$("#customTop").value.trim(),bottom:$("#customBottom").value.trim(),left:$("#customLeft").value.trim(),right:$("#customRight").value.trim()};
}
function applyAxes(){
  const a=currentAxes();
  $("#axisTop").textContent=a.top; $("#axisBottom").textContent=a.bottom; $("#axisLeft").textContent=a.left; $("#axisRight").textContent=a.right;
}
function layoutInitial(){
  const cols=3, rows=Math.ceil(state.photos.length/cols);
  state.photos.forEach((p,i)=>{
    if(p._placed) return;
    const c=i%cols, r=Math.floor(i/cols);
    p.x=(c+1)/(cols+1); p.y=(r+1)/(rows+1); p._placed=true;
  });
}

function renderMap(){
  const box=$("#mapPhotos");box.innerHTML="";
  state.photos.forEach(p=>{
    const el=document.createElement("div"); el.className="map-photo"+(p.id===state.selectedId?" is-selected":""); el.dataset.id=p.id;
    el.style.left=(p.x*100)+"%"; el.style.top=(p.y*100)+"%";
    el.innerHTML='<div class="pic" style="width:'+p.size+'px;height:'+p.size+'px"><img src="'+p.src+'" alt=""></div><div class="caption">'+escapeHtml(p.comment)+'</div>';
    el.addEventListener("pointerdown",startDrag);
    el.addEventListener("click",()=>selectPhoto(p.id));
    box.appendChild(el);
  });
}
function escapeHtml(s){return (s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}
function selectPhoto(id){
  state.selectedId=id; const p=state.photos.find(x=>x.id===id);
  $("#sizeRange").disabled=!p; $("#commentInput").disabled=!p; $("#deleteSelected").disabled=!p;
  $("#selectedHint").textContent=p?"選択中：サイズとひとことを調整":"写真をタップすると調整できます";
  if(p){$("#sizeRange").value=p.size;$("#commentInput").value=p.comment||"";}
  renderMap();
}
let drag=null;
function startDrag(e){
  e.preventDefault();
  const id=e.currentTarget.dataset.id; selectPhoto(id);
  const p=state.photos.find(x=>x.id===id); const rect=$("#mapCanvas").getBoundingClientRect();
  drag={p,rect,pointerId:e.pointerId};
  e.currentTarget.setPointerCapture?.(e.pointerId);
  e.currentTarget.addEventListener("pointermove",moveDrag);
  e.currentTarget.addEventListener("pointerup",endDrag,{once:true});
}
function moveDrag(e){
  if(!drag)return;
  drag.p.x=Math.min(.94,Math.max(.06,(e.clientX-drag.rect.left)/drag.rect.width));
  drag.p.y=Math.min(.94,Math.max(.06,(e.clientY-drag.rect.top)/drag.rect.height));
  const el=document.querySelector('.map-photo[data-id="'+drag.p.id+'"]');
  if(el){el.style.left=(drag.p.x*100)+"%";el.style.top=(drag.p.y*100)+"%";}
}
function endDrag(e){
  e.currentTarget.removeEventListener("pointermove",moveDrag); drag=null;
}
$("#sizeRange").oninput=e=>{const p=state.photos.find(x=>x.id===state.selectedId);if(p){p.size=+e.target.value;renderMap();}};
$("#commentInput").oninput=e=>{const p=state.photos.find(x=>x.id===state.selectedId);if(p){p.comment=e.target.value;renderMap();}};
$("#deleteSelected").onclick=()=>{if(!state.selectedId)return;state.photos=state.photos.filter(x=>x.id!==state.selectedId);state.selectedId=null;selectPhoto(null);renderPhotoList();renderMap();};

$("#toPreview").onclick=async()=>{await drawResult();show("screen-preview");};

async function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function fitCrop(ctx,img,x,y,w,h){
  const scale=Math.max(w/img.width,h/img.height);
  const sw=w/scale, sh=h/scale, sx=(img.width-sw)/2, sy=(img.height-sh)/2;
  ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
}
function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
}
async function drawResult(){
  const c=$("#resultCanvas"),ctx=c.getContext("2d"),a=currentAxes();
  ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle="#fffdf9";ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle="#292724";ctx.textAlign="left";ctx.font='700 48px "Zen Kaku Gothic New",sans-serif';ctx.fillText($("#mapTitle").value||"MY OSHI MAP",80,92);
  ctx.fillStyle="#817a70";ctx.font='700 18px "Zen Kaku Gothic New",sans-serif';ctx.fillText((a.name||"OSHI MAP").toUpperCase(),82,128);

  const mx=150,my=210,mw=780,mh=700,cx=mx+mw/2,cy=my+mh/2;
  ctx.strokeStyle="#292724";ctx.lineWidth=2;ctx.strokeRect(mx,my,mw,mh);
  ctx.strokeStyle="rgba(41,39,36,.38)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,my);ctx.lineTo(cx,my+mh);ctx.moveTo(mx,cy);ctx.lineTo(mx+mw,cy);ctx.stroke();

  ctx.fillStyle="#292724";ctx.font='600 24px "Klee One",sans-serif';ctx.textAlign="center";
  ctx.fillText(a.top,cx,my-28);ctx.fillText(a.bottom,cx,my+mh+40);
  ctx.save();ctx.translate(mx-44,cy);ctx.rotate(-Math.PI/2);ctx.fillText(a.left,0,0);ctx.restore();
  ctx.save();ctx.translate(mx+mw+44,cy);ctx.rotate(Math.PI/2);ctx.fillText(a.right,0,0);ctx.restore();

  for(const p of state.photos){
    const img=await loadImage(p.src); const size=p.size*2.05, x=mx+p.x*mw-size/2, y=my+p.y*mh-size/2;
    ctx.save();ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.12)";ctx.shadowBlur=12;ctx.shadowOffsetY=5;roundRect(ctx,x-5,y-5,size+10,size+10,2);ctx.fill();ctx.shadowColor="transparent";ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();fitCrop(ctx,img,x,y,size,size);ctx.restore();
    if(p.comment){ctx.fillStyle="#292724";ctx.font='600 18px "Klee One",sans-serif';ctx.textAlign="center";ctx.fillText(p.comment,mx+p.x*mw,y+size+28);}
  }
  ctx.fillStyle="#817a70";ctx.font='500 16px "Zen Kaku Gothic New",sans-serif';ctx.textAlign="right";ctx.fillText("created with MUZE TOOL BOX",1000,1032);
}

function dataURLtoBlob(dataURL){
  const [head,data]=dataURL.split(","),mime=head.match(/:(.*?);/)[1],bin=atob(data),arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});
}
$("#saveImage").onclick=async()=>{
  await drawResult();
  const c=$("#resultCanvas"),url=c.toDataURL("image/png");
  try{
    const blob=dataURLtoBlob(url),file=new File([blob],"oshi-map.png",{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"OSHI MAP"});return;}
    const a=document.createElement("a");a.href=url;a.download="oshi-map.png";document.body.appendChild(a);a.click();a.remove();
    $("#saveStatus").textContent="画像を保存しました";
  }catch(e){
    $("#fallbackImage").src=url;$("#fallback").hidden=false;
  }
};
$("#closeFallback").onclick=()=>$("#fallback").hidden=true;

function openDB(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open("muze-tool-box",1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("oshiMaps"))r.result.createObjectStore("oshiMaps",{keyPath:"id"});};
    r.onsuccess=()=>resolve(r.result);r.onerror=reject;
  });
}
$("#saveProject").onclick=async()=>{
  try{
    const db=await openDB(),tx=db.transaction("oshiMaps","readwrite"),store=tx.objectStore("oshiMaps");
    const project={id:"oshi-"+Date.now(),createdAt:new Date().toISOString(),title:$("#mapTitle").value,preset:state.preset,axes:currentAxes(),photos:state.photos};
    store.put(project);
    await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej;});
    $("#saveStatus").textContent="この端末にMAPを保存しました";
  }catch(e){$("#saveStatus").textContent="端末保存に失敗しました";}
};

initPresets();
