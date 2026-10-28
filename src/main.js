// こおりくんの大冒険 カードゲーム: はじめの 画面 (カード一覧。CPU 対戦は 次の 段階で 作る)
import './style.css';
import { CARDS, DECKS, KINDS } from './data/cards.js';
import { cardHTML } from './view/card.js';

const app = document.getElementById('app');
let deck = 'koori';
let kind = 'all';

function render() {
    const list = CARDS.filter((c) => c.deck === deck && (kind === 'all' || c.kind === kind));
    app.innerHTML = `
<header class="top">
    <h1>こおりくんの大冒険<small>カードゲーム</small></h1>
    <button class="play" disabled>CPU と たいせん（じゅんびちゅう）</button>
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

app.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.deck) deck = b.dataset.deck;
    if (b.dataset.kind) kind = b.dataset.kind;
    render();
});

render();
