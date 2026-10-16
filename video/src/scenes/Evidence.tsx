import React from "react";
import {AbsoluteFill, Sequence } from "remotion";
import { useSceneFrame, useStretch } from "../frame";
import { C, FONT, clamp01, ease } from "../theme";
import { FadeUp, CountUp } from "../ui";

/** 컷 3: 근거 세 장. ① 재난문자 없음 ② 1인당 481대 ③ 탐지→신고에서 끝 */

const Source: React.FC<{ text: string; start: number }> = ({ text, start }) => (
  <FadeUp start={start} style={{ position: "absolute", bottom: 150, left: 0, right: 0, textAlign: "center" }}>
    <div style={{ fontFamily: FONT, fontSize: 22, color: C.muted }}>{text}</div>
  </FadeUp>
);

const Phone: React.FC = () => {
  const f = useSceneFrame();
  const stamp = ease(clamp01((f - 70) / 12));
  const rows = ["폭염 경보 · 야외활동 자제", "호우주의보 · 하천 접근 금지", "미세먼지 주의보", "폭염 경보 · 야외활동 자제"];
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
      <FadeUp start={0} dur={16}>
        <div style={{ width: 460, height: 860, borderRadius: 54, border: `3px solid ${C.line}`, background: "#0B0F16", padding: "70px 26px 26px", position: "relative", boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)", width: 120, height: 26, borderRadius: 13, background: "#1A202B" }} />
          <div style={{ color: C.muted, fontSize: 20, marginBottom: 14 }}>재난문자</div>
          {rows.map((r, i) => (
            <FadeUp key={i} start={10 + i * 8} dur={10} style={{ background: "#141B27", borderRadius: 14, padding: "16px 18px", marginBottom: 10, color: C.muted, fontSize: 22 }}>
              {r}
            </FadeUp>
          ))}
          <div style={{ border: `2px dashed ${C.red}`, borderRadius: 14, padding: "16px 18px", color: C.red, fontSize: 22, opacity: stamp, textAlign: "center", marginTop: 6 }}>
            2023.8.3 서현역 흉기난동 — 없음
          </div>
          <div style={{ position: "absolute", right: -70, top: 420, transform: `rotate(-12deg) scale(${0.7 + 0.3 * stamp})`, opacity: stamp, border: `5px solid ${C.red}`, color: C.red, fontSize: 40, fontWeight: 800, padding: "8px 18px", borderRadius: 8, background: "rgba(14,17,24,0.85)", whiteSpace: "nowrap" }}>
            발송 대상 아님
          </div>
        </div>
      </FadeUp>
      <Source start={90} text="성남시 답변: 행안부 재난문자 기준은 자연재난·정전·감염병·방사능 중심 — 머니투데이 2023.8.4" />
    </AbsoluteFill>
  );
};

const Cameras: React.FC = () => {
  const f = useSceneFrame();
  const cols = 37, rows = 13; // 481
  const lit = Math.floor(ease(clamp01((f - 10) / 70)) * 481);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, alignItems: "center" }}>
      <div style={{ position: "absolute", top: 120, display: "flex", alignItems: "baseline", gap: 24 }}>
        <div style={{ fontSize: 220, fontWeight: 800, color: C.ink, letterSpacing: -6, lineHeight: 1 }}>
          <CountUp to={481} start={10} dur={70} />
        </div>
        <div style={{ fontSize: 40, color: C.muted, fontWeight: 500 }}>대</div>
      </div>
      <FadeUp start={20} style={{ position: "absolute", top: 380, fontSize: 36, color: C.ink, fontWeight: 600 }}>
        관제요원 한 명이 보는 CCTV, 전국 평균
      </FadeUp>
      <div style={{ position: "absolute", top: 460, display: "grid", gridTemplateColumns: `repeat(${cols}, 22px)`, gap: 6 }}>
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div key={i} style={{ width: 22, height: 14, borderRadius: 3, background: i < lit ? C.blue : "#1A202B", opacity: i < lit ? 0.85 : 1 }} />
        ))}
      </div>
      <FadeUp start={120} style={{ position: "absolute", top: 740, display: "flex", gap: 40, alignItems: "baseline" }}>
        <span style={{ fontSize: 30, color: C.muted }}>행안부 기준</span><span style={{ fontSize: 46, fontWeight: 800, color: C.ink }}>50대</span>
        <span style={{ fontSize: 30, color: C.muted, marginLeft: 30 }}>서울</span><span style={{ fontSize: 46, fontWeight: 800, color: C.red }}>약 1,200대</span>
      </FadeUp>
      <Source start={130} text="전국 216개 센터 65만 대(머니투데이 2025.2) · 서울시 2026.2.19 · 행안부 규정 1인 50대, 221개 센터 중 1곳만 준수(인공지능신문 2021.10)" />
    </AbsoluteFill>
  );
};

const Flow: React.FC = () => {
  const f = useSceneFrame();
  const boxes = ["CCTV 영상", "지능형 탐지", "관제요원 112 신고"];
  // 상자 3 + 끊긴 연결(100) + 점선 상자(300)를 한 덩어리로 가운데 정렬
  const bw = 330, gap = 70, y = 470, pw = 300, cutGap = 130;
  const x0 = (1920 - (bw * 3 + gap * 2 + cutGap + pw)) / 2;
  const prog = (i: number) => ease(clamp01((f - 10 - i * 22) / 16));
  const arrow = (i: number) => ease(clamp01((f - 24 - i * 22) / 14));
  const cut = ease(clamp01((f - 95) / 14));
  const px = x0 + bw * 3 + gap * 2 + cutGap;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <svg width="1920" height="1080">
        <defs>
          <marker id="ev-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill={C.muted} /></marker>
        </defs>
        {boxes.map((b, i) => {
          const x = x0 + i * (bw + gap);
          return (
            <g key={b} opacity={prog(i)} transform={`translate(0 ${(1 - prog(i)) * 14})`}>
              <rect x={x} y={y} width={bw} height={120} rx="14" fill={C.panel} stroke={C.line} strokeWidth="2" />
              <text x={x + bw / 2} y={y + 72} textAnchor="middle" fontFamily={FONT} fontSize="34" fontWeight="600" fill={C.ink}>{b}</text>
              {i < 2 && <line x1={x + bw + 6} y1={y + 60} x2={x + bw + 6 + (gap - 14) * arrow(i)} y2={y + 60} stroke={C.muted} strokeWidth="4" markerEnd={arrow(i) > 0.9 ? "url(#ev-arrow)" : undefined} />}
            </g>
          );
        })}
        {/* 끊긴 연결 + 건물 안 사람들 */}
        <g opacity={cut}>
          <line x1={x0 + bw * 3 + gap * 2 + 6} y1={y + 60} x2={px - 10} y2={y + 60} stroke={C.red} strokeWidth="4" strokeDasharray="10 10" />
          <text x={(x0 + bw * 3 + gap * 2 + px) / 2} y={y + 36} textAnchor="middle" fontFamily={FONT} fontSize="24" fontWeight="600" fill={C.red}>연결 없음</text>
        </g>
        <g opacity={cut} transform={`translate(${px} ${y - 10})`}>
          <rect x="0" y="0" width={pw} height="140" rx="14" fill="none" stroke={C.red} strokeWidth="2" strokeDasharray="8 8" />
          <text x={pw / 2} y="60" textAnchor="middle" fontFamily={FONT} fontSize="32" fontWeight="600" fill={C.ink}>건물 안 사람들</text>
          <text x={pw / 2} y="104" textAnchor="middle" fontFamily={FONT} fontSize="26" fill={C.red}>각자 알아서</text>
        </g>
      </svg>
      <FadeUp start={0} style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontSize: 40, fontWeight: 700, color: C.ink }}>
        지금 서울시가 깔고 있는 구조
      </FadeUp>
      <Source start={110} text="서울시 2026년 지능형 CCTV 271억 원, 8,536대 확충. 탐지 후 조치는 112 신고·상황실 영상 전송까지 — 서울시 2023.12, 2026.2" />
    </AbsoluteFill>
  );
};

export const Evidence: React.FC = () => {
  const s = useStretch();
  const r = (n: number) => Math.round(n * s);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence from={0} durationInFrames={r(195)}><Phone /></Sequence>
      <Sequence from={r(195)} durationInFrames={r(195)}><Cameras /></Sequence>
      <Sequence from={r(390)} durationInFrames={r(240)}><Flow /></Sequence>
    </AbsoluteFill>
  );
};
