(() => {
'use strict';
const MEMBERS=['KAIRYU','NAOYA','RAN','SEITO','RYUKI','TAKUTO','HAYATO','EIKI'];
const THEMES=[
 {id:'icecream',title:'ソフトクリームに挑戦',note:'巻いたり、味わったり。どんな一杯になる？',labels:['巻いてみる', '食べるのが楽しみ', 'そばで見守る']},
 {id:'bbq',title:'8人でBBQ',note:'いいお天気。おいしい時間を一緒に。',labels:['焼くのを楽しむ', '食べるのを楽しむ', 'おしゃべりを楽しむ']},
 {id:'tripnight',title:'修学旅行の夜',note:'消灯まで、あと少し。何して過ごす？',labels:['みんなとおしゃべり', '遊びを始める', '布団でのんびり']},
 {id:'park',title:'遊園地に集合',note:'一日フリータイム。どこから回ろう？',labels:['アトラクションへ', '食べ歩きへ', '気の向くままに']},
 {id:'island',title:'島でキャンプ',note:'海も空もひとりじめ。8人の島時間。',labels:['キャンプを楽しむ', '海を楽しむ', '木陰でのんびり']},
 {id:'cooking',title:'みんなで料理',note:'今夜のメニュー、どうしよう？',labels:['作ってみる', '味見する', 'そばで見守る']},
 {id:'movie',title:'おうちでホラー映画',note:'ちょっとドキドキ。好きな場所で映画タイム。',labels:['じっくり観る', '誰かとくっつく', 'おしゃべりしながら']},
 {id:'morning',title:'旅行の集合場所',note:'待ち合わせの朝。出発まで何してる？',labels:['出発の準備', 'ひと休み', 'おしゃべり']},
 {id:'rain',title:'突然の雨、どうする？',note:'雨の時間も、8人ならちょっと楽しい。',labels:['雨宿りする', '傘を探す', '雨を楽しむ']},
 {id:'visitor',title:'お部屋に小さな訪問者',note:'小さな虫を発見。さて、どうしよう？',labels:['そっと外へ', '様子を見守る', 'みんなを呼ぶ']}
];
const zones=()=>[[.25,.17],[.75,.17],[.5,.79]];
const $=s=>document.querySelector(s), KEY='muze-situation-map-v1';
const empty=()=>({size:13,positions:{},labels:[...THEMES[theme].labels]});
let saved={theme:0,maps:{}};try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw&&Number.isInteger(raw.theme)&&raw.theme>=0&&raw.theme<THEMES.length&&raw.maps&&typeof raw.maps==='object')saved=raw;}catch(_){ }
let theme=saved.theme,selected=null,drag=null,busy=false,outputURL=null;
const normalized=new Set();
function map(){const id=THEMES[theme].id;let m=saved.maps[id];if(normalized.has(id)&&m)return m;if(!m||typeof m!=='object')m=empty();m.size=Math.max(10,Math.min(19,Number(m.size)||13));const positions={};for(const name of MEMBERS){const p=m.positions?.[name];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))positions[name]={x:p.x,y:p.y};}m.positions=positions;m.labels=Array.isArray(m.labels)&&m.labels.length===3?m.labels.map(x=>String(x??'').slice(0,12)):[...THEMES[theme].labels];saved.maps[id]=m;normalized.add(id);return m;}
function persist(){saved.theme=theme;try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(_){$('#status').textContent='この端末での途中保存が使えません。完成画像を保存してね。';}}
function photo(name){return 'assets/'+name.toLowerCase()+'.webp';}
function constrain(p){const half=map().size/200;p.x=Math.max(half,Math.min(1-half,p.x));p.y=Math.max(half,Math.min(1-half-.04,p.y));return p;}
function button(name,token=false){const b=document.createElement('button');b.type='button';b.className=token?'token':'member-choice';b.dataset.member=name;b.setAttribute('aria-label',name+(token?'を移動':'を選ぶ'));b.setAttribute('aria-pressed',String(selected===name));const img=document.createElement('img');img.src=photo(name);img.alt='';img.draggable=false;const span=document.createElement('span');span.textContent=name;b.append(img,span);b.addEventListener('click',()=>select(name));b.addEventListener('keydown',e=>{if(!token||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const p=map().positions[name],step=e.shiftKey?.05:.015;p.x+=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;p.y+=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;constrain(p);renderTokens();persist();document.querySelector('.token[data-member="'+name+'"]').focus();});return b;}
function select(name){selected=name;sync();$('#selectedNote').textContent=name+'を選択中。マップの好きな場所をタップしてね。';}
function sync(){const m=map(),count=Object.keys(m.positions).length;$('#placedCount').textContent=count+' / 8';$('#saveImage').disabled=count!==8||busy;$('#returnMember').disabled=!selected||!m.positions[selected];document.querySelectorAll('[data-member]').forEach(b=>{b.setAttribute('aria-pressed',String(selected===b.dataset.member));if(b.classList.contains('member-choice'))b.classList.toggle('is-placed',!!m.positions[b.dataset.member]);});document.querySelectorAll('.theme-button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===theme)));}
function renderTokens(){const el=$('#tokens');el.replaceChildren();const m=map();MEMBERS.forEach(name=>{const p=m.positions[name];if(!p)return;constrain(p);const b=button(name,true);b.style.left=p.x*100+'%';b.style.top=p.y*100+'%';b.style.width=m.size+'%';el.append(b);});sync();}
function clearResult(){if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;$('#imageResult').hidden=true;$('#resultImage').removeAttribute('src');}
function showTheme(index){if(busy)return;theme=index;selected=null;drag=null;clearResult();$('#status').textContent='';const t=THEMES[theme];$('#mobileTheme').value=String(theme);$('#sceneNumber').textContent='SCENE '+String(theme+1).padStart(2,'0')+' / 10';$('#sceneTitle').textContent=t.title;$('#sceneNote').textContent=t.note;renderLabels();$('#size').value=map().size;$('#selectedNote').textContent='言葉のない場所にも置いてOK。8人の距離感も自由に。';renderTokens();persist();}
function renderLabels(){
 $('#sceneLabels').replaceChildren();map().labels.forEach((label,i)=>{if(!label.trim())return;const b=document.createElement('button');b.type='button';b.className='scene-label memo-'+i;b.textContent=label;b.setAttribute('aria-label','行動メモ'+(i+1)+'を編集：'+label);b.style.left=zones()[i][0]*100+'%';b.style.top=zones()[i][1]*100+'%';b.onclick=()=>editLabels(i);$('#sceneLabels').append(b);});
}
function editLabels(index=0){if(busy)return;map().labels.forEach((label,i)=>$('#memo'+i).value=label);$('#memoDialog').showModal();$('#memo'+index).focus();}
$('#editMemos').onclick=()=>editLabels();
$('#memoDialog').addEventListener('close',()=>{if($('#memoDialog').returnValue!=='apply')return;map().labels=[0,1,2].map(i=>$('#memo'+i).value.trim().slice(0,12));renderLabels();clearResult();persist();});
THEMES.forEach((t,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=String(i+1).padStart(2,'0')+'  '+t.title;$('#mobileTheme').append(option);const b=document.createElement('button');b.type='button';b.className='theme-button';b.setAttribute('aria-pressed','false');const no=document.createElement('span');no.className='no';no.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.textContent=t.title;b.append(no,title);b.onclick=()=>showTheme(i);$('#themeList').append(b);});MEMBERS.forEach(name=>$('#tray').append(button(name)));
$('#mobileTheme').onchange=()=>showTheme(Number($('#mobileTheme').value));
function position(x,y){const r=$('#board').getBoundingClientRect();return constrain({x:(x-r.left)/r.width,y:(y-r.top)/r.height});}
function place(name,p){map().positions[name]=p;clearResult();renderTokens();persist();}
function startDrag(e){if(busy||e.button>0)return;const b=e.target.closest('[data-member]');if(!b)return;e.preventDefault();select(b.dataset.member);const p=map().positions[b.dataset.member],r=$('#board').getBoundingClientRect();drag={name:b.dataset.member,id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,offsetX:b.classList.contains('token')?e.clientX-r.left-p.x*r.width:0,offsetY:b.classList.contains('token')?e.clientY-r.top-p.y*r.height:0};try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_){}}
$('#board').dataset.appVersion='3';
$('#tray').addEventListener('pointerdown',startDrag);$('#tokens').addEventListener('pointerdown',startDrag);
window.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5&&!drag.moved)return;drag.moved=true;e.preventDefault();const r=$('#board').getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){map().positions[drag.name]=position(e.clientX-drag.offsetX,e.clientY-drag.offsetY);renderTokens();}},{passive:false});
let ignoreBoardClick=false;
window.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(moved){ignoreBoardClick=true;setTimeout(()=>ignoreBoardClick=false,0);clearResult();persist();}});window.addEventListener('pointercancel',()=>{drag=null;persist();});
$('#board').addEventListener('click',e=>{if(ignoreBoardClick||busy||e.target.closest('.token,.scene-label')||!selected)return;place(selected,position(e.clientX,e.clientY));});
$('#size').oninput=()=>{map().size=Number($('#size').value);clearResult();renderTokens();persist();};
$('#returnMember').onclick=()=>{if(selected){delete map().positions[selected];clearResult();renderTokens();persist();}};
$('#reset').onclick=()=>{$('#resetDialog').showModal();};$('#resetDialog').addEventListener('close',()=>{if($('#resetDialog').returnValue==='reset'){map().positions={};selected=null;showTheme(theme);}});
$('#nextTheme').onclick=()=>{showTheme((theme+1)%THEMES.length);$('#sceneTitle').scrollIntoView({behavior:'smooth',block:'start'});};
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('画像を読み込めませんでした。通信を確認して、もう一度試してね。'));img.src=src;});}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawFace(ctx,img,x,y,d,name){ctx.save();ctx.shadowColor='#28253630';ctx.shadowBlur=6;ctx.shadowOffsetY=3;ctx.beginPath();ctx.arc(x,y,d/2+4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.shadowColor='transparent';ctx.beginPath();ctx.arc(x,y,d/2,0,Math.PI*2);ctx.clip();const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)*.3;ctx.drawImage(img,sx,sy,side,side,x-d/2,y-d/2,d,d);ctx.restore();ctx.font='700 23px "Zen Kaku Gothic New",sans-serif';const width=ctx.measureText(name).width+14;ctx.fillStyle='#fffcf3ed';rounded(ctx,x-width/2,y+d/2+7,width,32,3);ctx.fill();ctx.fillStyle='#282536';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,x,y+d/2+23);}
$('#saveImage').onclick=async()=>{
 if(busy||Object.keys(map().positions).length!==8)return;busy=true;sync();$('#saveImage').textContent='画像をつくっています…';$('#status').textContent='';
 const t=THEMES[theme],m=JSON.parse(JSON.stringify(map())),index=theme;
 try{
  await document.fonts.ready;
  const faces=await Promise.all(MEMBERS.map(n=>loadImage(photo(n))));
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.fillStyle='#f7f5ed';ctx.fillRect(0,0,1080,1350);ctx.fillStyle='#282536';ctx.textAlign='left';ctx.font='700 22px "Zen Kaku Gothic New",sans-serif';ctx.fillText('MUZE PLAY ROOM / MY MAZZEL',48,45);ctx.font='900 38px "Zen Kaku Gothic New",sans-serif';ctx.fillText(t.title,48,102);ctx.font='600 22px "Klee One",sans-serif';ctx.fillText('もしも、8人だったら。',48,140);
  const bx=40,by=172,bw=1000;ctx.fillStyle='#fffdf7';ctx.fillRect(bx,by,bw,bw);ctx.fillStyle='#d5d1d966';for(let x=bx+24;x<bx+bw;x+=35){for(let y=by+24;y<by+bw;y+=35){ctx.beginPath();ctx.arc(x,y,1.1,0,Math.PI*2);ctx.fill();}}ctx.strokeStyle='#282536';ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bw);
  ctx.font='600 32px "Klee One",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';m.labels.forEach((label,i)=>{if(!label.trim())return;const x=bx+zones()[i][0]*bw,y=by+zones()[i][1]*bw;const lines=[];let line='';for(const ch of label){if(line&&ctx.measureText(line+ch).width>380){lines.push(line);line=ch;}else line+=ch;}if(line)lines.push(line);const width=Math.max(...lines.map(l=>ctx.measureText(l).width))+24;ctx.fillStyle='#fffdf7';ctx.fillRect(x-width/2,y-27,width,lines.length*42+14);ctx.fillStyle=['#ffd5df','#dcefa5','#ded7ff'][i];ctx.fillRect(x-width/2,y+lines.length*42-34,width,15);ctx.fillStyle='#282536';lines.forEach((l,j)=>ctx.fillText(l,x,y+j*42));});
  MEMBERS.forEach((name,i)=>{const p=m.positions[name];drawFace(ctx,faces[i],bx+p.x*bw,by+p.y*bw,m.size/100*bw,name);});
  ctx.fillStyle='#625f6d';ctx.font='600 23px "Klee One",sans-serif';ctx.fillText('こんな8人、想像しちゃう。',540,1213);ctx.font='21px "Zen Kaku Gothic New",sans-serif';ctx.fillText('ファンの「もしも」の解釈です。実際の性格・行動とは関係ありません。',540,1260);ctx.font='18px "Zen Kaku Gothic New",sans-serif';ctx.fillText('非公式ファンメイド / MUZE TOOL BOX',540,1303);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像を作れませんでした。もう一度試してね。')),'image/png'));clearResult();outputURL=URL.createObjectURL(blob);$('#resultImage').src=outputURL;$('#imageResult').hidden=false;const a=document.createElement('a');a.href=outputURL;a.download='my-mazzel-'+t.id+'.png';document.body.append(a);a.click();a.remove();$('#status').textContent='画像ができました。保存されない場合は、下の画像を長押ししてね。';
 }catch(e){$('#status').textContent=e.message||'画像を作れませんでした。もう一度試してね。';}
 finally{busy=false;$('#saveImage').textContent='完成画像を保存';sync();}
};
showTheme(theme);
})();
