// こおりくんの大冒険 カードゲーム: はじめの 画面 (デッキを えらんで CPU と たいせん・カード一覧)
import './style.css';
import { CARDS, DECKS, KINDS, cardByNo } from './data/cards.js';
import { cardHTML } from './view/card.js';
import { emblemURL } from './view/emblems.js';
import { startBattle } from './view/battle.js';

const app = document.getElementById('app');
let screen = 'title';
let deck = 'koori';
let kind = 'all';

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
        screen = 'battle';
        startBattle(app, b.dataset.battle, { onQuit: () => { screen = 'title'; render(); } });
        return;
    }
    if (b.dataset.screen) screen = b.dataset.screen;
    if (b.dataset.deck) deck = b.dataset.deck;
    if (b.dataset.kind) kind = b.dataset.kind;
    render();
}

render();
