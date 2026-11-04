// =====================================================================
// たいせんの 画面 (上が 相手・下が 自分)。カードを タップすると 大きく 出て、出す・こうげき を えらぶ
// 選ぶ 場面は ルールから ask で 聞かれるので、まんなかに えらぶ 画面を 出す
// 相手は CPU か オンラインの 人 (logic/lockstep.js。自分の 番号 ME は 部屋を 作った 人 0・入った 人 1)
// =====================================================================
import { Game } from '../logic/game.js';
import { cpuTurn } from '../logic/cpu.js';
import { cpuDeckList } from '../logic/cpu-decks.js';
import { DECKS, SECRET } from '../data/cards.js';
import { cardHTML, pic, emblem } from './card.js';
import { artURL } from '../art/index.js';
import { Lockstep, seeded } from '../logic/lockstep.js';
import { speedK } from '../logic/settings.js';
import { play as sfx } from './sound.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// opts: { onQuit, buddy, list: 自分の デッキ (カード番号), onResult(won) → 結果に 出す ことば (ポイント), settings,
//         online: { net: { send, close, me }, seed, players: [部屋を 作った 人, 入った 人] の { name, deck, buddy, list } } }
export function startBattle(root, myDeck, opts) {
    const { onQuit, buddy = null, list = null, onResult = null, settings = {}, online = null, level = 'normal' } = opts;
    let netNote = null;   // オンライン: つなぎなおし中の 知らせ
    // はじめての CPU 戦の チュートリアル (2026-11-03 ユーザー指定): その 場面に なったら 1 つずつ 説明を 出す
    const coach = opts.tutorial && !online ? { seen: {}, now: null, done: false } : null;
    const ME = online ? online.net.me : 0;
    const OP = 1 - ME;
    const cpuK = speedK(settings.cpuSpeed), fxK = speedK(settings.fxSpeed);
    const link = online ? new Lockstep(online.net.send, ME) : null;
    let trouble = null;    // オンラインで ずれた とき
    let resultNote = null;   // 1 回だけ 結果を 知らせる
    // CPU は ほかの スターターデッキから ランダム (2026-11-03 デッキ 8 つ)
    const others = Object.keys(DECKS).filter((id) => id !== myDeck);
    const cpuDeck = others[Math.floor(Math.random() * others.length)];
    let g;
    let busy = false;
    let detail = null;     // { card, from: 'hand'|'buddy'|'field'|'enemy'|'scene' }
    let asking = null;     // { req, resolve }
    let graveOf = null;    // 墓地を 見ている プレイヤー (0 か 1)
    let logOpen = false;   // ログを ぜんぶ 見ている

    const me = () => g.players[ME];
    const cpu = () => g.players[OP];   // 相手 (CPU か オンラインの 人)
    const myTurn = () => g.winner === null && g.active === ME && !busy && !trouble;
    const localAsk = (req) => new Promise((resolve) => { asking = { req, resolve }; render(); });

    g = new Game({
        players: online
            ? online.players.map((x) => ({ name: x.name, deck: x.deck, buddy: x.buddy, list: x.list, secret: x.secret }))
            : [
                { name: settings.name || 'あなた', deck: myDeck, buddy, list, secret: opts.secret },
                { name: `CPU（${DECKS[cpuDeck].name}${level !== 'normal' ? `・${level === 'easy' ? 'かんたん' : 'つよい'}` : ''}）`, deck: cpuDeck, cpu: true, list: cpuDeckList(cpuDeck, level) }
            ],
        rand: online ? seeded(online.seed) : undefined,
        ask: online ? link.askFn(localAsk) : (pid, req) => localAsk(req),
        onChange: () => render(),
        delay: () => (g && !online && g.active === OP ? wait(450 * cpuK) : Promise.resolve()),
        fx: (ev) => fx(ev)
    });
    // 行動 (オンラインでは 相手にも 送る)
    const A = online ? link.actor(g) : g;
    // 効果音 (ログの ことばで 鳴らす)
    const log0 = g.log.bind(g);
    g.log = (m) => {
        if (m.includes('シールドが 割れた')) sfx('break');
        else if (m.startsWith('⚡')) sfx('trigger');
        else if (m.startsWith('⚔')) sfx('chance');
        log0(m);
    };
    if (online) {
        link.onQuit = (m) => { g.forfeit(cpu(), m.why || '相手が やめた'); busy = false; render(); };
        link.onDesync = (why) => { trouble = `対戦の ようすが ずれたので おわります（${why}）`; render(); };
        online.net.onMessage = (m) => link.receive(m);
        online.net.onClose = (why) => { netNote = null; if (g.winner === null) { g.forfeit(cpu(), why); busy = false; render(); } };
        online.net.onStatus = (text) => { netNote = text; render(); };   // つなぎなおし中 (2026-11-03)
        online.net.flush?.();   // 画面が できる 前に とどいた ぶん
    }

    // ---------- 演出 (こうげきの 矢印・やられて 割れる) ----------
    const keyOf = (u) => `${u.owner === ME ? 'f' : 'e'}:${u.uid}`;
    const elOf = (u) => root.querySelector(`.zone [data-key="${keyOf(u)}"]`);
    async function fx(ev) {
        render();
        if (ev.type === 'attack') {
            const from = elOf(ev.unit);
            const to = ev.target === 'shield'
                ? root.querySelector(`.side.${ev.unit.owner === ME ? 'enemy' : 'mine'} .shields`)
                : elOf(ev.target);
            if (!from || !to) return;
            const a = from.getBoundingClientRect();
            const b = to.getBoundingClientRect();
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', `arrow ${ev.unit.owner === ME ? 'me' : 'cpu'}`);
            svg.innerHTML = `<defs><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z"/></marker></defs>
<line x1="${a.x + a.width / 2}" y1="${a.y + a.height / 2}" x2="${b.x + b.width / 2}" y2="${b.y + b.height / 2}" marker-end="url(#ah)"/>`;
            from.classList.add('attacking');
            document.body.append(svg);
            sfx('attack');
            await wait(650 * fxK);
            svg.remove();
            from.classList.remove('attacking');
        } else if (ev.type === 'use') {
            await reveal(ev);
        } else if (ev.type === 'destroy') {
            const el = elOf(ev.unit);
            if (!el) return;
            el.classList.add('crack');
            sfx('destroy');
            await wait(600 * fxK);
        }
    }


    // 使う カードを まんなかに 大きく 見せてから 使う (2026-11-03 ユーザー指定: どちらにも わかるように)
    //   レア度の 高い カード (VR・SR・HR・OR) は 専用の 演出。タップで とばせる
    const RARE_MS = { VR: 1500, SR: 1900, HR: 2400, OR: 3200 };
    // シークレットは さらに 長く・専用の 演出 (SR ブラック・HR プラチナ・OR 別絵柄)
    const SECRET_MS = { black: 2600, platinum: 3000, alt: 3800 };
    async function reveal({ card, player, how }) {
        const mine = player.id === ME;
        const verb = card.kind === 'monster' ? 'を 出した' : card.kind === 'item' ? 'を 付ける' : card.kind === 'field' ? 'の 場面を 出した' : 'を 使った';
        const head = how === 'trigger' ? '⚡ ドタバタトリガー！' : how === 'chance' ? '⚔ アタックチャンス！' : '';
        const rare = RARE_MS[card.rarity] ? card.rarity : '';
        const sec = card.secret && SECRET[card.rarity];
        // 火の粉・星・流れ星の つぶ (シークレットだけ)
        const bits = sec ? `<div class="bits">${Array.from({ length: 18 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${sec.id === 'platinum' ? `${(i * 53) % 100}%` : ''};animation-delay:${((i * 0.37) % 2).toFixed(2)}s"></i>`).join('')}</div>` : '';
        const el = document.createElement('div');
        el.className = `reveal ${mine ? 'mine' : 'opp'} ${rare ? `r-${rare}` : ''} ${sec ? `s-${sec.id}` : ''}`;
        el.innerHTML = `${rare ? '<div class="rays"></div><div class="ring"></div><div class="ring r2"></div><div class="flash"></div>' : ''}${sec?.id === 'black' ? '<div class="bolt"></div>' : ''}${bits}
<div class="rv-in">
    <p class="who">${esc(player.name)}${head ? `　${head}` : ''}</p>
    ${rare ? `<p class="rarelabel">${rare}</p>` : ''}
    ${sec ? `<p class="seclabel">★ シークレット・${esc(sec.name)} ★</p>` : ''}
    <div class="rv-card">${cardHTML(card)}</div>
    <p class="what">${esc(card.name)} ${verb}</p>
</div>`;
        document.body.append(el);
        sfx(sec ? 'secret' : rare === 'OR' || rare === 'HR' ? 'legend' : rare ? 'rare' : 'card');
        const ms = Math.max(400, ((sec && SECRET_MS[sec.id]) || RARE_MS[rare] || 1150) * fxK);
        await new Promise((r) => { const t = setTimeout(r, ms); el.onclick = () => { clearTimeout(t); r(); }; });
        el.classList.add('out');
        await wait(180);
        el.remove();
    }

    async function run(fn) {
        busy = true;
        detail = null;
        render();
        try { await fn(); } finally { busy = false; }
        await cpuLoop();
        render();
    }
    // 相手の ターン (CPU が 考える か、オンラインの 相手の 行動を 待つ)
    async function cpuLoop() {
        try {
            while (g.winner === null && g.active === OP && !trouble) {
                busy = true;
                render();
                if (online) await link.remoteTurn(g);
                else await cpuTurn(g, cpu());
            }
        } catch (e) { if (e.message !== 'desync') throw e; }
        busy = false;
    }

    // ---------- 描く ----------
    function mini(card, { unit = null, cls = '', key = '', tag = 'button' } = {}) {
        const pw = unit ? g.power(unit) : card.power;
        const diff = unit ? pw - card.power : 0;
        const ready = unit && unit.owner === ME && g.active === ME && g.canAttack(unit);
        const sec = card.secret && SECRET[card.rarity];
        return `<${tag} class="mini ${card.kind} ${cls} ${ready ? 'ready' : ''} ${unit?.tapped ? 'tapped' : ''}${sec ? ` sec s-${sec.id}` : ''}" data-key="${key}">
    <span class="pic">${pic(card)}</span>
    <span class="lv">${card.lv}</span>
    ${emblem(card, 'emb')}
    <span class="nm">${esc(card.name)}</span>
    ${card.kind === 'monster' ? `<span class="pw ${diff > 0 ? 'up' : diff < 0 ? 'down' : ''}">${pw}</span>` : `<span class="kd">${{ magic: '魔法', field: '場面', item: 'アイテム' }[card.kind]}</span>`}
    ${unit?.item ? `<span class="it">＋${esc(unit.item.name)}</span>` : ''}
    ${unit && unit.stopTurn > g.turn ? '<span class="st">止</span>' : ''}
    ${unit?.muscle ? `<span class="mu" title="筋肉">💪${unit.muscle}</span>` : ''}
    ${unit?.under?.length ? `<span class="ev" title="進化">進化</span>` : ''}
    ${g.isBlocker(card) ? `<span class="bk ${unit && !unit.tapped ? 'on' : ''}" title="ブロッカー">盾</span>` : ''}
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
        // 場面を 出していたら、その 景色が 自分の 場の 背景に なる (2026-11-03 ユーザー指定)
        const bg = p.scene ? artURL(p.scene.no) : null;
        return `<section class="side ${mine ? 'mine' : 'enemy'}${bg ? ' has-scene' : ''}"${bg ? ` style="--scene: url('${bg}')"` : ''}>${mine ? '' : info}<div class="zone">${field}</div>${mine ? info : ''}</section>`;
    }

    function render() {
        if (!g) return;
        const scroll = root.querySelector('.fulllog')?.scrollTop;
        const p = me();
        const status = g.winner !== null ? '' : g.active === ME ? (busy ? '…' : g.phase === 'main' ? 'あなたの ターン（メインフェイズ）' : 'あなたの ターン（アタックフェイズ：カードは 使えない）') : online ? '相手の ターン…' : 'CPU の ターン…';
        root.innerHTML = `
<div class="battle">
    ${side(cpu(), false)}
    <div class="center">
        <div class="turn">${g.turn} ターン目　<b>${status}</b>${netNote ? `<span class="netnote">${esc(netNote)}</span>` : ''}</div>
        <button class="log" data-log="1" title="ログを ぜんぶ 見る"><ol>${g.logs.slice(-4).map((l) => `<li>${esc(l)}</li>`).join('')}</ol><span class="more">ぜんぶ 見る ▸</span></button>
    </div>
    ${side(p, true)}
    <div class="hand">${p.hand.map((c) => mini(c, { key: `h:${c.uid}`, cls: g.active === ME && g.canPlay(p, c) ? 'can' : '' })).join('')}</div>
    <div class="bar">
        <button class="quit">${online && g.winner === null ? 'こうさん' : 'やめる'}</button>
        <button class="end" ${myTurn() ? '' : 'disabled'}>ターン終了</button>
    </div>
</div>
${graveOf !== null ? graveHTML() : ''}
${logOpen ? logHTML() : ''}
${detail ? detailHTML() : ''}
${asking ? askHTML() : ''}
${coachHTML()}
${g.winner !== null ? resultHTML() : ''}
${trouble && g.winner === null ? `<div class="sheet result"><div class="sheet-in"><h2>ごめんね</h2><p>${esc(trouble)}</p><div class="acts"><button class="act sub quit">もどる</button></div></div></div>` : ''}`;
        const full = root.querySelector('.fulllog');
        if (full) full.scrollTop = scroll ?? full.scrollHeight;   // 開いたときは いちばん 下 (さいしん)
    }

    // ----- チュートリアル -----
    const TIPS = [
        ['goal', () => true, 'このゲームの かちかた', '相手の シールド（5 枚）を ぜんぶ わって、シールドが 0 枚の 相手に こうげきが 通ったら かち！'],
        ['play', () => myTurn() && g.phase === 'main' && me().hand.some((c) => g.canPlay(me(), c)), 'カードを 出そう', '光っている 手札は 出せる カード。タップして「場に 出す」か、上へ ドラッグ。モンスターは 1 ターンに 1 体まで。'],
        ['lv', () => myTurn() && me().hand.some((c) => g.needLv(me(), c) > me().lv), 'Lv（左上の 丸い 数字）', 'いまの Lv より 大きい カードは まだ 出せない。自分の シールドが 2・4 枚 割れると Lv アップ。'],
        ['attack', () => myTurn() && me().field.some((u) => g.canAttack(u)), 'こうげき しよう', 'こうげき できる モンスターは 光る。タップして「こうげき」→ 相手の モンスターか シールドを えらぶ。出した ターンは ふつう こうげき できない。'],
        ['phase', () => myTurn() && g.phase === 'attack', 'アタックフェイズ', '1 回でも こうげきすると アタックフェイズ。その ターンは もう カードを 使えない。カードは こうげきの 前に！'],
        ['end', () => myTurn() && !me().hand.some((c) => g.canPlay(me(), c)) && !me().field.some((u) => g.canAttack(u)), 'ターン終了', 'やる ことが なくなったら 右下の「ターン終了」を おそう。'],
        ['shield', () => me().broken > 0, 'シールドが 割れた！', '割れた シールドは 手札に 入る。⚡ドタバタトリガーの カードなら その場で ただで 使える。'],
        ['block', () => asking && /ブロックする/.test(asking.req.title), 'ブロック', 'ブロッカー（盾の マーク）は、相手の こうげきを かわりに うけられる。パワーが 大きければ 返りうち！']
    ];
    function coachHTML() {
        if (!coach || g.winner !== null) return '';
        if (!coach.now) coach.now = TIPS.find(([id, cond]) => !coach.seen[id] && cond()) || null;
        if (!coach.now) return '';
        const [, , title, text] = coach.now;
        return `<div class="coach"><b>📘 ${esc(title)}</b><p>${esc(text)}</p><button class="act" data-coach="1">わかった</button></div>`;
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
        const now = unit ? `<p class="now">いまの パワー：<b>${g.power(unit)}</b>${unit.tapped ? '（タップ中）' : ''}</p>` : '';
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
        const won = g.winner === ME;
        if (resultNote === null) { resultNote = onResult?.(won) || ''; sfx(won ? 'win' : 'lose'); }
        return `<div class="sheet result"><div class="sheet-in">
    <h2>${won ? 'かち！' : 'まけ…'}</h2><p>${esc(g.reason)}</p>${resultNote ? `<p class="points">${esc(resultNote)}</p>` : ''}
    <div class="acts">${online ? '' : '<button class="act" data-again="1">もう いちど</button>'}<button class="act sub quit">もどる</button></div>
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
        const guard = o.field.filter((b) => g.canBlock(b));
        const title = `${u.name}（${ap}）で こうげき${guard.length ? `（ブロッカー：${guard.map((b) => b.name).join('・')}）` : ''}`;
        return new Promise((resolve) => { asking = { req: { title, options, cancel: 'やめる' }, resolve }; render(); });
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
        if (!cancel && overMine(e.clientX, e.clientY) && myTurn()) await run(() => A.play(me(), card, from));
    }
    root.onpointerup = (e) => endDrag(e, false);
    root.onpointercancel = (e) => endDrag(e, true);

    root.onclick = async (e) => {
        if (dragged) return;
        const b = e.target.closest('button, [data-close]');
        if (!b) return;
        if (b.dataset.coach) {
            coach.seen[coach.now[0]] = true;
            coach.now = null;
            if (!coach.done && TIPS.every(([id]) => coach.seen[id] || id === 'block' || id === 'shield')) { coach.done = true; opts.onTutorialDone?.(); }
            render();
            return;
        }
        if (asking) {
            if (b.dataset.opt === undefined) return;
            const i = +b.dataset.opt;
            const { req, resolve } = asking;
            asking = null;
            render();
            resolve(i < 0 ? null : req.options[i].value);
            return;
        }
        if (b.dataset.again) { startBattle(root, myDeck, opts); return; }
        if (b.classList.contains('quit')) {
            if (online) {
                if (g.winner === null && !trouble) {
                    if (!window.confirm('こうさん する？（まけに なります）')) return;
                    online.net.send({ t: 'quit', why: '相手が こうさんした' });
                    g.forfeit(me(), 'こうさん');
                    render();
                    return;
                }
                online.net.close();
            }
            onQuit();
            return;
        }
        if (b.dataset.close && e.target === b) {   // いちばん 上の 画面だけ とじる
            if (detail) detail = null;
            else if (graveOf !== null) graveOf = null;
            else logOpen = false;
            render();
            return;
        }
        if (b.dataset.grave !== undefined) { graveOf = +b.dataset.grave; render(); return; }
        if (b.dataset.log) { logOpen = true; render(); return; }
        if (b.classList.contains('end')) { if (myTurn()) await run(() => A.endTurn()); return; }
        if (b.dataset.act === 'play') {
            const { card, from } = detail;
            await run(() => A.play(me(), card, from));
            return;
        }
        if (b.dataset.act === 'attack') {
            const u = detail.unit;
            detail = null;
            const t = await pickTarget(u);
            if (t) await run(() => A.attack(u, t));
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
