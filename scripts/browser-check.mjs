// Headless client-side check: loads pages in a CLEAN browser (no cache/SW) and
// reports console errors, failed requests, and whether the page hydrated.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:3000';
const EXE = process.env.CHROME || '/usr/bin/chromium';

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const log = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => log.push(`[PAGEERROR] ${e.message}`));
page.on('requestfailed', (r) => log.push(`[REQFAILED] ${r.url().replace(BASE, '')} :: ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) log.push(`[HTTP ${r.status()}] ${r.url().replace(BASE, '')}`); });

async function check(path, opts = {}) {
  log.length = 0;
  let nav = 'ok';
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 25000 });
  } catch (e) { nav = 'NAV-ERR: ' + e.message.split('\n')[0]; }
  await page.waitForTimeout(1500);
  const url = page.url().replace(BASE, '');
  const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140);
  const stuckLoading = /جارٍ تحميل|جاري التحميل|Loading/.test(body);
  console.log(`\n=== ${path}  (nav: ${nav}) ===`);
  console.log(`  final url: ${url}`);
  console.log(`  stuck-loading text present: ${stuckLoading}`);
  console.log(`  body[0..140]: ${body}`);
  if (log.length) { console.log('  client errors/failed:'); log.slice(0, 12).forEach((l) => console.log('   ' + l)); }
  else console.log('  client errors/failed: NONE');
  return { url, stuckLoading, errors: [...log] };
}

// 1) public homepage
await check('/');
// 2) login page
await check('/login');
// 3) log in as admin via the form, then land + check /admin
try {
  await page.fill('#email', 'admin@sainaiinstitute.com');
  await page.fill('#password', 'admin123');
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2000);
  console.log(`\n=== after admin login -> landed on: ${page.url().replace(BASE, '')} ===`);
} catch (e) { console.log('login flow error: ' + e.message.split('\n')[0]); }
// 4) admin universities page (the one that "loaded forever")
await check('/admin/universities');

await browser.close();
