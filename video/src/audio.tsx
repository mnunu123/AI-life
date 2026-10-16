import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SCENE, BASE_SCENE, mapTime, type SceneKey } from "./script";

/**
 * 효과음 큐. 시각은 '설계 타임라인'(BASE_SCENE) 기준 초.
 * 내레이션에 맞춰 씬이 늘어나면 같은 씬 안에서 같은 배율로 옮겨 놓는다(데모는 배율 1).
 * 파일은 tools/make_sfx.py가 만든다. 내레이션보다 항상 작게, 패드는 들릴락 말락.
 */
interface Cue { src: string; at: number; vol?: number; len?: number; scene?: SceneKey }

const KEYS = Object.keys(BASE_SCENE) as SceneKey[];
/** 설계 시각 → 실제 시각은 script.ts의 mapTime(구간별 워프) */

const B = BASE_SCENE;
const CUES: Cue[] = [
  // 컷 1 — 시계 틱 5번(48→53), '열 명' 둔탁음
  ...[5.01, 5.26, 5.54, 5.9, 6.42].map((at) => ({ src: "tick.wav", at, vol: 0.9 })),
  { src: "thud.wav", at: 8.9, vol: 1 },
  // 장면 전환 휘시 (각 씬 시작 직전)
  ...KEYS.filter((k) => B[k].from > 0).map((k) => ({ src: "whoosh.wav", at: B[k].from - 0.25, vol: 0.8 })),
  // 컷 2 — 전층 동일 방송 차임
  { src: "chime.wav", at: 23.0, vol: 0.9 },
  // 컷 3 — 스탬프, 카운터, 흐름도 상자, 끊긴 연결
  { src: "thud.wav", at: 34.33, vol: 0.7 },
  { src: "ratchet.wav", at: 38.83, vol: 1, len: 2.33 },
  { src: "blip.wav", at: 45.33 }, { src: "blip.wav", at: 46.07 }, { src: "blip.wav", at: 46.8 },
  { src: "deny.wav", at: 48.17, vol: 0.9 },
  // 컷 4 — 문장 타이핑 2줄, 상자 5개, 강조
  { src: "typing_fast.wav", at: 53.2, len: 1.0 },
  { src: "typing_fast.wav", at: 54.53, len: 1.3 },
  ...[58.67, 59.13, 59.6, 60.07, 60.53].map((at) => ({ src: "blip.wav", at })),
  { src: "confirm.wav", at: 62.0, vol: 0.9 },
  // 컷 5~8 — 탐지 알림 3회, 안내방송 차임 (데모는 배율 1)
  { src: "alert.wav", at: 71.0, vol: 1 },
  { src: "chime.wav", at: 80.9, vol: 0.8 },
  { src: "alert.wav", at: 86.0, vol: 0.9 },
  { src: "alert.wav", at: 100.0, vol: 0.9 },
  // 컷 9 — 사람 아이콘 50개×2 (2프레임 간격, 틱은 한 칸 걸러), 숫자 등장, 결론
  ...Array.from({ length: 25 }, (_, i) => ({ src: "tick_soft.wav", at: 113 + 70 / 30 + i * 0.133, vol: 0.6 })),
  { src: "blip.wav", at: 113 + 176 / 30, vol: 0.9 },
  ...Array.from({ length: 25 }, (_, i) => ({ src: "tick_soft.wav", at: 113 + 220 / 30 + i * 0.133, vol: 0.6 })),
  { src: "blip.wav", at: 113 + 326 / 30, vol: 0.9 },
  { src: "confirm.wav", at: 113 + 350 / 30, vol: 0.8 },
  // 컷 10 — 한계 3줄, 타이틀 타이핑
  ...[134.0, 134.87, 135.73].map((at) => ({ src: "blip.wav", at, vol: 0.6 })),
  { src: "typing_slow.wav", at: 139.53, len: 0.75 },
  { src: "confirm.wav", at: 140.7, vol: 0.7 },
];

/** 깔개: 씬 구간에 맞춰 길이를 정하고 끝에서 2초 페이드아웃 */
interface Bed { src: string; from: SceneKey; to: SceneKey; vol: number; fadeIn?: number }
const BEDS: Bed[] = [
  { src: "drone_open.wav", from: "open", to: "open", vol: 1.0 },
  { src: "pad_problem.wav", from: "open", to: "proposal", vol: 2.2 },
  { src: "pad_solution.wav", from: "proposal", to: "results", vol: 2.0 },
  { src: "pad_close.wav", from: "close", to: "close", vol: 1.8 },
];

export const Sfx: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <>
      {CUES.map((c, i) => {
        const at = mapTime(c.at);
        const len = c.len ? Math.max(1, Math.round((mapTime(c.at + c.len) - at) * fps)) : undefined;
        return (
          <Sequence key={i} from={Math.round(at * fps)} durationInFrames={len} name={`sfx ${c.src}`}>
            <Audio src={staticFile(`sfx/${c.src}`)} volume={c.vol ?? 1} />
          </Sequence>
        );
      })}
      {BEDS.map((b, i) => {
        const from = SCENE[b.from].from;
        const to = SCENE[b.to].to;
        const n = Math.round((to - from) * fps);
        const fadeIn = Math.round((b.fadeIn ?? 1.5) * fps);
        const fadeOut = Math.round(2.0 * fps);
        return (
          <Sequence key={`bed-${i}`} from={Math.round(from * fps)} durationInFrames={n} name={`bed ${b.src}`}>
            <Audio
              src={staticFile(`sfx/${b.src}`)}
              volume={(f) => b.vol * Math.min(1, f / fadeIn, (n - f) / fadeOut)}
            />
          </Sequence>
        );
      })}
    </>
  );
};

/** 내레이션. src/narration.json = [{ file, at, dur }] (실제 시각, tools/retime.py가 만든다) */
export interface NarrationClip { file: string; at: number; dur: number }
export const Narration: React.FC<{ clips: NarrationClip[]; volume?: number }> = ({ clips, volume = 1 }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {clips.map((c) => (
        <Sequence key={c.file} from={Math.round(c.at * fps)} name={`vo ${c.file}`}>
          <Audio src={staticFile(`narration/${c.file}`)} volume={volume} />
        </Sequence>
      ))}
    </>
  );
};
