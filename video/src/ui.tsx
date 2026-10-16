import React from "react";
import {AbsoluteFill, useVideoConfig } from "remotion";
import { useSceneFrame } from "./frame";
import { C, FONT, clamp01, ease } from "./theme";
import { CAPTIONS } from "./script";

/** 전 구간 자막. 투표 페이지에서 음소거로 봐도 이해되게. */
export const Captions: React.FC = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cap = CAPTIONS.find((c) => t >= c.from && t <= c.to);
  if (!cap) return null;
  const inA = clamp01((t - cap.from) / 0.25);
  const outA = clamp01((cap.to - t) / 0.25);
  const a = Math.min(inA, outA);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div
        style={{
          marginBottom: 56,
          maxWidth: 1480,
          padding: "14px 28px",
          borderRadius: 14,
          background: "rgba(8,10,16,0.78)",
          color: C.ink,
          fontFamily: FONT,
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1.35,
          textAlign: "center",
          opacity: a,
          transform: `translateY(${(1 - ease(inA)) * 10}px)`,
          letterSpacing: -0.3,
          wordBreak: "keep-all",
        }}
      >
        {cap.text}
      </div>
    </AbsoluteFill>
  );
};

/** 글자 하나씩 나타나는 타이포 */
export const Reveal: React.FC<{
  text: string;
  start: number; // local frame
  perChar?: number;
  style?: React.CSSProperties;
}> = ({ text, start, perChar = 1.2, style }) => {
  const f = useSceneFrame();
  const n = Math.max(0, Math.floor((f - start) / perChar));
  return (
    <span style={{ fontFamily: FONT, color: C.ink, ...style }}>
      {text.slice(0, n)}
      <span style={{ opacity: 0 }}>{text.slice(n)}</span>
    </span>
  );
};

/** 페이드+살짝 올라오기 */
export const FadeUp: React.FC<{ start: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties; out?: number }> = ({ start, dur = 14, children, style, out }) => {
  const f = useSceneFrame();
  const p = ease(clamp01((f - start) / dur));
  const q = out !== undefined ? ease(clamp01((out - f) / 10)) : 1;
  return (
    <div style={{ opacity: p * q, transform: `translateY(${(1 - p) * 16}px)`, ...style }}>{children}</div>
  );
};

/** 큰 숫자 카운트업 */
export const CountUp: React.FC<{ to: number; start: number; dur?: number; style?: React.CSSProperties; suffix?: string }> = ({ to, start, dur = 36, style, suffix = "" }) => {
  const f = useSceneFrame();
  const p = ease(clamp01((f - start) / dur));
  const v = Math.round(to * p);
  return (
    <span style={{ fontFamily: FONT, fontVariantNumeric: "tabular-nums", ...style }}>
      {v.toLocaleString("ko-KR")}
      {suffix}
    </span>
  );
};
