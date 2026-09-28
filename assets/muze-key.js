(function(){
"use strict";
var STORAGE_KEY="muze_tool_box_key_v1";
var alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomChunk(n){
  var out="", arr=new Uint32Array(n);
  if(window.crypto&&crypto.getRandomValues)crypto.getRandomValues(arr);
  for(var i=0;i<n;i++){var x=arr[i]||Math.floor(Math.random()*0xffffffff);out+=alphabet[x%alphabet.length]}
  return out;
}
function normalize(v){
  return String(v||"").toUpperCase().replace(/\s+/g,"").replace(/_/g,"-");
}
function valid(v){return /^MUZE-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalize(v))}
function generate(){return "MUZE-"+randomChunk(4)+"-"+randomChunk(4)+"-"+randomChunk(4)}
function ensure(){
  var k=normalize(localStorage.getItem(STORAGE_KEY));
  if(!valid(k)){k=generate();localStorage.setItem(STORAGE_KEY,k)}
  return k;
}
function get(){return ensure()}
function set(v){
  var k=normalize(v);
  if(!valid(k))throw new Error("INVALID_MUZE_KEY");
  localStorage.setItem(STORAGE_KEY,k);
  window.dispatchEvent(new CustomEvent("muze-key-changed",{detail:{key:k}}));
  return k;
}
function storageKey(base){return base+":"+get()}
function masked(k){
  k=k||get();
  var p=k.split("-");
  return p.length===4?"MUZE-••••-••••-"+p[3]:k;
}
window.MUZEKey={ensure:ensure,get:get,set:set,generate:generate,valid:valid,normalize:normalize,storageKey:storageKey,masked:masked};
})();