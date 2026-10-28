# こおりくんの大冒険 カードゲーム

こおりくんシリーズ（スロット・パチンコ・ダンジョン・RPG・アソ）のキャラ・場面・アイテム・技をカードにした対戦ゲーム。

- 遊ぶ: https://taku3482yasu-web.github.io/koori-card/
- ルール: [こおりくんカードゲーム_ルール資料.docx](こおりくんカードゲーム_ルール資料.docx)
- カード一覧（案）: [docs/cards.md](docs/cards.md)。データは `src/data/cards.js`

## いまできること

- デッキ（氷隊・鬼鬼団）を えらんで CPU と たいせん（CPU は もう片方の デッキ・強さは ふつう）
  - カードを タップすると 大きく 出て「出す・使う・付ける・こうげき」。光っている モンスターは こうげき できる
  - シールドが 割れたときの トリガー・Lv アップ、押し出し などは まんなかに えらぶ 画面が 出る
- カード一覧（60 種）を見る
- カードの 絵：モンスターと 前作の 道具は koori-dungeon の ドット絵を 写した（`node tools/extract-art.mjs` で `src/art/legacy-art.js` を 作り直す）。前作に ない 道具（コオリソード・金色の金棒）は `src/art/new-art.js`。技の 魔法（キャラが 技を 放つ ところ）と 場面は `src/art/scenes.js` で 描いた

## 作り

- Vite + 素の JS（React なし）。`npm install` → `npm run dev`
- テスト: `npm test`（ルール・CPU どうし 300 回）と `npm run test:browser`（Chrome で 1 回 たいせん）
- ルールは `src/logic/game.js`（画面に ふれない）、CPU は `src/logic/cpu.js`、画面は `src/view/`
- main に push すると GitHub Pages に公開される（`.github/workflows/pages.yml`）
