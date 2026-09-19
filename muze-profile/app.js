const DATA=window.MUZE_PROFILE_DATA;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={member:null,visual:null,songs:[],areas:[],design:null};

function show(id){$$(".screen").forEach(x=>x.classList.remove("active"));$("#"+id).classList.add("active");window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-go]").forEach(b=>b.onclick=()=>show(b.dataset.go));

function initMembers(){
 DATA.members.forEach(name=>{
   const b=document.createElement("button");b.className="member";b.textContent=name;
   b.onclick=()=>{state.member=name;$$(".member").forEach(x=>x.classList.toggle("selected",x===b));validate();};
   $("#memberGrid").appendChild(b);
 });
}

function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
$("#visualInput").addEventListener("change",async e=>{
 const file=e.target.files&&e.target.files[0];if(!file)return;
 state.visual={src:await fileToDataURL(file)};
 $("#visualPreviewImg").src=state.visual.src;
 $("#visualPreview").hidden=false;
 $("#visualStatus").textContent="選択済み";
 validate();
});
$("#visualClear").onclick=()=>{
 state.visual=null;$("#visualInput").value="";$("#visualPreview").hidden=true;$("#visualStatus").textContent="1枚アップロード";validate();
};

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
     if(idx>=0)state.songs.splice(idx,1);else if(state.songs.length<3)state.songs.push(title);
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
function drawCover(ctx,img,x,y,w,h,mode="cover"){
 if(!img){ctx.fillStyle="#ddd";ctx.fillRect(x,y,w,h);return;}
 const scale=mode==="contain"?Math.min(w/img.naturalWidth,h/img.naturalHeight):Math.max(w/img.naturalWidth,h/img.naturalHeight);
 const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale,dx=x+(w-dw)/2,dy=y+(h-dh)/2;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,dx,dy,dw,dh);ctx.restore();
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
 const chars=[...String(text||"")];let line="",lines=[];
 chars.forEach(ch=>{const t=line+ch;if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=ch}else line=t;});
 if(line)lines.push(line);lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
}
function label(ctx,text,x,y){ctx.fillStyle="#817a70";ctx.font='700 14px "Zen Kaku Gothic New",sans-serif';ctx.fillText(text,x,y);}
function value(ctx,text,x,y,width,size=20,lines=2){ctx.fillStyle="#292724";ctx.font='500 '+size+'px "Zen Kaku Gothic New",sans-serif';wrapText(ctx,text||"—",x,y,width,size+9,lines);}
function divider(ctx,x1,y,x2){ctx.strokeStyle="rgba(41,39,36,.18)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();}

async function drawResult(){
 const c=$("#resultCanvas"),ctx=c.getContext("2d"),theme=state.design||"editorial";
 const ink="#292724",muted="#817a70";
 const bg=theme==="soft"?"#f4e8e2":"#fffdf9";
 ctx.clearRect(0,0,1080,1350);ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
 const img=await loadImage(state.visual.src);
 const name=$("#nameInput").value.trim()||"MUZE PROFILE",xid=$("#xInput").value.trim();
 const first=getLiveValue("#firstLive","#firstLiveOther")||"—",next=getLiveValue("#nextLive","#nextLiveOther")||"—";
 const areas=state.areas.join(" / ")||"—";

 if(theme==="photo"){
   drawCover(ctx,img,0,0,1080,760,"cover");
   ctx.fillStyle="rgba(255,253,249,.96)";ctx.fillRect(0,700,1080,650);
   ctx.fillStyle=ink;ctx.textAlign="left";ctx.font='700 54px "Zen Kaku Gothic New",sans-serif';ctx.fillText(name,64,780);
   ctx.font='700 19px "Zen Kaku Gothic New",sans-serif';ctx.fillText("BIAS  "+state.member,66,817);
   if(xid){ctx.fillStyle=muted;ctx.font='500 17px "Zen Kaku Gothic New",sans-serif';ctx.fillText(xid,66,846);}
   label(ctx,"沼ポイント",64,900);value(ctx,$("#numaInput").value.trim(),64,938,952,22,2);
   divider(ctx,64,1015,1016);
   label(ctx,"好きな曲 TOP3",64,1050);
   ctx.fillStyle=ink;ctx.font='700 20px "Zen Kaku Gothic New",sans-serif';state.songs.forEach((s,i)=>ctx.fillText((i+1)+". "+s,64,1088+i*34));
   label(ctx,"初現場",550,1050);value(ctx,first,550,1088,466,18,2);
   label(ctx,"次の現場",550,1162);value(ctx,next,550,1200,466,18,2);
   label(ctx,"遠征エリア",64,1240);value(ctx,areas,64,1277,952,18,2);
 }else{
   // PNG仕様書に寄せた雑誌プロフィール型。写真を左、情報を右、下部に現場情報。
   ctx.fillStyle=ink;ctx.textAlign="left";ctx.font='700 58px "Zen Kaku Gothic New",sans-serif';ctx.fillText(name,70,82);
   ctx.font='700 20px "Zen Kaku Gothic New",sans-serif';ctx.fillText("MUZE PROFILE",72,119);
   if(xid){ctx.fillStyle=muted;ctx.font='500 17px "Zen Kaku Gothic New",sans-serif';ctx.fillText(xid,72,147);}

   const photoX=70,photoY=190,photoW=440,photoH=625;
   ctx.fillStyle="#fff";ctx.fillRect(photoX-7,photoY-7,photoW+14,photoH+14);
   drawCover(ctx,img,photoX,photoY,photoW,photoH,theme==="minimal"?"contain":"cover");

   const tx=560,tw=450;
   label(ctx,"BIAS",tx,208);ctx.fillStyle=ink;ctx.font='700 35px "Zen Kaku Gothic New",sans-serif';ctx.fillText(state.member,tx,252);
   divider(ctx,tx,285,1010);
   label(ctx,"沼ポイント",tx,325);value(ctx,$("#numaInput").value.trim(),tx,366,tw,22,3);
   divider(ctx,tx,490,1010);
   label(ctx,"好きな曲 TOP3",tx,530);
   ctx.fillStyle=ink;ctx.font='700 21px "Zen Kaku Gothic New",sans-serif';state.songs.forEach((s,i)=>ctx.fillText((i+1)+". "+s,tx,570+i*42));
   divider(ctx,tx,715,1010);
   label(ctx,"FAVORITE VISUAL",70,854);

   divider(ctx,70,905,1010);
   label(ctx,"初現場",70,950);value(ctx,first,70,990,430,19,2);
   label(ctx,"次の現場",560,950);value(ctx,next,560,990,450,19,2);
   divider(ctx,70,1090,1010);
   label(ctx,"遠征エリア",70,1135);value(ctx,areas,70,1175,940,20,2);

   if(theme==="minimal"){
     ctx.strokeStyle="#292724";ctx.lineWidth=2;ctx.strokeRect(50,45,980,1240);
   }
 }
 ctx.fillStyle=muted;ctx.textAlign="right";ctx.font='500 13px "Zen Kaku Gothic New",sans-serif';ctx.fillText("created with MUZE TOOL BOX",1010,1315);
}

function dataURLtoBlob(dataURL){const [h,d]=dataURL.split(","),m=h.match(/:(.*?);/)[1],b=atob(d),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new Blob([a],{type:m});}
$("#saveImage").onclick=async()=>{await drawResult();const url=$("#resultCanvas").toDataURL("image/png");try{const blob=dataURLtoBlob(url),file=new File([blob],"muze-profile.png",{type:"image/png"});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"MUZE PROFILE"});return;}const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();$("#saveStatus").textContent="画像を保存しました";}catch(e){$("#fallbackImage").src=url;$("#fallback").hidden=false;}};
$("#closeFallback").onclick=()=>$("#fallback").hidden=true;

initMembers();initSongs();initLives();initAreas();initDesigns();validate();