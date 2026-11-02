// こおりくんの大冒険 カードゲーム: はじめの 画面 (デッキを えらんで CPU と たいせん・カード一覧)
import './style.css';
import { CARDS, DECKS, KINDS, cardByNo } from './data/cards.js';
import { cardHTML } from './view/card.js';
import { emblemURL } from './view/emblems.js';
import { startBattle } from './view/battle.js';
import { buddyChoices } from './logic/game.js';

const app = document.getElementById('app');
let screen = 'title';
let deck = 'koori';
let kind = 'all';
let pickDeck = null;   // バディを えらんでいる デッキ (2026-11-03: バディは 自分で 決められる)

function render() {
    app.onclick = onClick;
    if (screen === 'title') {
        app.innerHTML = `
<section class="title">
    <h1>こおりくんの大冒険<small>カードゲーム</small></h1>
    <p>つかう スターターデッキを えらんでね（CPU は ほかの デッキから ランダム）</p>
    <div class="decks">
        ${Object.entries(DECKS).map(([id, d]) => `<button class="deckpick ${id}" data-battle="${id}"><img class="deckemb" src="${emblemURL(id) || ''}" alt="">${d.name}<small>バディ：${cardByNo(d.buddy).name}</small><small class="style">${d.style}</small></button>`).join('')}
    </div>
    <button class="link" data-screen="list">カード一覧を 見る</button>
</section>`;
        return;
    }
    // デッキの 中身 (枚数つき)。ノーブランドの タブは ノーブランドの カード ぜんぶ
    if (screen === 'buddy') {
        const d = DECKS[pickDeck];
        app.innerHTML = `
<header class="top">
    <h1>${d.name}：バディを えらんでね</h1>
    <button class="link" data-screen="title">もどる</button>
</header>
<p class="count">バディは デッキとは べつに、はじめから 使える 1 枚。チームの モンスターから えらべる</p>
<section class="grid">${buddyChoices(pickDeck).map((c) => `<button class="cardwrap buddypick" data-buddy="${c.no}">${cardHTML(c)}${c.no === d.buddy ? '<span class="copies">おすすめ</span>' : ''}</button>`).join('')}</section>`;
        return;
    }
    const rows = deck === 'nobrand' ? CARDS.filter((c) => c.team === 'nobrand').map((c) => [c, null]) : DECKS[deck].list.map(([no, n]) => [cardByNo(no), n]);
    const list = rows.filter(([c]) => kind === 'all' || c.kind === kind);
    app.innerHTML = `
<header class="top">
    <h1>カード一覧</h1>
    <button class="link" data-screen="title">もどる</button>
</header>
<nav class="tabs">
    ${Object.entries(DECKS).map(([id, d]) => `<button data-deck="${id}" class="${id === deck ? 'on' : ''}">${d.name}</button>`).join('')}
    <button data-deck="nobrand" class="${deck === 'nobrand' ? 'on' : ''}">ノーブランド</button>
</nav>
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
    if (b.dataset.battle) {
        pickDeck = b.dataset.battle;
        screen = 'buddy';
        render();
        return;
    }
    if (b.dataset.buddy) {
        screen = 'battle';
        startBattle(app, pickDeck, { buddy: Number(b.dataset.buddy), onQuit: () => { screen = 'title'; render(); } });
        return;
    }
    if (b.dataset.screen) screen = b.dataset.screen;
    if (b.dataset.deck) deck = b.dataset.deck;
    if (b.dataset.kind) kind = b.dataset.kind;
    render();
}

render();
