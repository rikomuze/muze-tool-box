/* MUZE TOOL BOX グッズ一覧（取引ログで使う）
   シリーズは新しい順。g: [id, グッズ名, 種類]。写真は assets/goods/<id>.webp
   pre: まだ発送されていない予約商品（発送時期）
   新しいグッズが出たら、ここに足す。写真も同じ id で assets/goods/ に置く。
   最終更新: 2026-11-09 */
window.MUZE_GOODS = (function () {
  var MEMBERS = ["KAIRYU", "NAOYA", "RAN", "SEITO", "RYUKI", "TAKUTO", "HAYATO", "EIKI"];
  var TYPES = ["トレカ", "ICステッカー", "ネームステッカー", "フレークシール", "ランダムチャーム", "缶バッジ", "アナザージャケット", "その他"];
  var SERIES = [
    { s: "MAZZEL ROOM", sub: "予約販売 ・ 2027年1月下旬以降発送", pre: "1月下旬以降", g: [["room-telop", "ランダムテロップチャーム", "ランダムチャーム"]] },
    { s: "Touch", sub: "5th Single ・ 2026.10", g: [["touch-solo", "ソロトレカ（Touchビジュ）", "トレカ"], ["touch-ic", "ICステッカー", "ICステッカー"], ["touch-name", "ネームステッカー", "ネームステッカー"], ["touch-jacket", "アナザージャケット（EPサイズ）", "アナザージャケット"], ["touch-keyholder", "アクリルキーホルダー", "その他"]] },
    { s: "So Strawberry", sub: "Touch UMS盤ビジュ", g: [["sost-solo", "ソロトレカ（So Strawberryビジュ）", "トレカ"], ["sost-flake", "フレークシール", "フレークシール"]] },
    { s: "BMSG FES ’26", sub: "フェス物販 ・ 2026.10", g: [["fes-marker", "ランダム マーカーチャーム2P", "ランダムチャーム"], ["fes-badge", "缶バッジ・トレカセット", "缶バッジ"], ["fes-luggage", "ラゲッジタグ・トレカセット", "トレカ"], ["fes-glitter", "グリッターステッカーセット", "その他"]] },
    { s: "Play at the MUZEUM vol.2", sub: "2nd ファンミ物販", g: [["muz-puripuri", "MZ Mate ランダムぷりぷりチャーム", "ランダムチャーム"], ["muz-tcset", "ランダムトレカ・ステッカーセット", "トレカ"]] },
    { s: "Banquet", sub: "2nd Album ・ 2026.4", g: [["banq-solo-guad", "ソロトレカ（GUADビジュ）", "トレカ"], ["banq-solo-bang", "ソロトレカ（BANQUET BANGビジュ）", "トレカ"], ["banq-ic", "ICステッカー", "ICステッカー"]] },
    { s: "Shall we hit the Banquet?", sub: "ツアー物販 ・ トレカ2種×8人", g: [["swh-tc-1", "トレカ（自撮り）", "トレカ"], ["swh-tc-2", "トレカ（他撮り）", "トレカ"]] },
    { s: "BANQUET BANG", sub: "物販", g: [["bang-art", "ランダムアートチャーム", "ランダムチャーム"]] },
    { s: "Only You", sub: "4th Single ・ 2025.11", g: [["oy-solo", "ソロトレカ", "トレカ"], ["oy-ic-onlyyou", "ICステッカー（Only Youビジュ）", "ICステッカー"], ["oy-ic-danger", "ICステッカー（DANGERビジュ）", "ICステッカー"]] },
    { s: "Royal Straight Flush", sub: "1st EP ・ 2025.4", g: [["rsf-ic-joker", "ICステッカー（J.O.K.E.R.ビジュ）", "ICステッカー"], ["rsf-ic-king", "ICステッカー（King Kila Gameビジュ）", "ICステッカー"]] }
  ];
  /* ランダムテロップチャーム：1人2種類。null はまだわかっていないもの（わかったら書きかえる） */
  var TELOPS = { KAIRYU: ["厄介おばさん", null], NAOYA: ["モザイクいちご", "世界のお姫様ちゃん"], RAN: [null, null], SEITO: ["腕枝豆", "SETIO"], RYUKI: ["マジでデュクシュ", null], TAKUTO: ["たっくんはとても楽しんでいます", null], HAYATO: ["オレンジひょろひょろ", null], EIKI: ["バカにするなよ！", null] };
  var byId = {};
  SERIES.forEach(function (c) { c.g.forEach(function (g) { byId[g[0]] = { id: g[0], series: c.s, goods: g[1], type: g[2], pre: c.pre || "", img: "assets/goods/" + g[0] + ".webp" }; }); });
  return { MEMBERS: MEMBERS, TYPES: TYPES, SERIES: SERIES, TELOPS: TELOPS, byId: byId };
})();
