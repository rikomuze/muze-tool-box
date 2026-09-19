# MUZE MAKERS Roadmap

BIAS MAP / 推し衣装ドラフト / プロフィールカードを、単発サイトではなく同じ制作基盤で増やしていくための設計メモ。

## Product 1: BIAS MAP
状態: MVP実装中

共通化対象:
- 画像アップロード
- 画像データの端末内保持
- Canvas結果画像生成
- iPhoneでの保存フォールバック
- IndexedDBプロジェクト保存
- MUZE TOOL BOX共通ナビ

固有機能:
- 2軸MAP
- 写真座標
- 写真サイズ
- 軸プリセット / CUSTOM

## Product 2: 推し衣装ドラフト
想定フロー:
1. 8〜16枚の衣装写真を登録
2. 2択対戦
3. 勝者を次戦へ
4. BEST 3〜5生成
5. 結果画像保存

BIAS MAPから再利用:
- ImageUploader
- ImageStore
- ResultCanvas
- ExportImage
- ProjectStore

新規:
- BattleEngine
- BracketState
- RankingResult

## Product 3: MUZE PROFILE
想定フロー:
1. 名前 / 推し / 好きな曲 / 好きなケミ等を入力
2. 推し画像を登録
3. レイアウト選択
4. プロフィールカード生成
5. 保存 / シェア

BIAS MAPから再利用:
- ImageUploader
- ImageStore
- ResultCanvas
- ExportImage
- ProjectStore

新規:
- ProfileForm
- LayoutPreset
- ProfileRenderer

## Shared modulesへ切り出すタイミング
BIAS MAPをiPhoneで一度実地テストしてから切り出す。

理由:
最初に抽象化しすぎると、まだ確定していないUXに共通基盤が引っ張られるため。
2本目（衣装ドラフト）を作り始める時点で、実際に重複した処理を /shared に移す。

## 優先順位
1. BIAS MAPを実機で成立させる
2. 結果画像の見栄えを完成
3. 共通Image/Export/Storageを切り出す
4. 衣装ドラフト実装
5. プロフィールカード実装
6. MUZE TOOL BOXトップのカテゴリ再編

## v1でサーバーを持たない
- ログインなし
- 外部DBなし
- 画像アップロード先なし
- 基本処理はブラウザ内

将来、端末間同期や公開ギャラリーが必要になった段階でバックエンド導入を検討する。
