// こおりくんの大冒険 カードゲーム: はじめの 画面 (デッキを えらんで CPU と たいせん・ショップ・コレクション・デッキ作り・カード一覧)
import './style.css';
import { CARDS, DECKS, KINDS, cardByNo } from './data/cards.js';
import { cardHTML } from './view/card.js';
import { emblemURL } from './view/emblems.js';
import { startBattle } from './view/battle.js';
import { buddyChoices } from './logic/game.js';
import {
    PACK_PRICE, PACK_CARDS, DECK_SIZE, WIN_POINTS, LOSE_POINTS, loadCollection, saveCollection, openPack, buyPack, addResult, has, ownedCount,
    deckOf, deckErrors, deckLimit, deckPool, saveDeck, resetDeck
} from './logic/collection.js';

const app = document.getElementById('app');
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const col = loadCollection(storage);
const save = () => saveCollection(storage, col);

let screen = 'title';
let deck = 'koori';
let kind = 'all';
let pickDeck = null;   // バディを えらんでいる デッキ (2026-11-03: バディは 自分で 決められる)
let opened = null;     // いま あけた パックの 5 枚
let colTeam = 'bariki';
let editTeam = null;   // デッキを 作っている チーム
let draft = null;      // 作りかけの デッキ (カード番号)
let peek = null;       // 大きく 見ている カード

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const back = '<button class="link" data-screen="title">もどる</button>';
const wallet = () => `<span class="points">${col.points} ポイント</span>・パック ${col.packs} こ`;
const teamTabs = (cur, attr, nobrand = true) => `<nav class="tabs">
    ${Object.entries(DECKS).map(([id, d]) => `<button data-${attr}="${id}" class="${id === cur ? 'on' : ''}">${d.name}</button>`).join('')}
    ${nobrand ? `<button data-${attr}="nobrand" class="${cur === 'nobrand' ? 'on' : ''}">ノーブランド</button>` : ''}
</nav>`;
const peekHTML = () => (peek ? `<button class="peek" data-close="1">${cardHTML(cardByNo(peek))}</button>` : '');

function render() {
    app.onclick = onClick;
    if (screen === 'title') {
        app.innerHTML = `
<section class="title">
    <h1>こおりくんの大冒険<small>カードゲーム</small></h1>
    <p class="wallet">${wallet()}</p>
    <p>つかう デッキを えらんでね（CPU は ほかの デッキから ランダム。勝つと ${WIN_POINTS}・負けても ${LOSE_POINTS} ポイント）</p>
    <div class="decks">
        ${Object.entries(DECKS).map(([id, d]) => `<button class="deckpick ${id}" data-battle="${id}"><img class="deckemb" src="${emblemURL(id) || ''}" alt="">${d.name}<small>${col.decks[id] ? '自分の デッキ' : 'スターターデッキ'}</small><small class="style">${d.style}</small></button>`).join('')}
    </div>
    <div class="menu">
        <button class="link" data-screen="shop">ショップ（パック）</button>
        <button class="link" data-screen="collection">コレクション</button>
        <button class="link" data-screen="edit">デッキを 作る</button>
        <button class="link" data-screen="list">スターターデッキの カード</button>
    </div>
</section>`;
        return;
    }
    if (screen === 'buddy') {
        const d = DECKS[pickDeck];
        app.innerHTML = `
<header class="top">
    <h1>${d.name}：バディを えらんでね</h1>
    ${back}
</header>
<p class="count">バディは デッキとは べつに、はじめから 使える 1 枚。チームの モンスターから えらべる（パックの カードは 持っていれば）</p>
<section class="grid">${buddyChoices(pickDeck, has(col)).map((c) => `<button class="cardwrap buddypick" data-buddy="${c.no}">${cardHTML(c)}${c.no === d.buddy ? '<span class="copies">おすすめ</span>' : ''}</button>`).join('')}</section>`;
        return;
    }
    // ショップ: 300 ポイントで 1 パック。あけると 5 枚
    if (screen === 'shop') {
        app.innerHTML = `
<header class="top">
    <h1>ショップ<small>パック 第1弾（1 パック 5 枚・${PACK_PRICE} ポイント）</small></h1>
    ${back}
</header>
<section class="shop">
    <div class="packbox">パック<br>第1弾</div>
    <p>${wallet()}</p>
    <div class="menu">
        <button class="play" data-buy="1" ${col.points < PACK_PRICE ? 'disabled' : ''}>${PACK_PRICE} ポイントで 1 パック かう</button>
        <button class="play" data-open="1" ${col.packs <= 0 ? 'disabled' : ''}>パックを あける</button>
    </div>
    <p class="count">N ×3・U ×1・R 以上 ×1（R 55%・VR 22%・SR 14%・HR 6%・OR 3%）。SR 以上は まれに シークレット</p>
</section>
${opened ? `<section class="grid opened">${opened.map((x) => `<div class="cardwrap">${cardHTML(cardByNo(x.no), { secret: x.secret })}${x.isNew ? '<span class="new">NEW</span>' : ''}</div>`).join('')}</section>` : ''}`;
        return;
    }
    // コレクション: パックの カード (持っていない カードは うすく)
    if (screen === 'collection') {
        const list = PACK_CARDS.filter((c) => c.team === colTeam);
        const got = PACK_CARDS.filter((c) => ownedCount(col, c.no)).length;
        app.innerHTML = `
<header class="top">
    <h1>コレクション<small>パック 第1弾：${PACK_CARDS.length} しゅるい中 ${got} しゅるい</small></h1>
    ${back}
</header>
${teamTabs(colTeam, 'colteam')}
<section class="grid collection">${list.map((c) => {
            const n = col.owned[c.no] || 0, s = col.secret[c.no] || 0;
            return `<button class="cardwrap ${n + s ? '' : 'none'}" data-peek="${c.no}">${cardHTML(c, { secret: s > 0 })}${n + s ? `<span class="copies">${[n ? `×${n}` : '', s ? `★${s}` : ''].filter(Boolean).join('・')}</span>` : ''}</button>`;
        }).join('')}</section>
${peekHTML()}`;
        return;
    }
    // デッキ作り: チームを えらぶ → 左が デッキ・右が 入れられる カード
    if (screen === 'edit') {
        if (!editTeam) {
            app.innerHTML = `
<header class="top"><h1>デッキを 作る<small>チームを えらんでね</small></h1>${back}</header>
<div class="decks">${Object.entries(DECKS).map(([id, d]) => `<button class="deckpick ${id}" data-editteam="${id}"><img class="deckemb" src="${emblemURL(id) || ''}" alt="">${d.name}<small>${col.decks[id] ? '自分の デッキ' : 'スターターデッキの まま'}</small></button>`).join('')}</div>`;
            return;
        }
        const count = {};
        for (const no of draft) count[no] = (count[no] || 0) + 1;
        const errs = deckErrors(col, editTeam, draft);
        const row = (c, n, lim, minus) => `<div class="erow">
    <img class="emb" src="${emblemURL(c.team) || ''}" alt="">${c.rarity ? `<span class="rarity">${c.rarity}</span>` : ''}
    <button class="ename" data-peek="${c.no}">Lv${c.lv} ${esc(c.name)}</button>
    <span class="n">${n}/${lim}</span>
    ${minus ? `<button class="pm" data-minus="${c.no}">－</button>` : ''}<button class="pm" data-plus="${c.no}" ${n >= lim || draft.length >= DECK_SIZE ? 'disabled' : ''}>＋</button>
</div>`;
        const inDeck = Object.keys(count).map(Number).sort((a, b) => a - b).map(cardByNo);
        app.innerHTML = `
<header class="top">
    <h1>${DECKS[editTeam].name} の デッキ<small>${draft.length} / ${DECK_SIZE} 枚・同じ カードは 4 枚まで（パックの カードは 持っている 枚数まで）</small></h1>
    <button class="link" data-editteam="">チームを えらびなおす</button>
</header>
<div class="menu" style="margin-top:10px">
    <button class="play" data-savedeck="1" ${errs.length ? 'disabled' : ''}>このデッキに する</button>
    <button class="link" data-starter="1">スターターデッキに もどす</button>
</div>
${errs.length ? `<p class="errs">${errs.map(esc).join('<br>')}</p>` : '<p class="count">OK！「このデッキに する」で きまり</p>'}
<div class="edit">
    <section><h2>デッキ（${inDeck.length} しゅるい）</h2><div class="elist">${inDeck.map((c) => row(c, count[c.no], deckLimit(col, editTeam, c.no), true)).join('')}</div></section>
    <section><h2>入れられる カード</h2><div class="elist">${deckPool(col, editTeam).filter((c) => !count[c.no]).map((c) => row(c, 0, deckLimit(col, editTeam, c.no), false)).join('')}</div></section>
</div>
${peekHTML()}`;
        return;
    }
    // スターターデッキの 中身 (枚数つき)。ノーブランドの タブは スターターの ノーブランド ぜんぶ
    const rows = deck === 'nobrand' ? CARDS.filter((c) => c.team === 'nobrand' && !c.pack).map((c) => [c, null]) : DECKS[deck].list.map(([no, n]) => [cardByNo(no), n]);
    const list = rows.filter(([c]) => kind === 'all' || c.kind === kind);
    app.innerHTML = `
<header class="top">
    <h1>スターターデッキの カード</h1>
    ${back}
</header>
${teamTabs(deck, 'deck')}
<nav class="tabs small">
    <button data-kind="all" class="${kind === 'all' ? 'on' : ''}">ぜんぶ</button>
    ${Object.entries(KINDS).map(([id, name]) => `<button data-kind="${id}" class="${id === kind ? 'on' : ''}">${name}</button>`).join('')}
</nav>
<p class="count">${list.length} しゅるい${deck !== 'nobrand' ? `・${list.reduce((n, [, k]) => n + k, 0)} 枚` : ''}（カードの 中身は ぜんぶ 案）</p>
<section class="grid">${list.map(([c, n]) => `<div class="cardwrap">${cardHTML(c)}${n ? `<span class="copies">×${n}</span>` : ''}</div>`).join('')}</section>`;
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.close) { peek = null; render(); return; }
    if (d.peek) { peek = +d.peek; render(); return; }
    if (d.battle) { pickDeck = d.battle; screen = 'buddy'; render(); return; }
    if (d.buddy) {
        screen = 'battle';
        startBattle(app, pickDeck, {
            buddy: Number(d.buddy),
            list: col.decks[pickDeck] ? deckOf(col, pickDeck) : null,
            onResult: (won) => { const n = addResult(col, won); save(); return `+${n} ポイント（いま ${col.points} ポイント）`; },
            onQuit: () => { screen = 'title'; render(); }
        });
        return;
    }
    if (d.buy) { if (buyPack(col)) save(); render(); return; }
    if (d.open) {
        const before = new Set(PACK_CARDS.filter((c) => ownedCount(col, c.no)).map((c) => c.no));
        const got = openPack(col);
        if (got) {
            for (const x of got) { x.isNew = !before.has(x.no); before.add(x.no); }
            opened = got;
            save();
        }
        render();
        return;
    }
    if (d.colteam) { colTeam = d.colteam; render(); return; }
    if (d.editteam !== undefined) { editTeam = d.editteam || null; draft = editTeam ? deckOf(col, editTeam) : null; render(); return; }
    if (d.plus) { draft.push(+d.plus); render(); return; }
    if (d.minus) { draft.splice(draft.indexOf(+d.minus), 1); render(); return; }
    if (d.savedeck) { if (saveDeck(col, editTeam, draft)) { save(); editTeam = null; draft = null; } render(); return; }
    if (d.starter) { resetDeck(col, editTeam); save(); draft = deckOf(col, editTeam); render(); return; }
    if (d.screen) { screen = d.screen; opened = null; editTeam = null; draft = null; }
    if (d.deck) deck = d.deck;
    if (d.kind) kind = d.kind;
    render();
}

render();
