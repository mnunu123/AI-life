"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type ClockMode = "idle" | "playing" | "paused" | "capture";

/**
 * 시연용 시계. 모든 화면 애니메이션은 t(ms)의 함수라서
 *  - 재생 모드: requestAnimationFrame으로 t가 흐른다
 *  - 캡처 모드: window.__demo.setTime(ms)로 t를 직접 정한다 → 프레임 단위 캡처가 결정적이다
 */
export function useClock(durationMs: number) {
  const [t, setT] = useState(0);
  const [mode, setMode] = useState<ClockMode>("idle");
  const startRef = useRef(0);

  useEffect(() => {
    if (mode !== "playing") return;
    let raf = 0;
    const loop = (now: number) => {
      const next = Math.min(durationMs, now - startRef.current);
      setT(next);
      if (next >= durationMs) {
        setMode("paused");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, durationMs]);

  const play = useCallback(() => {
    startRef.current = performance.now() - (t >= durationMs ? 0 : t);
    setMode("playing");
  }, [t, durationMs]);

  const pause = useCallback(() => setMode("paused"), []);

  const reset = useCallback(() => {
    setMode("idle");
    setT(0);
  }, []);

  const setTime = useCallback(
    (ms: number) => {
      setMode("capture");
      setT(Math.max(0, Math.min(durationMs, ms)));
    },
    [durationMs],
  );

  return { t, mode, play, pause, reset, setTime };
}
