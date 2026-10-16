/**
 * 자막 = 내레이션 대본. 초 단위. 여기 글이 화면 아래 자막으로 나가고, 세준이 같은 글을 읽는다.
 * 사실 문장은 계획서 3절 근거에서 그대로 가져왔다. 숫자는 출처가 있는 것만.
 */
import timing from "./timing.json";

export interface Caption { from: number; to: number; text: string; tts?: string }  // tts: 읽기용 텍스트(숫자 읽는 법 등), 없으면 text
export type SceneKey = "open" | "iso" | "evidence" | "proposal" | "demo" | "results" | "close";

export const BASE_SCENE = {
  open: { from: 0, to: 13 },
  iso: { from: 13, to: 32 },
  evidence: { from: 32, to: 53 },
  proposal: { from: 53, to: 68 },
  demo: { from: 68, to: 113 },
  results: { from: 113, to: 133 },
  close: { from: 133, to: 155 },
} as const;

export const BASE_TOTAL = 155;

/** 데모 구간: 영상 시각 = 캡처 시각 + DEMO_OFFSET (캡처 1.0초가 영상 68.0초) */
export const DEMO_OFFSET = 67;

export const BASE_CAPTIONS: Caption[] = [
  { from: 0.6, to: 4.6, text: "2026년 10월 13일 오후 1시 48분, 인천 구월동 복합상업시설 2층 식당가." },
  { from: 4.8, to: 8.6, text: "5분이었습니다. 1층에서 2층으로, 다시 에스컬레이터로." },
  { from: 8.8, to: 12.6, text: "열 명이 다쳤습니다." },

  { from: 13.2, to: 17.2, text: "같은 층 돈가스집 종업원은 조리실에서 \"싸움인 줄 알았다\"고 했습니다." },
  { from: 17.4, to: 21.6, text: "일식집 주인은 의자를 들고 버텼고, 피해자 수는 뉴스를 보고 알았습니다." },
  { from: 21.8, to: 26.2, text: "사건을 다룬 어느 기사에도 건물 안내방송은 나오지 않습니다." },
  { from: 26.4, to: 31.6, text: "모두가 알아서 숨고, 알아서 도망쳤습니다." },

  { from: 32.2, to: 38.2, text: "재난문자는 오지 않습니다. 2023년 서현역 때 성남시는 \"발송 대상이 아니다\"라고 답했습니다." },
  { from: 38.6, to: 44.8, text: "관제요원 한 명이 CCTV 481대를 봅니다. 서울은 1,200대입니다." },
  { from: 45.2, to: 52.6, text: "지능형 CCTV는 흉기를 잡고 112에 신고합니다. 건물 안 사람들에게는 아무도 말해주지 않습니다.", tts: "지능형 CCTV는 흉기를 잡고 일일이에 신고합니다. 건물 안 사람들에게는 아무도 말해주지 않습니다." },

  { from: 53.2, to: 58.2, text: "빠진 건 탐지가 아닙니다. 탐지 뒤 60초, 누가 어디로 가야 하는가입니다." },
  { from: 58.4, to: 63.4, text: "그래서 두 칸을 만들었습니다. 어디서 났는지 찾고, 층마다 다른 안내를 만듭니다." },
  { from: 63.6, to: 67.6, text: "탐지와 방송은 지금 있는 장비를 그대로 씁니다." },

  { from: 68.2, to: 70.4, text: "시제품입니다. 가상의 3층 복합몰, 카메라 열 대." },
  { from: 71.0, to: 75.4, text: "2층 식당가 동 카메라가 흉기를 잡습니다. 판단은 1초가 안 걸립니다." },
  { from: 75.8, to: 80.4, text: "같은 층 옆 구역은 봉쇄. 서쪽은 계단으로 북문. 3층 전체는 주차장 출구. 1층은 가까운 문." },
  { from: 80.8, to: 85.4, text: "층마다 다른 안내문이 만들어지고, 그 층 방송으로 읽힙니다." },
  { from: 86.2, to: 92.6, text: "위험이 2층 중앙홀로 움직입니다. 봉쇄 구역이 바뀌고 경로가 다시 계산됩니다." },
  { from: 100.2, to: 106.6, text: "3층으로 올라가면, 2층 전체가 계단으로 내려가 북문으로 나갑니다. 위험 층에는 아무도 올라가지 않습니다." },
  { from: 108.2, to: 112.6, text: "탐지부터 안내문까지 1초 안팎. 60초는 넉넉합니다." },

  { from: 113.4, to: 119.4, text: "20명에게 물었습니다. 3층 매장에 있는데 2층 식당가에서 흉기난동이 났다면, 어디로 가겠습니까." },
  { from: 119.8, to: 126.8, text: "방송만 들은 10명 중 몇 명이 2층을 지나는 에스컬레이터를 골랐는지, 층별 안내를 받은 10명은 어땠는지." },
  { from: 127.2, to: 132.4, text: "결과는 10월 25일 실험이 끝나면 이 자리에 숫자로 넣습니다." },

  { from: 133.4, to: 139.2, text: "아직 틀립니다. 우산을 흉기로 보기도 하고, 실제 방송 장비와는 연결하지 않았습니다." },
  { from: 139.6, to: 145.2, text: "하지만 탐지에서 멈추지 않고, 건물 안 사람들에게 처음으로 말을 겁니다." },
  { from: 145.8, to: 151.0, text: "60초 안내. 다중이용시설 흉기난동 실내 대피 유도 AI." },
];

/** 설계 길이(초). 내레이션에 맞춰 늘릴 때 배율의 기준 */
export const BASE_LEN: Record<SceneKey, number> = Object.fromEntries(
  (Object.keys(BASE_SCENE) as SceneKey[]).map((k) => [k, BASE_SCENE[k].to - BASE_SCENE[k].from]),
) as Record<SceneKey, number>;

/** 씬 시작 기준 [설계초, 실제초] 꺾은선. 자막 구간마다 필요한 만큼만 늘린다 */
export type Warp = [number, number][];
interface Timing { scenes?: Record<SceneKey, { from: number; to: number; warp?: Warp }>; captions?: Caption[]; total?: number }
const T = timing as Timing;

/** 실제로 쓰는 값: tools/retime.py가 만든 timing.json이 있으면 그것, 없으면 설계값 */
export const SCENE: Record<SceneKey, { from: number; to: number }> = T.scenes ?? BASE_SCENE;
export const CAPTIONS: Caption[] = T.captions ?? BASE_CAPTIONS;
export const TOTAL_SECONDS: number = T.total ?? BASE_TOTAL;
export const WARP: Record<SceneKey, Warp> = Object.fromEntries(
  (Object.keys(BASE_SCENE) as SceneKey[]).map((k) => {
    const w = T.scenes?.[k]?.warp;
    const L0 = BASE_LEN[k];
    const L = SCENE[k].to - SCENE[k].from;
    return [k, w && w.length >= 2 ? w : [[0, 0], [L0, L]]];
  }),
) as Record<SceneKey, Warp>;

/** 설계 시각(초) → 실제 시각(초). 효과음 큐 등 설계 타임라인 기준 값을 옮길 때 */
export const mapTime = (t: number) => {
  const keys = Object.keys(BASE_SCENE) as SceneKey[];
  const k = keys.find((x) => t >= BASE_SCENE[x].from && t < BASE_SCENE[x].to) ?? "close";
  const w = WARP[k];
  const b = t - BASE_SCENE[k].from;
  let i = 0;
  while (i < w.length - 2 && b > w[i + 1][0]) i++;
  const dx = w[i + 1][0] - w[i][0];
  const s = dx > 0 ? (w[i + 1][1] - w[i][1]) / dx : 1;
  return SCENE[k].from + w[i][1] + (b - w[i][0]) * s;
};
