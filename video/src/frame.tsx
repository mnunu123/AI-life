import React, { createContext, useContext } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

/**
 * 씬 시간 늘리기(워프).
 * 내레이션에 맞춰 씬이 길어지면, 자막 구간마다 필요한 만큼만 늘린다(구간별 선형).
 * warp = [[설계초, 실제초], ...] 씬 시작 기준, 단조 증가. 숫자 하나면 균일 배율.
 * 씬·UI 컴포넌트는 useCurrentFrame 대신 useSceneFrame(설계 기준 프레임)을 쓴다.
 * 데모 구간(실시간 캡처)은 워프 없음.
 */
export type Warp = [number, number][];

const WarpCtx = createContext<Warp>([[0, 0], [1, 1]]);
/** 씬 안의 하위 Sequence가 시작하는 설계 프레임(useCurrentFrame이 0으로 리셋되므로 보정용) */
const OffsetCtx = createContext(0);

const asWarp = (v: Warp | number): Warp => (typeof v === "number" ? [[0, 0], [1, v]] : v.length >= 2 ? v : [[0, 0], [1, 1]]);

/** 구간별 선형 보간. 범위 밖은 마지막 구간 기울기로 연장 */
const interp = (pts: [number, number][], x: number, inv = false) => {
  const X = inv ? 1 : 0, Y = inv ? 0 : 1;
  let i = 0;
  while (i < pts.length - 2 && x > pts[i + 1][X]) i++;
  const a = pts[i], b = pts[i + 1];
  const dx = b[X] - a[X];
  const k = dx > 0 ? (b[Y] - a[Y]) / dx : 1;
  return a[Y] + (x - a[X]) * k;
};
export const toActualSec = (w: Warp, base: number) => interp(w, base);
export const toBaseSec = (w: Warp, actual: number) => interp(w, actual, true);
const slopeAt = (w: Warp, base: number) => {
  let i = 0;
  while (i < w.length - 2 && base > w[i + 1][0]) i++;
  const dx = w[i + 1][0] - w[i][0];
  return dx > 0 ? (w[i + 1][1] - w[i][1]) / dx : 1;
};

export const FrameScale: React.FC<{ value: Warp | number; children: React.ReactNode }> = ({ value, children }) => (
  <WarpCtx.Provider value={asWarp(value)}>
    <OffsetCtx.Provider value={0}>{children}</OffsetCtx.Provider>
  </WarpCtx.Provider>
);

/** 씬 안에서 설계 프레임 base에 시작하는 하위 Sequence를 감쌀 때 */
export const SceneOffset: React.FC<{ base: number; children: React.ReactNode }> = ({ base, children }) => {
  const parent = useContext(OffsetCtx);
  return <OffsetCtx.Provider value={parent + base}>{children}</OffsetCtx.Provider>;
};

export const useWarp = () => useContext(WarpCtx);

/** 설계 프레임 → 실제 프레임(씬 시작 기준). 하위 Sequence의 from/duration 계산용 */
export const useToActualFrame = () => {
  const w = useContext(WarpCtx);
  const { fps } = useVideoConfig();
  return (baseFrame: number) => Math.round(toActualSec(w, baseFrame / fps) * fps);
};

/** 지금 프레임 근처의 국소 배율(실제/설계). 길이를 늘릴 때 쓴다 */
export const useStretch = () => {
  const w = useContext(WarpCtx);
  const off = useContext(OffsetCtx);
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const actual = toActualSec(w, off / fps) + f / fps;
  return slopeAt(w, toBaseSec(w, actual));
};

/** 씬 기준 프레임(원래 설계 길이 기준). 모든 씬·UI 컴포넌트는 useCurrentFrame 대신 이걸 쓴다. */
export const useSceneFrame = () => {
  const w = useContext(WarpCtx);
  const off = useContext(OffsetCtx);
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const actualSec = toActualSec(w, off / fps) + f / fps;
  return toBaseSec(w, actualSec) * fps - off;
};
