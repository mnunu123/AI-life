// 빠른 확인용: 지정 시각의 화면을 PNG로 저장
import { chromium } from "playwright";
const url = process.argv[2] ?? "http://localhost:3123/";
const times = (process.argv[3] ?? "0,6000,21000").split(",").map(Number);
const out = process.argv[4] ?? "/tmp/claude-0/-home-claude/e5e26804-8510-558c-ac33-4954e1cf8c41/scratchpad";
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.log("console.error:", m.text()); });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__demo?.ready(), null, { timeout: 30000 });
for (const t of times) {
  await page.evaluate((ms) => window.__demo.setTime(ms), t);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/shot-${t}.png` });
  console.log("saved", t);
}
await browser.close();
