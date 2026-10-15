import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, clamp01, ease } from "../theme";
import { FadeUp, CountUp } from "../ui";

/** 컷 1: 검은 화면, 시각이 13:48에서 13:53으로 흐른다. 5분. 열 명. */
export const Open: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;

  // 4.8s~8.6s 사이에 48→53분
  const p = ease(clamp01((t - 4.8) / 3.6));
  const minute = 48 + Math.floor(p * 5.999);
  const injured = t >= 8.9;

  return (
    <AbsoluteFill style={{ background: "#07090E", fontFamily: FONT, color: C.ink }}>
      <FadeUp start={8} style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 500, color: C.muted, letterSpacing: 0.5 }}>
          2026년 10월 13일 · 인천 구월동 · 복합상업시설 2층 식당가
        </div>
      </FadeUp>

      <div style={{ position: "absolute", top: 380, left: 0, right: 0, textAlign: "center" }}>
        <FadeUp start={20}>
          <div style={{ fontSize: 300, fontWeight: 800, letterSpacing: -8, lineHeight: 1, fontVariantNumeric: "tabular-nums", transform: `scale(${injured ? 0.6 : 1}) translateY(${injured ? -60 : 0}px)`, transition: "none", opacity: injured ? 0 : 1 }}>
            13:{minute}
          </div>
        </FadeUp>
        {/* 5분 진행 막대 */}
        <div style={{ margin: "28px auto 0", width: 760, height: 4, background: "#1A202B", borderRadius: 2, overflow: "hidden", opacity: t > 4.6 && !injured ? 1 : 0 }}>
          <div style={{ width: `${p * 100}%`, height: "100%", background: C.red }} />
        </div>
        <div style={{ marginTop: 18, fontSize: 34, fontWeight: 600, color: C.red, opacity: t > 8.2 && !injured ? 1 : 0 }}>5분</div>
      </div>

      {injured && (
        <div style={{ position: "absolute", top: 440, left: 0, right: 0, textAlign: "center" }}>
          <FadeUp start={Math.round(8.9 * fps)} dur={10}>
            <div style={{ fontSize: 260, fontWeight: 800, letterSpacing: -6, lineHeight: 1, color: C.red }}>
              <CountUp to={10} start={Math.round(9.0 * fps)} dur={30} />
              <span style={{ fontSize: 80, color: C.ink, marginLeft: 20, letterSpacing: -2 }}>명</span>
            </div>
            <div style={{ marginTop: 22, fontSize: 36, color: C.muted }}>다쳤습니다. 19세 여성은 의식을 되찾지 못했습니다.</div>
          </FadeUp>
        </div>
      )}
    </AbsoluteFill>
  );
};
