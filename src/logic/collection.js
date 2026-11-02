// =====================================================================
// あつめた カード・ポイント・パック・自分の デッキ (docs/pack1.md。2026-11-03 ユーザー OK)。画面には ふれない
// ---------------------------------------------------------------------
//   CPU に 勝つと 100・負けても 30 ポイント。ショップで 300 ポイント = 1 パック。はじめに 3 パック もらえる
//   1 パック 5 枚: N ×3・U ×1・R 以上 ×1 (R 55% / VR 22% / SR 14% / HR 6% / OR 3%)
//   シークレット: SR 以上が 出たとき 10% (OR = 別絵柄・HR = プラチナ・SR = ブラック)。持っている 数は べつに 数える
//   デッキ: チームの カード + ノーブランドで 50 枚・同じ カードは 4 枚まで。
//     スターターデッキの カード (パックでない カード) は いくらでも 使える。パックの カードは 持っている 枚数まで
// =====================================================================
import { CARDS, DECKS, SECRET, cardByNo, fitsDeck } from '../data/cards.js';
import { starterDeck } from './game.js';

export const PACK_PRICE = 300;
export const WIN_POINTS = 100;
export const LOSE_POINTS = 30;
export const FREE_PACKS = 3;
export const DECK_SIZE = 50;
export const RARE_ODDS = [['R', 55], ['VR', 22], ['SR', 14], ['HR', 6], ['OR', 3]];
export const SECRET_RATE = 0.1;
const KEY = 'koori-card-collection';

export const PACK_CARDS = CARDS.filter((c) => c.pack === 1);
const poolOf = (rarity) => PACK_CARDS.filter((c) => c.rarity === rarity);

export function newCollection() {
    return { points: 0, packs: FREE_PACKS, owned: {}, secret: {}, decks: {}, wins: 0, games: 0 };
}

// storage: localStorage (ない・使えない ときは 毎回 はじめから)
export function loadCollection(storage) {
    try {
        const raw = storage?.getItem(KEY);
        if (raw) return { ...newCollection(), ...JSON.parse(raw) };
    } catch { /* こわれていたら はじめから */ }
    return newCollection();
}
export function saveCollection(storage, c) {
    try { storage?.setItem(KEY, JSON.stringify(c)); } catch { /* 保存できなくても 遊べる */ }
}

export const ownedCount = (c, no) => (c.owned[no] || 0) + (c.secret[no] || 0);
export const has = (c) => (no) => ownedCount(c, no) > 0;

function pick(list, rand) { return list[Math.floor(rand() * list.length)]; }
export function rollRare(rand) {
    let r = rand() * RARE_ODDS.reduce((n, [, w]) => n + w, 0);
    for (const [rarity, w] of RARE_ODDS) { if (r < w) return rarity; r -= w; }
    return 'R';
}

// パックを 1 つ あける → [{ no, rarity, secret }] ×5 (コレクションに 足す)
export function openPack(c, rand = Math.random) {
    if (c.packs <= 0) return null;
    c.packs--;
    const rarities = ['N', 'N', 'N', 'U', rollRare(rand)];
    const got = rarities.map((rarity) => {
        const card = pick(poolOf(rarity), rand);
        const secret = Boolean(SECRET[rarity]) && rand() < SECRET_RATE;
        const box = secret ? c.secret : c.owned;
        box[card.no] = (box[card.no] || 0) + 1;
        return { no: card.no, rarity, secret };
    });
    return got;
}

export function buyPack(c) {
    if (c.points < PACK_PRICE) return false;
    c.points -= PACK_PRICE;
    c.packs++;
    return true;
}

// たいせんの 結果 → もらえた ポイント
export function addResult(c, won) {
    const n = won ? WIN_POINTS : LOSE_POINTS;
    c.points += n;
    c.games++;
    if (won) c.wins++;
    return n;
}

// ---------- デッキ ----------
// その デッキに 入れられる 枚数 (0 = 入れられない)
export function deckLimit(c, team, no) {
    const card = cardByNo(no);
    if (!card || !fitsDeck(card, team)) return 0;
    return card.pack ? Math.min(card.max, ownedCount(c, no)) : card.max;
}
// いまの デッキ (作っていなければ スターターデッキ)
export const deckOf = (c, team) => (c.decks[team] ? [...c.decks[team]] : starterDeck(team));
// デッキの まちがい (なければ 空の 配列)
export function deckErrors(c, team, list) {
    const err = [];
    if (list.length !== DECK_SIZE) err.push(`${DECK_SIZE} 枚に してね（いま ${list.length} 枚）`);
    const count = {};
    for (const no of list) count[no] = (count[no] || 0) + 1;
    for (const [no, n] of Object.entries(count)) {
        const lim = deckLimit(c, team, +no);
        if (n > lim) err.push(`${cardByNo(+no)?.name || no} は ${lim} 枚まで`);
    }
    return err;
}
export function saveDeck(c, team, list) {
    if (deckErrors(c, team, list).length) return false;
    c.decks[team] = [...list].sort((a, b) => a - b);
    return true;
}
export function resetDeck(c, team) { delete c.decks[team]; }
// デッキに 入れられる カード (チーム → ノーブランド・番号じゅん)
export const deckPool = (c, team) => CARDS.filter((card) => deckLimit(c, team, card.no) > 0)
    .sort((a, b) => (a.team === 'nobrand') - (b.team === 'nobrand') || a.no - b.no);
export const TEAM_IDS = Object.keys(DECKS);
