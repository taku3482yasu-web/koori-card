// =====================================================================
// たいせんの 画面 (上が CPU・下が 自分)。カードを タップすると 大きく 出て、出す・こうげき を えらぶ
// 選ぶ 場面は ルールから ask で 聞かれるので、まんなかに えらぶ 画面を 出す
// =====================================================================
import { Game } from '../logic/game.js';
import { cpuTurn } from '../logic/cpu.js';
import { DECKS } from '../data/cards.js';
import { cardHTML, pic } from './card.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function startBattle(root, myDeck, { onQuit }) {
    const cpuDeck = myDeck === 'koori' ? 'oni' : 'koori';
    let g;
    let busy = false;
    let detail = null;     // { card, from: 'hand'|'buddy'|'field'|'enemy'|'scene' }
    let asking = null;     // { req, resolve }
    let graveOf = null;    // 墓地を 見ている プレイヤー (0 か 1)
    let logOpen = false;   // ログを ぜんぶ 見ている

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
        delay: () => (g && g.active === 1 ? wait(450) : Promise.resolve()),
        fx: (ev) => fx(ev)
    });

    // ---------- 演出 (こうげきの 矢印・やられて 割れる) ----------
    const keyOf = (u) => `${u.owner === 0 ? 'f' : 'e'}:${u.uid}`;
    const elOf = (u) => root.querySelector(`.zone [data-key="${keyOf(u)}"]`);
    async function fx(ev) {
        render();
        if (ev.type === 'attack') {
            const from = elOf(ev.unit);
            const to = ev.target === 'shield'
                ? root.querySelector(`.side.${ev.unit.owner === 0 ? 'enemy' : 'mine'} .shields`)
                : elOf(ev.target);
            if (!from || !to) return;
            const a = from.getBoundingClientRect();
            const b = to.getBoundingClientRect();
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', `arrow ${ev.unit.owner === 0 ? 'me' : 'cpu'}`);
            svg.innerHTML = `<defs><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
<line x1="${a.x + a.width / 2}" y1="${a.y + a.height / 2}" x2="${b.x + b.width / 2}" y2="${b.y + b.height / 2}" marker-end="url(#ah)"/>`;
            from.classList.add('attacking');
            document.body.append(svg);
            await wait(650);
            svg.remove();
            from.classList.remove('attacking');
        } else if (ev.type === 'destroy') {
            const el = elOf(ev.unit);
            if (!el) return;
            el.classList.add('crack');
            await wait(600);
        }
    }


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
    <span class="pic">${pic(card)}</span>
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
    <span>山札 ${p.deck.length}</span><span>手札 ${p.hand.length}</span><button class="grave" data-grave="${p.id}">墓地 ${p.grave.length}</button>
    ${p.scene ? `<button class="scene" data-key="${mine ? 's' : 'S'}:${p.scene.uid}">場面：${esc(p.scene.name)}</button>` : ''}
    ${mine && p.buddy ? `<button class="buddy" data-key="b:${p.buddy.uid}">バディ：${esc(p.buddy.name)}</button>` : ''}
</div>`;
        return `<section class="side ${mine ? 'mine' : 'enemy'}">${mine ? '' : info}<div class="zone">${field}</div>${mine ? info : ''}</section>`;
    }

    function render() {
        if (!g) return;
        const scroll = root.querySelector('.fulllog')?.scrollTop;
        const p = me();
        const status = g.winner !== null ? '' : g.active === 0 ? (busy ? '…' : 'あなたの ターン') : 'CPU の ターン…';
        root.innerHTML = `
<div class="battle">
    ${side(cpu(), false)}
    <div class="center">
        <div class="turn">${g.turn} ターン目　<b>${status}</b></div>
        <button class="log" data-log="1" title="ログを ぜんぶ 見る"><ol>${g.logs.slice(-4).map((l) => `<li>${esc(l)}</li>`).join('')}</ol><span class="more">ぜんぶ 見る ▸</span></button>
    </div>
    ${side(p, true)}
    <div class="hand">${p.hand.map((c) => mini(c, { key: `h:${c.uid}`, cls: g.active === 0 && g.canPlay(p, c) ? 'can' : '' })).join('')}</div>
    <div class="bar">
        <button class="quit">やめる</button>
        <button class="end" ${myTurn() ? '' : 'disabled'}>ターン終了</button>
    </div>
</div>
${graveOf !== null ? graveHTML() : ''}
${logOpen ? logHTML() : ''}
${detail ? detailHTML() : ''}
${asking ? askHTML() : ''}
${g.winner !== null ? resultHTML() : ''}`;
        const full = root.querySelector('.fulllog');
        if (full) full.scrollTop = scroll ?? full.scrollHeight;   // 開いたときは いちばん 下 (さいしん)
    }

    function graveHTML() {
        const p = g.players[graveOf];
        const list = p.grave.map((c, i) => mini(c, { key: `g:${i}`, tag: 'button' })).join('');
        return `<div class="sheet" data-close="1"><div class="sheet-in wide">
    <h2>${esc(p.name)} の 墓地（${p.grave.length} 枚）</h2>
    ${p.grave.length ? `<div class="gravelist">${list}</div>` : '<p class="why">まだ ない</p>'}
    <div class="acts"><button class="act sub" data-close="1">とじる</button></div>
</div></div>`;
    }

    function logHTML() {
        return `<div class="sheet" data-close="1"><div class="sheet-in wide">
    <h2>ログ（${g.logs.length}）</h2>
    <ol class="fulllog">${g.logs.map((l) => `<li class="${l.startsWith('──') ? 'turnline' : ''}">${esc(l)}</li>`).join('')}</ol>
    <div class="acts"><button class="act sub" data-close="1">とじる</button></div>
</div></div>`;
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
        const now = unit ? `<p class="now">いまの パワー：<b>${g.power(unit)}</b></p>` : '';
        const item = unit?.item ? `<p class="now">付いている アイテム</p><div class="itemcard">${cardHTML(unit.item)}</div>` : '';
        return `<div class="sheet" data-close="1"><div class="sheet-in">${cardHTML(card)}${now}${item}<div class="acts">${actions}<button class="act sub" data-close="1">とじる</button></div></div></div>`;
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
        if (k === 'g') return { card: g.players[graveOf]?.grave[uid], from: 'grave' };
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

    // 手札を おしたまま 上へ 動かして、自分の 場で はなすと そのまま 出す (タップは いままでどおり 大きく 出る)
    let drag = null;       // { el, card, from, x, y, ghost }
    let dragged = false;   // ドラッグの あとの click は 無視する
    const overMine = (x, y) => !!document.elementFromPoint(x, y)?.closest('.side.mine, .center');

    root.onpointerdown = (e) => {
        const el = e.target.closest('.hand .mini.can, .buddy');
        if (!el || !myTurn() || asking || detail || graveOf !== null || logOpen || e.button > 0) return;
        const d = find(el.dataset.key);
        if (!d?.card || !g.canPlay(me(), d.card)) return;
        drag = { el, card: d.card, from: d.from, x: e.clientX, y: e.clientY, ghost: null };
    };
    root.onpointermove = (e) => {
        if (!drag) return;
        if (!drag.ghost) {
            if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
            drag.ghost = drag.el.cloneNode(true);
            drag.ghost.classList.add('ghost');
            drag.ghost.style.width = `${drag.el.offsetWidth}px`;
            document.body.append(drag.ghost);
            drag.el.classList.add('lift');
            try { drag.el.setPointerCapture(e.pointerId); } catch { /* もう はなした */ }
        }
        drag.ghost.style.left = `${e.clientX}px`;
        drag.ghost.style.top = `${e.clientY}px`;
        root.querySelector('.side.mine')?.classList.toggle('drop', overMine(e.clientX, e.clientY));
    };
    async function endDrag(e, cancel) {
        if (!drag) return;
        const { ghost, el, card, from } = drag;
        drag = null;
        if (!ghost) return;
        ghost.remove();
        el.classList.remove('lift');
        root.querySelector('.side.mine')?.classList.remove('drop');
        dragged = true;
        setTimeout(() => { dragged = false; }, 0);
        if (!cancel && overMine(e.clientX, e.clientY) && myTurn()) await run(() => g.play(me(), card, from));
    }
    root.onpointerup = (e) => endDrag(e, false);
    root.onpointercancel = (e) => endDrag(e, true);

    root.onclick = async (e) => {
        if (dragged) return;
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
        if (b.dataset.close && e.target === b) {   // いちばん 上の 画面だけ とじる
            if (detail) detail = null;
            else if (graveOf !== null) graveOf = null;
            else logOpen = false;
            render();
            return;
        }
        if (b.dataset.grave !== undefined) { graveOf = +b.dataset.grave; render(); return; }
        if (b.dataset.log) { logOpen = true; render(); return; }
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
