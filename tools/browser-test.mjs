// =====================================================================
// 本物の ブラウザでの 自動テスト (dist を Chrome で 開いて CPU と 1 回 たいせんする)
// ---------------------------------------------------------------------
// npm run build のあとに node tools/browser-test.mjs [--shots <フォルダ>]
//   タイトル → 氷隊デッキ → 手札を 出す・こうげき・ターン終了 を くりかえし、決着まで。
//   スマホの 大きさ (390×844) で 遊ぶ。エラーが 出たら 失敗 (終了コード 1)
// Chrome が 見つからないときは 飛ばす (終了コード 0)
// =====================================================================
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const shotsArg = process.argv.indexOf('--shots');
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const CHROMES = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const CHROME = CHROMES.find((p) => existsSync(p));
if (!CHROME) {
    console.log('ブラウザのテスト: Chrome が 見つからないので 飛ばしました');
    process.exit(0);
}
if (!existsSync(join(DIST, 'index.html'))) {
    console.log('ブラウザのテスト: 先に npm run build してください');
    process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer((req, res) => {
    const path = join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!path.startsWith(DIST) || !existsSync(path)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(readFileSync(path));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'koori-card-test-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });

let ws;
let id = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve) => {
    const n = ++id;
    pending.set(n, resolve);
    ws.send(JSON.stringify({ id: n, method, params }));
});
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
let shot = 0;
async function snap(name) {
    if (!SHOTS) return;
    const r = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SHOTS, `${String(++shot).padStart(2, '0')}_${name}.png`), Buffer.from(r.data, 'base64'));
}
// マウスで おしたまま 動かして はなす (手札を 場へ ドラッグ)
async function dragTo(from, to) {
    const pos = (sel) => js(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    const a = await pos(from);
    const b = await pos(to);
    if (!a || !b) return false;
    const mouse = (type, p) => send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
    await mouse('mousePressed', a);
    for (let i = 1; i <= 6; i++) await mouse('mouseMoved', { x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 });
    await mouse('mouseReleased', b);
    return true;
}
const click = (sel) => js(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);

async function main() {
    let target;
    for (let i = 0; i < 50 && !target; i++) {
        await sleep(200);
        try {
            const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
            target = list.find((t) => t.type === 'page');
        } catch { /* まだ 起動中 */ }
    }
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
        if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
        if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send('Page.navigate', { url });
    await sleep(800);
    await snap('title');

    if (!(await click('[data-battle="koori"]'))) throw new Error('デッキを えらぶ ボタンが ない');
    await sleep(600);
    await snap('battle-start');

    let steps = 0;
    let shotDetail = false;
    let shotAsk = false;
    let dragged = false;
    while (steps++ < 600) {
        if (await js('!!document.querySelector(".result")')) break;
        if (await js('!!document.querySelector(".ask")')) {
            if (!shotAsk) { await snap('ask'); shotAsk = true; }
            await click('.ask [data-opt="0"]');
            await sleep(80);
            continue;
        }
        const mine = await js('!document.querySelector(".bar .end").disabled');
        if (!mine) { await sleep(200); continue; }
        // さいしょの 1 枚は ドラッグで 出す (大きな 画面は 出ずに 手札が へる か 選ぶ 画面が 出る)
        if (!dragged && await js('!!document.querySelector(".hand .mini.can")')) {
            const before = await js('document.querySelectorAll(".hand .mini").length');
            await dragTo('.hand .mini.can', '.side.mine .zone');
            await sleep(200);
            const after = await js('document.querySelectorAll(".hand .mini").length');
            if (await js('!!document.querySelector(".sheet:not(.ask)")')) errors.push('ドラッグしたのに 大きな 画面が 出た');
            else if (after >= before && !(await js('!!document.querySelector(".ask")'))) errors.push('ドラッグで 手札が 出なかった');
            else console.log('ブラウザのテスト: ドラッグで 手札を 場に 出せた');
            dragged = true;
            continue;
        }
        // 出せる 手札 → こうげき できる モンスター → ターン終了
        if (await click('.hand .mini.can')) {
            await sleep(60);
            if (!shotDetail) { await snap('detail'); shotDetail = true; }
            if (!(await click('[data-act="play"]'))) await click('.sheet [data-close="1"].act');
            await sleep(120);
            continue;
        }
        if (await click('.side.mine .mini.ready')) {
            await sleep(60);
            await click('[data-act="attack"]');
            await sleep(60);
            // こうげき先: いちばん下 (シールド) を えらぶ
            await js('(() => { const o = [...document.querySelectorAll(".ask .opt")]; o[o.length - 1].click(); })()');
            await sleep(150);
            continue;
        }
        await click('.bar .end');
        await sleep(300);
    }
    await snap('result');
    const result = await js('document.querySelector(".result h2")?.textContent');
    const turn = await js('document.querySelector(".turn")?.textContent');
    if (!result) errors.push(`決着しなかった (${turn})`);
    else console.log(`ブラウザのテスト: ${result}（${turn?.trim()}）`);
}

try {
    await main();
} catch (e) {
    errors.push(String(e.stack || e));
} finally {
    ws?.close();
    chrome.kill();
    server.close();
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome が つかんでいる */ }
}
if (errors.length) {
    for (const e of errors) console.log(`✘ ${e}`);
    process.exit(1);
}
console.log('✔ ブラウザのテスト: エラーなし');
