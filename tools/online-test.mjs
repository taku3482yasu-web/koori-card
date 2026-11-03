// =====================================================================
// オンライン対戦の 自動テスト (本物の PeerJS で 2 つの ページを つなぎ、決着まで 遊ぶ)
// ---------------------------------------------------------------------
// npm run build のあとに node tools/online-test.mjs [--shots <フォルダ>]
//   ページ A が 部屋を 作り、ページ B が 番号を 入れて 入る。2 つとも 出せる カード → こうげき → ターン終了 を くりかえす。
//   インターネット (PeerJS の 無料サーバー) が いるので、コミット前の テストには 入れない
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
const CHROME = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) { console.log('オンラインテスト: Chrome が ない'); process.exit(0); }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer((req, res) => {
    const path = join(DIST, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!path.startsWith(DIST) || !existsSync(path)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream' });
    res.end(readFileSync(path));
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'koori-card-online-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const errors = [];

// ページ 1 つぶんの あやつり口
async function page(name, wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((r) => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (e) => {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
        if (m.method === 'Runtime.exceptionThrown') errors.push(`${name}: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
        if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
    });
    const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
    const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value;
    const click = (sel) => js(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return false; b.click(); return true; })()`);
    let shot = 0;
    const snap = async (label) => { if (!SHOTS) return; await send('Page.bringToFront'); const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(SHOTS, `${name}_${String(++shot).padStart(2, '0')}_${label}.png`), Buffer.from(r.data, 'base64')); };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url });
    await sleep(800);
    // 演出を はやく して テストを みじかく
    await js(`localStorage.setItem('koori-card-settings', JSON.stringify({ name: '${name}', fxSpeed: 'fast', cpuSpeed: 'fast' })); location.reload(); true`);
    await sleep(800);
    return { js, click, snap, close: () => ws.close() };
}

// 1 手 すすめる (自分の ばんなら 出す → こうげき → 終了。聞かれたら 1 番目)
async function step(p) {
    if (await p.js('!!document.querySelector(".result")')) return 'done';
    if (await p.js('!!document.querySelector(".ask")')) { await p.click('.ask [data-opt="0"]'); return 'ask'; }
    if (!(await p.js('!document.querySelector(".bar .end")?.disabled'))) return 'wait';
    if (await p.click('.hand .mini.can')) { await sleep(40); if (!(await p.click('[data-act="play"]'))) await p.click('.sheet [data-close="1"].act'); return 'play'; }
    if (await p.click('.side.mine .mini.ready')) {
        await sleep(40);
        await p.click('[data-act="attack"]');
        await sleep(40);
        await p.js('(() => { const o = [...document.querySelectorAll(".ask .opt")]; o[o.length - 1]?.click(); })()');
        return 'attack';
    }
    await p.click('.bar .end');
    return 'end';
}

async function main() {
    let targets = [];
    for (let i = 0; i < 50 && !targets.length; i++) {
        await sleep(200);
        try { targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === 'page'); } catch { /* 起動中 */ }
    }
    const second = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const A = await page('A', targets[0].webSocketDebuggerUrl);
    const B = await page('B', second.webSocketDebuggerUrl);
    const enter = async (p, deck) => {
        await p.click('[data-screen="versus"]'); await sleep(80);
        await p.click('[data-mode="online"]'); await sleep(80);
        await p.click(`[data-battle="${deck}"]`); await sleep(120);
        await p.click('[data-buddy]'); await sleep(120);
    };
    await enter(A, 'koori');
    await enter(B, 'oni');
    await A.click('[data-host="1"]');
    let code = null;
    for (let i = 0; i < 100 && !code; i++) { await sleep(200); code = await A.js('document.querySelector(".room .code")?.textContent'); }
    if (!code) { errors.push(`部屋の 番号が 出ない: ${await A.js('document.querySelector(".room")?.textContent')}`); return; }
    console.log(`オンラインテスト: 部屋 ${code}`);
    await A.snap('room');
    await B.js(`(() => { document.querySelector('#code').value = '${code}'; return true; })()`);
    await B.click('[data-join="1"]');
    for (let i = 0; i < 100; i++) { await sleep(200); if (await A.js('!!document.querySelector(".battle")') && await B.js('!!document.querySelector(".battle")')) break; }
    if (!(await A.js('!!document.querySelector(".battle")'))) { errors.push(`つながらない: ${await B.js('document.querySelector(".room")?.textContent')}`); return; }
    console.log('オンラインテスト: つながった');
    await A.snap('battle');
    await B.snap('battle');
    let steps = 0;
    for (; steps < 3000; steps++) {
        const [a, b] = [await step(A), await step(B)];
        if (a === 'done' && b === 'done') break;
        if (steps === 30) { await A.snap('mid'); await B.snap('mid'); }
        await sleep(a === 'wait' && b === 'wait' ? 150 : 60);
    }
    await A.snap('result');
    await B.snap('result');
    const ra = await A.js('document.querySelector(".result h2")?.textContent');
    const rb = await B.js('document.querySelector(".result h2")?.textContent');
    const la = await A.js('document.querySelector(".fulllog") ? null : document.querySelector(".turn")?.textContent');
    console.log(`オンラインテスト: A ${ra}・B ${rb}（${la?.trim()}）`);
    if (!ra || !rb) errors.push('決着しなかった');
    else if (ra === rb) errors.push('両方 同じ 結果に なった (ずれ)');
    if (await A.js('document.body.textContent.includes("ずれた")') || await B.js('document.body.textContent.includes("ずれた")')) errors.push('ずれが 起きた');
    A.close();
    B.close();
}

try { await main(); } catch (e) { errors.push(String(e.stack || e)); } finally {
    chrome.kill();
    server.close();
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* */ }
}
if (errors.length) { for (const e of errors) console.log(`✘ ${e}`); process.exit(1); }
console.log('✔ オンラインテスト: エラーなし');
