# MUZE TOOL BOX の作業ルール

- 返答・コミットメッセージ・PR の説明は日本語で書く。

## 新しいツール・ページを実装するとき

ページを作ったら、同じ作業の中で次の2つも必ず設定する。後回しにしない。

### 1. OGP（SNS で共有したときのカード）

- `og.jpg`（1200×630）をそのページのフォルダに置く
- `<head>` に次を入れる。URL は公開先の完全な URL にする

```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="MUZE TOOL BOX">
<meta property="og:title" content="（ページ名）">
<meta property="og:description" content="（一文の説明）">
<meta property="og:url" content="https://rikomuze.github.io/muze-tool-box/（フォルダ）/">
<meta property="og:image" content="https://rikomuze.github.io/muze-tool-box/（フォルダ）/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="（画像の説明）">
<meta property="og:locale" content="ja_JP">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://rikomuze.github.io/muze-tool-box/（フォルダ）/og.jpg">
<meta name="twitter:title" content="（ページ名）">
```

### 2. ホーム画面用アイコン

- `apple-touch-icon.png`（180px）、`icon-192.png`、`icon-512.png`、`manifest.json` をそのページのフォルダに置く
- デザインは既存アイコンと同じ系統にする。白か生成り（#f1ebe1）の地に太い英字、アクセント色は1つ。次の3つの型のどれかに合わせる
  - 太字型：MUZE TOOL BOX、交換ログ、立替精算
  - カード型（黒い太枠＋ずらした影）：締め切り、MUZE DAY、PHOTO、計算機、AnyPASS
  - 細字型（字間広め）：Touch キャンペーン、Touch 4形態
- アイコンはユーザーに案を見せて、選んでもらってから入れる
- `<head>` に次を入れる

```html
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="（ホーム画面での短い名前）">
```

- `manifest.json` の `start_url` は `"./"` にする。`scope` は、muze-tool-box 内のサブフォルダなら `"../"`（トップへ戻ってもアプリ内で開く）、独立したリポジトリなら `"./"` にする

## そのほか

- トップへ戻るリンクは `../` ではなく、`https://rikomuze.github.io/muze-tool-box/` の完全な URL にする
- 新しいツールはトップ（`index.html`）の「道具いちらん」にも追加する
