import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, clamp01, ease } from "../theme";
import { Reveal, FadeUp } from "../ui";

/** 컷 4: 한 문장 → 아키텍처 5칸, 가운데 2칸 강조 */
const BOXES: { name: string; a: string; b: string; main: boolean }[] = [
  { name: "CCTV 영상", a: "기존 장비 그대로", b: "층별 카메라 ID", main: false },
  { name: "탐지 AI", a: "흉기 객체", b: "군중 급이탈", main: false },
  { name: "위치 매핑", a: "평면도 그래프", b: "위험 노드 지정", main: true },
  { name: "안내 생성 AI", a: "구역별 경로 계산", b: "층마다 다른 문장", main: true },
  { name: "층별 출력", a: "방송 · 비상등", b: "관제 대시보드", main: false },
];

export const Proposal: React.FC = () => {
  const f = useCurrentFrame();
  // 0~150: 문장. 150~: 문장이 위로 올라가고 아키텍처 등장
  const lift = ease(clamp01((f - 150) / 24));
  const bw = 320, gap = 40, y = 520, x0 = (1920 - (bw * 5 + gap * 4)) / 2;
  const prog = (i: number) => ease(clamp01((f - 170 - i * 14) / 14));
  const glow = ease(clamp01((f - 270) / 20));
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 440 - lift * 300, textAlign: "center", transform: `scale(${1 - lift * 0.35})`, transformOrigin: "center top" }}>
        <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1.25 }}>
          <Reveal text="빠진 건 탐지가 아닙니다." start={6} perChar={1.6} /><br />
          <Reveal text="탐지 뒤 60초, 누가 어디로 가야 하는가." start={46} perChar={1.6} style={{ color: C.red }} />
        </div>
      </div>

      <svg width="1920" height="1080" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="pr-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill={C.muted} /></marker>
        </defs>
        {BOXES.map((b, i) => {
          const x = x0 + i * (bw + gap);
          const p = prog(i);
          const g = b.main ? glow : 0;
          return (
            <g key={b.name} opacity={p} transform={`translate(0 ${(1 - p) * 16})`}>
              <rect x={x} y={y} width={bw} height={170} rx="16" fill={b.main ? C.blue : C.panel} fillOpacity={b.main ? 0.14 * g + 0.02 : 1} stroke={b.main && g > 0 ? C.blue : C.line} strokeWidth={b.main ? 2 + g : 2} />
              <text x={x + bw / 2} y={y + 62} textAnchor="middle" fontFamily={FONT} fontSize="34" fontWeight="700" fill={C.ink}>{b.name}</text>
              <text x={x + bw / 2} y={y + 108} textAnchor="middle" fontFamily={FONT} fontSize="24" fill={b.main ? C.ink : C.muted}>{b.a}</text>
              <text x={x + bw / 2} y={y + 142} textAnchor="middle" fontFamily={FONT} fontSize="24" fill={b.main ? C.ink : C.muted}>{b.b}</text>
              {i < 4 && <line x1={x + bw + 4} y1={y + 85} x2={x + bw + gap - 8} y2={y + 85} stroke={C.muted} strokeWidth="3" markerEnd="url(#pr-arrow)" opacity={prog(i + 1)} />}
            </g>
          );
        })}
        <g opacity={glow}>
          <rect x={x0 + 2 * (bw + gap) - 16} y={y - 50} width={bw * 2 + gap + 32} height={170 + 100} rx="24" fill="none" stroke={C.blue} strokeWidth="2" strokeDasharray="10 8" />
          <text x={x0 + 2 * (bw + gap) + bw + gap / 2} y={y - 68} textAnchor="middle" fontFamily={FONT} fontSize="30" fontWeight="700" fill={C.blue}>이번에 만든 두 칸</text>
        </g>
      </svg>
      <FadeUp start={300} style={{ position: "absolute", top: 790, left: 0, right: 0, textAlign: "center", fontSize: 32, color: C.muted }}>
        탐지와 출력은 지금 있는 장비를 그대로 쓴다. 새로 넣는 건 판단 계층뿐이다.
      </FadeUp>
    </AbsoluteFill>
  );
};
