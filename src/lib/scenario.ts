/**
 * 시연 시나리오. 인천 구월동 사건의 동선(아래층 → 2층 식당가 → 에스컬레이터로 이동)을
 * 가상 건물에 옮긴 것이다. 실제 사건 영상·인물은 쓰지 않는다.
 */
export type EventKind = "detect" | "move";

export interface ScenarioEvent {
  atMs: number;
  kind: EventKind;
  camera: string; // CAMERAS id
  note: string; // 관제 로그에 찍히는 한 줄
  clip: string; // /video/*.mp4
  detections: string; // /detections/*.json
}

export interface Scenario {
  id: string;
  title: string;
  durationMs: number;
  events: ScenarioEvent[];
}

export const SCENARIO: Scenario = {
  id: "s1",
  title: "2층 식당가 동 → 2층 중앙홀 → 3층 중앙홀",
  durationMs: 46_000,
  events: [
    {
      atMs: 4_000,
      kind: "detect",
      camera: "CAM-2F-03",
      note: "흉기 객체 탐지 · 군중 급이탈 동반",
      clip: "/video/placeholder-2F-03.mp4",
      detections: "/detections/CAM-2F-03.json",
    },
    {
      atMs: 19_000,
      kind: "move",
      camera: "CAM-2F-01",
      note: "2층 중앙홀로 이동 감지",
      clip: "/video/placeholder-2F-01.mp4",
      detections: "/detections/CAM-2F-01.json",
    },
    {
      atMs: 33_000,
      kind: "move",
      camera: "CAM-3F-01",
      note: "에스컬레이터로 3층 중앙홀 이동",
      clip: "/video/placeholder-3F-01.mp4",
      detections: "/detections/CAM-3F-01.json",
    },
  ],
};

/** t(ms) 시점에 유효한 마지막 이벤트. 아직 아무 일 없으면 null */
export function activeEvent(s: Scenario, t: number): ScenarioEvent | null {
  let cur: ScenarioEvent | null = null;
  for (const e of s.events) if (e.atMs <= t) cur = e;
  return cur;
}
