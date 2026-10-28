# こおりくんの大冒険 カードゲーム

こおりくんシリーズ（スロット・パチンコ・ダンジョン・RPG・アソ）のキャラ・場面・アイテム・技をカードにした対戦ゲーム。

- 遊ぶ: https://taku3482yasu-web.github.io/koori-card/
- ルール: [こおりくんカードゲーム_ルール資料.docx](こおりくんカードゲーム_ルール資料.docx)
- カード一覧（案）: [docs/cards.md](docs/cards.md)。データは `src/data/cards.js`

## いまできること

- 構築済みデッキ「氷隊」「鬼鬼団」のカード一覧（60 種）を見る
- CPU 対戦は次の段階で作る

## 作り

- Vite + 素の JS（React なし）。`npm install` → `npm run dev`
- テスト: `npm test`
- main に push すると GitHub Pages に公開される（`.github/workflows/pages.yml`）
