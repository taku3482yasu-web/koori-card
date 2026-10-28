// =====================================================================
// たいせんの 画面 (上が CPU・下が 自分)。カードを タップすると 大きく 出て、出す・こうげき を えらぶ
// 選ぶ 場面は ルールから ask で 聞かれるので、まんなかに えらぶ 画面を 出す
// =====================================================================
import { Game } from '../logic/game.js';
import { cpuTurn } from '../logic/cpu.js';
import { DECKS } from '../data/cards.js';
import { cardHTML } from './card.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function startBattle(root, myDeck, { onQuit }) {
    const cpuDeck = myDeck === 'koori' ? 'oni' : 'koori';
    let g;
    let busy = false;
    let detail = null;     // { card, from: 'hand'|'buddy'|'field'|'enemy'|'scene' }
    let asking = null;     // { req, resolve }

    const me = () => g.players[0];
    const cpu = () => g.players[1];
    const myTurn = () => g.winner === null && g.active === 0 && !busy;

    g = new Game({
        players: [
            { name: 'あなた', deck: myDeck },
            { name: `CPU（${DECKS[cpuDeck].name}）`, deck: cpuDeck, cpu: true }
        ],
        ask: (pid, req) => new Promise((resolve) => { asking = { req, resolve }; render(); }),
        onChange: () => render(),
        delay: () => (g && g.active === 1 ? wait(450) : Promise.resolve())
    });

    async function run(fn) {
        busy = true;
        detail = null;
        render();
        try { await fn(); } finally { busy = false; }
        await cpuLoop();
        render();
    }
    async function cpuLoop() {
        while (g.winner === null && g.active === 1) {
            busy = true;
            render();
            await cpuTurn(g, cpu());
        }
        busy = false;
    }

    // ---------- 描く ----------
    function mini(card, { unit = null, cls = '', key = '', tag = 'button' } = {}) {
        const pw = unit ? g.power(unit) : card.power;
        const diff = unit ? pw - card.power : 0;
        const ready = unit && unit.owner === 0 && g.active === 0 && g.canAttack(unit);
        return `<${tag} class="mini ${card.kind} ${cls} ${ready ? 'ready' : ''}" data-key="${key}">
    <span class="lv">${card.lv}</span>
    <span class="nm">${esc(card.name)}</span>
    ${card.kind === 'monster' ? `<span class="pw ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${pw}</span>` : `<span class="kd">${{ magic: '魔法', field: '場面', item: 'アイテム' }[card.kind]}</span>`}
    ${unit?.item ? `<span class="it">＋${esc(unit.item.name)}</span>` : ''}
    ${unit && unit.stopTurn > g.turn ? '<span class="st">止</span>' : ''}
    ${card.dt ? '<span class="dtm">⚡</span>' : ''}
</${tag}>`;
    }

    function side(p, mine) {
        const slots = g.slots(p);
        const field = p.field.map((u) => mini(u, { unit: u, key: `${mine ? 'f' : 'e'}:${u.uid}` })).join('')
            + Array.from({ length: slots - p.field.length }, () => '<span class="mini empty"></span>').join('');
        const shields = Array.from({ length: 5 }, (_, i) => `<i class="${i < p.shields.length ? 'on' : ''}"></i>`).join('');
        const info = `<div class="info">
    <b>${esc(p.name)}</b><span class="badge">Lv${p.lv}</span>
    <span class="shields" title="シールド">${shields}</span>
    <span>山札 ${p.deck.length}</span><span>手札 ${p.hand.length}</span><span>墓地 ${p.grave.length}</span>
    ${p.scene ? `<button class="scene" data-key="${mine ? 's' : 'S'}:${p.scene.uid}">場面：${esc(p.scene.name)}</button>` : ''}
    ${mine && p.buddy ? `<button class="buddy" data-key="b:${p.buddy.uid}">バディ：${esc(p.buddy.name)}</button>` : ''}
</div>`;
        return `<section class="side ${mine ? 'mine' : 'enemy'}">${mine ? '' : info}<div class="zone">${field}</div>${mine ? info : ''}</section>`;
    }

    function render() {
        if (!g) return;
        const p = me();
        const status = g.winner !== null ? '' : g.active === 0 ? (busy ? '…' : 'あなたの ターン') : 'CPU の ターン…';
        root.innerHTML = `
<div class="battle">
    ${side(cpu(), false)}
    <div class="center">
        <div class="turn">${g.turn} ターン目　<b>${status}</b></div>
        <ol class="log">${g.logs.slice(-4).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
    </div>
    ${side(p, true)}
    <div class="hand">${p.hand.map((c) => mini(c, { key: `h:${c.uid}`, cls: g.active === 0 && g.canPlay(p, c) ? 'can' : '' })).join('')}</div>
    <div class="bar">
        <button class="quit">やめる</button>
        <button class="end" ${myTurn() ? '' : 'disabled'}>ターン終了</button>
    </div>
</div>
${detail ? detailHTML() : ''}
${asking ? askHTML() : ''}
${g.winner !== null ? resultHTML() : ''}`;
    }

    function detailHTML() {
        const { card, from, unit } = detail;
        const p = me();
        let actions = '';
        if (from === 'hand' || from === 'buddy') {
            const ok = myTurn() && g.canPlay(p, card);
            const verb = card.kind === 'monster' ? '場に 出す' : card.kind === 'item' ? '付ける' : '使う';
            actions = ok ? `<button class="act" data-act="play">${verb}</button>` : `<p class="why">${myTurn() ? esc(g.whyNot(p, card)) : 'いまは 使えない'}</p>`;
        } else if (from === 'field') {
            actions = myTurn() && g.canAttack(unit) ? '<button class="act" data-act="attack">こうげき</button>'
                : `<p class="why">${unit.enteredTurn === g.turn && !unit.haste ? '出した ターンは こうげき できない' : unit.stopTurn === g.turn ? '止められている' : 'いまは こうげき できない'}</p>`;
        }
        const now = unit ? `<p class="now">いまの パワー：<b>${g.power(unit)}</b>${unit.item ? `　アイテム：${esc(unit.item.name)}` : ''}</p>` : '';
        return `<div class="sheet" data-close="1"><div class="sheet-in">${cardHTML(card)}${now}<div class="acts">${actions}<button class="act sub" data-close="1">とじる</button></div></div></div>`;
    }

    function askHTML() {
        const { req } = asking;
        return `<div class="sheet ask"><div class="sheet-in">
    <h2>${esc(req.title)}</h2>
    <div class="opts">${req.options.map((o, i) => `<button class="opt" data-opt="${i}">${o.card ? mini(o.card.card || o.card, { unit: o.card.owner !== undefined ? o.card : null, tag: 'span' }) : ''}<span>${esc(o.label)}</span></button>`).join('')}</div>
    ${req.cancel ? `<button class="act sub" data-opt="-1">${esc(req.cancel)}</button>` : ''}
</div></div>`;
    }

    function resultHTML() {
        const won = g.winner === 0;
        return `<div class="sheet result"><div class="sheet-in">
    <h2>${won ? 'かち！' : 'まけ…'}</h2><p>${esc(g.reason)}</p>
    <div class="acts"><button class="act" data-again="1">もう いちど</button><button class="act sub quit">もどる</button></div>
</div></div>`;
    }

    // ---------- さわる ----------
    function find(key) {
        const [k, id] = key.split(':');
        const uid = +id;
        const p = me();
        if (k === 'h') return { card: p.hand.find((c) => c.uid === uid), from: 'hand' };
        if (k === 'b') return { card: p.buddy, from: 'buddy' };
        if (k === 'f') { const u = p.field.find((x) => x.uid === uid); return { card: u.card, unit: u, from: 'field' }; }
        if (k === 'e') { const u = cpu().field.find((x) => x.uid === uid); return { card: u.card, unit: u, from: 'enemy' }; }
        if (k === 's') return { card: p.scene, from: 'scene' };
        if (k === 'S') return { card: cpu().scene, from: 'scene' };
        return null;
    }

    // こうげきする 相手を 画面で えらぶ (ルールの ask と 同じ 見た目)
    function pickTarget(u) {
        const o = cpu();
        const ap = g.power(u, { attacking: true });
        const options = o.field.map((t) => {
            const dp = g.power(t);
            return { label: `${t.name}（${dp}）${ap > dp ? '→ かてる' : ap === dp ? '→ あいうち' : '→ まける'}`, value: t, card: t };
        });
        options.push({ label: o.shields.length ? `シールドを わる（のこり ${o.shields.length} 枚）` : 'ダイレクトアタック！', value: 'shield' });
        return new Promise((resolve) => { asking = { req: { title: `${u.name}（${ap}）で こうげき`, options, cancel: 'やめる' }, resolve }; render(); });
    }

    root.onclick = async (e) => {
        const b = e.target.closest('button, [data-close]');
        if (!b) return;
        if (asking) {
            if (b.dataset.opt === undefined) return;
            const i = +b.dataset.opt;
            const { req, resolve } = asking;
            asking = null;
            render();
            resolve(i < 0 ? null : req.options[i].value);
            return;
        }
        if (b.dataset.again) { startBattle(root, myDeck, { onQuit }); return; }
        if (b.classList.contains('quit')) { onQuit(); return; }
        if (b.dataset.close && e.target === b) { detail = null; render(); return; }
        if (b.classList.contains('end')) { if (myTurn()) await run(() => g.endTurn()); return; }
        if (b.dataset.act === 'play') {
            const { card, from } = detail;
            await run(() => g.play(me(), card, from));
            return;
        }
        if (b.dataset.act === 'attack') {
            const u = detail.unit;
            detail = null;
            const t = await pickTarget(u);
            if (t) await run(() => g.attack(u, t));
            else render();
            return;
        }
        if (b.dataset.key) {
            const d = find(b.dataset.key);
            if (d?.card) { detail = d; render(); }
        }
    };

    render();
    g.start().then(() => cpuLoop()).then(render);
}
