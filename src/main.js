// こおりくんの大冒険 カードゲーム: はじめの 画面 (デッキを えらんで CPU と たいせん・カード一覧)
import './style.css';
import { CARDS, DECKS, KINDS } from './data/cards.js';
import { cardHTML } from './view/card.js';
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
    <p>つかう デッキを えらんでね（CPU は もう片方の デッキ）</p>
    <div class="decks">
        ${Object.entries(DECKS).map(([id, d]) => `<button class="deckpick ${id}" data-battle="${id}">${d.name}デッキ<small>バディ：${CARDS.find((c) => c.no === d.buddy).name}</small></button>`).join('')}
    </div>
    <button class="link" data-screen="list">カード一覧を 見る</button>
</section>`;
        return;
    }
    const list = CARDS.filter((c) => c.deck === deck && (kind === 'all' || c.kind === kind));
    app.innerHTML = `
<header class="top">
    <h1>カード一覧</h1>
    <button class="link" data-screen="title">もどる</button>
</header>
<nav class="tabs">
    ${Object.entries(DECKS).map(([id, d]) => `<button data-deck="${id}" class="${id === deck ? 'on' : ''}">${d.name}デッキ</button>`).join('')}
</nav>
<nav class="tabs small">
    <button data-kind="all" class="${kind === 'all' ? 'on' : ''}">ぜんぶ</button>
    ${Object.entries(KINDS).map(([id, name]) => `<button data-kind="${id}" class="${id === kind ? 'on' : ''}">${name}</button>`).join('')}
</nav>
<p class="count">${list.length} しゅるい（カードの 中身は ぜんぶ 案）</p>
<section class="grid">${list.map(cardHTML).join('')}</section>`;
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
