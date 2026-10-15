/**
 * 가상 3층 복합몰. 층마다 같은 footprint(800×360)를 쓰고, 세로 동선(계단·에스컬레이터·엘리베이터)이
 * 층을 잇는다. 모든 좌표는 SVG 단위. 실제 시설 데이터가 아니라 시제품용 가상 평면도다.
 */

export type NodeType = "zone" | "stair" | "escalator" | "elevator" | "exit";

export interface BNode {
  id: string;
  floor: 1 | 2 | 3;
  name: string; // 안내문에 그대로 쓰는 이름
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BEdge {
  a: string;
  b: string;
  /** 비상시 통행 비용. 계단 1, 복도 1, 에스컬레이터 3(위험 동선), 엘리베이터는 edge 없음 */
  cost: number;
}

export interface Camera {
  id: string;
  node: string;
  label: string;
}

export const FLOOR_W = 800;
export const FLOOR_H = 360;

// 공통 코어 위치
const core = {
  stW: { x: 20, y: 20, w: 70, h: 110 },
  stE: { x: 710, y: 20, w: 70, h: 110 },
  esc: { x: 340, y: 150, w: 120, h: 90 },
  ev: { x: 20, y: 250, w: 70, h: 90 },
};
const cell = {
  NW: { x: 100, y: 20, w: 230, h: 120 },
  N: { x: 340, y: 20, w: 120, h: 120 },
  NE: { x: 470, y: 20, w: 230, h: 120 },
  W: { x: 100, y: 150, w: 230, h: 90 },
  E: { x: 470, y: 150, w: 230, h: 90 },
  SW: { x: 100, y: 250, w: 230, h: 90 },
  S: { x: 340, y: 250, w: 120, h: 90 },
  SE: { x: 470, y: 250, w: 230, h: 90 },
};

function floorNodes(
  floor: 1 | 2 | 3,
  names: Record<keyof typeof cell, string>,
): BNode[] {
  const z = (k: keyof typeof cell): BNode => ({
    id: `${floor}F-${k}`,
    floor,
    name: names[k],
    type: "zone",
    ...cell[k],
  });
  return [
    z("NW"), z("N"), z("NE"), z("W"), z("E"), z("SW"), z("S"), z("SE"),
    { id: `ST-W-${floor}`, floor, name: "서쪽 계단", type: "stair", ...core.stW },
    { id: `ST-E-${floor}`, floor, name: "동쪽 계단", type: "stair", ...core.stE },
    { id: `ESC-${floor}`, floor, name: "에스컬레이터", type: "escalator", ...core.esc },
    { id: `EV-${floor}`, floor, name: "엘리베이터", type: "elevator", ...core.ev },
  ];
}

export const NODES: BNode[] = [
  ...floorNodes(1, {
    NW: "서쪽 매장", N: "북문 통로", NE: "동쪽 매장",
    W: "서쪽 복도", E: "동쪽 복도",
    SW: "카페", S: "정문 로비", SE: "편의점",
  }),
  ...floorNodes(2, {
    NW: "식당가 서", N: "북쪽 복도", NE: "식당가 동",
    W: "서쪽 복도", E: "동쪽 복도",
    SW: "의류 매장", S: "중앙홀", SE: "잡화 매장",
  }),
  ...floorNodes(3, {
    NW: "영화관 로비", N: "북쪽 복도", NE: "주차장 통로",
    W: "서쪽 복도", E: "동쪽 복도",
    SW: "서점", S: "중앙홀", SE: "식당",
  }),
  // 출구 — 평면도 바깥쪽 가장자리에 붙는다
  { id: "EXIT-E1", floor: 1, name: "정문(E1)", type: "exit", x: 360, y: 345, w: 80, h: 14 },
  { id: "EXIT-E2", floor: 1, name: "북문(E2)", type: "exit", x: 360, y: 1, w: 80, h: 14 },
  { id: "EXIT-E3", floor: 3, name: "주차장 출구(E3)", type: "exit", x: 701, y: 60, w: 8, h: 40 },
  { id: "EXIT-E4", floor: 1, name: "서쪽 비상구(E4)", type: "exit", x: 175, y: 345, w: 80, h: 14 },
];

function sameFloorEdges(f: 1 | 2 | 3): BEdge[] {
  const p = (k: string) => `${f}F-${k}`;
  const e = (a: string, b: string, cost = 1): BEdge => ({ a, b, cost });
  return [
    // 구역끼리 (격자 이웃)
    e(p("NW"), p("N")), e(p("N"), p("NE")),
    e(p("NW"), p("W")), e(p("NE"), p("E")),
    e(p("W"), p("SW")), e(p("E"), p("SE")),
    e(p("SW"), p("S")), e(p("S"), p("SE")),
    // 에스컬레이터 홀(중앙)은 N·W·E·S와 맞닿음
    e(`ESC-${f}`, p("N")), e(`ESC-${f}`, p("W")), e(`ESC-${f}`, p("E")), e(`ESC-${f}`, p("S")),
    // 계단·엘리베이터 출입
    e(`ST-W-${f}`, p("NW")), e(`ST-E-${f}`, p("NE")), e(`EV-${f}`, p("SW")),
  ];
}

export const EDGES: BEdge[] = [
  ...sameFloorEdges(1), ...sameFloorEdges(2), ...sameFloorEdges(3),
  // 세로 동선. 엘리베이터는 비상시 사용 금지라 edge를 두지 않는다.
  { a: "ST-W-1", b: "ST-W-2", cost: 1 }, { a: "ST-W-2", b: "ST-W-3", cost: 1 },
  { a: "ST-E-1", b: "ST-E-2", cost: 1 }, { a: "ST-E-2", b: "ST-E-3", cost: 1 },
  { a: "ESC-1", b: "ESC-2", cost: 3 }, { a: "ESC-2", b: "ESC-3", cost: 3 },
  // 출구
  { a: "EXIT-E1", b: "1F-S", cost: 0 },
  { a: "EXIT-E2", b: "1F-N", cost: 0 },
  { a: "EXIT-E3", b: "3F-NE", cost: 0 },
  { a: "EXIT-E4", b: "1F-SW", cost: 0 },
];

export const CAMERAS: Camera[] = [
  { id: "CAM-1F-01", node: "1F-S", label: "1F 정문 로비" },
  { id: "CAM-1F-02", node: "1F-N", label: "1F 북문 통로" },
  { id: "CAM-1F-03", node: "1F-NE", label: "1F 동쪽 매장" },
  { id: "CAM-2F-01", node: "2F-S", label: "2F 중앙홀" },
  { id: "CAM-2F-02", node: "2F-NW", label: "2F 식당가 서" },
  { id: "CAM-2F-03", node: "2F-NE", label: "2F 식당가 동" },
  { id: "CAM-2F-04", node: "2F-E", label: "2F 동쪽 복도" },
  { id: "CAM-3F-01", node: "3F-S", label: "3F 중앙홀" },
  { id: "CAM-3F-02", node: "3F-NE", label: "3F 주차장 통로" },
  { id: "CAM-ESC-2", node: "ESC-2", label: "2F 에스컬레이터" },
];

export const nodeById = new Map(NODES.map((n) => [n.id, n]));
export const cameraById = new Map(CAMERAS.map((c) => [c.id, c]));

export function neighbors(id: string): { id: string; cost: number }[] {
  const out: { id: string; cost: number }[] = [];
  for (const e of EDGES) {
    if (e.a === id) out.push({ id: e.b, cost: e.cost });
    else if (e.b === id) out.push({ id: e.a, cost: e.cost });
  }
  return out;
}

export function center(n: BNode) {
  return { cx: n.x + n.w / 2, cy: n.y + n.h / 2 };
}
