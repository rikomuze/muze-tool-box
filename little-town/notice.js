/* 新機能のお知らせ: 初回の訪問時だけ表示。既存のタスク記録には触れない。 */
(()=>{
  'use strict';
  const modal=document.getElementById('updateNotice');
  const closeButton=document.getElementById('closeUpdateNotice');
  const KEY='little-town-notice-winter-20261116-v1';
  if(!modal||!closeButton)return;
  let seen=false;
  try{seen=localStorage.getItem(KEY)==='seen'}catch(error){seen=true}
  if(seen)return;
  modal.hidden=false;
  const close=()=>{
    modal.hidden=true;
    try{localStorage.setItem(KEY,'seen')}catch(error){}
  };
  closeButton.addEventListener('click',close);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!modal.hidden)close();
  });
})();