(()=>{'use strict';
const $=id=>document.getElementById(id), KEY='little-town-preview-v1';
const tiles=['grass_center_N','grass_path_N','grass_pathCrossing_N','grass_pathBend_N','grass_pathCorner_N','grass_water_N','grass_river_N','grass_riverBridge_N','rocks_grass_N','tree_single_N','tree_multiple_N','building_door_N','building_window_N','building_center_N','building_doorBeige_N','building_windowBeige_N','building_centerBeige_N','roof_gableBrown_N','roof_roundedGreen_N','roof_slantPurple_N','roof_pointPurple_N','roof_gableGreen_N','castle_tower_N','castle_gateOpen_N','castle_wall_N','castle_towerGreen_N','castle_towerBrown_N'];
let state={tasks:[],log:[],avatar:'',name:'まる'},editing=null,preview=false,storageOK=false,lastDay='',images={};
const nowDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const escaped=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=()=>state.log.length,finished=id=>state.log.some(x=>x.id===id&&x.day===nowDate());
const dayCount=()=>state.tasks.filter(t=>finished(t.id)).length;
let timer=0;function toast(msg){const e=$('toast');e.textContent=msg;e.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>e.classList.remove('visible'),3300)}
function checkStorage(){try{let t=KEY+'-probe';localStorage.setItem(t,'ok');let ok=localStorage.getItem(t)==='ok';localStorage.removeItem(t);return ok}catch{return false}}
function showSave(ok){const el=$('saveStatus');el.className='status '+(ok?'ok':'error');el.textContent=ok?'✓ このブラウザへの保存を確認できました':'⚠ この表示環境では保存できません。ブラウザで公開URLを開くか、記録を書き出してください。'}
function load(){storageOK=checkStorage();if(storageOK){try{let j=JSON.parse(localStorage.getItem(KEY)||'null');if(j&&Array.isArray(j.tasks)&&Array.isArray(j.log))state={tasks:j.tasks.slice(0,3),log:j.log,avatar:typeof j.avatar==='string'?j.avatar:'',name:typeof j.name==='string'?(j.name==='まるこ'&&!j.avatar?'まる':j.name):'まる'}}catch(e){console.warn('保存データを読めません',e)}}showSave(storageOK)}
function persist(){if(!storageOK){showSave(false);return false}try{let j=JSON.stringify(state);localStorage.setItem(KEY,j);if(localStorage.getItem(KEY)!==j)throw Error('保存の検証に失敗');showSave(true);return true}catch(e){storageOK=false;showSave(false);console.warn('保存失敗',e);return false}}
function renderTasks(){const list=$('taskList');list.innerHTML='';state.tasks.forEach((t,i)=>{let done=finished(t.id),el=document.createElement('div');el.className='task'+(done?' done':'');el.innerHTML=`<span class="task-icon">${['✿','♫','✦'][i]}</span><div class="task-title"><strong>${escaped(t.name)}</strong><small>${done?'DONE':'NOT YET'}</small></div><button type="button" class="edit-button" title="編集" aria-label="${escaped(t.name)}を編集" data-edit="${escaped(t.id)}">⋯</button><button type="button" class="complete-button" data-done="${escaped(t.id)}" ${done?'disabled':''}>${done?'✓ 完了':'できた！'}</button>`;list.append(el)});if(state.tasks.length<3){let el=document.createElement('button');el.className='empty-slot';el.textContent='＋ ADD TASK';el.type='button';el.dataset.add='1';list.append(el)}$('todayDone').textContent=dayCount();$('todayMax').textContent=' / '+state.tasks.length}
function openTask(id){editing=id||null;const t=state.tasks.find(x=>x.id===editing);$('taskName').value=t?t.name:'';$('modalTitle').textContent=t?'タスクを編集':'タスクを追加';$('deleteTask').hidden=!t;$('taskModal').hidden=false;$('taskName').focus()}
function closeTask(){$('taskModal').hidden=true;editing=null}
$('taskList').addEventListener('click',e=>{let btn=e.target.closest('button');if(!btn)return;if(btn.dataset.add)openTask(null);else if(btn.dataset.edit)openTask(btn.dataset.edit);else if(btn.dataset.done)complete(btn.dataset.done)});
$('taskForm').addEventListener('submit',e=>{e.preventDefault();const name=$('taskName').value.trim();if(!name)return;if(editing){let t=state.tasks.find(x=>x.id===editing);if(t)t.name=name}else{if(state.tasks.length===3)return toast('タスクは3つまでだよ');state.tasks.push({id:`t${Date.now()}${Math.random().toString(36).slice(2,6)}`,name})}let ok=persist();closeTask();render();toast(ok?'タスクを保存したよ':'タスクを表示したよ。ただし保存できない環境だよ')});
$('cancelModal').addEventListener('click',closeTask);$('taskModal').addEventListener('click',e=>{if(e.target===$('taskModal'))closeTask()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTask()});
$('deleteTask').addEventListener('click',()=>{if(!editing||!confirm('このタスクを削除しますか？街の成長履歴は残ります。'))return;state.tasks=state.tasks.filter(t=>t.id!==editing);let ok=persist();closeTask();render();toast(ok?'タスクを削除したよ':'削除を表示に反映しました（保存できていません）')});
function complete(id){if(finished(id))return;let t=state.tasks.find(x=>x.id===id);if(!t)return;state.log.push({id:t.id,name:t.name,day:nowDate(),at:Date.now()});let ok=persist();render();toast(ok?'CLEAR！':'記録しました。保存できないためバックアップしてください')}
const avatarDefault='<img src="../default-cat.webp" alt="初期キャラクターの猫">';
function renderAvatar(){const html=state.avatar?`<img src="${state.avatar}" alt="キャラクター">`:avatarDefault;$('walkerImage').innerHTML=html;$('avatarSample').innerHTML=html;const name=$('avatarName');if(document.activeElement!==name)name.value=state.name}
$('avatarName').addEventListener('change',e=>{state.name=e.target.value.trim().slice(0,18)||'まる';let ok=persist();renderAvatar();toast(ok?'名前を保存したよ':'名前を変更したよ。保存はできていないよ')});
// キャラクター画像の切り抜きはすべて端末内の Canvas で処理し、保存ボタンまでは既存設定を変更しない。
let editOriginal=null,editCurrent=null,editorOpened=false,hasEdited=false;
const editorCanvas=$('avatarEditCanvas'),editorCtx=editorCanvas.getContext('2d',{willReadFrequently:true});
function canvasCopy(source){const c=document.createElement('canvas');c.width=source.width;c.height=source.height;c.getContext('2d').drawImage(source,0,0);return c}
function showEditCanvas(source){editorCanvas.width=source.width;editorCanvas.height=source.height;editorCtx.clearRect(0,0,source.width,source.height);editorCtx.drawImage(source,0,0)}
function openAvatarEditor(source){
 editOriginal=canvasCopy(source);editCurrent=canvasCopy(source);editorOpened=true;hasEdited=false;
 $('bgStrength').value='45';$('bgStrengthValue').value='45';
 showEditCanvas(editCurrent);$('avatarEditor').hidden=false;
}
function closeAvatarEditor(){editorOpened=false;editOriginal=null;editCurrent=null;$('avatarEditor').hidden=true}
function sourceFromFile(file){
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){toast('PNG・JPG・WebP・GIFを選んでね');return}
 if(file.size>5*1024*1024){toast('画像は5MB以下にしてね');return}
 const reader=new FileReader();reader.onerror=()=>toast('画像を読み込めませんでした');
 reader.onload=()=>{const img=new Image();img.onerror=()=>toast('画像を開けませんでした');img.onload=()=>{
   const scale=Math.min(1,520/Math.max(img.naturalWidth,img.naturalHeight));
   const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);openAvatarEditor(c);
   if(file.type==='image/gif')toast('GIFは編集すると静止画像になります');
 };img.src=String(reader.result||'')};reader.readAsDataURL(file)
}
$('avatarFile').addEventListener('change',e=>{const f=e.target.files?.[0];e.target.value='';if(f)sourceFromFile(f)});
// 画像の外周とつながっている似た色のピクセルだけを消す。キャラ内部の白は消さない。
function removeFlatBackground(source,threshold){
 const c=canvasCopy(source),cx=c.getContext('2d',{willReadFrequently:true});
 const image=cx.getImageData(0,0,c.width,c.height),data=image.data,w=c.width,h=c.height;
 const cornerPoints=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]];
 const corners=cornerPoints.map(([x,y])=>{const i=(y*w+x)*4;return [data[i],data[i+1],data[i+2],data[i+3]]}).filter(p=>p[3]>80);
 if(!corners.length)return c;
 // もっとも頻出する隅の色を背景とみなす。
 let best=corners[0],bestVotes=-1;for(const a of corners){const votes=corners.filter(b=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2<4200).length;if(votes>bestVotes){best=a;bestVotes=votes}}
 const validCorners=corners.filter(a=>(a[0]-best[0])**2+(a[1]-best[1])**2+(a[2]-best[2])**2<4200);
 const bg=[0,0,0];validCorners.forEach(v=>{bg[0]+=v[0];bg[1]+=v[1];bg[2]+=v[2]});for(let n=0;n<3;n++)bg[n]/=validCorners.length;
 const thr2=threshold*threshold*3,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 function similar(p){const i=p*4;if(data[i+3]<16)return true;const dr=data[i]-bg[0],dg=data[i+1]-bg[1],db=data[i+2]-bg[2];return dr*dr+dg*dg+db*db<=thr2}
 function seed(p){if(!seen[p]&&similar(p)){seen[p]=1;queue[tail++]=p}}
 for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x)}
 for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1)}
 while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w,i=p*4;data[i+3]=0;
  if(x>0)seed(p-1);if(x<w-1)seed(p+1);if(y>0)seed(p-w);if(y<h-1)seed(p+w)}
 cx.putImageData(image,0,0);return c
}
function trimTransparent(source){
 const cx=source.getContext('2d',{willReadFrequently:true}),w=source.width,h=source.height,pixels=cx.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(pixels[(y*w+x)*4+3]>14){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 if(maxX<minX)return canvasCopy(source);
 const margin=Math.max(4,Math.round(Math.max(maxX-minX+1,maxY-minY+1)*.05));
 const x=Math.max(0,minX-margin),y=Math.max(0,minY-margin),right=Math.min(w,maxX+margin+1),bottom=Math.min(h,maxY+margin+1);
 const out=document.createElement('canvas');out.width=right-x;out.height=bottom-y;
 out.getContext('2d').drawImage(source,x,y,out.width,out.height,0,0,out.width,out.height);return out
}
$('removeBgButton').addEventListener('click',()=>{
 if(!editOriginal)return;
 // スライダーの値は常に元画像に適用し、何度でも調整できる。
 editCurrent=removeFlatBackground(editOriginal,Number($('bgStrength').value));
 hasEdited=true;showEditCanvas(editCurrent);
});
$('bgStrength').addEventListener('input',e=>{$('bgStrengthValue').value=e.target.value;if(hasEdited&&editOriginal){editCurrent=removeFlatBackground(editOriginal,Number(e.target.value));showEditCanvas(editCurrent)}});
$('trimAvatarButton').addEventListener('click',()=>{if(!editCurrent)return;editCurrent=trimTransparent(editCurrent);hasEdited=true;showEditCanvas(editCurrent)});
$('undoAvatarButton').addEventListener('click',()=>{if(!editOriginal)return;editCurrent=canvasCopy(editOriginal);hasEdited=false;showEditCanvas(editCurrent)});
$('cancelAvatarEdit').addEventListener('click',closeAvatarEditor);
$('avatarEditor').addEventListener('click',e=>{if(e.target===$('avatarEditor'))closeAvatarEditor()});
$('saveAvatarEdit').addEventListener('click',()=>{
 if(!editCurrent)return;
 const max=360,scale=Math.min(1,max/Math.max(editCurrent.width,editCurrent.height));
 const out=document.createElement('canvas');out.width=Math.max(1,Math.round(editCurrent.width*scale));out.height=Math.max(1,Math.round(editCurrent.height*scale));
 out.getContext('2d').drawImage(editCurrent,0,0,out.width,out.height);
 const webp=out.toDataURL('image/webp',.86);
 state.avatar=webp.startsWith('data:image/webp')?webp:out.toDataURL('image/png');
 const ok=persist();closeAvatarEditor();renderAvatar();toast(ok?'キャラ画像を保存したよ':'画像は表示できますが、保存に失敗しました。記録を書き出してください');
});
$('defaultAvatar').addEventListener('click',()=>{state.avatar='';let ok=persist();renderAvatar();toast(ok?'元の子に戻したよ':'表示を元に戻したよ（保存できていません）')});
// 実際の Kenney Sketch Town の PNG を描画。360度の斜め見下ろしタイルではなく、全てN向きに統一。
let townTheme='winter';const winterImages={};
const canvas=$('townCanvas'),ctx=canvas.getContext('2d');const S=.62,W=256*S,H=352*S;
function tilePosition(i,j){return {x:480+(i-j)*75,y:83+(i+j)*37.5}}
function drawTile(id,i,j,layer='ground',rise=0){const image=(townTheme==='winter'&&winterImages[id])||images[id];if(!image||(!image.complete&&!image.width)||!(image.naturalWidth||image.width))return;const pos=tilePosition(i,j);const top=layer==='ground'?pos.y-38:pos.y-104-rise;ctx.drawImage(image,pos.x-W/2,top,W,H)}
// 建物と木の解放順は維持。道と池の新しい地形はプレビューのみ。
const props=[
 [1,'tree_single_N',0,2],[2,'rocks_grass_N',5,0],[3,'tree_multiple_N',1,0],[5,'tree_single_N',0,5],
 [7,'tree_single_N',5,5],[9,'building_door_N',3,1,'roof_gableBrown_N'],[11,'tree_multiple_N',1,4],
 [13,'building_doorBeige_N',4,3,'roof_roundedGreen_N'],
 [16,'building_window_N',2,4,'roof_pointPurple_N'],
 [19,'tree_single_N',2,0],[22,'building_windowBeige_N',4,1,'roof_gableGreen_N'],
 [25,'fountain_N',2,2],[27,'tree_single_N',0,3],[29,'market_stall_N',2,1],
 [33,'tree_multiple_N',0,4],[36,'building_door_N',5,2,'roof_slantPurple_N'],
 [39,'market_green_N',4,4],[42,'tree_single_N',3,2],
 [48,'building_window_N',1,3,'roof_roundedGreen_N'],
 [52,'tree_single_N',5,3],[55,'windmill_N',1,1],[60,'tree_single_N',2,5],
 [65,'tree_multiple_N',4,5],[70,'tree_single_N',1,5],[75,'tree_multiple_N',0,0]
];
const milestones=[{at:1,label:'ちいさな木'},{at:9,label:'はじめのおうち'},{at:25,label:'広場と噴水'},{at:42,label:'お店のある街'},{at:55,label:'風車の丘'},{at:75,label:'にぎやかな街'}];
const gardenTiles=['market_stall_N','market_green_N','fountain_N','windmill_N'];
let previewStage=75;
const displayedCount=()=>preview?previewStage:count();
function renderFlowers(n){
 const container=$('flowerGround');
 if(!container)return;
 container.hidden=false;
 container.classList.toggle('is-winter',townTheme==='winter');
 for(const flower of container.querySelectorAll('.flower-cluster')){
  const at=Number(flower.dataset.bloomAt);
  flower.hidden=n<at;
  // 花のサイズは固定。成長は新しい群れの追加だけ。
 }
}
// 地面の上面座標。タイル間の小さな隙間を道の描画でつなぐ。
function groundPoint(i,j){const p=tilePosition(i,j);return {x:p.x,y:p.y+74}}
function terrainLine(points,width,color){
 ctx.beginPath();points.forEach(([i,j],k)=>{const p=groundPoint(i,j);if(k===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});
 ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function drawConnectedPaths(n){
 if(n<4)return;
 ctx.save();
 // 手前から街の中心へ。建物を増やすと枝道も伸びる。
 const paths=[[[3,5.32],[3,4],[3,3],[3,2]],[[3,3],[2,3],[1,3]]];
 if(n>=13)paths.push([[3,3],[4,3]]);
 for(const p of paths)terrainLine(p,35,townTheme==='winter'?'#d6a887':'#ca8c63');
 for(const p of paths)terrainLine(p,29,'#efad80');
 ctx.restore();
}
function drawPond(n){
 if(n<12)return;
 ctx.save();
 const p=groundPoint(0,5);
 // 既存の水タイルではなく雪や芝の岸を残す、浅い小さな池。
 ctx.translate(p.x+8,p.y+9);
 if(n>=18)ctx.translate(31,-14);
 const rx=n>=18?79:47,ry=n>=18?24:19;
 const winter=townTheme==='winter';
 ctx.beginPath();
 ctx.moveTo(-rx,1);
 ctx.bezierCurveTo(-rx-2,-ry*.75,-rx*.52,-ry*1.08,-rx*.17,-ry*.84);
 ctx.bezierCurveTo(rx*.25,-ry*1.23,rx*.85,-ry*.82,rx,-ry*.07);
 ctx.bezierCurveTo(rx*1.04,ry*.73,rx*.32,ry*1.07,0,ry*.82);
 ctx.bezierCurveTo(-rx*.55,ry*1.16,-rx,ry*.65,-rx,1);
 ctx.closePath();
 ctx.fillStyle=winter?'#acdce9':'#89cddd';ctx.fill();
 ctx.strokeStyle=winter?'#8baebc':'#779d93';ctx.lineWidth=3;ctx.stroke();
 ctx.save();ctx.clip();
 ctx.strokeStyle=winter?'#e6f7fd':'#bcebf1';ctx.lineWidth=2.5;ctx.lineCap='round';
 for(const [x,y,len] of [[-.61,-.2,.24],[-.06,.28,.30],[.38,-.38,.25]]){
  ctx.beginPath();ctx.moveTo(rx*x,ry*y);ctx.quadraticCurveTo(rx*(x+len*.5),ry*y-2,rx*(x+len),ry*y);ctx.stroke();
 }
 ctx.restore();ctx.restore();
}
const pondBankImages={};
function drawPondBankFlowers(n){
 if(n<20)return;
 const image=pondBankImages[townTheme==='winter'?'winter':'normal'];
 if(!image||!image.complete||!image.naturalWidth)return;
 // 池の手前左寄りの岸。背の高い木より先に描くので、木の後ろに自然に隠れる。
 const w=960*.09,h=w*78/150;
 const x=115,y=366;
 ctx.drawImage(image,x-w/2,y-h,w,h);
}
function paint(){const n=displayedCount();ctx.clearRect(0,0,960,640);let gr=ctx.createLinearGradient(0,0,0,640);gr.addColorStop(0,townTheme==='winter'?'#dce8f0':'#e1e6d8');gr.addColorStop(1,townTheme==='winter'?'#f1f5f7':'#f6e9d7');ctx.fillStyle=gr;ctx.fillRect(0,0,960,640);ctx.fillStyle='rgba(140,151,125,.13)';ctx.beginPath();ctx.ellipse(480,555,380,43,0,0,Math.PI*2);ctx.fill();
 for(let z=0;z<=10;z++)for(let i=0;i<6;i++){let j=z-i;if(j<0||j>5)continue;drawTile('grass_center_N',i,j)}
 drawConnectedPaths(n);
 drawPond(n);
 drawPondBankFlowers(n);
 // 奥のタイルにあるオブジェクトから順に描くことで、重なり方が自然になる。
 for(let z=0;z<=10;z++)for(let i=0;i<6;i++){let j=z-i;if(j<0||j>5)continue;for(const p of props){const [at,id,x,y,roof]=p;if(x!==i||y!==j||at>n)continue;if(n>=12&&at===5&&id==='tree_single_N'&&x===0&&y===5)continue;drawTile(id,i,j,'prop');if(roof)drawTile(roof,i,j,'prop',54)}}
 renderFlowers(n);
}
function renderProgress(){
 const actual=count(),n=displayedCount(),next=milestones.find(x=>x.at>n);
 $('totalDone').textContent=actual;
 $('level').textContent=String(1+Math.floor(n/8)).padStart(2,'0');
 $('worldNote').textContent=preview?n+' CLEAR / PREVIEW':n===0?'START':n+' CLEAR';
 if(next){
  $('nextTitle').textContent='NEXT：'+next.label+' まであと '+(next.at-n);
  $('nextDescription').textContent='NEW ITEM';
  const prev=milestones.filter(x=>x.at<=n).at(-1)?.at||0;
  $('progressFill').style.width=((n-prev)/(next.at-prev)*100)+'%';
 }else{
  $('nextTitle').textContent='LEVEL MAX';$('nextDescription').textContent='ALL UNLOCKED';
  $('progressFill').style.width='100%';
 }
 $('milestones').innerHTML=milestones.map(x=>'<div class="milestone '+(actual>=x.at?'done':'')+'"><span>'+(actual>=x.at?'✓':'○')+' '+x.label+'</span><strong>'+x.at+' 回</strong></div>').join('');
 $('previewTag').hidden=!preview;
 const selector=$('townStagePicker');if(selector)selector.hidden=!preview;
 if(selector)for(const b of selector.querySelectorAll('[data-stage]')){
  const selected=Number(b.dataset.stage)===previewStage;
  b.classList.toggle('is-selected',selected);b.setAttribute('aria-pressed',String(selected));
 }
}
function render(){renderTasks();renderProgress();renderAvatar();paint();renderHistory()}
$('previewButton').addEventListener('click',()=>{
 preview=!preview;
 $('previewButton').textContent=preview?'MAP に戻る':'PREVIEW';
 renderProgress();paint();
});
$('townStagePicker').addEventListener('click',event=>{
 const b=event.target.closest('button[data-stage]');
 if(!b)return;
 preview=true;previewStage=Math.max(0,Math.min(75,Number(b.dataset.stage)));
 renderProgress();paint();
});
// 専用の保存データを JSON としてエクスポート/復元できる。
$('backupButton').addEventListener('click',()=>{const data=JSON.stringify({...state,version:1,exportedAt:new Date().toISOString()},null,2);const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='little-town-backup-'+nowDate()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),6000);toast('記録を書き出したよ')});
$('restoreFile').addEventListener('change',e=>{let f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>3*1024*1024)return toast('ファイルは3MB以下にしてね');const fr=new FileReader();fr.onload=()=>{try{const data=JSON.parse(String(fr.result));if(!Array.isArray(data.tasks)||!Array.isArray(data.log))throw Error('形式が違います');if(!confirm('今のタスクと記録をバックアップの内容で置き換える？'))return;const tasks=data.tasks.filter(t=>t&&typeof t.name==='string'&&typeof t.id==='string').slice(0,3).map(t=>({id:t.id.slice(0,64),name:t.name.slice(0,32)}));const log=data.log.filter(x=>x&&typeof x.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.day)).slice(-4000).map(x=>({id:x.id.slice(0,64),name:String(x.name||'').slice(0,32),day:x.day,at:Number(x.at)||0}));state={tasks,log,avatar:typeof data.avatar==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,/.test(data.avatar)?data.avatar:'',name:typeof data.name==='string'?data.name.slice(0,18):'まる'};let ok=persist();preview=false;render();toast(ok?'記録を復元したよ':'復元したよ。ただし保存できない環境です')}catch(err){toast('JSONファイルを確認してね')}};fr.readAsText(f)});
function loadImages(){
 for(const [season,src] of Object.entries({normal:'garden/tiny-bloom-pink.svg?v=2',winter:'garden/snow-berry.svg?v=3'})){
  const img=new Image();
  img.onload=()=>{pondBankImages[season]=img;paint()};
  img.onerror=()=>console.warn('池の岸の花を読み込めませんでした',season);
  img.src=src;
 }

 for(const name of tiles){
  const img=new Image();
  img.onload=()=>{images[name]=img;try{winterImages[name]=window.littleTownWinterTile?.(name,img)}catch(error){console.warn('冬用画像の加工に失敗',name,error)}paint()};
  img.onerror=()=>console.warn('タイルの読み込みに失敗',name);
  img.src='../tiles/'+name+'.png';
 }
 for(const name of gardenTiles){
  for(const winter of [false,true]){
   const img=new Image();
   img.onload=()=>{(winter?winterImages:images)[name]=img;paint()};
   img.onerror=()=>console.warn('街のパーツの読み込みに失敗',name,winter);
   img.src='garden/'+name+(winter?'_winter':'')+'.svg';
  }
 }
}

const monthCursor={year:new Date().getFullYear(),month:new Date().getMonth()};
let selectedDay=nowDate();
const dayUTC=day=>Date.parse(day+'T00:00:00Z');
const isoDay=(y,m,d)=>[y,String(m+1).padStart(2,'0'),String(d).padStart(2,'0')].join('-');
function historyStats(){
  const days=[...new Set(state.log.filter(x=>typeof x.day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.day)&&x.day<=nowDate()).map(x=>x.day))].sort();
  let longest=0,chain=0,last=0;
  for(const day of days){const utc=dayUTC(day);chain=last&&utc-last===86400000?chain+1:1;longest=Math.max(longest,chain);last=utc}
  const today=nowDate(),yesterday=new Date(dayUTC(today)-86400000).toISOString().slice(0,10);
  let current=0;
  if(days.length&&(days[days.length-1]===today||days[days.length-1]===yesterday)){
    let expected=dayUTC(days[days.length-1]);for(let i=days.length-1;i>=0;i--){if(dayUTC(days[i])!==expected)break;current++;expected-=86400000}
  }
  return{days:days.length,current,longest};
}
function renderDayLog(){
 const panel=$('selectedDayLog');const entries=state.log.filter(x=>x.day===selectedDay);
 $('selectedDayTitle').textContent=selectedDay.replace(/^(\d{4})-(\d{2})-(\d{2})$/,(_,y,m,d)=>y+' / '+Number(m)+' / '+Number(d));
 if(!entries.length){panel.innerHTML='<p class="log-empty">NO RECORDS</p>';return}
 panel.innerHTML=entries.map((e,i)=>'<div class="day-log-item"><span class="log-check">✓</span><span>'+escaped(e.name||state.tasks.find(t=>t.id===e.id)?.name||'タスク')+'</span></div>').join('');
}
function renderHistory(){
 const stats=historyStats();
 $('activeDays').textContent=stats.days;
 $('currentStreak').textContent=stats.current;
 $('bestStreak').textContent=stats.longest;
 const y=monthCursor.year,m=monthCursor.month;
 $('calendarMonth').textContent=y+' / '+String(m+1).padStart(2,'0');
 const first=new Date(y,m,1).getDay(),size=new Date(y,m+1,0).getDate();
 const counts={};
 for(const e of state.log){if(typeof e.day==='string')counts[e.day]=(counts[e.day]||0)+1}
 const frag=document.createDocumentFragment();
 for(let i=0;i<first;i++){const gap=document.createElement('span');gap.className='calendar-blank';frag.append(gap)}
 for(let d=1;d<=size;d++){
   const day=isoDay(y,m,d),n=counts[day]||0,b=document.createElement('button');
   b.type='button';b.className='calendar-day'+(n?' has-log':'')+(day===nowDate()?' is-today':'')+(day===selectedDay?' is-selected':'');
   b.setAttribute('aria-label',day+'：'+n+'件達成');b.dataset.day=day;
   b.innerHTML='<span class="date-number">'+d+'</span>'+(n?'<small>'+n+'</small>':'');
   frag.append(b);
 }
 const grid=$('calendarDays');grid.replaceChildren(frag);
 renderDayLog();
}
$('calendarDays').addEventListener('click',e=>{const b=e.target.closest('button[data-day]');if(!b)return;selectedDay=b.dataset.day;renderHistory()});
function shiftMonth(n){const d=new Date(monthCursor.year,monthCursor.month+n,1);monthCursor.year=d.getFullYear();monthCursor.month=d.getMonth();renderHistory()}
$('prevMonth').addEventListener('click',()=>shiftMonth(-1));
$('nextMonth').addEventListener('click',()=>shiftMonth(1));
$('thisMonth').addEventListener('click',()=>{const d=new Date();monthCursor.year=d.getFullYear();monthCursor.month=d.getMonth();selectedDay=nowDate();renderHistory()});

// たまに日付が変わると、新しい「今日」を反映する。
lastDay=nowDate();setInterval(()=>{let d=nowDate();if(d!==lastDay){lastDay=d;renderTasks();renderHistory()}},30000);
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;let began=performance.now();function walk(ts){const period=14500,part=((ts-began)%period)/period;const u=part<.5?part*2:(1-part)*2;$('walker').style.left=(23+u*55)+'%';$('walker').classList.toggle('reverse',part>=.5);if(!reduce)requestAnimationFrame(walk)}
// このプレビュー専用の配置データ。本番サイトやタスク記録に干渉しない。
const decorDefaults={
 tree:{x:9,y:46},gift:{x:29,y:67},snowman:{x:76,y:62},
 cane:{x:34.5,y:6},wreath:{x:31.2,y:32.8}
};
const decorStoreKey='little-town-preview-decor-v1';
const decorHiddenKey='little-town-preview-decor-hidden-v1';
let decorHidden={};
try{const savedHidden=JSON.parse(localStorage.getItem(decorHiddenKey)||'{}');if(savedHidden&&typeof savedHidden==='object')decorHidden=savedHidden}catch(error){console.warn('飾りの収納状態を読み込めませんでした',error)}
const decorLayer=$('christmasFront');
let decorEditing=false,activePointer=null,decorPositions=JSON.parse(JSON.stringify(decorDefaults));
const decorElements={
 tree:decorLayer.querySelector('.decor-tree'),gift:decorLayer.querySelector('.decor-gift'),
 snowman:decorLayer.querySelector('.decor-snowman'),cane:decorLayer.querySelector('.decor-cane'),
 wreath:decorLayer.querySelector('.decor-wreath')
};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
try{
 const stored=JSON.parse(localStorage.getItem(decorStoreKey)||'null');
 if(stored&&typeof stored==='object'){
  for(const key of Object.keys(decorDefaults)){
   if(Number.isFinite(stored[key]?.x)&&Number.isFinite(stored[key]?.y)){
    decorPositions[key]={x:clamp(stored[key].x,0,90),y:clamp(stored[key].y,5,95)};
   }
  }
 }
}catch(err){console.warn('プレビューの装飾位置を読み込めませんでした',err)}
// 成長段階に応じて建物の密集する位置を避ける。配置を変える操作はこれまでどおり優先する。
const decorSuggestions=[
 {max:8,positions:{tree:{x:12,y:40},gift:{x:34,y:67},snowman:{x:77,y:53},cane:{x:34.5,y:6},wreath:{x:55,y:47}}},
 {max:24,positions:{tree:{x:7,y:43},gift:{x:26,y:72},snowman:{x:79,y:62},cane:{x:34.5,y:6},wreath:{x:55,y:47}}},
 {max:41,positions:{tree:{x:5,y:48},gift:{x:25,y:73},snowman:{x:81,y:64},cane:{x:34.5,y:6},wreath:{x:55,y:47}}},
 {max:74,positions:{tree:{x:7,y:46},gift:{x:27,y:74},snowman:{x:81,y:64},cane:{x:34.5,y:6},wreath:{x:31.2,y:32.8}}},
 {max:Infinity,positions:{tree:{x:9,y:46},gift:{x:29,y:67},snowman:{x:76,y:62},cane:{x:34.5,y:6},wreath:{x:31.2,y:32.8}}}
];
function getSuggestedDecorPositions(){
 const n=displayedCount();
 const positions=JSON.parse(JSON.stringify(decorSuggestions.find(entry=>n<=entry.max).positions));
 positions.wreath=n>=48?{x:31.2,y:32.8}:{x:55,y:47};
 return positions;
}
function refreshDecorShelf(){
 for(const [key,element] of Object.entries(decorElements)){
  element.hidden=decorHidden[key]===true;
  const button=$('decorShelfItems').querySelector('[data-decor-shelf="'+key+'"]');
  if(!button)continue;
  const visible=decorHidden[key]!==true;
  button.classList.toggle('is-stored',!visible);
  button.setAttribute('aria-pressed',String(visible));
  button.querySelector('small').textContent=visible?'表示中':'収納中';
 }
}
$('decorShelfItems').addEventListener('click',event=>{
 const button=event.target.closest('button[data-decor-shelf]');
 if(!button)return;
 const key=button.dataset.decorShelf;
 if(!decorElements[key])return;
 decorHidden[key]=!(decorHidden[key]===true);
 try{localStorage.setItem(decorHiddenKey,JSON.stringify(decorHidden))}catch(error){toast('収納状態を保存できませんでした')}
 refreshDecorShelf();
 toast(decorHidden[key]?'飾りをしまったよ':'飾りを出したよ');
});
$('suggestDecor').addEventListener('click',()=>{
 decorPositions=getSuggestedDecorPositions();
 renderDecorPositions();saveDecorPositions();
 toast((preview?'完成した街':'現在の街')+'に合わせておすすめ配置にしたよ');
});
function renderDecorPositions(){
 const bounds=decorLayer.getBoundingClientRect();
 for(const [key,element] of Object.entries(decorElements)){
  const pos=decorPositions[key];
  // 新しい縦長の素材でも、以前に保存した配置が画面外にはみ出さないよう補正。
  if(bounds.width&&bounds.height){
   const rect=element.getBoundingClientRect();
   pos.x=clamp(pos.x,0,Math.max(0,100-rect.width/bounds.width*100));
   pos.y=clamp(pos.y,0,Math.max(0,100-rect.height/bounds.height*100));
  }
  element.style.setProperty('--decor-x',pos.x+'%');
  element.style.setProperty('--decor-y',pos.y+'%');
 }
}
function saveDecorPositions(){
 try{localStorage.setItem(decorStoreKey,JSON.stringify(decorPositions))}
 catch(err){toast('この環境では配置を保存できません')}
}
function setDecorEditing(editing){
 decorEditing=editing;decorLayer.classList.toggle('is-editing',editing);
 $('editDecor').textContent=editing?'配置完了':'配置を変える';
 $('editDecor').setAttribute('aria-pressed',String(editing));
 $('decorTip').hidden=!editing;
 for(const [key,element] of Object.entries(decorElements)){
  element.setAttribute('role',editing?'button':'img');
  element.setAttribute('aria-label',key+' の飾り');
  element.tabIndex=editing?0:-1;
 }
}
function moveDecor(key,x,y){
 const box=decorElements[key],layerRect=decorLayer.getBoundingClientRect();
 if(!layerRect.width||!layerRect.height)return;
 const widthPct=(box.getBoundingClientRect().width/layerRect.width)*100;
 const heightPct=(box.getBoundingClientRect().height/layerRect.height)*100;
 decorPositions[key]={x:clamp(x,0,100-widthPct),y:clamp(y,0,100-heightPct)};
 renderDecorPositions();
}
for(const [key,element] of Object.entries(decorElements)){
 element.addEventListener('pointerdown',event=>{
  if(!decorEditing||decorLayer.classList.contains('is-hidden')||event.button!==0)return;
  event.preventDefault();
  const rect=decorLayer.getBoundingClientRect(),el=element.getBoundingClientRect();
  activePointer={id:event.pointerId,key,offsetX:event.clientX-el.left,offsetY:event.clientY-el.top};
  element.classList.add('is-dragging');
  element.setPointerCapture(event.pointerId);
 });
 element.addEventListener('pointermove',event=>{
  if(!activePointer||activePointer.id!==event.pointerId||activePointer.key!==key)return;
  const rect=decorLayer.getBoundingClientRect();
  moveDecor(key,(event.clientX-activePointer.offsetX-rect.left)/rect.width*100,(event.clientY-activePointer.offsetY-rect.top)/rect.height*100);
 });
 function finish(event){
  if(!activePointer||activePointer.id!==event.pointerId||activePointer.key!==key)return;
  activePointer=null;element.classList.remove('is-dragging');saveDecorPositions();
 }
 element.addEventListener('pointerup',finish);
 element.addEventListener('pointercancel',finish);
 element.addEventListener('lostpointercapture',finish);
 element.addEventListener('keydown',event=>{
  if(!decorEditing||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  event.preventDefault();const pos=decorPositions[key],d=event.shiftKey?5:1;
  moveDecor(key,pos.x+(event.key==='ArrowRight'?d:event.key==='ArrowLeft'?-d:0),pos.y+(event.key==='ArrowDown'?d:event.key==='ArrowUp'?-d:0));saveDecorPositions();
 });
}
$('editDecor').addEventListener('click',()=>setDecorEditing(!decorEditing));
$('resetDecor').addEventListener('click',()=>{
 decorPositions=JSON.parse(JSON.stringify(decorDefaults));
 renderDecorPositions();saveDecorPositions();toast('飾りの配置を戻したよ');
});
$('decorToggle').addEventListener('click',()=>{
 const hidden=decorLayer.classList.toggle('is-hidden');
 $('decorToggle').textContent=hidden?'飾り：OFF':'飾り：ON';
 $('decorToggle').setAttribute('aria-pressed',String(!hidden));
 if(hidden&&decorEditing)setDecorEditing(false);
});
$('winterToggle').addEventListener('click',()=>{
 townTheme=townTheme==='winter'?'normal':'winter';
 $('winterToggle').textContent=townTheme==='winter'?'冬モード：ON':'冬モード：OFF';
 $('winterToggle').setAttribute('aria-pressed',String(townTheme==='winter'));
 paint();
});
// Preview-only migration of the old floating wreath; retain every other decoration position.
try{
 if(localStorage.getItem('little-town-preview-wreath-v2')!=='1'){
  decorPositions.wreath={...decorDefaults.wreath};
  localStorage.setItem(decorStoreKey,JSON.stringify(decorPositions));
  localStorage.setItem('little-town-preview-wreath-v2','1');
 }
}catch(error){console.warn('リースの位置を更新できませんでした',error)}
renderDecorPositions();refreshDecorShelf();setDecorEditing(false);
load();preview=true;render();loadImages();$('previewButton').textContent='MAPに戻る';
if(reduce){$('walker').style.left='40%'}else requestAnimationFrame(walk);
})();
