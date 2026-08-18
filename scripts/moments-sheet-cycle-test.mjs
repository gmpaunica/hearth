import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const expoCli = join(process.cwd(), 'node_modules', 'expo', 'bin', 'cli');
const metro = spawn(process.execPath, [expoCli, 'start', '--web', '--port', '8081'], {
  env: { ...process.env, CI: '1' },
  stdio: 'ignore',
});
process.on('exit', () => { if (!metro.killed) metro.kill(); });
let metroReady = false;
for (let attempt = 0; attempt < 120; attempt += 1) {
  try {
    const response = await fetch('http://localhost:8081/');
    if (response.ok) { metroReady = true; break; }
  } catch {
    // Metro is still bundling.
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.equal(metroReady, true, 'Expo web must become reachable on port 8081');

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--disable-gpu', '--use-angle=swiftshader'],
});

const contextOptions = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true };
const first = await browser.newContext(contextOptions);
const second = await browser.newContext(contextOptions);
const A = await first.newPage();
const B = await second.newPage();
const cdp = await first.newCDPSession(A);
const errors = [];
for (const page of [A, B]) {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message.text().includes('play() request was interrupted by a call to pause()')
    ) errors.push(message.text());
  });
}

async function onboard(page, name) {
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.getByText('Begin', { exact: true }).click({ timeout: 60_000 });
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByText('Continue', { exact: true }).click();
  await page.getByText('Make a home together').waitFor({ timeout: 60_000 });
}

await onboard(A, 'Cycle A');
await onboard(B, 'Cycle B');
await A.getByText('Create a home', { exact: true }).click();
const code = (await A.locator('text=/^[A-Z0-9]{6}$/').textContent())?.trim();
assert.match(code ?? '', /^[A-Z0-9]{6}$/);
await B.getByText('I have a code', { exact: true }).click();
await B.getByPlaceholder('ABC123').fill(code);
await B.getByText('Join home', { exact: true }).click();
await A.getByLabel('Expand Moments').waitFor({ timeout: 60_000 });
await B.getByLabel('Expand Moments').waitFor({ timeout: 60_000 });

const open = async () => {
  await A.getByLabel('Expand Moments').click({ force: true });
  await A.getByLabel('Drag Moments down to collapse').waitFor({ timeout: 5_000 });
};
const waitClosed = async () => {
  try {
    await A.getByLabel('Expand Moments').waitFor({ timeout: 10_000 });
  } catch (error) {
    const sheet = A.locator('[aria-label*="Moments sheet."]').first();
    console.error('Sheet after release:', await sheet.getAttribute('aria-label'), await sheet.boundingBox());
    console.error('Browser errors:', errors);
    throw error;
  }
};
const dragHeader = async (deltaY, verifyTracking = false) => {
  const header = A.getByLabel('Drag Moments down to collapse').or(A.getByLabel('Expand Moments')).last();
  const headerBox = await header.boundingBox();
  assert.ok(headerBox, 'the continuously mounted sheet header must be measurable');
  const sheet = A.locator('[aria-label*="Moments sheet."]').first();
  const start = await sheet.boundingBox();
  assert.ok(start, 'the continuously mounted sheet must be measurable');
  const x = headerBox.x + headerBox.width / 2;
  const y = headerBox.y + Math.min(28, headerBox.height / 2);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  const samples = [];
  for (const fraction of Array.from({ length: 10 }, (_, index) => (index + 1) / 10)) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + deltaY * fraction }],
    });
    await A.waitForTimeout(verifyTracking ? 45 : 18);
    if (verifyTracking) samples.push((await sheet.boundingBox())?.y ?? start.y);
  }
  // CDP synthesizes moves in bursts and can report a stale/inverted terminal
  // velocity. Hold the final point so this real-touch cycle tests midpoint
  // settling; directional flick precedence is covered by the shared physics
  // contract used by the component.
  await A.waitForTimeout(verifyTracking ? 280 : 100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  if (verifyTracking) {
    console.log('Touch tracking:', { deltaY, startY: start.y, samples });
    if (deltaY > 0) assert.ok(samples[8] > samples[2] + 40, 'expanded sheet follows a downward finger');
    else assert.ok(samples[8] < samples[2] - 40, 'docked sheet follows an upward finger');
  }
};

// A short, slow partial drag returns to expanded. The intermediate transforms
// prove continuous tracking instead of an on-release-only snap.
await open();
await dragHeader(90, true);
await A.getByLabel('Drag Moments down to collapse').waitFor({ timeout: 5_000 });
await A.waitForTimeout(400);

for (let cycle = 0; cycle < 20; cycle += 1) {
  await dragHeader(600, cycle === 0);
  await waitClosed();
  await A.waitForTimeout(300);
  // The docked surface's whole visible header can be dragged back upward.
  const dockHeader = A.getByLabel('Expand Moments');
  const dockBox = await dockHeader.boundingBox();
  assert.ok(dockBox && dockBox.y < 844, 'the compact 48 pixel dock remains visible');
  await dragHeader(-600, cycle === 0);
  await A.getByLabel('Drag Moments down to collapse').waitFor({ timeout: 5_000 });
  await A.waitForTimeout(300);
}

await A.getByText('1 of 2', { exact: true }).waitFor();
const banners = A.getByRole('button').filter({ hasText: /Fireplace|Garden|Sofa|Table|Resting area|Bedroom/ });
assert.ok(await banners.count() >= 6);
for (const label of [
  'I want us to feel close again', 'I need some space', 'I need comfort or affection',
  'I need us to talk', 'I’m overwhelmed or worn out', 'I want gentle closeness',
]) {
  await A.getByText(label, { exact: true }).waitFor();
}
await A.getByText('I want us to feel close again', { exact: true }).click();
await A.getByText('2 of 2', { exact: true }).waitFor();
await A.getByText('I want us to feel close again', { exact: true }).click();
const send = A.getByText('Send moment', { exact: true });
assert.equal(await send.isEnabled(), true);
await send.click();
await A.getByLabel('Expand Moments').waitFor({ timeout: 60_000 });
await A.getByLabel('Expand Moments').click({ force: true });
const pinned = A.getByText('Next for you', { exact: true });
await pinned.waitFor();
await A.waitForTimeout(600);
const pinBox = await pinned.boundingBox();
assert.ok(
  pinBox && pinBox.y >= 0 && pinBox.y + pinBox.height <= 844,
  'the required action stays fully visible in the first viewport',
);
await A.getByText(/Waiting for Cycle B/).first().waitFor();

const relevantErrors = errors.filter((message) =>
  !message.includes('play() request was interrupted by a call to pause()') &&
  // Supabase may probe a protected resource while the paired test sessions
  // exchange auth state. It does not affect sheet responsiveness.
  !message.includes('Failed to load resource: the server responded with a status of 401')
);
assert.deepEqual(relevantErrors, []);
console.log('Moments sheet passed 20 dock/expand/collapse cycles plus its two-step and pinned-action checks at 390x844.');
await first.close();
await second.close();
await browser.close();
metro.kill();
