/* little town. Winter Tile Workshop — Kenney Sketch Townの元PNGを端末内で冬色に加工。
 * 元データは変更せず、PNGと同じ透過・座標でCanvasを生成する。
 * v1: 積雪の地面・樹木・屋根・城壁。降雪アニメーションは含めない。 */
(function () {
  'use strict';
  const snowy = [243,249,254];
  const category = id => /^(grass_|rocks_)/.test(id) ? 'ground' :
    /^tree_/.test(id) ? 'tree' : /^roof_/.test(id) ? 'roof' :
    /^castle_/.test(id) ? 'castle' : 'building';
  const isGreen = (r,g,b) => g > r * 1.14 && g > b * 1.34 && r > 43 && b < 125;
  function snowTile(id, original) {
    const canvas = document.createElement('canvas');
    canvas.width = original.naturalWidth || original.width;
    canvas.height = original.naturalHeight || original.height;
    const context = canvas.getContext('2d', {willReadFrequently:true});
    context.drawImage(original,0,0);
    const image = context.getImageData(0,0,canvas.width,canvas.height);
    const pixels=image.data,w=canvas.width,h=canvas.height,type=category(id);
    const top=new Int16Array(w).fill(h),topGreen=new Int16Array(w).fill(h);
    for(let x=0;x<w;x++)for(let y=0;y<h;y++){
      const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
      if(a>130&&top[x]===h)top[x]=y;
      if(a>130&&isGreen(r,g,b)&&topGreen[x]===h)topGreen[x]=y;
    }
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
      if(a<60)continue;
      const green=isGreen(r,g,b);
      let color=null;
      if(type==='ground'&&green){
        color=g<120?[124,147,161]:g<160?[163,188,205]:g<185?[202,219,233]:
              g<206?[222,235,245]:snowy;
      }else if(type==='tree'&&green){
        const phase=y-topGreen[x],cap=phase<25+3*Math.sin(x*.16);
        const shelf=Math.abs(y-207)<(6+2*Math.sin(x*.2))||
                    Math.abs(y-248)<(6+2*Math.sin(x*.2));
        if(cap||shelf)color=g>125?[243,249,255]:[208,225,240];
      }else if(type==='roof'){
        const roofColor=(green&&id.includes('Green'))||
           (r>90&&b>r*1.15&&id.includes('Purple'))||
           (r>g*1.28&&r>b*1.3&&id.includes('Brown'));
        const depth=y-top[x],wave=6*Math.sin(x*.085)+3*Math.sin(x*.18);
        if(roofColor&&depth<57+wave)color=[241,248,254];
      }else if(type==='castle'){
        const depth=y-top[x];
        if(depth<12&&r>110&&g>135&&b>145)
          color=g>180?[243,249,255]:[217,231,241];
      }
      if(color){pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];}
    }
    context.putImageData(image,0,0);
    return canvas;
  }
  window.littleTownWinterTile=snowTile;
})();
