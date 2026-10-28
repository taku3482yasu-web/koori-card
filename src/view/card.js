// =====================================================================
// カード 1 枚の 見た目 (ユーザーの デザイン案「こおりくんカード デザイン案」に 合わせた)
//   モンスター: 紺に 水色の 枠 / 魔法・場面: 紫 / アイテム: 緑
//   上: 左上の 丸い 数字 + 名前 / まんなか: イラスト / 下: 種族・パワー か 種類ラベル / 効果欄 (ドタバタトリガーの 黄色い マーク)
// =====================================================================
import { KINDS } from '../data/cards.js';

const NOTE = {
    magic: '使ったら墓地へ',
    field: '場に残る（自分の場に1枚）',
    item: 'モンスターに1枚付ける'
};

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function cardHTML(card) {
    const mid = card.kind === 'monster'
        ? `<span class="race">種族：${esc(card.race)}</span><span class="power"><small>パワー</small>${card.power}</span>`
        : `<span class="label">${KINDS[card.kind]}</span><span class="note">${NOTE[card.kind]}</span>`;
    const text = card.text || (card.dt ? '' : '（効果なし）');
    return `<article class="card ${card.kind}" data-no="${card.no}">
    <header><span class="lv">${card.lv}</span><span class="name">${esc(card.name)}</span></header>
    <div class="art"><span>${esc(card.name.slice(0, 1))}</span></div>
    <div class="mid">${mid}</div>
    <div class="text"><div class="tags"><span class="tag">効果</span>${card.dt ? '<span class="tag dt">⚡ ドタバタトリガー</span>' : ''}</div>${esc(text)}</div>
    <footer>No.${String(card.no).padStart(3, '0')}　${esc(card.from)}</footer>
</article>`;
}
