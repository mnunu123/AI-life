import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { SCENE, TOTAL_SECONDS, WARP, type SceneKey } from "./script";
import { FrameScale } from "./frame";
import { C, ensureFont } from "./theme";
import { Captions } from "./ui";
import { Open } from "./scenes/Open";
import { Iso } from "./scenes/Iso";
import { Evidence } from "./scenes/Evidence";
import { Proposal } from "./scenes/Proposal";
import { Demo } from "./scenes/Demo";
import { Results, type ResultsProps } from "./scenes/Results";
import { Close, type CloseProps } from "./scenes/Close";
import { Sfx, Narration, type NarrationClip } from "./audio";
import narrationManifest from "./narration.json";

export const FPS = 30;
export const DURATION_FRAMES = Math.ceil(TOTAL_SECONDS * FPS);

export type MainProps = { results: ResultsProps; close: CloseProps } & Record<string, unknown>;
export const defaultProps: MainProps = {
  results: { broadcastRisky: 26, guidedRisky: 2, n: 50, note: "실험 A · 설문 100명(50명씩 두 집단) · 2026.10" },
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
  const seq = (k: SceneKey) => ({ from: s2f(SCENE[k].from), durationInFrames: s2f(SCENE[k].to) - s2f(SCENE[k].from) });
  const st = (k: SceneKey) => WARP[k];
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence {...seq("open")} name="1 cold open"><FrameScale value={st("open")}><Open /></FrameScale></Sequence>
      <Sequence {...seq("iso")} name="2 isometric"><FrameScale value={st("iso")}><Iso /></FrameScale></Sequence>
      <Sequence {...seq("evidence")} name="3 evidence"><FrameScale value={st("evidence")}><Evidence /></FrameScale></Sequence>
      <Sequence {...seq("proposal")} name="4 proposal"><FrameScale value={st("proposal")}><Proposal /></FrameScale></Sequence>
      <Sequence {...seq("demo")} name="5-8 demo capture"><Demo /></Sequence>
      <Sequence {...seq("results")} name="9 results"><FrameScale value={st("results")}><Results {...results} /></FrameScale></Sequence>
      <Sequence {...seq("close")} name="10 close"><FrameScale value={st("close")}><Close {...close} /></FrameScale></Sequence>
      <Captions />
      <Cuts />
      <Sfx />
      <Narration clips={narrationManifest as NarrationClip[]} />
    </AbsoluteFill>
  );
};
