// こおりくんの大冒険 カードゲーム: メイン画面 (2026-11-03 ユーザー指定: 対戦する・ショップ・ヘルプ・カード・デッキ・設定)
//   対戦する → CPU か オンライン → デッキ → バディ → (オンラインは 部屋を 作る・入る) → たいせん
import './style.css';
import { CARDS, DECKS, KINDS, cardByNo } from './data/cards.js';
import { cardHTML } from './view/card.js';
import { emblemURL } from './view/emblems.js';
import { startBattle } from './view/battle.js';
import { HELP } from './view/help.js';
import { play as sfx, setSound } from './view/sound.js';
import { buddyChoices } from './logic/game.js';
import {
    PACK_PRICE, PACK_CARDS, DECK_SIZE, loadCollection, saveCollection, newCollection, openPack, buyPack, addResult, has, ownedCount,
    deckOf, deckErrors, deckLimit, deckPool, saveDeck, resetDeck
} from './logic/collection.js';
import { SPEEDS, loadSettings, saveSettings, cleanName } from './logic/settings.js';

const app = document.getElementById('app');
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
let col = loadCollection(storage);
const save = () => saveCollection(storage, col);
const settings = loadSettings(storage);
setSound(settings.sound);

let screen = 'title';
let mode = 'cpu';      // 対戦の 相手: cpu / online
let pickDeck = null;   // 対戦で つかう デッキ
let pickBuddy = null;
let room = null;       // オンライン: { status, code, error, handle, joining }
let cardTeam = 'bariki';
let kind = 'all';
let opened = null;     // いま あけた パックの 5 枚
let editTeam = null;   // デッキを 作っている チーム
let draft = null;      // 作りかけの デッキ (カード番号)
let peek = null;       // 大きく 見ている カード
let helpOpen = 0;

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const back = (to = 'title') => `<button class="link" data-screen="${to}">もどる</button>`;
const wallet = () => `<span class="points">${col.points} ポイント</span>・パック ${col.packs} こ`;
const teamTabs = (cur, attr, nobrand = true) => `<nav class="tabs">
    ${Object.entries(DECKS).map(([id, d]) => `<button data-${attr}="${id}" class="${id === cur ? 'on' : ''}">${d.name}</button>`).join('')}
    ${nobrand ? `<button data-${attr}="nobrand" class="${cur === 'nobrand' ? 'on' : ''}">ノーブランド</button>` : ''}
</nav>`;
const peekHTML = () => (peek ? `<button class="peek" data-close="1">${cardHTML(cardByNo(peek), { secret: (col.secret[peek] || 0) > 0 })}</button>` : '');
const deckButtons = (attr) => Object.entries(DECKS).map(([id, d]) => `<button class="deckpick ${id}" data-${attr}="${id}"><img class="deckemb" src="${emblemURL(id) || ''}" alt="">${d.name}<small>${col.decks[id] ? '自分の デッキ' : 'スターターデッキ'}</small><small class="style">${d.style}</small></button>`).join('');

const MENU = [['versus', '⚔', '対戦する', 'CPU・オンライン'], ['shop', '🎁', 'ショップ', 'パックを かう・あける'], ['help', '？', 'ヘルプ', 'あそびかた'],
    ['cards', '🃏', 'カード', 'カードを 見る・コレクション'], ['deck', '📦', 'デッキ', 'デッキを 作る'], ['settings', '⚙', '設定', '名前・音・速さ']];

function render() {
    app.onclick = onClick;
    app.onchange = onChange;
    const view = SCREENS[screen] || SCREENS.title;
    app.innerHTML = view();
}

const SCREENS = {
    title: () => `
<section class="title">
    <h1>こおりくんの大冒険<small>カードゲーム</small></h1>
    <p class="wallet">${esc(settings.name)}　${wallet()}</p>
    <nav class="mainmenu">${MENU.map(([id, icon, name, sub]) => `<button class="menubtn" data-screen="${id}"><span class="icon">${icon}</span>${name}<small>${sub}</small></button>`).join('')}</nav>
</section>`,

    // ---------- 対戦する ----------
    versus: () => `
<header class="top"><h1>対戦する</h1>${back()}</header>
<nav class="mainmenu two">
    <button class="menubtn" data-mode="cpu"><span class="icon">🤖</span>CPU と 対戦<small>CPU は ほかの デッキから ランダム</small></button>
    <button class="menubtn" data-mode="online"><span class="icon">🌐</span>オンライン対戦<small>友だちと ルーム番号で つながる</small></button>
</nav>`,
    pickdeck: () => `
<header class="top"><h1>${mode === 'online' ? 'オンライン対戦' : 'CPU と 対戦'}<small>つかう デッキを えらんでね</small></h1>${back('versus')}</header>
<div class="decks">${deckButtons('battle')}</div>`,
    buddy: () => {
        const d = DECKS[pickDeck];
        return `
<header class="top"><h1>${d.name}：バディを えらんでね</h1>${back('pickdeck')}</header>
<p class="count">バディは デッキとは べつに、はじめから 使える 1 枚。チームの モンスターから えらべる（パックの カードは 持っていれば）</p>
<section class="grid">${buddyChoices(pickDeck, has(col)).map((c) => `<button class="cardwrap buddypick" data-buddy="${c.no}">${cardHTML(c)}${c.no === d.buddy ? '<span class="copies">おすすめ</span>' : ''}</button>`).join('')}</section>`;
    },
    room: () => `
<header class="top"><h1>オンライン対戦<small>${esc(DECKS[pickDeck].name)}・バディ：${esc(cardByNo(pickBuddy).name)}</small></h1><button class="link" data-leave="1">もどる</button></header>
<section class="room">
    ${room?.handle ? `
        ${room.code ? `<p>この 番号を 友だちに 伝えてね</p><p class="code">${room.code}</p>` : ''}
        <p class="status">${esc(room.status)}</p>
        <button class="link" data-leave="1">やめる</button>` : `
        <button class="play big" data-host="1">部屋を 作る</button>
        <p class="or">または</p>
        <div class="join"><input id="code" inputmode="numeric" maxlength="6" placeholder="6 けたの 番号" autocomplete="off"><button class="play" data-join="1">部屋に 入る</button></div>
        ${room?.error ? `<p class="errs">${esc(room.error)}</p>` : ''}
        <p class="count">あなたの 名前：${esc(settings.name)}（設定で かえられる）</p>`}
</section>`,

    // ---------- ショップ: 300 ポイントで 1 パック。あけると 5 枚 ----------
    shop: () => `
<header class="top"><h1>ショップ<small>パック 第1弾（1 パック 5 枚・${PACK_PRICE} ポイント）</small></h1>${back()}</header>
<section class="shop">
    <div class="packbox">パック<br>第1弾</div>
    <p>${wallet()}</p>
    <div class="menu">
        <button class="play" data-buy="1" ${col.points < PACK_PRICE ? 'disabled' : ''}>${PACK_PRICE} ポイントで 1 パック かう</button>
        <button class="play" data-open="1" ${col.packs <= 0 ? 'disabled' : ''}>パックを あける</button>
    </div>
    <p class="count">N ×3・U ×1・R 以上 ×1（R 55%・VR 22%・SR 14%・HR 6%・OR 3%）。SR 以上は まれに シークレット</p>
</section>
${opened ? `<section class="grid opened">${opened.map((x) => `<div class="cardwrap">${cardHTML(cardByNo(x.no), { secret: x.secret })}${x.isNew ? '<span class="new">NEW</span>' : ''}</div>`).join('')}</section>` : ''}`,

    // ---------- ヘルプ ----------
    help: () => `
<header class="top"><h1>ヘルプ<small>あそびかた</small></h1>${back()}</header>
<section class="help">${HELP.map(([t, body], i) => `<details ${i === helpOpen ? 'open' : ''}><summary>${t}</summary><div class="helpbody">${body}</div></details>`).join('')}</section>`,

    // ---------- カード: チームごとに スターターの カードと パックの カード (持っていない パックの カードは うすく) ----------
    cards: () => {
        const starter = CARDS.filter((c) => !c.pack && c.team === cardTeam && (kind === 'all' || c.kind === kind));
        const pack = PACK_CARDS.filter((c) => c.team === cardTeam && (kind === 'all' || c.kind === kind));
        const got = PACK_CARDS.filter((c) => ownedCount(col, c.no)).length;
        const inStarter = (no) => (DECKS[cardTeam]?.list.find(([n]) => n === no) || [])[1];
        const packCard = (c) => {
            const n = col.owned[c.no] || 0, s = col.secret[c.no] || 0;
            return `<button class="cardwrap ${n + s ? '' : 'none'}" data-peek="${c.no}">${cardHTML(c, { secret: s > 0 })}${n + s ? `<span class="copies">${[n ? `×${n}` : '', s ? `★${s}` : ''].filter(Boolean).join('・')}</span>` : ''}</button>`;
        };
        return `
<header class="top"><h1>カード<small>パック 第1弾：${PACK_CARDS.length} しゅるい中 ${got} しゅるい あつめた</small></h1>${back()}</header>
${teamTabs(cardTeam, 'cardteam')}
<nav class="tabs small">
    <button data-kind="all" class="${kind === 'all' ? 'on' : ''}">ぜんぶ</button>
    ${Object.entries(KINDS).map(([id, name]) => `<button data-kind="${id}" class="${id === kind ? 'on' : ''}">${name}</button>`).join('')}
</nav>
<h2 class="sub">スターターの カード（${starter.length} しゅるい・いつでも 使える）</h2>
<section class="grid">${starter.map((c) => `<button class="cardwrap" data-peek="${c.no}">${cardHTML(c)}${inStarter(c.no) ? `<span class="copies">デッキに ×${inStarter(c.no)}</span>` : ''}</button>`).join('')}</section>
<h2 class="sub">パック 第1弾の カード（${pack.filter((c) => ownedCount(col, c.no)).length} / ${pack.length}）</h2>
<section class="grid collection">${pack.map(packCard).join('')}</section>
${peekHTML()}`;
    },

    // ---------- デッキ: チームを えらぶ → 左が デッキ・右が 入れられる カード ----------
    deck: () => {
        if (!editTeam) return `
<header class="top"><h1>デッキ<small>作る チームを えらんでね</small></h1>${back()}</header>
<div class="decks">${deckButtons('editteam')}</div>`;
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
        return `
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
    },

    // ---------- 設定 ----------
    settings: () => {
        const speed = (key) => Object.entries(SPEEDS).map(([id, s]) => `<button data-set="${key}" data-val="${id}" class="${settings[key] === id ? 'on' : ''}">${s.name}</button>`).join('');
        return `
<header class="top"><h1>設定</h1>${back()}</header>
<section class="settings">
    <label class="row"><span>プレイヤーの 名前</span><input id="name" maxlength="10" value="${esc(settings.name)}"></label>
    <p class="count">オンライン対戦で 相手に 見える 名前（10 文字まで）</p>
    <div class="row"><span>音</span><nav class="tabs small"><button data-set="sound" data-val="1" class="${settings.sound ? 'on' : ''}">オン</button><button data-set="sound" data-val="0" class="${settings.sound ? '' : 'on'}">オフ</button></nav></div>
    <div class="row"><span>CPU の 速さ</span><nav class="tabs small">${speed('cpuSpeed')}</nav></div>
    <div class="row"><span>演出の 速さ</span><nav class="tabs small">${speed('fxSpeed')}</nav></div>
    <div class="row danger"><span>データの リセット</span><button class="link" data-reset="1">ポイント・カード・デッキを はじめから にする</button></div>
</section>`;
    }
};

// ---------- オンライン ----------
async function openRoom(kind, code) {
    const { hostRoom, joinRoom, channel, VERSION } = await import('./view/net.js');
    const mine = { name: settings.name, deck: pickDeck, buddy: pickBuddy, list: col.decks[pickDeck] ? deckOf(col, pickDeck) : null, ver: VERSION };
    room = { status: 'サーバーに つないでいます…', code: null, error: null, handle: null };
    const cb = { onCode: (c) => { room.code = c; render(); }, onStatus: (s) => { if (room) { room.status = s; render(); } } };
    room.handle = kind === 'host' ? hostRoom(mine, cb) : joinRoom(code, mine, cb);
    render();
    let res;
    try {
        res = await room.handle.promise;
    } catch (e) {
        room.handle?.cancel();
        room = { error: e.message };
        render();
        return;
    }
    // ここから すぐ つなぐ (とどいた 行動を とりこぼさない)
    const me = kind === 'host' ? 0 : 1;
    const pending = [];
    const net = { me, onMessage: null, onClose: null };
    const ch = channel(res, me, (m) => (net.onMessage ? net.onMessage(m) : pending.push(m)), (why) => net.onClose?.(why));
    net.send = ch.send;
    net.close = ch.close;
    net.flush = () => { while (pending.length && net.onMessage) net.onMessage(pending.shift()); };
    const otherName = cleanName(res.other.name);
    const other = { name: otherName === 'あなた' ? '相手' : otherName, deck: DECKS[res.other.deck] ? res.other.deck : 'koori', buddy: res.other.buddy, list: res.other.list || null };
    room = null;
    screen = 'battle';
    sfx('chance');
    startBattle(app, pickDeck, {
        settings,
        online: { net, seed: res.seed, players: me === 0 ? [mine, other] : [other, mine] },
        onResult,
        onQuit: () => { screen = 'title'; render(); }
    });
}
function onResult(won) {
    const n = addResult(col, won);
    save();
    return `+${n} ポイント（いま ${col.points} ポイント）`;
}

function onChange(e) {
    if (e.target.id === 'name') {
        settings.name = cleanName(e.target.value);
        saveSettings(storage, settings);
        render();
    }
}

function onClick(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    sfx('click');
    if (d.close) { peek = null; render(); return; }
    if (d.peek) { peek = +d.peek; render(); return; }
    if (d.mode) { mode = d.mode; screen = 'pickdeck'; render(); return; }
    if (d.battle) { pickDeck = d.battle; screen = 'buddy'; render(); return; }
    if (d.buddy) {
        pickBuddy = Number(d.buddy);
        if (mode === 'online') { screen = 'room'; room = null; render(); return; }
        screen = 'battle';
        startBattle(app, pickDeck, {
            buddy: pickBuddy,
            list: col.decks[pickDeck] ? deckOf(col, pickDeck) : null,
            settings,
            onResult,
            onQuit: () => { screen = 'title'; render(); }
        });
        return;
    }
    if (d.host) { openRoom('host'); return; }
    if (d.join) {
        const code = (app.querySelector('#code')?.value || '').replace(/\D/g, '');
        if (code.length !== 6) { room = { error: '6 けたの 番号を 入れてね' }; render(); return; }
        openRoom('join', code);
        return;
    }
    if (d.leave) { room?.handle?.cancel(); room = null; screen = 'buddy'; render(); return; }
    if (d.buy) { if (buyPack(col)) save(); render(); return; }
    if (d.open) {
        const before = new Set(PACK_CARDS.filter((c) => ownedCount(col, c.no)).map((c) => c.no));
        const got = openPack(col);
        if (got) {
            for (const x of got) { x.isNew = !before.has(x.no); before.add(x.no); }
            opened = got;
            save();
            sfx(got.some((x) => ['SR', 'HR', 'OR'].includes(x.rarity)) ? 'rare' : 'pack');
        }
        render();
        return;
    }
    if (d.cardteam) { cardTeam = d.cardteam; render(); return; }
    if (d.editteam !== undefined) { editTeam = d.editteam || null; draft = editTeam ? deckOf(col, editTeam) : null; render(); return; }
    if (d.plus) { draft.push(+d.plus); render(); return; }
    if (d.minus) { draft.splice(draft.indexOf(+d.minus), 1); render(); return; }
    if (d.savedeck) { if (saveDeck(col, editTeam, draft)) { save(); editTeam = null; draft = null; } render(); return; }
    if (d.starter) { resetDeck(col, editTeam); save(); draft = deckOf(col, editTeam); render(); return; }
    if (d.set) {
        settings[d.set] = d.set === 'sound' ? d.val === '1' : d.val;
        setSound(settings.sound);
        saveSettings(storage, settings);
        render();
        return;
    }
    if (d.reset) {
        if (!window.confirm('ポイント・あつめた カード・作った デッキを ぜんぶ けして はじめから にする？')) return;
        if (!window.confirm('ほんとうに いい？（もとに もどせません）')) return;
        col = newCollection();
        save();
        render();
        return;
    }
    if (d.screen) { screen = d.screen; opened = null; editTeam = null; draft = null; peek = null; }
    if (d.kind) kind = d.kind;
    render();
}

render();
