/* 取引ログ（おためし版）
   - 自分のデータは localStorage「muze_trade_log_v3:<KEY>」と、MUZE KEY で暗号化したクラウド（前の交換ログとは別の保存先）
   - 前の交換ログ（muze_exchange_log_v1:<KEY>）は読むだけ。書きかえない */
(function () {
"use strict";
var G = window.MUZE_GOODS;
var BASE = "muze_trade_log_v3";
var OLD_BASE = "muze_exchange_log_v1";
var API_URL = "https://muze-toolbox-api.logical-bear-ishi.workers.dev/api/exchange-v2";
var ITER = 180000;
var KINDS = ["交換", "買取", "譲渡", "譲り受け"];
var SLOT = {
  exGive: { kind: "交換", q: "交換でわたすものは？", label: "わたすもの", short: "わたす", give: true },
  exGet: { kind: "交換", q: "交換でもらうものは？", label: "もらうもの", short: "もらう", give: false },
  buy: { kind: "買取", q: "買うものは？", label: "買うもの", short: "買う", give: false },
  gift: { kind: "譲渡", q: "ゆずるものは？", label: "ゆずるもの", short: "ゆずる", give: true },
  recv: { kind: "譲り受け", q: "ゆずってもらうものは？", label: "ゆずってもらうもの", short: "もらう", give: false }
};
var PRICE = {
  buy: { q: "いくらで買う？", hint: "あとで決まるなら空欄でOK。", pay: true },
  gift: { q: "いくらでゆずる？", hint: "無料でゆずるなら空欄のままでOK。", pay: false },
  recv: { q: "いくらでゆずってもらう？", hint: "無料なら空欄のままでOK。", pay: true }
};
var $ = function (id) { return document.getElementById(id); };

/* ---------- 小さな道具 ---------- */
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
function uid() { return "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function yen(n) { return "¥" + (Number(n) || 0).toLocaleString("ja-JP"); }
function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function today() { return iso(new Date()); }
function md(s) { if (!s) return ""; var p = s.split("-"); return (+p[1]) + "/" + (+p[2]); }
function dow(s) { return "日月火水木金土"[new Date(s + "T00:00:00").getDay()]; }
function daysUntil(s) { return Math.round((new Date(s + "T00:00:00") - new Date(today() + "T00:00:00")) / 86400000); }
function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
function endOfWeek(plus) { var d = new Date(); var add = (7 - d.getDay()) % 7 + (plus || 0) * 7; d.setDate(d.getDate() + add); return iso(d); }
function toast(msg) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 2600); }
function count(arr) { return (arr || []).reduce(function (a, x) { return a + (x.qty || 1); }, 0); }
function emptyItems() { return { exGive: [], exGet: [], buy: [], gift: [], recv: [] }; }
function emptyMoney() { return { buy: { price: "", ship: "" }, gift: { price: "", ship: "" }, recv: { price: "", ship: "" } }; }
function sumMoney(m) { return (Number(m && m.price) || 0) + (Number(m && m.ship) || 0); }
function ser(x) { return x.series && x.series !== "その他" && x.goods.indexOf(x.series) < 0 ? "（" + x.series + "）" : ""; }
function appText(d) { return d.app === "その他" ? (d.appOther || "") : (d.app || ""); }

/* ---------- データ ---------- */
var deals = [], meta = { importedIds: [] };
function key() { return MUZEKey.get(); }
function lsKey() { return BASE + ":" + key(); }
function dirtyKey() { return "muze_trade_dirty_v3:" + key(); }
function loadLocal() {
  var raw = null;
  try { raw = localStorage.getItem(lsKey()); } catch (e) {}
  if (raw === null) return false;
  try { var o = JSON.parse(raw); deals = Array.isArray(o.deals) ? o.deals.map(fixDeal) : []; meta = o.meta || { importedIds: [] }; } catch (e) { deals = []; meta = { importedIds: [] }; }
  if (!Array.isArray(meta.importedIds)) meta.importedIds = [];
  return true;
}
function snapshot() { return { v: 3, deals: deals, meta: meta }; }
function saveLocal(dirty) {
  try { localStorage.setItem(lsKey(), JSON.stringify(snapshot())); if (dirty) localStorage.setItem(dirtyKey(), "1"); } catch (e) {}
}
function fixDeal(d) {
  d.items = Object.assign(emptyItems(), d.items || {});
  d.money = Object.assign(emptyMoney(), d.money || {});
  d.done = d.done || {};
  d.photos = Array.isArray(d.photos) ? d.photos : [];
  return d;
}
function persist() { saveLocal(true); render(); cloudSave(); }

/* ---------- 暗号化クラウド（前の交換ログと同じしくみ・別の保存先） ---------- */
function b64(bytes) { var s = ""; for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }
async function sha256Hex(v) { var d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)); return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); }
async function aesKey(salt) {
  var m = await crypto.subtle.importKey("raw", new TextEncoder().encode(key()), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: ITER, hash: "SHA-256" }, m, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encrypt(value) {
  var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  var c = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, await aesKey(salt), new TextEncoder().encode(JSON.stringify(value)));
  return { v: 2, alg: "AES-GCM", kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(c)) };
}
async function decrypt(env) {
  var p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, await aesKey(unb64(env.salt)), unb64(env.ct));
  return JSON.parse(new TextDecoder().decode(p));
}
async function cloudGet(prefix) {
  var id = await sha256Hex(prefix + key());
  var r = await fetch(API_URL, { method: "GET", headers: { "X-MUZE-ID": id } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
var NEW_ID = "MUZE-TOOL-BOX:TRADE:ID:V3:", OLD_ID = "MUZE-TOOL-BOX:EXCHANGE:ID:V2:";
function setSync(t) { $("sync").textContent = t; }
async function cloudSave() {
  setSync("暗号化してクラウドに保存中…");
  try {
    var id = await sha256Hex(NEW_ID + key());
    var r = await fetch(API_URL, { method: "PUT", headers: { "Content-Type": "application/json", "X-MUZE-ID": id }, body: JSON.stringify({ envelope: await encrypt(snapshot()) }) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    try { localStorage.removeItem(dirtyKey()); } catch (e) {}
    setSync("暗号化してクラウドに保存済み");
  } catch (e) { setSync("この端末には保存済み・クラウドにはつながっていません"); }
}

/* ---------- 前の交換ログから読み込む（元のデータは変えない） ---------- */
var OLD_GOODS = { "フォトカード": "トレカ", "ネームシール": "ネームステッカー", "ICカード": "ICステッカー", "フレークシールセット": "フレークシール", "マーカーチャーム2P": "ランダム マーカーチャーム2P" };
function findGid(series, goods) {
  var hit = null;
  G.SERIES.forEach(function (c) { if (c.s !== series) return; c.g.forEach(function (g) { if (!hit && (g[1] === goods || g[1].indexOf(goods) === 0 || g[2] === goods)) hit = g[0]; }); });
  return hit;
}
function convertItem(it) {
  var goods = OLD_GOODS[it.type] || it.type || "グッズ";
  var series = it.series === "その他" ? "その他" : (it.series || "その他");
  var gid = findGid(series, goods);
  var c = gid ? G.byId[gid] : null;
  return { id: uid(), gid: gid || "", member: it.member === "その他" ? (it.other || "その他") : (it.member || "—"), series: c ? c.series : series, goods: c ? c.goods : goods, type: c ? c.type : "その他", variant: "", detail: it.detail || "", qty: 1, tent: false, pre: !!(c && c.pre) };
}
function convertRow(r) {
  var d = fixDeal({ id: uid(), created: r.created || new Date().toISOString(), name: r.name || "（名前なし）", handle: r.handle || "", app: r.app || "", appOther: r.appOther || "", memo: r.memo || "", photos: r.photos || [], method: r.method === "手渡し" ? "手渡し" : "郵送", legacy: { id: r.id, status: r.status, type: r.tradeType } });
  var give = (r.giveItems || []).map(convertItem), get = (r.getItems || []).map(convertItem);
  if (r.tradeType === "買取") { d.items.buy = get; d.money.buy = { price: r.price || "", ship: r.shipping || "" }; }
  else if (r.tradeType === "譲渡") d.items.gift = give;
  else { d.items.exGive = give; d.items.exGet = get; }
  if (d.method === "手渡し") { d.place = [r.dueDate ? md(r.dueDate) : "", r.event || ""].filter(Boolean).join(" ") || "会う日はまだ未定"; d.placeDate = r.dueDate || ""; }
  else { d.due = r.dueDate ? md(r.dueDate) + "まで" : "まだ決めてない"; d.dueDate = r.dueDate || ""; }
  if (r.promiseDate) d.memo = ("約束した日 " + r.promiseDate + (d.memo ? "\n" + d.memo : ""));
  var st = r.status || "仮約束";
  d.status = st === "仮約束" ? "仮約束" : "約束済";
  var finished = ["交換完了", "受取完了", "譲渡完了"].indexOf(st) >= 0;
  var steps = stepsOf(d), now = new Date().toISOString();
  steps.forEach(function (s) {
    if (finished) d.done[s.id] = now;
    else if (st === "発送済" && (s.id === "send")) d.done[s.id] = now;
    else if (st === "支払済" && s.id === "pay") d.done[s.id] = now;
  });
  return d;
}
function readOldLocal() {
  try { var raw = localStorage.getItem(OLD_BASE + ":" + key()); if (raw === null) raw = localStorage.getItem(OLD_BASE); var a = JSON.parse(raw || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
async function readOldRows() {
  var rows = readOldLocal();
  try {
    var c = await cloudGet(OLD_ID);
    if (c && c.found) { var cr = await decrypt(c.envelope); if (Array.isArray(cr)) { var ids = {}; rows.forEach(function (r) { ids[r.id] = 1; }); cr.forEach(function (r) { if (r && !ids[r.id]) rows.push(r); }); } }
  } catch (e) {}
  return rows;
}
async function importOld(manual) {
  var rows = await readOldRows();
  var fresh = rows.filter(function (r) { return r && r.id && meta.importedIds.indexOf(r.id) < 0; });
  fresh.forEach(function (r) { deals.push(convertRow(r)); meta.importedIds.push(r.id); });
  if (fresh.length) persist();
  var n = $("importNote");
  if (fresh.length) { n.hidden = false; n.innerHTML = "<b>前の交換ログから " + fresh.length + " 件を読み込みました。</b><span>前の交換ログの記録はそのまま残っています。グッズ名がうまく合わなかったものは「その他」になっているので、気になるものは「くわしく」から直してください。</span><div class=\"row\"><button class=\"btn sm\" type=\"button\" data-act=\"note-close\">わかった</button></div>"; }
  else if (manual) toast("新しく読み込む記録はありませんでした");
}

/* ---------- 次にやること（質問） ---------- */
function allItems(d) { var o = []; Object.keys(d.items).forEach(function (k) { (d.items[k] || []).forEach(function (x) { o.push(Object.assign({ slot: k }, x)); }); }); return o; }
function hasPre(d) { return allItems(d).some(function (x) { return x.pre; }); }
function preName(d) { var x = allItems(d).filter(function (x) { return x.pre; })[0]; return x ? x.goods : "予約のグッズ"; }
function dueText(d) {
  if (d.dueDate) { var n = daysUntil(d.dueDate); return (n > 0 ? "あと" + n + "日 " : n === 0 ? "今日 " : "期限すぎ ") + md(d.dueDate) + "（" + dow(d.dueDate) + "）まで"; }
  return d.due || "";
}
function stepsOf(d) {
  var n = d.name || "相手", out = [];
  var give = count(d.items.exGive) + count(d.items.gift) > 0, get = count(d.items.exGet) + count(d.items.buy) + count(d.items.recv) > 0;
  var pre = hasPre(d), plan = d.shipPlan || (pre ? "together" : "");
  if (d.status === "仮約束") out.push({ id: "agree", label: "約束", due: "相談中", q: n + "さんと約束できた？", a: "約束した" });
  var pay = sumMoney(d.money.buy) + (count(d.items.recv) ? sumMoney(d.money.recv) : 0), paid = count(d.items.gift) ? sumMoney(d.money.gift) : 0;
  if (d.method === "手渡し") {
    if (pre) out.push({ id: "arrive", label: "入荷待ち", due: "発送予定 " + (G.byId[allItems(d).filter(function (x) { return x.pre; })[0].gid] || {}).pre, q: preName(d) + "、届いた？", a: "届いた" });
    if (/未定/.test(d.place || "")) out.push({ id: "date", label: "日程", due: d.place, q: n + "さんと会う日、決まった？", a: "決まった" });
    out.push({ id: "meet", label: "受けわたし", due: d.placeDate ? (daysUntil(d.placeDate) >= 0 ? "あと" + daysUntil(d.placeDate) + "日 " : "") + d.place : (d.place || ""), q: n + "さんと受けわたしできた？", a: "できた" });
  } else {
    if (pay) out.push({ id: "pay", label: "支払い", due: "先に代金", q: "代金 " + yen(pay) + "、" + n + "さんに払った？", a: "払った" });
    if (paid) out.push({ id: "paid", label: "入金", due: "先に代金", q: "譲渡の代金 " + yen(paid) + "、" + n + "さんから届いた？", a: "届いた" });
    if (plan === "split") {
      var gNow = allItems(d).some(function (x) { return SLOT[x.slot].give && !x.pre; }), gPre = allItems(d).some(function (x) { return SLOT[x.slot].give && x.pre; });
      var rNow = allItems(d).some(function (x) { return !SLOT[x.slot].give && !x.pre; }), rPre = allItems(d).some(function (x) { return !SLOT[x.slot].give && x.pre; });
      if (gNow) out.push({ id: "send1", label: "1回目発送", due: dueText(d) + " ・ 今あるものだけ", q: n + "さんに、今あるものを発送した？", a: "発送した" });
      if (rNow) out.push({ id: "recv1", label: "1回目受取", due: "1回目", q: n + "さんから1回目が届いた？", a: "届いた" });
      out.push({ id: "arrive", label: "入荷待ち", due: preName(d) + "の発送待ち", q: preName(d) + "、届いた？", a: "届いた" });
      if (gPre) out.push({ id: "send2", label: "2回目発送", due: "届いてから", q: n + "さんに、残りを発送した？", a: "発送した" });
      if (rPre) out.push({ id: "recv2", label: "2回目受取", due: "2回目", q: n + "さんから2回目が届いた？", a: "届いた" });
    } else {
      if (pre) out.push({ id: "arrive", label: "入荷待ち", due: preName(d) + "の発送待ち", q: preName(d) + "、届いた？", a: "届いた" });
      if (give) out.push({ id: "send", label: "発送", due: dueText(d), q: n + "さんに発送した？", a: "発送した" });
      if (get) out.push({ id: "recv", label: "受け取り", due: give ? "発送したら" : dueText(d), q: n + "さんから届いた？", a: "届いた" });
    }
  }
  if (allItems(d).some(function (x) { return x.tent; })) out.push({ id: "tent", label: "仮の分", due: "出たら", q: "（仮）のグッズ、" + n + "さんのところで出た？", a: "出た" });
  return out;
}
function progress(d) {
  var st = stepsOf(d), at = 0;
  while (at < st.length && d.done[st[at].id]) at++;
  return { steps: st, at: at, fin: at >= st.length, cur: st[at] };
}
function answer(id) {
  var d = deals.find(function (x) { return x.id === id; }); if (!d) return;
  var p = progress(d); if (p.fin) return;
  d.done[p.cur.id] = new Date().toISOString();
  if (p.cur.id === "agree") d.status = "約束済";
  d.updated = new Date().toISOString();
  persist();
  if (progress(d).fin) toast(d.name + "さんとの取引、ぜんぶ完了！履歴に移したよ");
}
function undo(id) {
  var d = deals.find(function (x) { return x.id === id; }); if (!d) return;
  var p = progress(d); if (!p.at) return;
  var last = p.steps[p.at - 1];
  delete d.done[last.id];
  if (last.id === "agree") d.status = "仮約束";
  persist();
}

/* ---------- 一覧 ---------- */
var tab = "open";
function itemLine(x) { return x.member + (x.variant ? "「" + x.variant + "」" : "") + (x.qty > 1 ? "×" + x.qty : "") + " " + x.goods + ser(x) + (x.tent ? "（仮）" : "") + (x.pre ? "（未発送）" : ""); }
function blocksOf(d) {
  var b = [];
  if (count(d.items.exGive) + count(d.items.exGet)) b.push({ kind: "交換", money: count(d.items.exGive) + " ⇄ " + count(d.items.exGet), rows: [["わたす", d.items.exGive], ["もらう", d.items.exGet]] });
  if (count(d.items.buy)) b.push({ kind: "買取", money: sumMoney(d.money.buy) ? yen(sumMoney(d.money.buy)) : "金額未定", rows: [["買う", d.items.buy]] });
  if (count(d.items.gift)) b.push({ kind: "譲渡", money: sumMoney(d.money.gift) ? yen(sumMoney(d.money.gift)) : "無料", rows: [["ゆずる", d.items.gift]] });
  if (count(d.items.recv)) b.push({ kind: "譲り受け", money: sumMoney(d.money.recv) ? yen(sumMoney(d.money.recv)) : "無料", rows: [["もらう", d.items.recv]] });
  return b;
}
function howOf(d) {
  if (d.method === "手渡し") return "手渡し ・ " + (d.place || "会う日はまだ未定");
  var plan = d.shipPlan === "split" ? "2回に分けて（あるものを先に）" : d.shipPlan === "together" || hasPre(d) ? "そろってからまとめて" : "まとめて1回";
  return "郵送 ・ " + plan;
}
function blocksHtml(d) {
  return blocksOf(d).map(function (b) {
    return '<div class="kblock"><div class="ktop"><span class="ktag">' + b.kind + '</span><span class="money">' + esc(b.money) + '</span></div>' +
      b.rows.map(function (r) { return '<div class="krow"><span class="k">' + r[0] + '</span><span class="v">' + ((r[1] || []).length ? r[1].map(function (x) { return "<span>" + esc(itemLine(x)) + "</span>"; }).join("") : "<span>—</span>") + "</span></div>"; }).join("") + "</div>";
  }).join("");
}
function sortKey(d) { var p = progress(d); return (d.dueDate || d.placeDate || "9999") + (p.cur && p.cur.id === "agree" ? "z" : ""); }
function render() {
  $("keyOpen").textContent = "KEY " + key().slice(-4);
  var q = $("search").value.trim().toLowerCase();
  var list = deals.filter(function (d) { return (tab === "done") === progress(d).fin; })
    .filter(function (d) { return !q || JSON.stringify([d.name, d.handle, allItems(d).map(itemLine)]).toLowerCase().indexOf(q) >= 0; })
    .sort(function (a, b) { return tab === "done" ? String(b.updated || b.created).localeCompare(String(a.updated || a.created)) : sortKey(a).localeCompare(sortKey(b)) || String(b.created).localeCompare(String(a.created)); });
  var open = deals.filter(function (d) { return !progress(d).fin; }).length;
  $("tabOpen").textContent = "やること " + open; $("tabDone").textContent = "履歴 " + (deals.length - open);
  $("tabOpen").setAttribute("aria-pressed", String(tab === "open")); $("tabDone").setAttribute("aria-pressed", String(tab === "done"));
  if (!list.length) { $("list").innerHTML = '<div class="empty">' + (q ? "見つかりませんでした" : tab === "done" ? "完了した取引はまだありません" : "やることはありません。<br>下の「取引を追加」から、質問に答えて登録できます。") + "</div>"; return; }
  $("list").innerHTML = list.map(function (d) {
    var p = progress(d);
    return '<article class="card' + (p.fin ? " fin" : "") + '">' +
      '<div class="who"><b>' + esc(d.name) + '</b><span class="sub">' + esc([d.handle, appText(d)].filter(Boolean).join(" ・ ")) + '</span><span class="sp"></span><span class="st' + (d.status === "仮約束" ? " tmp" : "") + '">' + esc(d.status) + "</span></div>" +
      '<div class="how">' + esc(howOf(d)) + "</div>" + blocksHtml(d) +
      '<div class="cardacts"><button class="btn sm" type="button" data-act="share" data-id="' + d.id + '">画像で保存</button><button class="link" type="button" data-act="open" data-id="' + d.id + '">くわしく ›</button></div>' +
      '<div class="dots">' + p.steps.map(function (s, j) { return '<span class="dot' + (j < p.at ? " on" : "") + '"><i></i>' + esc(s.label) + "</span>"; }).join("") + "</div>" +
      (p.fin ? '<div class="fin-row"><span class="hand" style="font-size:18px">ぜんぶ完了 ✓</span><button class="link muted" type="button" data-act="undo" data-id="' + d.id + '">ひとつもどす</button></div>'
        : '<div class="ask"><div class="due">' + esc(p.cur.due || "") + '</div><div class="q">' + esc(p.cur.q) + '</div><div class="acts"><button class="btn dark" type="button" data-act="answer" data-id="' + d.id + '">' + esc(p.cur.a) + "</button>" + (p.at ? '<button class="link muted" type="button" data-act="undo" data-id="' + d.id + '">ひとつもどす</button>' : "") + "</div></div>") +
      "</article>";
  }).join("");
}

/* ---------- 登録（質問に答えていく） ---------- */
var W = null;
function newW(seed) {
  return Object.assign({ editId: "", i: 0, partner: null, newName: "", app: "", appOther: "", merge: null, mergeId: "", kinds: [], items: emptyItems(), money: emptyMoney(), filter: "ぜんぶ", selSeries: "", combo: null, picker: true, pending: null, other: false, justAdded: false, lastAdded: "", method: "", shipPlan: "", due: "", dueDate: "", place: "", placeDate: "", placeFree: "", status: "", memo: "", n: 0 }, seed || {});
}
function partners() {
  var map = {};
  deals.slice().sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }).forEach(function (d) {
    var k = (d.handle || d.name).toLowerCase(); if (map[k]) return;
    var openMail = deals.filter(function (x) { return (x.handle || x.name).toLowerCase() === k && x.method === "郵送" && !progress(x).fin && !x.done.send && !x.done.send1; })[0];
    map[k] = { key: k, name: d.name, handle: d.handle, app: d.app, appOther: d.appOther, sub: [appText(d), openMail ? "未発送のやり取りあり" : "前回 " + md(String(d.created).slice(0, 10))].filter(Boolean).join(" ・ "), openId: openMail ? openMail.id : "" };
  });
  return Object.keys(map).map(function (k) { return map[k]; }).slice(0, 6);
}
function wSteps() {
  var out = [{ id: "who" }, { id: "what" }];
  var groups = [];
  if (W.kinds.indexOf("交換") >= 0) groups.push(["交換", [{ id: "items", slot: "exGive" }, { id: "items", slot: "exGet" }]]);
  if (W.kinds.indexOf("買取") >= 0) groups.push(["買取", [{ id: "items", slot: "buy" }, { id: "price", slot: "buy" }]]);
  if (W.kinds.indexOf("譲渡") >= 0) groups.push(["譲渡", [{ id: "items", slot: "gift" }, { id: "price", slot: "gift" }]]);
  if (W.kinds.indexOf("譲り受け") >= 0) groups.push(["譲り受け", [{ id: "items", slot: "recv" }, { id: "price", slot: "recv" }]]);
  groups.forEach(function (g, gi) { g[1].forEach(function (s) { out.push(Object.assign({ kind: g[0], pos: groups.length > 1 ? (gi + 1) + "つめ / " + groups.length + "つ" : "" }, s)); }); });
  if (W.merge !== true) { out.push({ id: "how" }); out.push({ id: "status" }); }
  out.push({ id: "check" });
  return out;
}
function wName() { return W.partner ? W.partner.name : (W.newName.trim() || "お相手"); }
function wAll() { var o = []; Object.keys(W.items).forEach(function (k) { W.items[k].forEach(function (x) { o.push(x); }); }); return o; }
function wPre() { return wAll().some(function (x) { return x.pre; }); }
function wAllPre() { var a = wAll(); return a.length > 0 && a.every(function (x) { return x.pre; }); }
function wAskPlan() { return W.method === "郵送" && wPre() && !wAllPre(); }
function wPlan() { return wAskPlan() ? W.shipPlan : (wPre() ? "together" : ""); }
function canNext(st) {
  if (st.id === "who") return !!(W.partner || W.newName.trim()) && !(W.partner && W.partner.openId && W.merge === null);
  if (st.id === "what") return W.kinds.length > 0;
  if (st.id === "items") return W.items[st.slot].length > 0;
  if (st.id === "how") return W.method === "郵送" ? (!wAskPlan() || !!W.shipPlan) && !!(W.due || W.dueDate) : W.method === "手渡し" && !!W.place;
  if (st.id === "status") return !!W.status;
  return true;
}
function desc(st) {
  if (!st) return "";
  if (st.id === "items") return SLOT[st.slot].label + "を選ぶ";
  return { who: "だれとのやり取りか", what: "なにをするか", price: "金額", how: "受けわたし方", status: "約束か仮約束か", check: "最後の確認" }[st.id];
}
function openWizard(seed) { W = newW(seed); $("wiz").hidden = false; document.body.style.overflow = "hidden"; wRender(); }
function closeWizard() { $("wiz").hidden = true; document.body.style.overflow = ""; W = null; }
function seriesOpts() {
  return G.SERIES.map(function (c) { return { s: c.s, sub: c.sub, pre: c.pre, g: c.g.filter(function (g) { return W.filter === "ぜんぶ" || g[2] === W.filter; }) }; }).filter(function (c) { return c.g.length; });
}
function chooseGoods(gid) {
  var c = G.byId[gid]; if (!c) return;
  W.combo = { gid: gid, series: c.series, goods: c.goods, type: c.type, pre: !!c.pre }; W.picker = false; W.selSeries = "";
}
function addItem(m, variant) {
  var c = W.combo, slot = wSteps()[W.i].slot, list = W.items[slot];
  var hit = list.filter(function (x) { return x.member === m && x.goods === c.goods && x.series === c.series && (x.variant || "") === variant; })[0];
  if (hit) hit.qty++; else list.push({ id: uid(), gid: c.gid || "", member: m, series: c.series, goods: c.goods, type: c.type, variant: variant, detail: "", qty: 1, tent: false, pre: !!c.pre });
  W.pending = null; W.other = false; W.justAdded = true;
  W.lastAdded = m + (variant ? "「" + variant + "」" : "") + "　" + c.goods + ser(c);
}
function telopOptions(m) {
  var t = G.TELOPS[m] || [null, null], out = [];
  t.forEach(function (x) { if (x) out.push({ v: x, label: x, sub: "" }); });
  var unknown = t.filter(function (x) { return !x; }).length;
  if (unknown) out.push({ v: unknown === 2 ? "テロップ未定" : "未公開の方", label: unknown === 2 ? "まだわからない" : "もう1つの方（まだ公開されていない）", sub: "わかったら、あとで選びなおせるよ" });
  out.push({ v: "どちらでも", label: "どちらでもOK", sub: m + "ならどれでも" });
  return out;
}
function wRender() {
  var steps = wSteps(); if (W.i >= steps.length) W.i = steps.length - 1;
  var st = steps[W.i], nx = steps[W.i + 1], name = wName(), h = "";
  var q = "", hint = "";
  if (st.id === "who") { q = "だれとのやり取り？"; hint = "前にやり取りした人はタップするだけ。"; }
  if (st.id === "what") { q = "なにをする？"; hint = "いくつでもえらべるよ。えらんだ種類ごとに、ひとつずつ聞いていくね。"; }
  if (st.id === "items") { q = SLOT[st.slot].q; hint = W.justAdded ? "" : W.picker || !W.combo ? "シリーズをえらぶと、そのとき出たグッズだけ出てくるよ。" : "メンバーを選ぶと1つ追加されるよ。グッズが違うときは「変える」から。"; }
  if (st.id === "price") { q = PRICE[st.slot].q; hint = PRICE[st.slot].hint; }
  if (st.id === "how") { q = "どうやって受けわたす？"; hint = "同じ相手とのやり取りは、まとめて送る前提だよ。"; }
  if (st.id === "status") { q = name + "さんとの約束は？"; hint = "どちらか必ず選んでね。あとから一覧で変えられるよ。"; }
  if (st.id === "check") { q = W.editId ? "この内容で保存していい？" : "これで保存していい？"; hint = W.editId ? "直したいところは「もどる」で前の質問に戻れるよ。" : "写真やメモは、あとから足せるよ。"; }
  h += '<div class="bar"><div class="barrow"><button class="back" type="button" data-w="back"' + (W.i === 0 ? " disabled" : "") + '>‹ もどる</button><span class="lbl">' + (W.i + 1) + " / " + steps.length + '</span><button class="x" type="button" data-w="close" aria-label="閉じる">✕</button></div><div class="segs">' + steps.map(function (s, j) { return '<span class="seg' + (j <= W.i ? " on" : "") + '"></span>'; }).join("") + "</div></div>";
  h += '<div class="body"><div class="inner">';
  if (st.kind) h += '<div class="kindhead"><span class="ktag">' + st.kind + "</span><span>" + (st.pos || "") + "</span></div>";
  h += '<h2 class="qh">' + esc(q) + "</h2>" + (hint ? '<p class="hint">' + esc(hint) + "</p>" : "");

  if (st.id === "who") {
    var ps = partners();
    if (ps.length) h += '<div class="lbl">前にやり取りした人</div>' + ps.map(function (p) { return '<button class="opt' + (W.partner && W.partner.key === p.key ? " on" : "") + '" type="button" data-w="partner" data-v="' + esc(p.key) + '"><b>' + esc(p.name) + ' <span style="font-family:var(--gothic);font-size:15px;font-weight:400;color:var(--muted)">' + esc(p.handle || "") + "</span></b><small>" + esc(p.sub) + "</small></button>"; }).join("");
    h += '<div class="lbl" style="margin-top:8px">はじめての人</div><input class="inp" id="wName" type="text" placeholder="ニックネーム（例：りこ）" value="' + esc(W.newName) + '" autocomplete="off">';
    if (!W.partner && W.newName.trim()) {
      h += '<input class="inp" id="wHandle" type="text" placeholder="@ID（任意）" value="' + esc(W.handle || "") + '" autocomplete="off" autocapitalize="off">';
      h += '<div class="lbl">どこでやり取りしてる？</div><div class="chips">' + ["X", "Instagram", "LINE", "Threads", "その他"].map(function (a) { return '<button class="chip' + (W.app === a ? " on" : "") + '" type="button" data-w="app" data-v="' + a + '">' + a + "</button>"; }).join("") + "</div>";
      if (W.app === "その他") h += '<input class="inp" id="wAppOther" type="text" placeholder="アプリ名" value="' + esc(W.appOther) + '">';
    }
    if (W.partner && W.partner.openId) h += '<div class="choice"><div class="hand" style="font-size:17px;line-height:1.5">' + esc(W.partner.name) + 'さんとは、まだ発送していないやり取りがあるよ。同じ封筒に入れる？</div><div class="grid2"><button class="chip' + (W.merge === true ? " on" : "") + '" type="button" data-w="merge" data-v="1">まとめる</button><button class="chip' + (W.merge === false ? " on" : "") + '" type="button" data-w="merge" data-v="0">別にする</button></div></div>';
  }
  if (st.id === "what") {
    var subs = { "交換": "グッズとグッズを交換する", "買取": "相手のグッズをお金で買う", "譲渡": "自分のグッズをゆずる", "譲り受け": "相手のグッズをゆずってもらう" };
    h += KINDS.map(function (k) { return '<button class="opt' + (W.kinds.indexOf(k) >= 0 ? " on" : "") + '" type="button" data-w="kind" data-v="' + k + '"><b>' + k + "</b><small>" + subs[k] + "</small></button>"; }).join("");
  }
  if (st.id === "items") {
    var give = SLOT[st.slot].give, list = W.items[st.slot];
    h += '<div class="dir"><span>' + (give ? "→" : "←") + "</span><span>" + (give ? "わたす（" + esc(name) + "さんへ）" : "もらう（" + esc(name) + "さんから）") + "</span></div>";
    if (W.justAdded) {
      h += '<div class="added"><b>✓ 追加</b><span>' + esc(W.lastAdded) + "</span></div>";
      h += '<div class="choice"><div class="hand" style="font-size:19px">つぎはどうする？</div><button class="opt on" type="button" data-w="more"><b>＋ ' + SLOT[st.slot].label + 'をもう1つ入れる</b><small>グッズの種類から選びなおすよ</small></button><button class="opt" type="button" data-w="next"><b>' + (nx && nx.id === "items" && nx.slot === "exGet" ? "もらうものに進む →" : esc(desc(nx).replace(/を選ぶ$/, "")) + "に進む →") + "</b><small>" + SLOT[st.slot].label + "はこれで全部</small></button></div>";
    } else if (W.picker || !W.combo) {
      var so = seriesOpts(), cur = so.filter(function (c) { return c.s === W.selSeries; })[0];
      h += '<div class="picker">';
      h += '<label><span><span class="num">1</span>グッズの種類 <span style="font-weight:400;color:var(--muted)">（しぼりこみ・任意）</span></span><select class="sel" id="wFilter">' + ["ぜんぶ"].concat(G.TYPES).map(function (t) { return '<option value="' + t + '"' + (W.filter === t ? " selected" : "") + ">" + (t === "ぜんぶ" ? "すべての種類" : t) + "</option>"; }).join("") + "</select></label>";
      h += '<label><span><span class="num">2</span>シリーズ <span style="font-weight:400;color:var(--muted)">（新しい順・' + so.length + '件）</span></span><select class="sel" id="wSeries"><option value="">シリーズをえらぶ</option>' + so.map(function (c) { return '<option value="' + esc(c.s) + '"' + (W.selSeries === c.s ? " selected" : "") + ">" + esc(c.s + "（" + c.sub + "）") + "</option>"; }).join("") + "</select></label>";
      h += '<label><span><span class="num">3</span>グッズ</span><select class="sel" id="wGoods"' + (cur ? "" : " disabled") + '><option value="">' + (cur ? "グッズをえらぶ（" + cur.g.length + "種類）" : "先にシリーズをえらんでね") + "</option>" + (cur ? cur.g.map(function (g) { return '<option value="' + g[0] + '">' + esc(g[1]) + "</option>"; }).join("") : "") + "</select></label>";
      h += '<div style="padding-top:10px;border-top:1px dashed var(--line);display:flex;flex-direction:column;gap:6px"><div class="lbl">一覧にないもの</div><div style="display:flex;gap:6px"><input class="inp" id="wFree" type="text" placeholder="例：2023 夏祭り 缶バッジ"><button class="chip" type="button" data-w="free" style="flex-shrink:0">決定</button></div></div>';
      h += "</div>";
    } else {
      var c = W.combo;
      h += '<div class="picked"><div class="ph" style="width:64px;height:64px">' + (c.gid ? '<img src="../' + G.byId[c.gid].img + '" alt="">' : "写真") + '</div><div class="t"><small>' + esc(c.series) + "</small><b>" + esc(c.goods) + '</b></div><button class="chip" type="button" data-w="change">変える</button></div>';
      h += '<div style="font-size:15px;font-weight:700">どのメンバー？</div><div class="mems">' + G.MEMBERS.map(function (m) { return '<button class="mem" type="button" data-w="mem" data-v="' + m + '">' + m + "</button>"; }).join("") + "</div>";
      h += '<button class="link muted" type="button" data-w="othermem">メンバー以外・グループのもの</button>';
      if (W.other) h += '<div style="display:flex;gap:6px"><input class="inp" id="wOther" type="text" placeholder="例：MAZZEL（集合） / ほかのアーティスト"><button class="chip" type="button" data-w="otheradd" style="flex-shrink:0">追加</button></div>';
      if (W.pending) h += '<div class="pend"><div style="display:flex;align-items:center;justify-content:space-between"><span class="hand" style="font-size:18px">' + esc(W.pending) + ' のどのテロップ？</span><button class="x" type="button" data-w="cancelpend" aria-label="やめる">✕</button></div>' + telopOptions(W.pending).map(function (o) { return '<button class="goods" type="button" data-w="telop" data-v="' + esc(o.v) + '">' + esc(o.label) + (o.sub ? "<br><small>" + esc(o.sub) + "</small>" : "") + "</button>"; }).join("") + "</div>";
    }
    h += '<div class="items"><div class="lbl">' + SLOT[st.slot].label + " " + count(list) + "つ</div>" + (list.length ? list.map(function (x) {
      var flake = x.goods.indexOf("フレークシール") === 0;
      return '<div class="item"><div class="ph" style="width:44px;height:44px">' + (x.gid ? '<img src="../' + G.byId[x.gid].img + '" alt="">' : "写真") + '</div><div class="t"><b>' + esc(x.member) + (x.tent ? "（仮）" : "") + "</b><small>" + esc(x.series + " ／ " + x.goods + (x.variant ? "「" + x.variant + "」" : "")) + '</small><div class="tg">' + (flake ? '<button class="tent" type="button" data-w="pose" data-v="' + x.id + '">' + (x.variant === "2ポーズ" ? "1ポーズだけにする" : "2ポーズセットにもどす") + "</button>" : "") + '<button class="tent' + (x.tent ? " on" : "") + '" type="button" data-w="tent" data-v="' + x.id + '">' + (x.tent ? "仮：もし出たら・まだ未確定" : "仮にする（もし出たら など）") + '</button></div></div><button class="qty" type="button" data-w="dec" data-v="' + x.id + '" aria-label="1つへらす">−</button><span class="qn">×' + x.qty + '</span><button class="qty" type="button" data-w="inc" data-v="' + x.id + '" aria-label="1つふやす">＋</button></div>';
    }).join("") : '<div class="empty" style="padding:14px">まだないよ</div>') + "</div>";
  }
  if (st.id === "price") {
    var mm = W.money[st.slot];
    h += '<div class="note" style="border-style:dashed">' + esc(SLOT[st.slot].label + "：" + W.items[st.slot].map(itemLine).join("、")) + "</div>";
    h += '<div class="price" style="display:flex;flex-direction:column;gap:12px"><label>グッズ代金<input class="inp" id="wPrice" type="number" inputmode="numeric" min="0" placeholder="500" value="' + esc(mm.price) + '"></label><label>送料<input class="inp" id="wShip" type="number" inputmode="numeric" min="0" placeholder="210" value="' + esc(mm.ship) + '"></label><div class="total" id="wTotal">合計 ' + yen(sumMoney(mm)) + "</div></div>";
  }
  if (st.id === "how") {
    h += [["郵送", "まとめて発送して、相手からも届くのを待つ"], ["手渡し", "現場などで会って受けわたす"]].map(function (x) { return '<button class="opt' + (W.method === x[0] ? " on" : "") + '" type="button" data-w="method" data-v="' + x[0] + '"><b>' + x[0] + "</b><small>" + x[1] + "</small></button>"; }).join("");
    if (wPre()) h += '<div class="note"><b>まだ届いていないグッズが入っているよ</b><br>' + esc(preNameW()) + " は発送待ち。届いたら一覧で聞くね。</div>";
    if (W.method === "郵送") {
      if (wAskPlan()) h += '<div class="hand" style="font-size:18px">まだ届いていないグッズがあるけど、どう送る？</div>' + [["split", "あるものを先に送る", "未発送のグッズは、届いてから後日もう1回送る"], ["together", "そろってからまとめて送る", "届くまで待って、1回で送る"]].map(function (x) { return '<button class="opt' + (W.shipPlan === x[0] ? " on" : "") + '" type="button" data-w="plan" data-v="' + x[0] + '"><b>' + x[1] + "</b><small>" + x[2] + "</small></button>"; }).join("");
      if (!wAskPlan() || W.shipPlan) {
        var plan = wPlan(), opts = plan === "together" ? ["届いてから1週間以内", "まだ決めてない"] : ["今週中", "来週中", "まだ決めてない"];
        h += '<div class="hand" style="font-size:18px">' + (plan === "split" ? "今あるものは、いつまでに送る？" : plan === "together" ? "そろったら、いつまでに送る？" : "いつまでに送る？") + '</div><div class="chips">' + opts.map(function (t) { return '<button class="chip' + (W.due === t ? " on" : "") + '" type="button" data-w="due" data-v="' + t + '">' + t + "</button>"; }).join("") + "</div>";
        if (plan !== "together") h += '<label class="lbl" style="display:flex;flex-direction:column;gap:6px">日付で決める<input class="inp" id="wDueDate" type="date" value="' + esc(W.dueDate) + '"></label>';
      }
    }
    if (W.method === "手渡し") {
      var evs = (window.MUZE_DAY_EVENTS || []).filter(function (e) { return e.date >= today(); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 6);
      h += '<div class="hand" style="font-size:18px">どこで、いつ？</div><div class="lbl">MUZE DAYの予定から</div><div class="chips">' + evs.map(function (e) { var l = md(e.date) + " " + e.name.replace(/^2nd Fan Meeting /, "ファンミ "); return '<button class="chip' + (W.place === l ? " on" : "") + '" type="button" data-w="place" data-v="' + esc(l) + '" data-d="' + e.date + '">' + esc(l) + "</button>"; }).join("") + '<button class="chip' + (W.place === "会う日はまだ未定" ? " on" : "") + '" type="button" data-w="place" data-v="会う日はまだ未定" data-d="">会う日はまだ未定（来月など）</button></div>';
      h += '<label class="lbl" style="display:flex;flex-direction:column;gap:6px">ほかの場所・日<input class="inp" id="wPlace" type="text" placeholder="例：11/20 渋谷" value="' + esc(W.placeFree) + '"></label>';
    }
  }
  if (st.id === "status") {
    h += [["約束済", "お互いOKして、内容が決まっている"], ["仮約束", wPre() ? "まだ届いていないグッズがあるなら、こっち" : "まだ相談中・相手の返事待ち・出たら交換 など"]].map(function (x) { return '<button class="opt' + (W.status === x[0] ? " on" : "") + '" type="button" data-w="status" data-v="' + x[0] + '"><b>' + x[0] + "</b><small>" + x[1] + "</small></button>"; }).join("");
  }
  if (st.id === "check") {
    var tmp = wToDeal(true);
    h += '<div class="summary"><div class="who"><b>' + esc(tmp.name) + '</b><span class="sub">' + esc([tmp.handle, appText(tmp)].filter(Boolean).join(" ・ ")) + '</span><span class="sp"></span><span class="st' + (tmp.status === "仮約束" ? " tmp" : "") + '">' + esc(tmp.status) + "</span></div>";
    if (W.merge === true) h += '<div class="note" style="padding:6px 10px;font-size:14px">前のやり取りと同じ封筒にまとめるよ</div>';
    h += blocksHtml(tmp) + '<div class="how" style="margin:0;padding-top:10px;border-top:1px dashed var(--line);font-size:16px;color:var(--ink)">' + esc(howOf(tmp)) + "</div></div>";
    h += '<label class="lbl" style="display:flex;flex-direction:column;gap:6px">メモ（任意）<textarea class="inp" id="wMemo" placeholder="梱包・待ち合わせ・DMの内容など">' + esc(W.memo) + "</textarea></label>";
  }
  h += "</div></div>";
  var showNext = st.id !== "check" && !(st.id === "items" && W.justAdded);
  h += '<div class="foot"><div class="in">' + (showNext ? '<button class="next" type="button" data-w="next" id="wNext"' + (canNext(st) ? "" : " disabled") + ">" + (st.id === "items" && W.items[st.slot].length && st.slot === "exGive" ? "もらうものに進む →" : "つぎへ") + "</button>" + (nx ? '<div class="nextnote">つぎ：' + esc(desc(nx)) + "</div>" : "") : st.id === "check" ? '<button class="save" type="button" data-w="save">' + (W.editId ? "この内容で保存する" : "これで保存する") + "</button>" : "") + "</div></div>";
  $("wiz").innerHTML = h;
}
function preNameW() { var x = wAll().filter(function (x) { return x.pre; })[0]; return x ? x.goods : ""; }
function wRefreshNext() { var b = document.getElementById("wNext"); if (b) b.disabled = !canNext(wSteps()[W.i]); }
function wToDeal(preview) {
  var base = W.editId ? deals.find(function (d) { return d.id === W.editId; }) : null;
  var target = W.merge === true ? deals.find(function (d) { return d.id === W.mergeId; }) : null;
  if (target) {
    var t = JSON.parse(JSON.stringify(target));
    Object.keys(W.items).forEach(function (k) { t.items[k] = t.items[k].concat(W.items[k]); });
    Object.keys(W.money).forEach(function (k) { if (sumMoney(W.money[k])) t.money[k] = W.money[k]; });
    if (W.memo) t.memo = (t.memo ? t.memo + "\n" : "") + W.memo;
    return fixDeal(t);
  }
  var p = W.partner;
  var dueDate = W.dueDate || (W.due === "今週中" ? endOfWeek(0) : W.due === "来週中" ? endOfWeek(1) : "");
  return fixDeal({
    id: base ? base.id : uid(), created: base ? base.created : new Date().toISOString(), updated: new Date().toISOString(),
    name: p ? p.name : W.newName.trim(), handle: p ? p.handle : (W.handle || "").trim(), app: p ? p.app : W.app, appOther: p ? p.appOther : W.appOther,
    status: W.status || "仮約束", items: JSON.parse(JSON.stringify(W.items)), money: JSON.parse(JSON.stringify(W.money)),
    method: W.method, shipPlan: wAskPlan() ? W.shipPlan : (wPre() ? "together" : ""), due: W.dueDate ? md(W.dueDate) + "まで" : W.due, dueDate: dueDate,
    place: W.place, placeDate: W.placeDate, memo: W.memo, photos: base ? base.photos : [], done: base ? base.done : {}, tracking: base ? base.tracking : "", legacy: base ? base.legacy : undefined
  });
}
function wSave() {
  var d = wToDeal(false);
  var idx = deals.findIndex(function (x) { return x.id === d.id; });
  if (idx >= 0) deals[idx] = d; else deals.push(d);
  closeWizard(); tab = "open"; persist();
  var p = progress(d);
  toast(p.fin ? "保存したよ" : "保存したよ。つぎは「" + p.cur.q + "」");
}
function dealToW(d) {
  var p = partners().filter(function (x) { return x.key === (d.handle || d.name).toLowerCase(); })[0] || { key: (d.handle || d.name).toLowerCase(), name: d.name, handle: d.handle, app: d.app, appOther: d.appOther, sub: "" };
  p = Object.assign({}, p, { openId: "" });
  var kinds = []; if (d.items.exGive.length + d.items.exGet.length) kinds.push("交換"); if (d.items.buy.length) kinds.push("買取"); if (d.items.gift.length) kinds.push("譲渡"); if (d.items.recv.length) kinds.push("譲り受け");
  var w = newW({ editId: d.id, partner: p, merge: false, kinds: kinds, items: JSON.parse(JSON.stringify(d.items)), money: JSON.parse(JSON.stringify(d.money)), method: d.method, shipPlan: d.shipPlan || "", due: d.dueDate ? "" : d.due, dueDate: d.dueDate && !/中$/.test(d.due || "") ? d.dueDate : "", place: d.place || "", placeDate: d.placeDate || "", status: d.status, memo: d.memo || "", picker: false });
  if (/中$/.test(d.due || "")) w.due = d.due;
  return w;
}

document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-w]"); if (!b || !W) return;
  var a = b.getAttribute("data-w"), v = b.getAttribute("data-v"), steps = wSteps(), st = steps[W.i];
  var slot = st.slot;
  if (a === "close") { closeWizard(); return; }
  if (a === "back") { W.i = Math.max(0, W.i - 1); W.justAdded = false; W.pending = null; }
  if (a === "next") { if (!canNext(st)) return; W.i++; W.justAdded = false; W.pending = null; W.picker = !W.combo; W.filter = "ぜんぶ"; W.selSeries = ""; }
  if (a === "partner") { var p = partners().filter(function (x) { return x.key === v; })[0]; W.partner = p; W.newName = ""; W.merge = null; W.mergeId = p.openId; }
  if (a === "merge") W.merge = v === "1";
  if (a === "app") W.app = v;
  if (a === "kind") { var k = W.kinds; W.kinds = k.indexOf(v) >= 0 ? k.filter(function (x) { return x !== v; }) : KINDS.filter(function (x) { return x === v || k.indexOf(x) >= 0; }); }
  if (a === "free") { var f = (document.getElementById("wFree").value || "").trim(); if (!f) return; W.combo = { gid: "", series: "その他", goods: f, type: "その他", pre: false }; W.picker = false; }
  if (a === "change") { W.picker = true; W.filter = "ぜんぶ"; W.selSeries = ""; }
  if (a === "more") { W.justAdded = false; W.picker = true; W.combo = null; W.selSeries = ""; W.filter = "ぜんぶ"; }
  if (a === "mem") { if (W.combo.goods === "ランダムテロップチャーム") W.pending = v; else addItem(v, W.combo.goods.indexOf("フレークシール") === 0 ? "2ポーズ" : ""); }
  if (a === "telop") addItem(W.pending, v);
  if (a === "cancelpend") W.pending = null;
  if (a === "othermem") W.other = !W.other;
  if (a === "otheradd") { var o = (document.getElementById("wOther").value || "").trim(); if (!o) return; addItem(o, ""); }
  if (a === "inc" || a === "dec" || a === "tent" || a === "pose") {
    var list = W.items[slot], it = list.filter(function (x) { return x.id === v; })[0]; if (!it) return;
    if (a === "inc") it.qty++;
    if (a === "dec") { if (it.qty > 1) it.qty--; else W.items[slot] = list.filter(function (x) { return x !== it; }); }
    if (a === "tent") it.tent = !it.tent;
    if (a === "pose") it.variant = it.variant === "2ポーズ" ? "1ポーズだけ" : "2ポーズ";
  }
  if (a === "method") { W.method = v; }
  if (a === "plan") { W.shipPlan = v; W.due = ""; W.dueDate = ""; }
  if (a === "due") { W.due = v; W.dueDate = ""; }
  if (a === "place") { W.place = v; W.placeDate = b.getAttribute("data-d") || ""; W.placeFree = ""; }
  if (a === "status") W.status = v;
  if (a === "save") { wSave(); return; }
  var body = document.querySelector("#wiz .body"), y = body ? body.scrollTop : 0, keep = ["inc", "dec", "tent", "pose", "app", "merge", "kind", "plan", "due", "place", "status", "method", "partner", "telop", "mem", "othermem", "otheradd", "cancelpend"].indexOf(a) >= 0;
  wRender();
  var nb = document.querySelector("#wiz .body"); if (nb) nb.scrollTop = keep ? y : 0;
});
document.addEventListener("input", function (e) {
  if (!W) return;
  var id = e.target.id, v = e.target.value;
  if (id === "wName") { W.newName = v; W.partner = null; W.merge = null; var had = !!document.getElementById("wHandle"); if (had !== !!v.trim()) { wRender(); var el = document.getElementById("wName"); el.focus(); el.setSelectionRange(v.length, v.length); } }
  if (id === "wHandle") W.handle = v;
  if (id === "wAppOther") W.appOther = v;
  if (id === "wPrice" || id === "wShip") { var st = wSteps()[W.i]; W.money[st.slot][id === "wPrice" ? "price" : "ship"] = v; document.getElementById("wTotal").textContent = "合計 " + yen(sumMoney(W.money[st.slot])); }
  if (id === "wDueDate") { W.dueDate = v; W.due = ""; document.querySelectorAll('#wiz [data-w="due"]').forEach(function (x) { x.classList.remove("on"); }); }
  if (id === "wPlace") { W.placeFree = v; W.place = v.trim(); W.placeDate = ""; document.querySelectorAll('#wiz [data-w="place"]').forEach(function (x) { x.classList.remove("on"); }); }
  if (id === "wMemo") W.memo = v;
  wRefreshNext();
});
document.addEventListener("change", function (e) {
  if (!W) return;
  var id = e.target.id, v = e.target.value;
  if (id === "wFilter") { W.filter = v; W.selSeries = ""; wRender(); }
  if (id === "wSeries") { W.selSeries = v; var c = seriesOpts().filter(function (x) { return x.s === v; })[0]; if (c && c.g.length === 1) chooseGoods(c.g[0][0]); wRender(); }
  if (id === "wGoods") { if (v) { chooseGoods(v); wRender(); } }
});

/* ---------- くわしく ---------- */
var openId = "", confirmDel = false;
function openDetail(id) { openId = id; confirmDel = false; $("detail").hidden = false; document.body.style.overflow = "hidden"; dRender(); }
function closeDetail() { $("detail").hidden = true; document.body.style.overflow = ""; openId = ""; }
function dRender() {
  var d = deals.find(function (x) { return x.id === openId; }); if (!d) { closeDetail(); return; }
  var p = progress(d), h = "";
  h += '<div class="bar"><div class="barrow"><button class="back" type="button" data-d="close">‹ 一覧</button><span class="lbl">' + esc(howOf(d)) + "</span><span></span></div></div>";
  h += '<div class="body"><div class="inner">';
  h += '<div class="who"><b style="font-size:28px">' + esc(d.name) + '</b><span class="sub">' + esc([d.handle, appText(d)].filter(Boolean).join(" ・ ")) + '</span><span class="sp"></span><button class="st' + (d.status === "仮約束" ? " tmp" : "") + '" type="button" data-d="status" style="cursor:pointer">' + esc(d.status) + " ⇄</button></div>";
  h += '<div class="dots" style="border:0;padding:0">' + p.steps.map(function (s, j) { return '<span class="dot' + (j < p.at ? " on" : "") + '"><i></i>' + esc(s.label) + "</span>"; }).join("") + "</div>";
  if (!p.fin) h += '<div class="ask"><div class="due">' + esc(p.cur.due || "") + '</div><div class="q">' + esc(p.cur.q) + '</div><div class="acts"><button class="btn dark" type="button" data-d="answer">' + esc(p.cur.a) + "</button>" + (p.at ? '<button class="link muted" type="button" data-d="undo">ひとつもどす</button>' : "") + "</div></div>";
  else h += '<div class="fin-row"><span class="hand" style="font-size:18px">ぜんぶ完了 ✓</span><button class="link muted" type="button" data-d="undo">ひとつもどす</button></div>';
  h += blocksOf(d).map(function (b) {
    return '<div class="kblock"><div class="ktop"><span class="ktag">' + b.kind + '</span><span class="money">' + esc(b.money) + "</span></div>" + b.rows.map(function (r) {
      return '<div class="lbl">' + r[0] + "</div>" + (r[1] || []).map(function (x) { return '<div class="ditem"><div class="ph" style="width:52px;height:52px">' + (x.gid ? '<img src="../' + G.byId[x.gid].img + '" alt="">' : "写真") + "</div><div><b>" + esc(x.member + (x.variant ? "「" + x.variant + "」" : "") + (x.qty > 1 ? " ×" + x.qty : "")) + "</b>" + (x.tent ? "（仮）" : "") + '<br><span style="font-size:13px;color:var(--muted)">' + esc(x.goods + ser(x) + (x.pre ? " ・ 未発送" : "") + (x.detail ? " ・ " + x.detail : "")) + "</span></div></div>"; }).join("");
    }).join("") + "</div>";
  }).join("");
  h += '<button class="btn pink" type="button" data-d="share">この取引を画像で保存</button>';
  if (d.method === "郵送") h += '<label class="lbl" style="display:flex;flex-direction:column;gap:6px">追跡番号（任意）<input class="inp" id="dTrack" type="text" placeholder="発送したら入れておくと安心" value="' + esc(d.tracking || "") + '"></label>';
  h += '<label class="lbl" style="display:flex;flex-direction:column;gap:6px">メモ<textarea class="inp" id="dMemo" placeholder="梱包・待ち合わせ・DMの内容など">' + esc(d.memo || "") + "</textarea></label>";
  h += '<div class="lbl">写真（この端末だけに保存・3枚まで）</div><div class="photos" id="dPhotos">' + d.photos.map(function (pid) { return '<div class="p"><img data-photo="' + esc(pid) + '" alt="取引の写真"><button type="button" data-d="delphoto" data-v="' + esc(pid) + '" aria-label="写真を外す">✕</button></div>'; }).join("") + (d.photos.length < 3 ? '<button class="add" type="button" data-d="addphoto" aria-label="写真を足す">＋</button>' : "") + "</div>";
  h += '<div class="grid2"><button class="btn" type="button" data-d="edit">質問にもどって直す</button><button class="btn" type="button" data-d="again">この相手と別の取引</button></div>';
  h += confirmDel ? '<div class="confirm"><b>この取引を消しますか？</b><span style="font-size:14px;color:var(--muted)">消すと元に戻せません。</span><div class="grid2"><button class="btn danger" type="button" data-d="delyes">消す</button><button class="btn" type="button" data-d="delno">やめる</button></div></div>' : '<button class="link muted" type="button" data-d="del" style="color:var(--danger);align-self:flex-start">この取引を消す</button>';
  h += "</div></div>";
  $("detail").innerHTML = h;
  hydratePhotos($("detail"));
}
document.addEventListener("click", function (e) {
  var b = e.target.closest("[data-d]"); if (!b || !openId) return;
  var a = b.getAttribute("data-d"), d = deals.find(function (x) { return x.id === openId; });
  if (a === "close") { closeDetail(); return; }
  if (!d) return;
  if (a === "answer") answer(d.id);
  if (a === "undo") undo(d.id);
  if (a === "status") { d.status = d.status === "仮約束" ? "約束済" : "仮約束"; if (d.status === "仮約束") delete d.done.agree; else d.done.agree = d.done.agree || new Date().toISOString(); persist(); }
  if (a === "share") { shareImage(d); return; }
  if (a === "edit") { closeDetail(); openWizard(dealToW(d)); W.i = wSteps().length - 1; wRender(); return; }
  if (a === "again") { var k = (d.handle || d.name).toLowerCase(), p = partners().filter(function (x) { return x.key === k; })[0]; closeDetail(); openWizard({ partner: p, mergeId: p && p.openId, i: p && p.openId ? 0 : 1 }); return; }
  if (a === "del") confirmDel = true;
  if (a === "delno") confirmDel = false;
  if (a === "delyes") { d.photos.forEach(function (pid) { PhotoStore.del(pid).catch(function () {}); }); deals = deals.filter(function (x) { return x !== d; }); closeDetail(); persist(); toast("消しました"); return; }
  if (a === "addphoto") { $("photoInput").click(); return; }
  if (a === "delphoto") { var v = b.getAttribute("data-v"); d.photos = d.photos.filter(function (x) { return x !== v; }); PhotoStore.del(v).catch(function () {}); persist(); }
  dRender();
});
document.addEventListener("change", function (e) {
  if (!openId) return;
  var d = deals.find(function (x) { return x.id === openId; }); if (!d) return;
  if (e.target.id === "dTrack") { d.tracking = e.target.value; persist(); }
  if (e.target.id === "dMemo") { d.memo = e.target.value; persist(); }
});

/* ---------- 取引の写真（前の交換ログと同じ、この端末の IndexedDB） ---------- */
var PhotoStore = (function () {
  var dbp = null;
  function db() { if (!dbp) dbp = new Promise(function (res, rej) { var q = indexedDB.open("muze_exchange_photos", 1); q.onupgradeneeded = function () { q.result.createObjectStore("photos"); }; q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); return dbp; }
  function run(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction("photos", mode), r = fn(t.objectStore("photos")); t.oncomplete = function () { res(r && r.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  return { put: function (id, b) { return run("readwrite", function (s) { return s.put(b, id); }); }, get: function (id) { return run("readonly", function (s) { return s.get(id); }); }, del: function (id) { return run("readwrite", function (s) { return s.delete(id); }); } };
})();
function hydratePhotos(root) {
  root.querySelectorAll("img[data-photo]").forEach(function (img) {
    PhotoStore.get(img.getAttribute("data-photo")).then(function (b) { if (b) img.src = URL.createObjectURL(b); else img.parentElement.firstChild.replaceWith(document.createTextNode("別の端末の写真")); }).catch(function () {});
  });
}
$("photoInput").addEventListener("change", async function (e) {
  var d = deals.find(function (x) { return x.id === openId; }); if (!d) return;
  var files = Array.from(e.target.files || []).slice(0, 3 - d.photos.length);
  for (var i = 0; i < files.length; i++) {
    try {
      var url = URL.createObjectURL(files[i]), img = await new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = url; });
      var s = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      var blob = await new Promise(function (res) { c.toBlob(res, "image/jpeg", .82); });
      var pid = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await PhotoStore.put(pid, blob); d.photos.push(pid);
    } catch (err) { toast("写真を読みこめませんでした"); }
  }
  e.target.value = ""; persist(); dRender();
});

/* ---------- 取引ごとの画像（1080×自動の高さ） ---------- */
function loadImg(src) { return new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
function fit(ctx, t, w) { t = String(t); if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1); return t + "…"; }
async function shareImage(d) {
  try { await document.fonts.ready; } catch (e) {}
  var sections = [];
  blocksOf(d).forEach(function (b) { b.rows.forEach(function (r) { if ((r[1] || []).length) sections.push({ title: b.kind + " ・ " + r[0] + (SLOT_GIVE[r[0]] ? " →" : " ←"), money: b.kind !== "交換" ? b.money : "", items: r[1] }); }); });
  var W2 = 1080, pad = 64, rowH = 124, H = 260 + sections.reduce(function (a, s) { return a + 90 + s.items.length * rowH; }, 0) + 150;
  var c = document.createElement("canvas"); c.width = W2; c.height = H; var x = c.getContext("2d");
  x.fillStyle = "#f1ebe1"; x.fillRect(0, 0, W2, H);
  x.fillStyle = "#40382f"; x.font = '600 72px "Klee One","Yu Gothic",serif'; x.fillText(fit(x, d.name, 600), pad, 130);
  var nw = Math.min(600, x.measureText(d.name).width); x.font = '500 34px "Zen Kaku Gothic New","Hiragino Sans",sans-serif'; x.fillStyle = "#5f564c"; x.fillText("さんとの取引", pad + nw + 16, 130);
  x.font = '700 32px "Zen Kaku Gothic New","Hiragino Sans",sans-serif'; var sw = x.measureText(d.status).width + 40; x.strokeStyle = "#40382f"; x.lineWidth = 3; if (d.status === "仮約束") x.setLineDash([10, 8]); x.strokeRect(W2 - pad - sw, 80, sw, 64); x.setLineDash([]); x.fillStyle = "#40382f"; x.fillText(d.status, W2 - pad - sw + 20, 124);
  x.font = '500 30px "Zen Kaku Gothic New","Hiragino Sans",sans-serif'; x.fillStyle = "#5f564c"; x.fillText(fit(x, howOf(d), W2 - pad * 2), pad, 196);
  var y = 250;
  for (var si = 0; si < sections.length; si++) {
    var s = sections[si], boxH = 70 + s.items.length * rowH;
    x.fillStyle = "#fff"; x.fillRect(pad, y, W2 - pad * 2, boxH);
    x.font = '700 34px "Zen Kaku Gothic New","Hiragino Sans",sans-serif'; x.fillStyle = "#40382f"; x.fillText(s.title, pad + 28, y + 50);
    if (s.money) { x.textAlign = "right"; x.fillText(s.money, W2 - pad - 28, y + 50); x.textAlign = "left"; }
    for (var ii = 0; ii < s.items.length; ii++) {
      var it = s.items[ii], iy = y + 76 + ii * rowH;
      x.fillStyle = "#efe7da"; x.fillRect(pad + 28, iy, 104, 104);
      if (it.gid) { var im = await loadImg("../" + G.byId[it.gid].img); if (im) x.drawImage(im, pad + 28, iy, 104, 104); }
      x.fillStyle = "#40382f"; x.font = '700 44px "Zen Kaku Gothic New","Hiragino Sans",sans-serif';
      x.fillText(fit(x, it.member + (it.variant ? "「" + it.variant + "」" : "") + (it.qty > 1 ? " ×" + it.qty : "") + (it.tent ? "（仮）" : ""), W2 - pad * 2 - 200), pad + 156, iy + 48);
      x.font = '500 30px "Zen Kaku Gothic New","Hiragino Sans",sans-serif'; x.fillStyle = "#5f564c";
      x.fillText(fit(x, it.goods + ser(it) + (it.pre ? " 未発送" : ""), W2 - pad * 2 - 200), pad + 156, iy + 92);
    }
    y += boxH + 20;
  }
  x.font = '500 24px "Zen Kaku Gothic New","Hiragino Sans",sans-serif'; x.fillStyle = "#6f665c"; x.textAlign = "center"; x.fillText("MUZE TOOL BOX ・ 取引ログ", W2 / 2, H - 50); x.textAlign = "left";
  var blob = await new Promise(function (res) { c.toBlob(res, "image/png"); });
  var name = "muze-trade-" + (d.name || "trade").replace(/[\\/:*?"<>|\s]/g, "") + "-" + today() + ".png", file = new File([blob], name, { type: "image/png" });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try { await navigator.share({ files: [file], title: d.name + "さんとの取引" }); return; } catch (err) { if (err && err.name === "AbortError") return; }
  }
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast("画像を保存しました");
}
var SLOT_GIVE = { "わたす": 1, "ゆずる": 1 };

/* ---------- MUZE KEY ---------- */
function openKey() { $("keyValue").value = key(); $("keyDlg").hidden = false; }
$("keyOpen").addEventListener("click", openKey);
$("keyClose").addEventListener("click", function () { $("keyDlg").hidden = true; });
$("keyCopy").addEventListener("click", async function () {
  var t = $("keyValue").value.trim(), ok = false;
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); ok = true; } } catch (e) {}
  if (!ok) { var i = $("keyValue"); i.focus(); i.setSelectionRange(0, t.length); try { ok = document.execCommand("copy"); } catch (e) {} }
  $("keyCopy").textContent = ok ? "コピーしました" : "選択済み・長押しでコピー"; setTimeout(function () { $("keyCopy").textContent = "コピー"; }, 2500);
});
$("keyUse").addEventListener("click", async function () {
  var v = MUZEKey.normalize($("keyValue").value);
  if (!MUZEKey.valid(v)) { toast("MUZE KEYの形式を確認してください"); return; }
  MUZEKey.set(v); $("keyDlg").hidden = true; await boot();
});

/* ---------- 一覧の操作 ---------- */
$("list").addEventListener("click", function (e) {
  var b = e.target.closest("[data-act]"); if (!b) return;
  var id = b.getAttribute("data-id"), a = b.getAttribute("data-act");
  if (a === "answer") answer(id);
  if (a === "undo") undo(id);
  if (a === "open") openDetail(id);
  if (a === "share") { var d = deals.find(function (x) { return x.id === id; }); if (d) shareImage(d); }
});
$("importNote").addEventListener("click", function (e) { if (e.target.closest('[data-act="note-close"]')) $("importNote").hidden = true; });
$("importBtn").addEventListener("click", function () { importOld(true); });
$("tabOpen").addEventListener("click", function () { tab = "open"; render(); });
$("tabDone").addEventListener("click", function () { tab = "done"; render(); });
$("search").addEventListener("input", render);
$("add").addEventListener("click", function () { openWizard(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (W) closeWizard(); else if (openId) closeDetail(); else $("keyDlg").hidden = true; } });

/* ---------- 起動 ---------- */
async function boot() {
  deals = []; meta = { importedIds: [] };
  var hadLocal = loadLocal(); render();
  setSync("暗号化クラウドを確認中…");
  try {
    var c = await cloudGet(NEW_ID);
    var dirty = false; try { dirty = localStorage.getItem(dirtyKey()) === "1"; } catch (e) {}
    if (dirty) { await cloudSave(); }
    else if (c && c.found) { var o = await decrypt(c.envelope); deals = (o.deals || []).map(fixDeal); meta = o.meta || { importedIds: [] }; if (!Array.isArray(meta.importedIds)) meta.importedIds = []; saveLocal(false); render(); setSync("暗号化データをKEYから復元・同期済み"); }
    else setSync("暗号化クラウドに接続済み");
  } catch (e) { setSync("この端末には保存済み・クラウドにはつながっていません"); }
  if (!meta.firstImport) { meta.firstImport = new Date().toISOString(); await importOld(false); saveLocal(true); }
  render();
}
window.addEventListener("muze-key-changed", function () {});
boot();
})();
