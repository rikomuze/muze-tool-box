# little town. — 習慣から育つ小さな街

MUZE TOOL BOX 内の、1人用・ブラウザ保存のハビットトラッカー。

## 機能
- タスクを最大3つ登録・編集・削除。各タスクは1日1回だけ「できた！」を記録。
- 自分のキャラクター画像（PNG / JPG / WebP / GIF）を読み込んで、左右に歩かせられる。
- 達成累計でSketch Townの木・家・屋根・城が増える。お休みしても街は減らない。
- 未来の街のプレビューは記録に加算されない。
- localStorageへの保存と書き込み確認。JSONバックアップ・復元に対応。
- 外部CDNを使用せず、KenneyのPNGを同梱。

## データについて
記録はこのブラウザ（localStorage キー: `little-town-rikomuze-v1`）に保存され、端末間同期はなし。ファイルプレビューやプライベートブラウズでは保存が制限されることがあるため、アプリ上で警告する。

## 素材
Kenney Sketch TownのPNG 27種類を使用。CC0 1.0ライセンス。
https://kenney.nl/assets/sketch-town

## 公開前
- [ ] ユーザーにホーム画面アイコン案を提示し、選んでもらってからapple-touch-icon.png、icon-192.png、icon-512.png、manifest.jsonを設置する
- [ ] GitHub Pages公開URL上で保存・再読込・スマホ表示を確認する

既存ツールの本体とデータに影響しないよう、新フォルダのページとして追加。
