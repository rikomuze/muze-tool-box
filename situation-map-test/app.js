(() => {
'use strict';
const MEMBERS=['KAIRYU','NAOYA','RAN','SEITO','RYUKI','TAKUTO','HAYATO','EIKI'];
const THEMES=[
 {id:'icecream',title:'ソフトクリームに挑戦',note:'巻いたり、味わったり。どんな一杯になる？',labels:['じっくり巻く','トッピングに夢中','みんなの分も作る','ひとくち味見','写真に残したい','一緒にやってみる']},
 {id:'bbq',title:'8人でBBQ',note:'いいお天気。おいしい時間を一緒に。',labels:['焼き加減を見守る','下ごしらえ','みんなに取り分ける','のんびりおしゃべり','外遊びを満喫','ドリンクを準備']},
 {id:'tripnight',title:'修学旅行の夜',note:'消灯まで、あと少し。何して過ごす？',labels:['布団でごろごろ','お菓子パーティー','ゲームで盛り上がる','窓辺で星を見る','思い出を語る','明日の準備']},
 {id:'park',title:'遊園地に集合',note:'一日フリータイム。どこから回ろう？',labels:['絶叫アトラクション','メリーゴーラウンド','観覧車で景色を見る','食べ歩き','ゲームコーナー','ベンチでひと休み']},
 {id:'island',title:'島でキャンプ',note:'海も空もひとりじめ。8人の島時間。',labels:['拠点をつくる','焚き火を囲む','海辺で魚を探す','木陰でひと休み','景色を見に行く','浜辺でおしゃべり']},
 {id:'cooking',title:'みんなで料理',note:'今夜のメニュー、どうしよう？',labels:['食材を切る','お鍋を見守る','レシピをチェック','味見して相談','盛り付けを楽しむ','洗い物を進める']},
 {id:'movie',title:'おうちでホラー映画',note:'ちょっとドキドキ。好きな場所で映画タイム。',labels:['画面に集中','クッションと一緒','ポップコーン片手に','隣で一緒に見る','展開を予想','お茶を用意']},
 {id:'morning',title:'旅行の集合場所',note:'待ち合わせの朝。出発まで何してる？',labels:['時計をチェック','コーヒーを買う','荷物をまとめる','切符を準備','ベンチでおしゃべり','ルートを確認']},
 {id:'rain',title:'突然の雨、どうする？',note:'雨の時間も、8人ならちょっと楽しい。',labels:['カフェで雨宿り','傘をシェア','水たまりを楽しむ','屋根の下で待つ','お店で傘を探す','雨景色を撮る']},
 {id:'visitor',title:'お部屋に小さな訪問者',note:'小さな虫を発見。さて、どうしよう？',labels:['そっとカップで保護','道具を持ってくる','窓を開けておく','遠くから見守る','声をかけ合う','何の虫か観察']}
];
const ALL_ZONES=[
 [[.50,.27],[.80,.29],[.77,.88],[.76,.57],[.25,.90],[.25,.55]],
 [[.36,.26],[.68,.29],[.26,.88],[.25,.53],[.82,.53],[.86,.18]],
 [[.35,.48],[.82,.79],[.45,.74],[.29,.15],[.22,.91],[.85,.28]],
 [[.26,.28],[.27,.64],[.78,.29],[.19,.89],[.86,.63],[.75,.91]],
 [[.26,.29],[.66,.26],[.81,.87],[.78,.56],[.25,.72],[.48,.90]],
 [[.46,.64],[.46,.27],[.63,.63],[.85,.75],[.24,.85],[.81,.42]],
 [[.48,.27],[.17,.49],[.46,.66],[.70,.91],[.79,.51],[.88,.83]],
 [[.20,.17],[.82,.35],[.22,.65],[.82,.67],[.29,.91],[.73,.91]],
 [[.28,.25],[.38,.63],[.53,.54],[.21,.69],[.83,.22],[.77,.82]],
 [[.24,.87],[.22,.46],[.28,.24],[.78,.88],[.77,.28],[.74,.60]]
 ];
const zones=()=>ALL_ZONES[theme];
const $=s=>document.querySelector(s), KEY='muze-situation-map-v1';
const empty=()=>({size:13,positions:{}});
let saved={theme:0,maps:{}};try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw&&Number.isInteger(raw.theme)&&raw.theme>=0&&raw.theme<THEMES.length&&raw.maps&&typeof raw.maps==='object')saved=raw;}catch(_){ }
let theme=saved.theme,selected=null,drag=null,busy=false,outputURL=null;
function map(){const id=THEMES[theme].id;let m=saved.maps[id];if(!m||typeof m!=='object')m=empty();m.size=Math.max(10,Math.min(19,Number(m.size)||13));const positions={};for(const name of MEMBERS){const p=m.positions?.[name];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))positions[name]={x:p.x,y:p.y};}m.positions=positions;saved.maps[id]=m;return m;}
function persist(){saved.theme=theme;try{localStorage.setItem(KEY,JSON.stringify(saved));}catch(_){$('#status').textContent='この端末での途中保存が使えません。完成画像を保存してね。';}}
function photo(name){return 'assets/'+name.toLowerCase()+'.webp';}
function constrain(p){const half=map().size/200;p.x=Math.max(half,Math.min(1-half,p.x));p.y=Math.max(half,Math.min(1-half-.04,p.y));return p;}
function button(name,token=false){const b=document.createElement('button');b.type='button';b.className=token?'token':'member-choice';b.dataset.member=name;b.setAttribute('aria-label',name+(token?'を移動':'を選ぶ'));b.setAttribute('aria-pressed',String(selected===name));const img=document.createElement('img');img.src=photo(name);img.alt='';img.draggable=false;const span=document.createElement('span');span.textContent=name;b.append(img,span);b.addEventListener('click',()=>select(name));b.addEventListener('keydown',e=>{if(!token||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const p=map().positions[name],step=e.shiftKey?.05:.015;p.x+=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;p.y+=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;constrain(p);renderTokens();persist();document.querySelector('.token[data-member="'+name+'"]').focus();});return b;}
function select(name){selected=name;sync();$('#selectedNote').textContent=name+'を選択中。マップの好きな場所をタップしてね。';}
function sync(){const m=map(),count=Object.keys(m.positions).length;$('#placedCount').textContent=count+' / 8';$('#saveImage').disabled=count!==8||busy;$('#returnMember').disabled=!selected||!m.positions[selected];document.querySelectorAll('[data-member]').forEach(b=>{b.setAttribute('aria-pressed',String(selected===b.dataset.member));if(b.classList.contains('member-choice'))b.classList.toggle('is-placed',!!m.positions[b.dataset.member]);});document.querySelectorAll('.theme-button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===theme)));}
function renderTokens(){const el=$('#tokens');el.replaceChildren();const m=map();MEMBERS.forEach(name=>{const p=m.positions[name];if(!p)return;constrain(p);const b=button(name,true);b.style.left=p.x*100+'%';b.style.top=p.y*100+'%';b.style.width=m.size+'%';el.append(b);});sync();}
function clearResult(){if(outputURL)URL.revokeObjectURL(outputURL);outputURL=null;$('#imageResult').hidden=true;$('#resultImage').removeAttribute('src');}
function showTheme(index){if(busy)return;theme=index;selected=null;drag=null;clearResult();$('#status').textContent='';const t=THEMES[theme];$('#mobileTheme').value=String(theme);$('#sceneNumber').textContent='SCENE '+String(theme+1).padStart(2,'0')+' / 10';$('#sceneTitle').textContent=t.title;$('#sceneNote').textContent=t.note;$('#art').style.backgroundPosition=(theme%2)*100+'% '+Math.floor(theme/2)*25+'%';$('#sceneLabels').replaceChildren();t.labels.forEach((label,i)=>{const el=document.createElement('span');el.className='scene-label';el.textContent=label;el.style.left=zones()[i][0]*100+'%';el.style.top=zones()[i][1]*100+'%';$('#sceneLabels').append(el);});$('#size').value=map().size;$('#selectedNote').textContent='同じ場所に何人置いてもOK。8人の距離感も自由に。';renderTokens();persist();}
THEMES.forEach((t,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=String(i+1).padStart(2,'0')+'  '+t.title;$('#mobileTheme').append(option);const b=document.createElement('button');b.type='button';b.className='theme-button';b.setAttribute('aria-pressed','false');const no=document.createElement('span');no.className='no';no.textContent=String(i+1).padStart(2,'0');const title=document.createElement('span');title.textContent=t.title;b.append(no,title);b.onclick=()=>showTheme(i);$('#themeList').append(b);});MEMBERS.forEach(name=>$('#tray').append(button(name)));
$('#mobileTheme').onchange=()=>showTheme(Number($('#mobileTheme').value));
function position(x,y){const r=$('#board').getBoundingClientRect();return constrain({x:(x-r.left)/r.width,y:(y-r.top)/r.height});}
function place(name,p){map().positions[name]=p;clearResult();renderTokens();persist();}
function startDrag(e){if(busy||e.button>0)return;const b=e.target.closest('[data-member]');if(!b)return;e.preventDefault();select(b.dataset.member);const p=map().positions[b.dataset.member],r=$('#board').getBoundingClientRect();drag={name:b.dataset.member,id:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,offsetX:b.classList.contains('token')?e.clientX-r.left-p.x*r.width:0,offsetY:b.classList.contains('token')?e.clientY-r.top-p.y*r.height:0};}
$('#tray').addEventListener('pointerdown',startDrag);$('#tokens').addEventListener('pointerdown',startDrag);
window.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<5&&!drag.moved)return;drag.moved=true;e.preventDefault();const r=$('#board').getBoundingClientRect();if(e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom){map().positions[drag.name]=position(e.clientX-drag.offsetX,e.clientY-drag.offsetY);renderTokens();}},{passive:false});
let ignoreBoardClick=false;
window.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;if(moved){ignoreBoardClick=true;setTimeout(()=>ignoreBoardClick=false,0);clearResult();persist();}});window.addEventListener('pointercancel',()=>{drag=null;persist();});
$('#board').addEventListener('click',e=>{if(ignoreBoardClick||busy||e.target.closest('.token')||!selected)return;place(selected,position(e.clientX,e.clientY));});
$('#size').oninput=()=>{map().size=Number($('#size').value);clearResult();renderTokens();persist();};
$('#returnMember').onclick=()=>{if(selected){delete map().positions[selected];clearResult();renderTokens();persist();}};
$('#reset').onclick=()=>{$('#resetDialog').showModal();};$('#resetDialog').addEventListener('close',()=>{if($('#resetDialog').returnValue==='reset'){saved.maps[THEMES[theme].id]=empty();selected=null;showTheme(theme);}});
$('#nextTheme').onclick=()=>{showTheme((theme+1)%THEMES.length);$('#sceneTitle').scrollIntoView({behavior:'smooth',block:'start'});};
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('画像を読み込めませんでした。通信を確認して、もう一度試してね。'));img.src=src;});}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawFace(ctx,img,x,y,d,name){ctx.save();ctx.shadowColor='#28253630';ctx.shadowBlur=6;ctx.shadowOffsetY=3;ctx.beginPath();ctx.arc(x,y,d/2+4,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.shadowColor='transparent';ctx.beginPath();ctx.arc(x,y,d/2,0,Math.PI*2);ctx.clip();const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)*.3;ctx.drawImage(img,sx,sy,side,side,x-d/2,y-d/2,d,d);ctx.restore();ctx.font='700 23px "Zen Kaku Gothic New",sans-serif';const width=ctx.measureText(name).width+14;ctx.fillStyle='#fffcf3ed';rounded(ctx,x-width/2,y+d/2+7,width,32,3);ctx.fill();ctx.fillStyle='#282536';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,x,y+d/2+23);}
$('#saveImage').onclick=async()=>{
 if(busy||Object.keys(map().positions).length!==8)return;busy=true;sync();$('#saveImage').textContent='画像をつくっています…';$('#status').textContent='';
 const t=THEMES[theme],m=JSON.parse(JSON.stringify(map())),index=theme;
 try{
  await document.fonts.ready;
  const [atlas,...faces]=await Promise.all([loadImage('assets/scenes.webp'),...MEMBERS.map(n=>loadImage(photo(n)))]);
  const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.fillStyle='#f7f5ed';ctx.fillRect(0,0,1080,1350);ctx.fillStyle='#282536';ctx.textAlign='left';ctx.font='700 22px "Zen Kaku Gothic New",sans-serif';ctx.fillText('MUZE PLAY ROOM / MY MAZZEL',48,45);ctx.font='900 38px "Zen Kaku Gothic New",sans-serif';ctx.fillText(t.title,48,102);ctx.font='600 22px "Klee One",sans-serif';ctx.fillText('もしも、8人だったら。',48,140);
  const bx=40,by=172,bw=1000,tw=atlas.naturalWidth/2,th=atlas.naturalHeight/5;ctx.fillStyle='#fffaf1';ctx.fillRect(bx,by,bw,bw);ctx.drawImage(atlas,(index%2)*tw,Math.floor(index/2)*th,tw,th,bx,by,bw,bw);ctx.strokeStyle='#282536';ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bw);
  ctx.font='600 25px "Klee One",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';t.labels.forEach((label,i)=>{const x=bx+zones()[i][0]*bw,y=by+zones()[i][1]*bw,w=ctx.measureText(label).width+16;ctx.fillStyle='#fffef2dd';rounded(ctx,x-w/2,y-19,w,38,5);ctx.fill();ctx.fillStyle='#393047';ctx.fillText(label,x,y);});
  MEMBERS.forEach((name,i)=>{const p=m.positions[name];drawFace(ctx,faces[i],bx+p.x*bw,by+p.y*bw,m.size/100*bw,name);});
  ctx.fillStyle='#625f6d';ctx.font='600 23px "Klee One",sans-serif';ctx.fillText('こんな8人、想像しちゃう。',540,1213);ctx.font='21px "Zen Kaku Gothic New",sans-serif';ctx.fillText('ファンの「もしも」の解釈です。実際の性格・行動とは関係ありません。',540,1260);ctx.font='18px "Zen Kaku Gothic New",sans-serif';ctx.fillText('非公式ファンメイド / MUZE TOOL BOX',540,1303);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('画像を作れませんでした。もう一度試してね。')),'image/png'));clearResult();outputURL=URL.createObjectURL(blob);$('#resultImage').src=outputURL;$('#imageResult').hidden=false;const a=document.createElement('a');a.href=outputURL;a.download='my-mazzel-'+t.id+'.png';document.body.append(a);a.click();a.remove();$('#status').textContent='画像ができました。保存されない場合は、下の画像を長押ししてね。';
 }catch(e){$('#status').textContent=e.message||'画像を作れませんでした。もう一度試してね。';}
 finally{busy=false;$('#saveImage').textContent='完成画像を保存';sync();}
};
showTheme(theme);
})();
