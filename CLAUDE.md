# CLAUDE.md

このリポジトリで作業する Claude への約束です。

- 返事・コメント・書類は日本語で書く。ゲームの中の文字は、ほかのこおりくんシリーズと同じく ひらがな多め。
- ルールは `こおりくんカードゲーム_ルール資料.docx`（ユーザーが書いた）。カードの中身は `docs/cards.md` と `src/data/cards.js` を合わせて直す。
- 分からないことは、作る前にユーザーに聞く（ユーザー指定）。決まったことは docs/cards.md の 0 章に書き戻す。
- カードの見た目はユーザーのデザイン案（モンスター＝紺と水色・魔法＝紫・アイテム＝緑・左上の丸い数字・効果欄にドタバタトリガーの黄色いマーク）。
- 前作のキャラの絵は、前作（koori-dungeon など）の絵と設定を写す。`tools/extract-art.mjs` で `src/art/legacy-art.js` を作る（手で直さない）。どのカードにどの絵かは `src/art/index.js` の CARD_ART。前作にない絵は `src/art/new-art.js`。
- ルールは `src/logic/game.js`（画面に ふれない・選ぶ 場面は ask で 聞く）、CPU は `src/logic/cpu.js`、画面は `src/view/`。
- テスト: `npm test` と `npm run test:browser`（Chrome）。main に push すると GitHub Pages に公開される。
