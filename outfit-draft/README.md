# OUTFIT DRAFT v1

MAZZELのメンバーを選び、ランダムに提示される衣装2択を7回選んで1番を決めるブラウザツール。

## v1 flow
START → MEMBER → BATTLE → RESULT

## Current implementation
- MAZZEL 8人選択
- メンバーごとに16件の仮衣装データを生成
- その中からランダム8件を抽選
- 8人トーナメント（7戦）
- 直前1手のUNDO
- WINNER / FINALIST / FINAL FOUR
- 1080×1080 Canvas画像
- iPhone共有 / 保存フォールバック

## Temporary data
実写真ライブラリ未実装のため、現在は LOOK 01〜16 のプレースホルダーを使用。
後から各メンバーの共通衣装素材ライブラリへ差し替える前提。

## Not in v1
- 写真アップロード
- 16枚トーナメント
- クラウド保存
- ログイン
- SNS連携
