import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, clamp01, ease, easeInOut } from "../theme";

/** 컷 2: 아이소메트릭 3층 건물. 빨간 점이 층을 옮겨 다니고, 사람들은 제각각 흩어진다. 방송은 전층 똑같다. */

const S = 5.0;
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);
const CX = 960, CY = 530;
const W = 100, D = 50, FH = 48, TH = 5;

const iso = (x: number, y: number, z: number) => ({ X: CX + (x - y) * COS * S, Y: CY + (x + y) * SIN * S - z * S });
const pts = (arr: { X: number; Y: number }[]) => arr.map((p) => `${p.X},${p.Y}`).join(" ");

function rand(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface Person { floor: number; x: number; y: number; ang: number; dist: number; delay: number }
const PEOPLE: Person[] = (() => {
  const out: Person[] = [];
  const r = rand(7);
  const counts = [10, 14, 10];
  counts.forEach((n, floor) => {
    for (let i = 0; i < n; i++) {
      out.push({ floor, x: 8 + r() * 84, y: 6 + r() * 40, ang: r() * Math.PI * 2, dist: 10 + r() * 16, delay: r() * 30 });
    }
  });
  return out;
})();

// 위험 점 경로 (frame → floor, x, y, 보임)
function threatAt(f: number): { floor: number; x: number; y: number; z: number; a: number } {
  const seg = (f0: number, f1: number, a: [number, number], b: [number, number]) => {
    const p = easeInOut(clamp01((f - f0) / (f1 - f0)));
    return { x: a[0] + (b[0] - a[0]) * p, y: a[1] + (b[1] - a[1]) * p };
  };
  if (f < 70) return { floor: 0, x: 50, y: 55, z: 0, a: 0 };
  if (f < 120) return { floor: 0, ...seg(70, 120, [50, 55], [6, 50]), z: 0, a: clamp01((f - 70) / 10) };
  if (f < 135) return { floor: 0, x: 6, y: 50, z: 0, a: 1 - clamp01((f - 120) / 12) };
  if (f < 230) return { floor: 1, ...seg(135, 230, [6, 50], [80, 15]), z: FH, a: clamp01((f - 135) / 10) };
  if (f < 330) return { floor: 1, ...seg(230, 330, [80, 15], [52, 28]), z: FH, a: 1 };
  if (f < 420) { const p = easeInOut(clamp01((f - 330) / 90)); return { floor: p > 0.5 ? 2 : 1, x: 52, y: 28, z: FH + FH * p, a: 1 }; }
  return { floor: 2, ...seg(420, 570, [52, 28], [72, 18]), z: FH * 2, a: 1 };
}

export const Iso: React.FC = () => {
  const f = useCurrentFrame();
  const appear = ease(clamp01(f / 40));
  const th = threatAt(f);
  const broadcast = f >= 300;
  const bAlpha = ease(clamp01((f - 300) / 14));

  const personPos = (p: Person) => {
    // 2층 사람은 위험이 가까워지면(160~), 다른 층은 방송 뒤(320~) 제각각 흩어진다
    const panicStart = p.floor === 1 ? 160 + p.delay : 320 + p.delay;
    const q = ease(clamp01((f - panicStart) / 80));
    const jitter = Math.sin(f / 9 + p.ang * 10) * 0.6;
    let x = p.x + Math.cos(p.ang) * p.dist * q;
    let y = p.y + Math.sin(p.ang) * p.dist * q + jitter;
    x = Math.max(4, Math.min(W - 4, x));
    y = Math.max(4, Math.min(D - 4, y));
    return { x, y };
  };

  const floorSlab = (k: number) => {
    const z = k * FH;
    const top = [iso(0, 0, z), iso(W, 0, z), iso(W, D, z), iso(0, D, z)];
    const left = [iso(0, D, z), iso(W, D, z), iso(W, D, z - TH), iso(0, D, z - TH)];
    const right = [iso(W, 0, z), iso(W, D, z), iso(W, D, z - TH), iso(W, 0, z - TH)];
    const hot = th.floor === k && th.a > 0.5;
    return (
      <g key={k} opacity={appear}>
        <polygon points={pts(left)} fill="#0F141D" stroke={C.line} strokeWidth="1" />
        <polygon points={pts(right)} fill="#131A26" stroke={C.line} strokeWidth="1" />
        <polygon points={pts(top)} fill={C.panel} stroke={hot ? C.red : C.line} strokeWidth={hot ? 2 : 1.2} />
        {/* 2층 식당가 표시 */}
        {k === 1 && <polygon points={pts([iso(60, 0, z), iso(W, 0, z), iso(W, 30, z), iso(60, 30, z)])} fill="none" stroke={C.line} strokeDasharray="4 4" />}
        {/* 에스컬레이터 */}
        {k < 2 && <line x1={iso(52, 28, z).X} y1={iso(52, 28, z).Y} x2={iso(52, 28, z + FH).X} y2={iso(52, 28, z + FH).Y} stroke={C.line} strokeWidth="6" strokeLinecap="round" opacity="0.8" />}
        <text x={iso(-2, D + 2, z).X - 70} y={iso(-2, D + 2, z).Y + 8} fontFamily={FONT} fontSize="30" fontWeight="800" fill={hot ? C.red : C.muted}>{k + 1}F</text>
      </g>
    );
  };

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <svg width="1920" height="1080" viewBox="0 0 1920 1080">
        {[0, 1, 2].map((k) => (
          <g key={k}>
            {floorSlab(k)}
            {/* 사람 */}
            {PEOPLE.filter((p) => p.floor === k).map((p, i) => {
              const { x, y } = personPos(p);
              const q = iso(x, y, k * FH);
              return <g key={i} opacity={appear}><circle cx={q.X} cy={q.Y - 11} r="6.5" fill={C.ink} /><rect x={q.X - 6} y={q.Y - 4} width="12" height="17" rx="4" fill={C.ink} /></g>;
            })}
            {/* 위험 점 (해당 층에 있을 때 그 층 위에 그린다) */}
            {th.floor === k && th.a > 0 && (() => {
              const q = iso(th.x, th.y, th.z);
              const pulse = (f % 40) / 40;
              return (
                <g opacity={th.a}>
                  <circle cx={q.X} cy={q.Y} r={10 + 26 * pulse} fill="none" stroke={C.red} strokeWidth="2" opacity={1 - pulse} />
                  <circle cx={q.X} cy={q.Y} r="9" fill={C.red} />
                </g>
              );
            })()}
            {/* 전층 동일 방송 말풍선 */}
            {broadcast && (() => {
              const q = iso(0, D, k * FH + 6);
              return (
                <g opacity={bAlpha} transform={`translate(${q.X - 330} ${q.Y - 40})`}>
                  <rect x="0" y="-26" width="300" height="52" rx="10" fill="#1F2736" stroke={C.line} />
                  <text x="20" y="8" fontFamily={FONT} fontSize="22" fontWeight="600" fill={C.ink}>🔈 침착하게 대피하세요</text>
                </g>
              );
            })()}
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
