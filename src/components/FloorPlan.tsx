"use client";
import { NODES, CAMERAS, nodeById, center, FLOOR_W, FLOOR_H } from "@/lib/building";
import type { Decision, ZoneDecision, Action } from "@/lib/engine";

export const ACTION_STYLE: Record<Action, { fill: string; stroke: string; label: string }> = {
  HIDE: { fill: "#FF4D4F", stroke: "#FF4D4F", label: "위험 · 숨기" },
  LOCKDOWN: { fill: "#F5B942", stroke: "#F5B942", label: "봉쇄" },
  EVACUATE: { fill: "#3DD68C", stroke: "#3DD68C", label: "대피" },
  INVACUATE: { fill: "#5BA8FF", stroke: "#5BA8FF", label: "실내 대기" },
};

const INK = "#E8ECF2";
const MUTED = "#8E98AA";
const LINE = "#2E3747";
const PANEL = "#151B27";

const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

interface Props {
  floor: 1 | 2 | 3;
  decision: Decision | null;
  /** 현재 이벤트가 시작된 뒤 지난 시간(ms). 애니메이션 진행도에 쓴다 */
  sinceEventMs: number;
  activeCamera?: string;
  reducedMotion?: boolean;
}

export function FloorPlan({ floor, decision, sinceEventMs, activeCamera, reducedMotion }: Props) {
  const nodes = NODES.filter((n) => n.floor === floor);
  const zones = new Map<string, ZoneDecision>();
  if (decision) for (const z of decision.zones) if (z.floor === floor) zones.set(z.node, z);
  const threat = decision ? nodeById.get(decision.threat)! : null;
  const threatHere = threat?.floor === floor;
  const appear = ease(clamp01(sinceEventMs / 450));
  const routeProg = ease(clamp01((sinceEventMs - 300) / 1200));
  const pulse = reducedMotion ? 0.5 : (sinceEventMs % 1600) / 1600;

  return (
    <svg
      viewBox={`-12 -16 ${FLOOR_W + 84} ${FLOOR_H + 36}`}
      className="w-full h-auto block"
      role="img"
      aria-label={`${floor}층 평면도`}
    >
      <defs>
        <marker id={`arrow-${floor}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#3DD68C" />
        </marker>
        <pattern id={`hatch-${floor}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={LINE} strokeWidth="2" />
        </pattern>
      </defs>

      {/* 바닥판 */}
      <rect x="0" y="0" width={FLOOR_W} height={FLOOR_H} rx="6" fill={PANEL} stroke={LINE} strokeWidth="1.5" />

      {/* 구역 */}
      {nodes
        .filter((n) => n.type === "zone")
        .map((n) => {
          const z = zones.get(n.id);
          const st = z ? ACTION_STYLE[z.action] : null;
          const { cx, cy } = center(n);
          const alpha = st ? (z!.action === "HIDE" ? 0.32 : z!.action === "LOCKDOWN" ? 0.24 : 0.14) * appear : 0;
          return (
            <g key={n.id}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="4" fill={st ? st.fill : "none"} fillOpacity={alpha} stroke={st ? st.stroke : LINE} strokeOpacity={st ? 0.55 + 0.45 * appear : 1} strokeWidth={z?.action === "HIDE" ? 2.5 : 1.25} />
              <text x={n.x + 10} y={n.y + 20} fontSize="13" fontWeight="600" fill={INK}>{n.name}</text>
              {st && (
                <text x={n.x + 10} y={n.y + n.h - 10} fontSize="11.5" fontWeight="600" fill={st.stroke} fillOpacity={appear}>
                  {st.label}
                  {z!.action === "EVACUATE" && z!.direction ? ` → ${z!.direction}` : ""}
                </text>
              )}
              {/* 대피 방향 화살표(비상등) */}
              {z?.action === "EVACUATE" && z.route && z.route.length > 1 && (() => {
                const next = nodeById.get(z.route[1])!;
                const b = center(next);
                const dx = b.cx - cx, dy = b.cy - cy;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;
                const L = 34 * routeProg;
                return (
                  <line x1={cx - ux * 6} y1={cy - uy * 6} x2={cx + ux * L} y2={cy + uy * L} stroke="#3DD68C" strokeWidth="3" strokeLinecap="round" markerEnd={routeProg > 0.6 ? `url(#arrow-${floor})` : undefined} opacity={0.95} />
                );
              })()}
            </g>
          );
        })}

      {/* 전체 대피 경로(옅게) — 같은 층 안의 구간만 */}
      {decision && [...zones.values()].filter((z) => z.action === "EVACUATE" && z.route).map((z) => {
        const pts = z.route!
          .map((id) => nodeById.get(id)!)
          .filter((n) => n.floor === floor)
          .map((n) => center(n));
        if (pts.length < 2) return null;
        const d = pts.map((p, i) => `${i ? "L" : "M"}${p.cx} ${p.cy}`).join(" ");
        const total = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.cx - pts[i].cx, p.cy - pts[i].cy), 0);
        return <path key={`r-${z.node}`} d={d} fill="none" stroke="#3DD68C" strokeWidth="1.5" strokeOpacity="0.35" strokeDasharray={`${total}`} strokeDashoffset={`${total * (1 - routeProg)}`} />;
      })}

      {/* 코어: 계단·에스컬레이터·엘리베이터 */}
      {nodes.filter((n) => n.type !== "zone" && n.type !== "exit").map((n) => {
        const blocked = decision?.dangerSet.includes(n.id) || n.type === "elevator";
        const { cx, cy } = center(n);
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="4" fill={n.type === "elevator" || blocked ? `url(#hatch-${floor})` : "#1C2434"} stroke={blocked ? "#FF4D4F" : LINE} strokeOpacity={blocked ? 0.8 : 1} strokeWidth="1.25" />
            <text x={cx} y={cy + 4} fontSize="11.5" fontWeight="600" textAnchor="middle" fill={blocked ? "#FF8A8C" : MUTED}>
              {n.type === "elevator" ? "엘리베이터" : n.type === "escalator" ? "에스컬레이터" : n.name}
            </text>
            {blocked && decision && (
              <text x={cx} y={cy + 20} fontSize="10.5" textAnchor="middle" fill="#FF8A8C">사용 금지</text>
            )}
          </g>
        );
      })}

      {/* 출구 — 라벨은 바닥판 바깥에 */}
      {nodes.filter((n) => n.type === "exit").map((n) => {
        const { cx, cy } = center(n);
        const vertical = n.w < n.h;
        const short = n.name.replace(/\(E\d\)/, "").trim();
        const code = n.name.match(/E\d/)?.[0] ?? "";
        const label = `${code} ${short}`;
        let x = cx, y = n.y + n.h + 13, anchor: "start" | "middle" | "end" = "middle";
        if (vertical) { x = n.x > FLOOR_W / 2 ? FLOOR_W + 6 : -6; y = cy + 4; anchor = n.x > FLOOR_W / 2 ? "start" : "end"; }
        else if (n.y < 10) y = -5;
        return (
          <g key={n.id}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="3" fill="#3DD68C" fillOpacity="0.9" />
            <text x={x} y={y} fontSize="11" fontWeight="600" textAnchor={anchor} fill="#3DD68C">{label}</text>
          </g>
        );
      })}

      {/* 카메라 */}
      {CAMERAS.filter((c) => nodeById.get(c.node)!.floor === floor).map((c) => {
        const n = nodeById.get(c.node)!;
        const x = n.x + n.w - 14, y = n.y + 8;
        const active = c.id === activeCamera;
        return (
          <g key={c.id} transform={`translate(${x} ${y})`}>
            <rect x="-9" y="-3" width="12" height="8" rx="1.5" fill={active ? "#FF4D4F" : MUTED} />
            <path d="M3 -1 L8 -4 L8 6 L3 3 Z" fill={active ? "#FF4D4F" : MUTED} />
            {active && <circle cx="-14" cy="1" r={3 + 2 * Math.sin(pulse * Math.PI * 2)} fill="#FF4D4F" opacity={0.9} />}
          </g>
        );
      })}

      {/* 위험 지점 펄스 */}
      {threatHere && threat && (() => {
        const { cx, cy } = center(threat);
        const r = 18 + 26 * pulse;
        return (
          <g>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FF4D4F" strokeWidth="2" opacity={(1 - pulse) * 0.9 * appear} />
            <circle cx={cx} cy={cy} r="7" fill="#FF4D4F" opacity={appear} />
          </g>
        );
      })()}

      {/* 층 라벨 */}
      <text x={FLOOR_W - 10} y={FLOOR_H - 10} fontSize="22" fontWeight="800" textAnchor="end" fill={threatHere ? "#FF4D4F" : MUTED} opacity="0.9">{floor}F</text>
    </svg>
  );
}
