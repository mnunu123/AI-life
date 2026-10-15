import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, clamp01, easeInOut } from "../theme";

/**
 * 컷 5~8: 배포 화면 캡처(1배속) 위에 카메라 이동만 얹는다.
 * 캡처 시각 = 로컬 초 + CAP_START. 같은 장면을 두 번 보여주지 않는다.
 */
export const CAP_START = 1.0;

interface Key { t: number; cx: number; cy: number; s: number; label?: string }
const CAM: Key[] = [
  { t: 1.0, cx: 960, cy: 540, s: 1 },
  { t: 3.2, cx: 960, cy: 540, s: 1 },
  { t: 4.0, cx: 430, cy: 330, s: 1.6, label: "탐지 · CAM-2F-03" },
  { t: 8.6, cx: 430, cy: 330, s: 1.6, label: "탐지 · CAM-2F-03" },
  { t: 9.6, cx: 745, cy: 555, s: 1.45, label: "판단 · 2층 평면도" },
  { t: 13.6, cx: 745, cy: 555, s: 1.45, label: "판단 · 2층 평면도" },
  { t: 14.6, cx: 1490, cy: 540, s: 1.35, label: "안내 · 2층 방송문" },
  { t: 18.4, cx: 1490, cy: 540, s: 1.35, label: "안내 · 2층 방송문" },
  { t: 19.4, cx: 960, cy: 540, s: 1 },
  { t: 35.0, cx: 960, cy: 540, s: 1 },
  { t: 36.2, cx: 745, cy: 555, s: 1.4, label: "위험이 3층으로 · 2층은 전부 계단으로" },
  { t: 40.2, cx: 745, cy: 555, s: 1.4, label: "위험이 3층으로 · 2층은 전부 계단으로" },
  { t: 41.2, cx: 235, cy: 585, s: 1.9, label: "탐지 → 안내문까지 걸린 시간" },
  { t: 44.4, cx: 235, cy: 585, s: 1.9, label: "탐지 → 안내문까지 걸린 시간" },
  { t: 45.6, cx: 960, cy: 540, s: 1 },
];

function camAt(t: number) {
  if (t <= CAM[0].t) return CAM[0];
  for (let i = 0; i < CAM.length - 1; i++) {
    const a = CAM[i], b = CAM[i + 1];
    if (t >= a.t && t <= b.t) {
      const p = easeInOut(clamp01((t - a.t) / (b.t - a.t)));
      return { t, cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p, s: a.s + (b.s - a.s) * p, label: p < 0.5 ? a.label : b.label };
    }
  }
  return CAM[CAM.length - 1];
}

export const Demo: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps + CAP_START;
  const cam = camAt(t);
  const labelA = cam.label ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: "#10151F", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transformOrigin: "960px 540px", transform: `translate(${-(cam.cx - 960) * cam.s}px, ${-(cam.cy - 540) * cam.s}px) scale(${cam.s})` }}>
        <OffthreadVideo src={staticFile("clips/dashboard.mp4")} startFrom={Math.round(CAP_START * fps)} style={{ width: 1920, height: 1080 }} muted />
      </div>
      {/* 단계 칩 */}
      <div style={{ position: "absolute", top: 36, left: 40, fontFamily: FONT, fontSize: 30, fontWeight: 700, color: C.ink, background: "rgba(8,10,16,0.8)", border: `1.5px solid ${C.line}`, borderRadius: 999, padding: "10px 22px", opacity: labelA, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: C.red, display: "inline-block" }} />
        {cam.label}
      </div>
      {/* 캡처 표기 */}
      <div style={{ position: "absolute", top: 38, left: "50%", transform: "translateX(-50%)", fontFamily: FONT, fontSize: 22, color: C.muted, background: "rgba(8,10,16,0.7)", borderRadius: 8, padding: "6px 12px" }}>
        실제 시제품 화면 · 편집 없음 · 1배속
      </div>
    </AbsoluteFill>
  );
};
