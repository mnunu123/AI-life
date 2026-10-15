"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SCENARIO, activeEvent, type ScenarioEvent } from "@/lib/scenario";
import { decide, type Decision } from "@/lib/engine";
import { templateAnnouncements, type AnnouncementSet } from "@/lib/announce";
import { cameraById, nodeById } from "@/lib/building";
import { useClock } from "@/lib/useClock";
import { FloorPlan, ACTION_STYLE } from "./FloorPlan";
import { CctvPanel, type DetFile } from "./CctvPanel";

interface TimerEntry {
  event: ScenarioEvent;
  decisionMs: number; // 엔진 계산 시간
  textSource: "template" | "llm";
  textMs: number; // 안내문 준비까지 걸린 시간(네트워크 포함)
}

declare global {
  interface Window {
    __demo?: {
      play: () => void;
      pause: () => void;
      reset: () => void;
      setTime: (ms: number) => void;
      ready: () => boolean;
      state: () => { t: number; mode: string; threat: string | null };
      duration: number;
    };
  }
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor((ms % 1000) / 100);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.${d}`;
};

export function Dashboard() {
  const clock = useClock(SCENARIO.durationMs);
  const { t, mode } = clock;
  const capture = mode === "capture";
  const ev = activeEvent(SCENARIO, t);
  const threat = ev ? cameraById.get(ev.camera)!.node : null;
  const sinceEvent = ev ? t - ev.atMs : 0;

  const decision: Decision | null = useMemo(() => (threat ? decide(threat) : null), [threat]);

  // 안내문: 시나리오의 모든 위험 노드에 대해 미리 받아둔다(캡처가 결정적이어야 하므로).
  const [annMap, setAnnMap] = useState<Record<string, { set: AnnouncementSet; ms: number }>>({});
  const [detMap, setDetMap] = useState<Record<string, DetFile>>({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const nodes = [...new Set(SCENARIO.events.map((e) => cameraById.get(e.camera)!.node))];
      const annEntries = await Promise.all(
        nodes.map(async (node) => {
          const t0 = performance.now();
          try {
            const r = await fetch("/api/announce", { method: "POST", body: JSON.stringify({ threat: node }), headers: { "content-type": "application/json" } });
            const set = (await r.json()) as AnnouncementSet;
            return [node, { set, ms: performance.now() - t0 }] as const;
          } catch {
            return [node, { set: templateAnnouncements(decide(node)), ms: performance.now() - t0 }] as const;
          }
        }),
      );
      const detEntries = await Promise.all(
        [...new Set(SCENARIO.events.map((e) => e.detections))].map(async (url) => {
          const r = await fetch(url);
          return [url, (await r.json()) as DetFile] as const;
        }),
      );
      if (!alive) return;
      setAnnMap(Object.fromEntries(annEntries));
      setDetMap(Object.fromEntries(detEntries));
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const ann = threat ? (annMap[threat]?.set ?? (decision ? templateAnnouncements(decision) : null)) : null;

  // 타이머 로그(실험 C): 이벤트마다 탐지→판단→안내문까지
  const timerLog: TimerEntry[] = useMemo(
    () =>
      SCENARIO.events
        .filter((e) => e.atMs <= t)
        .map((e) => {
          const node = cameraById.get(e.camera)!.node;
          const d = decide(node);
          const a = annMap[node];
          return { event: e, decisionMs: d.computedMs, textSource: a?.set.source ?? "template", textMs: a?.ms ?? 0 };
        }),
    [t, annMap],
  );

  // TTS: 재생 모드에서 새 이벤트가 오면 위험 층 안내문을 읽는다
  const spokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "playing" || !ev || !ann) return;
    const key = `${ev.atMs}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    try {
      const u = new SpeechSynthesisUtterance(ann.floors[ann.threatFloor - 1].ko);
      u.lang = "ko-KR"; u.rate = 1.05;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, [mode, ev, ann]);
  useEffect(() => { if (mode === "idle") { spokenRef.current = null; try { window.speechSynthesis?.cancel(); } catch {} } }, [mode]);

  const speak = useCallback((text: string) => {
    try { const u = new SpeechSynthesisUtterance(text); u.lang = "ko-KR"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
  }, []);

  // 캡처 스크립트용 훅
  useEffect(() => {
    window.__demo = {
      play: clock.play, pause: clock.pause, reset: clock.reset, setTime: clock.setTime,
      ready: () => ready,
      state: () => ({ t, mode, threat }),
      duration: SCENARIO.durationMs,
    };
  }, [clock.play, clock.pause, clock.reset, clock.setTime, ready, t, mode, threat]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("autoplay") === "1" && ready && mode === "idle") clock.play();
  }, [ready, mode, clock]);

  const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const status: "idle" | "detect" | "move" = ev ? ev.kind : "idle";
  const threatNode = threat ? nodeById.get(threat)! : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* 상단 바 */}
      <header className="flex items-center gap-6 px-6 h-14 border-b border-line">
        <div className="text-[17px] font-extrabold tracking-tight">60초 안내</div>
        <div className="text-[13px] text-muted">다중이용시설 실내 대피 유도 · 시제품</div>
        <div className="ml-auto flex items-center gap-5">
          <div className={`text-[13px] font-semibold px-2.5 py-1 rounded-full ${status === "idle" ? "bg-panel text-muted" : "bg-threat/15 text-threat"}`}>
            {status === "idle" ? "평시" : `위험 · ${threatNode!.floor}층 ${threatNode!.name}`}
          </div>
          <div className="tabular-nums text-[22px] font-extrabold w-[112px] text-right">T+{fmt(t)}</div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[400px_1fr] gap-5 p-5 max-[1100px]:grid-cols-1">
        {/* 왼쪽: CCTV + 로그 */}
        <aside className="flex flex-col gap-5">
          <section className="rounded-lg bg-panel p-4">
            <CctvPanel camera={ev?.camera ?? null} clip={ev?.clip ?? null} det={ev ? detMap[ev.detections] ?? null : null} sinceEventMs={sinceEvent} capture={capture} status={status} />
          </section>

          <section className="rounded-lg bg-panel p-4">
            <div className="text-[13px] font-semibold text-muted mb-2">관제 로그</div>
            <ol className="flex flex-col gap-1.5 text-[13px]">
              {SCENARIO.events.filter((e) => e.atMs <= t).map((e) => (
                <li key={e.atMs} className="flex gap-3">
                  <span className="tabular-nums text-muted w-[72px] shrink-0">T+{fmt(e.atMs)}</span>
                  <span><span className="font-semibold">{e.camera}</span> {e.note}</span>
                </li>
              ))}
              {t === 0 && <li className="text-muted">아직 이벤트가 없습니다. 시나리오를 재생하세요.</li>}
            </ol>
          </section>

          <section className="rounded-lg bg-panel p-4">
            <div className="text-[13px] font-semibold text-muted mb-2">탐지 → 안내문까지 걸린 시간</div>
            <table className="w-full text-[13px] tabular-nums">
              <thead className="text-muted">
                <tr><th className="text-left font-medium">카메라</th><th className="text-right font-medium">판단</th><th className="text-right font-medium">안내문</th><th className="text-right font-medium">출처</th></tr>
              </thead>
              <tbody>
                {timerLog.map((r) => (
                  <tr key={r.event.atMs}>
                    <td>{r.event.camera}</td>
                    <td className="text-right">{r.decisionMs.toFixed(1)} ms</td>
                    <td className="text-right">{(r.textMs / 1000).toFixed(2)} s</td>
                    <td className="text-right">{r.textSource === "llm" ? "AI 생성" : "템플릿"}</td>
                  </tr>
                ))}
                {timerLog.length === 0 && <tr><td colSpan={4} className="text-muted">—</td></tr>}
              </tbody>
            </table>
          </section>

          <div className="flex items-center gap-2 mt-auto">
            {mode === "playing" ? (
              <button onClick={clock.pause} className="btn">일시정지</button>
            ) : (
              <button onClick={clock.play} className="btn btn-primary" disabled={!ready}>{t > 0 && t < SCENARIO.durationMs ? "이어서 재생" : "시나리오 재생"}</button>
            )}
            <button onClick={clock.reset} className="btn">초기화</button>
            <span className="ml-auto text-[12px] text-muted">{ready ? SCENARIO.title : "안내문 준비 중…"}</span>
          </div>
        </aside>

        {/* 오른쪽: 층별 평면도 + 그 층 안내문 */}
        <section className="flex flex-col gap-4">
          {([3, 2, 1] as const).map((f) => {
            const fa = ann?.floors[f - 1];
            const hot = threatNode?.floor === f;
            const chars = Math.floor(Math.max(0, sinceEvent - 500) / 22);
            const shown = fa ? fa.ko.slice(0, chars) : "";
            return (
              <div key={f} className={`floor-row grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-lg bg-panel p-3 ring-1 ${hot ? "ring-threat/60" : "ring-transparent"} max-[1400px]:grid-cols-1`}>
                <div className="plan"><FloorPlan floor={f} decision={decision} sinceEventMs={sinceEvent} activeCamera={ev?.camera} reducedMotion={reducedMotion} /></div>
                <div className="flex flex-col gap-2 min-w-0 py-1 pr-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[20px] font-extrabold ${hot ? "text-threat" : ""}`}>{f}층 안내</span>
                    {fa && (
                      <button onClick={() => speak(fa.ko)} className="btn btn-sm ml-auto" aria-label={`${f}층 안내 듣기`}>듣기</button>
                    )}
                  </div>
                  {fa ? (
                    <>
                      <p className="text-[17px] leading-[1.55] font-semibold min-h-[4.6em]">{shown}<span className={chars < fa.ko.length ? "caret" : "hidden"}>▍</span></p>
                      {chars >= fa.ko.length && <p className="text-[12.5px] text-muted leading-snug">{fa.en}</p>}
                    </>
                  ) : (
                    <p className="text-[14px] text-muted">위험이 감지되면 이 층에 맞는 안내문이 여기에 뜹니다.</p>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex gap-4 text-[12px] text-muted px-1">
            {(Object.keys(ACTION_STYLE) as (keyof typeof ACTION_STYLE)[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: ACTION_STYLE[k].fill }} />{ACTION_STYLE[k].label}</span>
            ))}
            <span className="ml-auto">{ann?.source === "llm" ? `안내문: ${ann.model} 생성` : "안내문: 템플릿 (API 키 없음)"}</span>
          </div>
        </section>
      </main>
    </div>
  );
}
