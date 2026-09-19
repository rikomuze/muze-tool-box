# OUTFIT DRAFT v1

MAZZELのメンバーを選び、ランダムに提示される衣装2択を7回選んで1番を決めるブラウザツール。

## v1 flow
START → MEMBER → BATTLE → RESULT

## 写真素材
既存の「最強9マス」2種をそのまま素材プールとして利用します。

- アー写編: https://rikomuze.github.io/mazzel-best-visual/
- パフォ衣装編: https://rikomuze.github.io/mazzel-best-visual-performance/

各メンバーについて、両方の通常画像 01〜15 と 2026-09-18追加画像（3分割）を候補化。
合計36候補から毎回ランダムに8件を抽選し、トーナメントを開始します。

素材のコピーは行わず、既存GitHub Pagesの画像URLを参照します。

## 実装済み
- MAZZEL 8人選択
- アー写＋パフォ衣装の統合素材プール
- ランダム8候補抽選
- 8人トーナメント（7戦）
- 直前1手のUNDO
- WINNER / FINALIST / FINAL FOUR
- 1080×1080 Canvas結果画像
- iPhone共有 / 保存フォールバック

## Not in v1
- 16枚トーナメント
- クラウド保存
- ログイン
- SNS連携
