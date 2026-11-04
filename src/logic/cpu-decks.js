// =====================================================================
// CPU の 強さ = 使う デッキの 強さ (2026-11-04 ユーザー指定)
// ---------------------------------------------------------------------
// CPU の 考え方は どれも 同じ (logic/cpu.js)。デッキだけが かわる:
//   かんたん: スターターの いちばん 強い モンスターを 弱い ノーブランドに 入れかえる
//   ふつう:   スターターデッキ そのまま
//   つよい:   スターターの 一部を パックの レアカード (R 以上) に 入れかえる。組み合わせは data/cpu-hard-decks.js
//             (tools/tune-cpu-decks.mjs が ためして えらんだ)。勝率は tools/cpu-levels.mjs で はかる
// =====================================================================
import { CARDS, cardByNo, MAX_COPIES } from '../data/cards.js';
import { HARD_DECKS } from '../data/cpu-hard-decks.js';
import { starterDeck } from './game.js';

export const LEVELS = { easy: 'かんたん', normal: 'ふつう', hard: 'つよい' };
export const TUNE = { easySwaps: 12 };

const monsterPower = (no) => { const c = cardByNo(no); return c.kind === 'monster' ? c.power : null; };
// 入れかえの 順 (番号で そろえて、いつも 同じ デッキに する)
const byPower = (list, dir) => list.filter((no) => monsterPower(no) !== null)
    .sort((a, b) => dir * (monsterPower(a) - monsterPower(b)) || a - b);

function swap(list, out, add) {
    const deck = [...list];
    for (const no of out) deck.splice(deck.indexOf(no), 1);
    return [...deck, ...add];
}

function easyDeck(team) {
    const list = starterDeck(team);
    const out = byPower(list, -1).slice(0, TUNE.easySwaps);
    const count = (no) => list.filter((x) => x === no).length - out.filter((x) => x === no).length;
    const filler = CARDS.filter((c) => c.team === 'nobrand' && !c.pack && c.kind === 'monster' && c.power > 0 && c.lv === 1)
        .sort((a, b) => a.power - b.power || a.no - b.no);
    const add = [];
    for (const c of filler) {
        for (let n = count(c.no); n < MAX_COPIES && add.length < out.length; n++) add.push(c.no);
    }
    return swap(list, out.slice(0, add.length), add);
}

function hardDeck(team) {
    const { out, add } = HARD_DECKS[team];
    return swap(starterDeck(team), out, add);
}

// 強さに あわせた デッキ (カード番号 50 こ)
export function cpuDeckList(team, level = 'normal') {
    if (level === 'easy') return easyDeck(team);
    if (level === 'hard') return hardDeck(team);
    return starterDeck(team);
}
