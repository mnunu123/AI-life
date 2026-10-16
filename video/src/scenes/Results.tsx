import React from "react";
import {AbsoluteFill } from "remotion";
import { useSceneFrame } from "../frame";
import { C, FONT, clamp01, ease } from "../theme";
import { FadeUp } from "../ui";

/**
 * 컷 9: 실험 A 결과. 숫자는 실험이 끝나면 props로 넣는다(null이면 '?'로 그린다).
 */
export interface ResultsProps { broadcastRisky: number | null; guidedRisky: number | null }

const Person: React.FC<{ state: "idle" | "risky" | "safe" | "unknown"; delay: number }> = ({ state, delay }) => {
  const f = useSceneFrame();
  const p = ease(clamp01((f - delay) / 10));
  const color = state === "risky" ? C.red : state === "safe" ? C.green : state === "unknown" ? C.line : C.muted;
  return (
    <svg width="84" height="120" viewBox="0 0 84 120" style={{ opacity: 0.25 + 0.75 * p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <circle cx="42" cy="26" r="18" fill={color} />
      <rect x="18" y="50" width="48" height="62" rx="16" fill={color} />
      {state === "unknown" && <text x="42" y="92" textAnchor="middle" fontFamily={FONT} fontSize="36" fontWeight="800" fill={C.bg}>?</text>}
    </svg>
  );
};

export const Results: React.FC<ResultsProps> = ({ broadcastRisky, guidedRisky }) => {
  const f = useSceneFrame();
  const row = (label: string, risky: number | null, top: number, startFrame: number) => (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <FadeUp start={startFrame - 10} style={{ fontFamily: FONT, fontSize: 34, fontWeight: 600, color: C.ink }}>{label}</FadeUp>
      <div style={{ display: "flex", gap: 14 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const state = risky === null ? "unknown" : i < risky ? "risky" : "safe";
          return <Person key={i} state={state} delay={startFrame + i * 4} />;
        })}
      </div>
      <FadeUp start={startFrame + 50} style={{ fontFamily: FONT, fontSize: 30, color: C.muted }}>
        {risky === null ? "2층을 지나는 길을 고른 사람: 10명 중 ?명" : `2층을 지나는 길을 고른 사람: 10명 중 ${risky}명`}
      </FadeUp>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <FadeUp start={4} style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center", fontSize: 44, fontWeight: 800, color: C.ink }}>
        "3층 매장에 있는데 2층 식당가에서 흉기난동. 어디로 가겠습니까?"
      </FadeUp>
      <FadeUp start={20} style={{ position: "absolute", top: 160, left: 0, right: 0, textAlign: "center", fontSize: 28, color: C.muted }}>
        20명, 무작위로 반씩 나눔 · 보기: 2층 지나는 에스컬레이터 / 반대편 계단 / 매장 안 문 잠금 / 모르겠다
      </FadeUp>
      {row("방송만 들음 — \"침착하게 대피하세요\"", broadcastRisky, 260, 60)}
      {row("층별 안내 받음 — \"3층은 동쪽 계단으로 주차장 출구\"", guidedRisky, 600, 170)}
      {broadcastRisky === null && (
        <div style={{ position: "absolute", right: 40, top: 40, fontFamily: FONT, fontSize: 24, color: C.amber, border: `1.5px solid ${C.amber}`, borderRadius: 999, padding: "6px 16px", opacity: ease(clamp01((f - 30) / 10)) }}>
          가안 · 실험 A 결과로 교체 (10/25)
        </div>
      )}
    </AbsoluteFill>
  );
};
