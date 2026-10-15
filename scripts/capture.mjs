// 결정적 프레임 캡처: 시계를 프레임 단위로 옮기며 스크린샷 → ffmpeg로 mp4
// 사용: node scripts/capture.mjs <url> [fps=30] [fromMs=0] [toMs=duration] [outdir]
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const [, , urlArg, fpsArg, fromArg, toArg, outArg] = process.argv;
const url = urlArg ?? "http://localhost:3123/";
const fps = Number(fpsArg ?? 30);
const outdir = outArg ?? path.resolve("capture");
const frames = path.join(outdir, "frames");
mkdirSync(frames, { recursive: true });

const exe = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => existsSync(p));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__demo?.ready(), null, { timeout: 60000 });
// 폰트·영상 로드 여유
await page.waitForTimeout(800);

const duration = await page.evaluate(() => window.__demo.duration);
const fromMs = Number(fromArg ?? 0);
const toMs = Number(toArg ?? duration);
const total = Math.floor(((toMs - fromMs) / 1000) * fps);
console.log(`capturing ${total} frames @${fps}fps, ${fromMs}→${toMs}ms`);

const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const ms = fromMs + (i * 1000) / fps;
  await page.evaluate(async (m) => {
    window.__demo.setTime(m);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const v = document.querySelector("video");
    if (v && v.readyState >= 1) {
      // seek가 걸려 있으면 끝날 때까지
      for (let k = 0; k < 40 && v.seeking; k++) await new Promise((r) => setTimeout(r, 10));
    }
  }, ms);
  await page.screenshot({ path: path.join(frames, `f${String(i).padStart(5, "0")}.png`), type: "png" });
  if (i % 100 === 0) console.log(`  ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();

const out = path.join(outdir, `dashboard_${fromMs}-${toMs}_${fps}fps.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(frames, "f%05d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
console.log("wrote", out);
