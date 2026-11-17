/* little town. — postcard preview.
 * Preview only: render the current live scene as a 1200×960 PNG.
 * Never reads/writes the production tracker state. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const modal = $('postcardModal');
  const image = $('postcardImage');
  const status = $('postcardStatus');
  const withAvatar = $('postcardWithAvatar');
  const save = $('savePostcard'), share = $('sharePostcard'), openImage=$('openPostcardImage'), shareX=$('sharePostcardX');
  const siteUrl='https://rikomuze.github.io/muze-tool-box/little-town/';
  const shareText='little town.';
  const W=1200,H=800;
  const scene={x:0,y:0,w:1200,h:800};
  let currentBlob=null,previewURL=null,renderSequence=0;
  const assetCache=new Map();
  function getAsset(src){
    if(!assetCache.has(src)){
      assetCache.set(src,new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);
        img.onerror=()=>reject(new Error('画像を読み込めませんでした: '+src));img.src=src;
      }));
    }
    return assetCache.get(src);
  }
  const sceneRect=()=>$('townCanvas').getBoundingClientRect();
  function placeRect(ctx,element,sourceRect,drawRect,drawImage){
    const r=element.getBoundingClientRect(),scale=drawRect.w/sourceRect.width;
    const x=drawRect.x+(r.left-sourceRect.left)*scale;
    const y=drawRect.y+(r.top-sourceRect.top)*scale;
    drawImage(x,y,r.width*scale,r.height*scale);
  }
  function drawContain(ctx,img,x,y,w,h){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih)return;
    const size=Math.min(w/iw,h/ih),dw=iw*size,dh=ih*size;
    ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  }
  function drawRoundRect(ctx,x,y,w,h,r){
    ctx.fillRect(x,y,w,h);
  }
  async function buildPostcard(includeCharacter){
    const output=document.createElement('canvas');output.width=W;output.height=H;
    const ctx=output.getContext('2d');
    // 余計なコピーや日付を入れず、街と装飾だけの1枚絵にする。
    ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,W,H);
    const original=$('townCanvas');
    const rect=sceneRect();
    if(!rect.width||!original.width)throw Error('街の画像を取得できませんでした');
    // Preserve the displayed canvas scene, including the current winter theme.
    const sx=scene.x,sy=scene.y,sw=scene.w,sh=scene.h;
    const bg=ctx.createLinearGradient(0,sy,0,sy+sh);
    bg.addColorStop(0,'#dce8df');bg.addColorStop(1,'#f7e9d7');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.beginPath();ctx.rect(sx,sy,sw,sh);ctx.clip();
    ctx.drawImage(original,sx,sy,sw,sh);
    const bounds={x:sx,y:sy,w:sw,h:sh};
    // Overlay the user's actual placement, not a default decoration arrangement.
    // 表示中の小花だけを、街と同じ座標・サイズで合成する。
    const flowers=$('flowerGround');
    if(flowers&&!flowers.hidden){
      for(const flower of flowers.querySelectorAll('.flower-cluster')){
        if(flower.hidden||getComputedStyle(flower).display==='none')continue;
        const type=flower.dataset.flower==='pink'?'pink':'white';
        const winter=flowers.classList.contains('is-winter');
        const edge=winter&&flower.dataset.edge;
        const img=await getAsset(edge?'garden/'+(type==='pink'?'berry':'shrub')+'-edge-'+edge+'.svg':winter?(type==='pink'?'garden/snow-berry.svg?v=3':'garden/snow-shrub.svg'):'garden/tiny-bloom-'+type+'.svg?v=2');
        const style=getComputedStyle(flower),angle=edge?0:(parseFloat(style.getPropertyValue('--fa'))||0);
        if(!angle){placeRect(ctx,flower,rect,bounds,(x,y,w,h)=>drawContain(ctx,img,x,y,w,h));}
        else{
          // 同じ斜めの基準線で描画。変形後の外接矩形で画像を伸縮させない。
          const r=flower.getBoundingClientRect(),scale=bounds.w/rect.width;
          const w=parseFloat(style.width)*scale,h=parseFloat(style.height)*scale;
          const x=bounds.x+(r.left+r.width/2-rect.left)*scale;
          const y=bounds.y+(r.top+r.height/2-rect.top)*scale+h/2;
          ctx.save();ctx.translate(x,y);ctx.transform(1,Math.tan(angle*Math.PI/180),0,1,0,0);
          drawContain(ctx,img,-w/2,-h,w,h);ctx.restore();
        }
      }
    }
    const deco=$('christmasFront');
    if(deco&&!deco.classList.contains('is-hidden')){
      status.textContent='装飾の画像を読み込んでいます…';
      const atlas=await getAsset('../holiday/sketch-christmas-atlas.png');
      const parts=['tree','gift','snowman','cane','wreath'];
      const cropW=atlas.naturalWidth/5,cropH=atlas.naturalHeight;
      for(let i=0;i<parts.length;i++){
        const part=deco.querySelector('.decor-'+parts[i]);
        if(!part||part.hidden||getComputedStyle(part).display==='none')continue;
        if(parts[i]==='wreath'){
          const wreath=await getAsset('garden/wreath-v2.svg');
          placeRect(ctx,part,rect,bounds,(x,y,w,h)=>drawContain(ctx,wreath,x,y,w,h));
        }else{
          placeRect(ctx,part,rect,bounds,(x,y,w,h)=>{
            if(w>0&&h>0)ctx.drawImage(atlas,i*cropW,0,cropW,cropH,x,y,w,h);
          });
        }
      }
    }
    if(includeCharacter){
      const walker=$('walker'),avatar=$('walkerImage')?.querySelector('img');
      if(walker&&avatar){
        if(!avatar.complete||!avatar.naturalWidth){
          try{await avatar.decode()}catch(err){throw Error('キャラクターの画像を読み込めませんでした')}
        }
        placeRect(ctx,walker,rect,bounds,(x,y,w,h)=>{
          ctx.save();
          if(walker.classList.contains('reverse')){
            ctx.translate(x+w/2,0);ctx.scale(-1,1);ctx.translate(-(x+w/2),0);
          }
          ctx.shadowColor='rgba(52,67,50,.22)';ctx.shadowBlur=8;ctx.shadowOffsetY=4;
          drawContain(ctx,avatar,x,y,w,h);
          ctx.restore();
        });
      }
    }
    ctx.restore();

    return await new Promise((resolve,reject)=>{
      try {
        if(typeof output.toBlob==='function') output.toBlob(blob=>blob?resolve(blob):reject(new Error('PNGの作成に失敗しました')),'image/png');
        else resolve(dataURLToBlob(output.toDataURL('image/png')));
      }catch(e){reject(e)}
    });
  }
  function dataURLToBlob(dataURL){
    const raw=atob(dataURL.split(',')[1]),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return new Blob([out],{type:'image/png'});
  }
  async function refresh(){
    const seq=++renderSequence;currentBlob=null;
    save.disabled=true;share.disabled=true;openImage.disabled=true;shareX.disabled=true;
    status.textContent='画像を準備しています…';
    try{
      const blob=await buildPostcard(withAvatar.checked);
      if(seq!==renderSequence||modal.hidden)return;
      if(previewURL)URL.revokeObjectURL(previewURL);
      currentBlob=blob;previewURL=URL.createObjectURL(blob);image.src=previewURL;
      save.disabled=false;share.disabled=false;openImage.disabled=false;shareX.disabled=false;
      status.textContent='現在の街・装飾の配置・冬モードが反映されています。';
    }catch(error){
      if(seq!==renderSequence)return;
      status.textContent='画像の作成に失敗しました：'+(error?.message||String(error));
      console.error('Postcard preview failed',error);
    }
  }
  function close(){
    modal.hidden=true;renderSequence++;
    if(previewURL){URL.revokeObjectURL(previewURL);previewURL=null}
    image.removeAttribute('src');currentBlob=null;
  }
  function fileName(){
    const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    return 'little-town-postcard-'+date+'.png';
  }
  function download(){
    if(!currentBlob)return;
    const url=URL.createObjectURL(currentBlob),a=document.createElement('a');
    a.href=url;a.download=fileName();document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),12000);
    status.textContent='PNGを保存しました。iPhoneでは共有・ファイル保存のメニューが開くことがあります。';
  }
  $('openPostcard').addEventListener('click',()=>{modal.hidden=false;refresh()});
  $('cancelPostcard').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  withAvatar.addEventListener('change',refresh);
  save.addEventListener('click',download);
  openImage.addEventListener('click',()=>{
    if(!previewURL)return;
    const opened=window.open(previewURL,'_blank');
    if(!opened)status.textContent='画像を開けなかったので「PNGを保存」を試してください。';
  });
  share.addEventListener('click',async()=>{
    if(!currentBlob)return;
    const file=new File([currentBlob],fileName(),{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      try{await navigator.share({files:[file],title:shareText,text:shareText+'\n'+siteUrl,url:siteUrl})}
      catch(error){if(error.name!=='AbortError')status.textContent='共有できませんでした。PNGを保存して共有してね。'}
    }else download();
  });
  // Xの投稿画面はサイト名とURLを確実に入力。画像は端末側から添付してもらう。
  shareX.addEventListener('click',()=>{
    const url='https://twitter.com/intent/tweet?text='+encodeURIComponent(shareText)+'&url='+encodeURIComponent(siteUrl);
    const opened=window.open(url,'_blank','noopener,noreferrer');
    if(!opened)location.href=url;
    status.textContent='Xの投稿画面を開きました。画像も載せるときは保存したPNGを添付してね。';
  });
})();