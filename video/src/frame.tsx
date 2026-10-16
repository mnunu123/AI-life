import React, { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";

/**
 * 씬 늘리기. 내레이션에 맞춰 씬 길이가 바뀌면 씬 안의 프레임을 배율로 나눠서
 * 애니메이션이 같은 비율로 느려지게 한다. 데모 구간(실시간 캡처)은 배율 1 고정.
 */
const StretchCtx = createContext(1);

export const FrameScale: React.FC<{ value: number; children: React.ReactNode }> = ({ value, children }) => (
  <StretchCtx.Provider value={value}>{children}</StretchCtx.Provider>
);

export const useStretch = () => useContext(StretchCtx);

/** 씬 기준 프레임(원래 설계 길이 기준). 모든 씬·UI 컴포넌트는 useCurrentFrame 대신 이걸 쓴다. */
export const useSceneFrame = () => {
  const f = useCurrentFrame();
  const s = useContext(StretchCtx);
  return f / s;
};
