/* MUZE DAY プリセット（公式発表をもとに手で更新する）
   kind: "LIVE"（ファンミ・単独）| "OTHER"（フェスなど、その他のイベント）
   official: 公式の時間（開場・開演）。今後は自動取得にしたい。
   終わった公演は自動でかくれる。時間や会場は必ず公式サイトでも確認すること。
   最終更新: 2026-10-01 */
window.MUZE_DAY_EVENTS = (function () {
  var FM = "MAZZEL 2nd Fan Meeting -Play at the MUZEUM Vol.2-";
  function fm(id, date, city, venue, open, start, part) {
    return {
      id: id, date: date, kind: "LIVE", tag: "FAN MEETING",
      name: "2nd Fan Meeting " + city + (part ? " " + part : ""),
      title: FM + " " + city + (part ? " " + part : ""),
      venue: venue,
      official: [{ label: "開場", time: open }, { label: "開演", time: start }]
    };
  }
  function bmsg(id, date, day, note) {
    return {
      id: id, date: date, kind: "OTHER", tag: "その他",
      name: "BMSG FES'26 " + day, title: "BMSG FES'26 " + day,
      venue: "お台場 BMSG FES 特設会場",
      official: [{ label: "開場", time: "13:00" }, { label: "開演", time: "15:00" }],
      note: note || ""
    };
  }
  return [
    {
      id: "magurock26-1", date: "2026-10-03", kind: "OTHER", tag: "その他",
      name: "マグロック＆ポップ 2026 DAY1", title: "マグロック＆ポップ 2026 DAY1",
      venue: "清水マリンパーク（静岡）",
      official: [{ label: "開場", time: "10:00" }, { label: "開演", time: "11:00" }],
      note: "MAZZEL出演日"
    },
    bmsg("bmsg26-1", "2026-10-10", "DAY1", "トリ STARGLOW"),
    bmsg("bmsg26-2", "2026-10-11", "DAY2", "MAZZELがトリ"),
    bmsg("bmsg26-3", "2026-10-12", "DAY3", "トリ BE:FIRST"),
    Object.assign(fm("fm2-tokyo", "2026-10-22", "東京", "LINE CUBE SHIBUYA", "18:00", "19:00"), { note: "ファンミ初日" }),
    fm("fm2-sapporo", "2026-10-24", "札幌", "カナモトホール", "17:00", "18:00"),
    fm("fm2-hakodate", "2026-10-25", "函館", "函館（会場は公式で確認）", "16:00", "17:00"),
    {
      id: "vmaj26", date: "2026-10-29", kind: "OTHER", tag: "その他", name: "MTV VMAJ 2026", title: "MTV VMAJ 2026",
      venue: "東京ドーム", official: []
    },
    fm("fm2-fukushima", "2026-11-02", "福島", "とうほう・みんなの文化センター", "17:00", "18:00"),
    fm("fm2-miyagi", "2026-11-03", "宮城", "東京エレクトロンホール宮城", "16:00", "17:00"),
    fm("fm2-niigata", "2026-11-07", "新潟", "新潟テルサ", "16:00", "17:00"),
    fm("fm2-yokohama", "2026-11-10", "横浜", "パシフィコ横浜", "15:00", "16:00"),
    fm("fm2-okayama", "2026-11-17", "岡山", "倉敷市民会館", "17:00", "18:00"),
    fm("fm2-hiroshima", "2026-11-18", "広島", "広島文化学園HBGホール", "17:00", "18:00"),
    {
      id: "dreamfes26", date: "2026-11-23", kind: "OTHER", tag: "その他", name: "テレビ朝日ドリームフェスティバル2026",
      title: "15th Anniversary テレビ朝日ドリームフェスティバル2026", venue: "Kアリーナ横浜", official: [{ label: "開場", time: "13:30" }, { label: "開演", time: "15:00" }],
      note: "この日のトリ"
    },
    fm("fm2-kobe-1", "2026-11-25", "神戸", "神戸国際会館", "14:00", "15:00", "1部"),
    fm("fm2-kobe-2", "2026-11-25", "神戸", "神戸国際会館", "18:00", "19:00", "2部"),
    fm("fm2-osaka", "2026-11-26", "大阪", "大阪国際会議場", "17:00", "18:00"),
    fm("fm2-saitama", "2026-12-01", "埼玉", "大宮ソニックシティ", "17:00", "18:00"),
    fm("fm2-gunma", "2026-12-03", "群馬", "Gメッセ群馬", "17:00", "18:00"),
    fm("fm2-tochigi", "2026-12-04", "栃木", "宇都宮市文化会館", "17:00", "18:00"),
    fm("fm2-fukuoka-1", "2026-12-07", "福岡", "福岡サンパレス", "14:00", "15:00", "1部"),
    fm("fm2-fukuoka-2", "2026-12-07", "福岡", "福岡サンパレス", "18:00", "19:00", "2部"),
    fm("fm2-aichi", "2026-12-11", "愛知", "愛知県芸術劇場", "17:00", "18:00"),
    fm("fm2-kagawa", "2026-12-15", "香川", "レクザムホール", "17:00", "18:00"),
    fm("fm2-kochi", "2026-12-16", "高知", "新来島高知重工ホール", "17:00", "18:00"),
    fm("fm2-shizuoka", "2026-12-21", "静岡", "アクトシティ浜松", "17:00", "18:00"),
    fm("fm2-kumamoto", "2026-12-23", "熊本", "熊本城ホール", "15:30", "16:30")
  ];
})();
