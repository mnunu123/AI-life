import React from "react";
import {AbsoluteFill } from "remotion";
import { useSceneFrame } from "../frame";
import { C, FONT, clamp01, ease } from "../theme";
import { FadeUp, Reveal } from "../ui";

/** 컷 10: 한계 세 줄 → 타이틀 → 링크 */
export interface CloseProps { url: string; repo: string }

export const Close: React.FC<CloseProps> = ({ url, repo }) => {
  const f = useSceneFrame();
  const limits = ["우산이나 긴 물건을 흉기로 볼 때가 있다", "군중 급이탈은 학습이 아니라 규칙으로 잡는다", "실제 방송·비상등 장비와는 아직 연결하지 않았다"];
  const phase2 = f >= 190; // 6.3s
  const fade = ease(clamp01((f - 180) / 12));
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - fade }}>
        <FadeUp start={4} style={{ position: "absolute", top: 220, left: 0, right: 0, textAlign: "center", fontSize: 44, fontWeight: 800, color: C.ink }}>
          아직 틀립니다
        </FadeUp>
        {limits.map((l, i) => (
          <FadeUp key={l} start={30 + i * 26} style={{ position: "absolute", top: 340 + i * 110, left: 0, right: 0, textAlign: "center", fontSize: 40, color: C.muted }}>
            {l}
          </FadeUp>
        ))}
      </div>
      {phase2 && (
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", top: 330, left: 0, right: 0, textAlign: "center" }}>
            <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>
              <Reveal text="60초 안내" start={196} perChar={4} />
            </div>
            <FadeUp start={230} style={{ marginTop: 26, fontSize: 40, color: C.muted, fontWeight: 500 }}>
              다중이용시설 흉기난동 실내 대피 유도 AI
            </FadeUp>
            <FadeUp start={330} style={{ marginTop: 90, fontSize: 32, color: C.ink, lineHeight: 1.7 }}>
              <div>{url}</div>
              <div style={{ color: C.muted }}>{repo}</div>
            </FadeUp>
            <FadeUp start={380} style={{ marginTop: 60, fontSize: 24, color: C.muted }}>
              2026 AI 라이프 솔루션 챌린지 · 박세준 · 경북대학교 전자공학부
            </FadeUp>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
