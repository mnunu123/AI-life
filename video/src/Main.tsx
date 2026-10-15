import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { SCENE, TOTAL_SECONDS } from "./script";
import { C, ensureFont } from "./theme";
import { Captions } from "./ui";
import { Open } from "./scenes/Open";
import { Iso } from "./scenes/Iso";
import { Evidence } from "./scenes/Evidence";
import { Proposal } from "./scenes/Proposal";
import { Demo } from "./scenes/Demo";
import { Results, type ResultsProps } from "./scenes/Results";
import { Close, type CloseProps } from "./scenes/Close";

export const FPS = 30;
export const DURATION_FRAMES = TOTAL_SECONDS * FPS;

export type MainProps = { results: ResultsProps; close: CloseProps } & Record<string, unknown>;
export const defaultProps: MainProps = {
  results: { broadcastRisky: null, guidedRisky: null },
  close: { url: "배포 URL (Vercel) — 배포 후 교체", repo: "github.com/mnunu123/AI-life" },
};

const s2f = (s: number) => Math.round(s * FPS);

/** 장면 경계에서 짧게 검게 */
const Cuts: React.FC = () => {
  const f = useCurrentFrame();
  const bounds = Object.values(SCENE).map((s) => s2f(s.from)).filter((x) => x > 0);
  let a = 0;
  for (const b of bounds) {
    const d = Math.abs(f - b);
    if (d < 7) a = Math.max(a, 1 - d / 7);
  }
  return <AbsoluteFill style={{ background: "#000", opacity: a, pointerEvents: "none" }} />;
};

export const Main: React.FC<MainProps> = ({ results, close }) => {
  ensureFont();
  const seq = (k: keyof typeof SCENE) => ({ from: s2f(SCENE[k].from), durationInFrames: s2f(SCENE[k].to) - s2f(SCENE[k].from) });
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence {...seq("open")} name="1 cold open"><Open /></Sequence>
      <Sequence {...seq("iso")} name="2 isometric"><Iso /></Sequence>
      <Sequence {...seq("evidence")} name="3 evidence"><Evidence /></Sequence>
      <Sequence {...seq("proposal")} name="4 proposal"><Proposal /></Sequence>
      <Sequence {...seq("demo")} name="5-8 demo capture"><Demo /></Sequence>
      <Sequence {...seq("results")} name="9 results"><Results {...results} /></Sequence>
      <Sequence {...seq("close")} name="10 close"><Close {...close} /></Sequence>
      <Captions />
      <Cuts />
    </AbsoluteFill>
  );
};
