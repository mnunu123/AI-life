import React from "react";
import { AbsoluteFill } from "remotion";
import { useSceneFrame } from "../frame";
import { C, FONT, clamp01, ease } from "../theme";
import { FadeUp } from "../ui";

/**
 * 컷 9: 실험 A 결과. 두 집단을 나란히 — 왼쪽 방송만, 오른쪽 층별 안내.
 * 집단마다 n명 아이콘(10열), 위험 층을 지나는 길을 고른 사람은 빨강.
 * 숫자가 null이면 '?'로 그린다(실험 전 가안).
 */
export interface ResultsProps {
  broadcastRisky: number | null;
  guidedRisky: number | null;
  /** 집단 크기 */
  n?: number;
  /** 오른쪽 위 조건 표기 */
  note?: string;
}

const COLS = 10;
const IW = 50, IH = 70, GAP = 9; // 아이콘 크기·간격

const Person: React.FC<{ state: "risky" | "safe" | "unknown"; delay: number }> = ({ state, delay }) => {
  const f = useSceneFrame();
  const p = ease(clamp01((f - delay) / 8));
  const color = state === "risky" ? C.red : state === "safe" ? C.green : C.line;
  return (
    <svg width={IW} height={IH} viewBox="0 0 84 120" style={{ opacity: 0.12 + 0.88 * p, transform: `translateY(${(1 - p) * 8}px)` }}>
      <circle cx="42" cy="26" r="18" fill={color} />
      <rect x="18" y="50" width="48" height="62" rx="16" fill={color} />
      {state === "unknown" && <text x="42" y="92" textAnchor="middle" fontFamily={FONT} fontSize="40" fontWeight="800" fill={C.bg}>?</text>}
    </svg>
  );
};

const Group: React.FC<{ title: string; quote: string; risky: number | null; n: number; left: number; start: number; accent: string }> = ({ title, quote, risky, n, left, start, accent }) => {
  const f = useSceneFrame();
  const rows = Math.ceil(n / COLS);
  const w = COLS * IW + (COLS - 1) * GAP;
  const countAt = start + n * 2 + 6;
  const cp = ease(clamp01((f - countAt) / 12));
  return (
    <div style={{ position: "absolute", left, top: 250, width: w, fontFamily: FONT }}>
      <FadeUp start={start - 14} style={{ textAlign: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: C.ink }}>{title}</div>
        <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{quote}</div>
      </FadeUp>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${IW}px)`, gap: GAP, marginTop: 28, height: rows * IH + (rows - 1) * GAP }}>
        {Array.from({ length: n }).map((_, i) => {
          const state = risky === null ? "unknown" : i < risky ? "risky" : "safe";
          return <Person key={i} state={state} delay={start + i * 2} />;
        })}
      </div>
      <div style={{ marginTop: 26, textAlign: "center", opacity: cp, transform: `translateY(${(1 - cp) * 12}px)` }}>
        <div style={{ fontSize: 26, color: C.muted }}>2층을 지나는 길을 고른 사람</div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, lineHeight: 1.1, color: accent, fontVariantNumeric: "tabular-nums" }}>
          {risky === null ? "?" : risky}
          <span style={{ fontSize: 40, color: C.ink, marginLeft: 8, letterSpacing: -1 }}>명</span>
          <span style={{ fontSize: 30, color: C.muted, marginLeft: 16 }}>/ {n}명</span>
        </div>
      </div>
    </div>
  );
};

export const Results: React.FC<ResultsProps> = ({ broadcastRisky, guidedRisky, n = 50, note }) => {
  const f = useSceneFrame();
  const w = COLS * IW + (COLS - 1) * GAP;
  const gapX = 180;
  const x0 = (1920 - (w * 2 + gapX)) / 2;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FadeUp start={4} style={{ position: "absolute", top: 84, left: 0, right: 0, textAlign: "center", fontSize: 44, fontWeight: 800, color: C.ink }}>
        "3층 매장에 있는데 2층 식당가에서 흉기난동. 어디로 가겠습니까?"
      </FadeUp>
      <FadeUp start={20} style={{ position: "absolute", top: 152, left: 0, right: 0, textAlign: "center", fontSize: 26, color: C.muted }}>
        {n * 2}명, 무작위로 반씩 나눔 · 보기: 2층 지나는 에스컬레이터 / 반대편 계단 / 매장 안 문 잠금 / 모르겠다
      </FadeUp>

      <Group title="방송만 들음" quote={"“침착하게 대피하세요”"} risky={broadcastRisky} n={n} left={x0} start={70} accent={C.red} />
      <Group title="층별 안내 받음" quote={"“3층은 동쪽 계단으로 주차장 출구”"} risky={guidedRisky} n={n} left={x0 + w + gapX} start={220} accent={C.green} />

      {/* 가운데 화살표 */}
      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <g opacity={ease(clamp01((f - 350) / 12))}>
          <line x1={960 - 46} y1={690} x2={960 + 30} y2={690} stroke={C.muted} strokeWidth="4" strokeLinecap="round" />
          <path d={`M${960 + 20} 678 L${960 + 40} 690 L${960 + 20} 702`} fill="none" stroke={C.muted} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>

      {(note || broadcastRisky === null) && (
        <div style={{ position: "absolute", right: 40, top: 40, fontFamily: FONT, fontSize: 22, color: broadcastRisky === null ? C.amber : C.muted, border: `1.5px solid ${broadcastRisky === null ? C.amber : C.line}`, borderRadius: 999, padding: "6px 16px", opacity: ease(clamp01((f - 30) / 10)) }}>
          {broadcastRisky === null ? "가안 · 실험 A 결과로 교체" : note}
        </div>
      )}
    </AbsoluteFill>
  );
};
