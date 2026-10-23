/**
 * 실험 1(처리 속도) 재현용. 24개 구역을 하나씩 위험 위치로 놓고 판단 + 템플릿 안내문을 200회씩 돌린다.
 *   npx rolldown scripts/bench-engine.ts --format esm --file /tmp/bench.mjs && node /tmp/bench.mjs
 * 성과보고서 숫자: 3번 실행(14,400회) 평균 0.43ms, 95% 0.68ms 이하, 최대 3.2ms (Node.js 22, 2코어 서버).
 */
import { decide } from "../src/lib/engine";
import { templateAnnouncements } from "../src/lib/announce";
import { NODES } from "../src/lib/building";

const zones = NODES.filter((n) => n.type === "zone").map((n) => n.id);
const REPS = 200;
for (let w = 0; w < 5; w++) for (const id of zones) templateAnnouncements(decide(id)); // 워밍업

const dec: number[] = [];
const all: number[] = [];
for (let r = 0; r < REPS; r++) {
  for (const id of zones) {
    const t0 = performance.now();
    const d = decide(id);
    const t1 = performance.now();
    templateAnnouncements(d);
    const t2 = performance.now();
    dec.push(t1 - t0);
    all.push(t2 - t0);
  }
}
const stat = (a: number[]) => {
  const b = [...a].sort((x, y) => x - y);
  const mean = a.reduce((p, c) => p + c, 0) / a.length;
  const q = (p: number) => +b[Math.floor(b.length * p)].toFixed(3);
  return { n: a.length, mean: +mean.toFixed(3), median: q(0.5), p95: q(0.95), p99: q(0.99), max: +b[b.length - 1].toFixed(3) };
};
console.log(JSON.stringify({ zones: zones.length, reps: REPS, node: process.version, decide: stat(dec), decideAndText: stat(all) }, null, 1));
