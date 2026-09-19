const MEMBERS=["KAIRYU","NAOYA","RAN","SEITO","RYUKI","TAKUTO","HAYATO","EIKI"];
const PRESETS={
  safety:{no:"01",name:"治安 MAP",top:"治安良",bottom:"治安悪",left:"クール",right:"色気"},
  distance:{no:"02",name:"距離感 MAP",top:"彼氏感",bottom:"神々しい",left:"メロい",right:"かわいい"},
  world:{no:"03",name:"世界観 MAP",top:"天使",bottom:"ヴィラン",left:"儚い",right:"強い"},
  custom:{no:"04",name:"CUSTOM",top:"",bottom:"",left:"",right:""}
};
const state={member:null,preset:null,photos:[],selectedId:null};
const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
function show(id){$$(".screen").forEach(x=>x.classList.remove("is-active"));$("#"+id).classList.add("is-active");window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-next]").forEach(b=>b.onclick=()=>show(b.dataset.next));$$("[data-back]").forEach(b=>b.onclick=()=>show(b.dataset.back));
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));}

function initMembers(){
  const list=$("#memberList");
  MEMBERS.forEach(name=>{const b=document.createElement("button");b.type="button";b.className="member-button";b.textContent=name;b.onclick=()=>{state.member=name;$$(".member-button").forEach(x=>x.classList.toggle("is-selected",x===b));$("#toMap").disabled=false;};list.appendChild(b);});
}
$("#toMap").onclick=()=>show("screen-map");

function initPresets(){
  const list=$("#presetList");
  Object.entries(PRESETS).forEach(([key,p])=>{
    const card=document.createElement("div");card.className="preset-card";card.dataset.key=key;
    const button=document.createElement("button");button.type="button";button.className="preset-select";
    button.innerHTML='<span class="preset-no">'+p.no+' / 04</span><span class="preset-title">'+p.name+'</span>';
    card.appendChild(button);
    const spec=document.createElement("div");spec.className="axis-spec";
    if(key==="custom"){
      spec.innerHTML='<span><b>縦軸</b>　自由入力</span><span><b>横軸</b>　自由入力</span>';
      const fields=document.createElement("div");fields.className="custom-fields";
      fields.innerHTML='<label>上<input id="customTop" maxlength="10" placeholder="例：光"></label><label>下<input id="customBottom" maxlength="10" placeholder="例：闇"></label><label>左<input id="customLeft" maxlength="10" placeholder="例：かわいい"></label><label>右<input id="customRight" maxlength="10" placeholder="例：色気"></label>';
      card.appendChild(spec);card.appendChild(fields);
      fields.addEventListener("focusin",()=>selectPreset(key,card));fields.addEventListener("click",()=>selectPreset(key,card));
    }else{
      spec.innerHTML='<span><b>縦軸</b>　上：'+p.top+' / 下：'+p.bottom+'</span><span><b>横軸</b>　左：'+p.left+' / 右：'+p.right+'</span>';card.appendChild(spec);
    }
    button.onclick=()=>selectPreset(key,card);list.appendChild(card);
  });
}
function selectPreset(key,card){state.preset=key;$$(".preset-card").forEach(x=>x.classList.toggle("is-selected",x===card));$("#toPhotos").disabled=false;}
$("#toPhotos").onclick=()=>{if(state.preset==="custom"){const ids=["customTop","customBottom","customLeft","customRight"];if(ids.some(id=>!$("#"+id).value.trim())){alert("CUSTOMは上下左右を入力してください");return;}}show("screen-photos");};
function currentAxes(){if(state.preset!=="custom")return PRESETS[state.preset||"safety"];return{name:"CUSTOM",top:$("#customTop").value.trim(),bottom:$("#customBottom").value.trim(),left:$("#customLeft").value.trim(),right:$("#customRight").value.trim()};}

function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
$("#photoInput").addEventListener("change",async e=>{const files=[...e.target.files].slice(0,9-state.photos.length);for(const f of files){const src=await fileToDataURL(f);state.photos.push({id:(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()),src,x:.5,y:.5,size:58});}e.target.value="";renderPhotoList();});
function renderPhotoList(){const list=$("#photoList");list.innerHTML="";state.photos.forEach(p=>{const d=document.createElement("div");d.className="photo-thumb";d.innerHTML='<img src="'+p.src+'" alt=""><button type="button" aria-label="削除">×</button>';d.querySelector("button").onclick=()=>{state.photos=state.photos.filter(x=>x.id!==p.id);renderPhotoList();};list.appendChild(d);});$("#toEditor").disabled=state.photos.length===0;}
$("#toEditor").onclick=()=>{applyAxes();layoutInitial();renderMap();$("#summaryMember").textContent=state.member||"";$("#summaryMap").textContent=currentAxes().name;show("screen-editor");};
function applyAxes(){const a=currentAxes();$("#axisTop").textContent=a.top;$("#axisBottom").textContent=a.bottom;$("#axisLeft").textContent=a.left;$("#axisRight").textContent=a.right;}
function layoutInitial(){const cols=3,rows=Math.ceil(state.photos.length/cols);state.photos.forEach((p,i)=>{if(p._placed)return;const c=i%cols,r=Math.floor(i/cols);p.x=(c+1)/(cols+1);p.y=(r+1)/(rows+1);p._placed=true;});}
function renderMap(){const box=$("#mapPhotos");box.innerHTML="";state.photos.forEach(p=>{const el=document.createElement("div");el.className="map-photo"+(p.id===state.selectedId?" is-selected":"");el.dataset.id=p.id;el.style.left=(p.x*100)+"%";el.style.top=(p.y*100)+"%";el.innerHTML='<div class="pic" style="width:'+p.size+'px;height:'+p.size+'px"><img src="'+p.src+'" alt="" draggable="false"></div>';box.appendChild(el);});}
function selectPhoto(id){state.selectedId=id;const p=state.photos.find(x=>x.id===id);$("#sizeRange").disabled=!p;$("#deleteSelected").disabled=!p;$("#selectedHint").textContent=p?"選択中の写真サイズを調整できます":"写真をタップするとサイズを調整できます";if(p)$("#sizeRange").value=p.size;$$(".map-photo").forEach(el=>el.classList.toggle("is-selected",el.dataset.id===id));}

let drag=null;
function beginDrag(e,el){
  e.preventDefault();
  const id=el.dataset.id,p=state.photos.find(x=>x.id===id);if(!p)return;
  selectPhoto(id);const rect=$("#mapCanvas").getBoundingClientRect();drag={p,el,rect,pointerId:e.pointerId};
  try{el.setPointerCapture?.(e.pointerId);}catch(_){}
}
function moveDrag(e){
  if(!drag)return;e.preventDefault();const half=(drag.p.size/2)+4;
  const minX=half/drag.rect.width,maxX=1-minX,minY=half/drag.rect.height,maxY=1-minY;
  drag.p.x=Math.min(maxX,Math.max(minX,(e.clientX-drag.rect.left)/drag.rect.width));drag.p.y=Math.min(maxY,Math.max(minY,(e.clientY-drag.rect.top)/drag.rect.height));
  drag.el.style.left=(drag.p.x*100)+"%";drag.el.style.top=(drag.p.y*100)+"%";
}
function endDrag(){drag=null;}
$("#mapPhotos").addEventListener("pointerdown",e=>{const el=e.target.closest(".map-photo");if(el)beginDrag(e,el);});
window.addEventListener("pointermove",moveDrag,{passive:false});window.addEventListener("pointerup",endDrag);window.addEventListener("pointercancel",endDrag);
$("#mapPhotos").addEventListener("click",e=>{const el=e.target.closest(".map-photo");if(el)selectPhoto(el.dataset.id);});
$("#sizeRange").oninput=e=>{const p=state.photos.find(x=>x.id===state.selectedId);if(p){p.size=+e.target.value;const el=document.querySelector('.map-photo[data-id="'+p.id+'"] .pic');if(el){el.style.width=p.size+"px";el.style.height=p.size+"px";}}};
$("#deleteSelected").onclick=()=>{if(!state.selectedId)return;state.photos=state.photos.filter(x=>x.id!==state.selectedId);state.selectedId=null;renderPhotoList();renderMap();selectPhoto(null);};

$("#toPreview").onclick=async()=>{await drawResult();show("screen-preview");};
async function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});}
function fitCrop(ctx,img,x,y,w,h){const scale=Math.max(w/img.width,h/img.height),sw=w/scale,sh=h/scale,sx=(img.width-sw)/2,sy=(img.height-sh)/2;ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
async function drawResult(){
  const c=$("#resultCanvas"),ctx=c.getContext("2d"),a=currentAxes();ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle="#fffdf9";ctx.fillRect(0,0,1080,1080);
  ctx.fillStyle="#292724";ctx.textAlign="left";ctx.font='700 46px "Zen Kaku Gothic New",sans-serif';ctx.fillText(state.member||"BIAS",62,68);
  ctx.fillStyle="#817a70";ctx.font='700 17px "Zen Kaku Gothic New",sans-serif';ctx.fillText("BIAS MAP / "+a.name,64,101);
  const mx=105,my=155,mw=870,mh=810,cx=mx+mw/2,cy=my+mh/2;
  ctx.strokeStyle="#292724";ctx.lineWidth=2;ctx.strokeRect(mx,my,mw,mh);ctx.strokeStyle="rgba(41,39,36,.38)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx,my);ctx.lineTo(cx,my+mh);ctx.moveTo(mx,cy);ctx.lineTo(mx+mw,cy);ctx.stroke();
  ctx.fillStyle="#292724";ctx.font='600 21px "Klee One",sans-serif';ctx.textAlign="center";ctx.fillText(a.top,cx,my-18);ctx.fillText(a.bottom,cx,my+mh+27);
  ctx.save();ctx.translate(mx-31,cy);ctx.rotate(-Math.PI/2);ctx.fillText(a.left,0,0);ctx.restore();ctx.save();ctx.translate(mx+mw+31,cy);ctx.rotate(Math.PI/2);ctx.fillText(a.right,0,0);ctx.restore();
  for(const p of state.photos){const img=await loadImage(p.src),size=p.size*1.75,x=mx+p.x*mw-size/2,y=my+p.y*mh-size/2;ctx.save();ctx.fillStyle="#fff";ctx.shadowColor="rgba(0,0,0,.11)";ctx.shadowBlur=9;ctx.shadowOffsetY=4;ctx.fillRect(x-4,y-4,size+8,size+8);ctx.shadowColor="transparent";ctx.beginPath();ctx.rect(x,y,size,size);ctx.clip();fitCrop(ctx,img,x,y,size,size);ctx.restore();}
  ctx.fillStyle="#817a70";ctx.font='500 14px "Zen Kaku Gothic New",sans-serif';ctx.textAlign="right";ctx.fillText("created with MUZE TOOL BOX",1018,1048);
}
function dataURLtoBlob(dataURL){const [head,data]=dataURL.split(","),mime=head.match(/:(.*?);/)[1],bin=atob(data),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
$("#saveImage").onclick=async()=>{await drawResult();const url=$("#resultCanvas").toDataURL("image/png");try{const blob=dataURLtoBlob(url),file=new File([blob],(state.member||"bias").toLowerCase()+"-bias-map.png",{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"BIAS MAP"});return;}const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();$("#saveStatus").textContent="画像を保存しました";}catch(e){$("#fallbackImage").src=url;$("#fallback").hidden=false;}};
$("#closeFallback").onclick=()=>$("#fallback").hidden=true;

function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open("muze-tool-box",2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("biasMaps"))r.result.createObjectStore("biasMaps",{keyPath:"id"});};r.onsuccess=()=>resolve(r.result);r.onerror=reject;});}
function getAllProjects(){return new Promise(async(resolve,reject)=>{try{const db=await openDB(),tx=db.transaction("biasMaps","readonly"),req=tx.objectStore("biasMaps").getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=reject;}catch(e){reject(e);}});}
async function renderSavedProjects(){try{const projects=(await getAllProjects()).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))),section=$("#savedSection"),list=$("#savedList");list.innerHTML="";section.hidden=projects.length===0;projects.forEach(p=>{const card=document.createElement("div");card.className="saved-card";const date=new Date(p.createdAt),label=isNaN(date)?p.createdAt:date.toLocaleDateString("ja-JP",{month:"numeric",day:"numeric"});card.innerHTML='<button class="saved-open" type="button"><span class="saved-title">'+escapeHtml(p.member||"BIAS")+'</span><span class="saved-meta">'+escapeHtml((p.axes&&p.axes.name)||"BIAS MAP")+' · '+label+'</span></button><button class="saved-delete" type="button">削除</button>';card.querySelector(".saved-open").onclick=()=>openProject(p);card.querySelector(".saved-delete").onclick=()=>deleteProject(p.id);list.appendChild(card);});}catch(e){}}
function openProject(p){state.member=p.member||MEMBERS[0];state.preset=p.preset||"custom";state.photos=(p.photos||[]).map(x=>({...x,_placed:true}));state.selectedId=null;if(state.preset==="custom"&&p.axes){selectCustomInputs(p.axes);}renderPhotoList();applyAxes();renderMap();$("#summaryMember").textContent=state.member;$("#summaryMap").textContent=currentAxes().name;show("screen-editor");}
function selectCustomInputs(a){["Top","Bottom","Left","Right"].forEach(k=>{const el=$("#custom"+k);if(el)el.value=a[k.toLowerCase()]||"";});}
async function deleteProject(id){try{const db=await openDB(),tx=db.transaction("biasMaps","readwrite");tx.objectStore("biasMaps").delete(id);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej;});renderSavedProjects();}catch(e){}}
$("#saveProject").onclick=async()=>{try{const db=await openDB(),tx=db.transaction("biasMaps","readwrite"),store=tx.objectStore("biasMaps"),project={id:"bias-"+Date.now(),createdAt:new Date().toISOString(),member:state.member,preset:state.preset,axes:currentAxes(),photos:state.photos};store.put(project);await new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=rej;});$("#saveStatus").textContent="この端末にMAPを保存しました";renderSavedProjects();}catch(e){$("#saveStatus").textContent="端末保存に失敗しました";}};

initMembers();initPresets();renderSavedProjects();