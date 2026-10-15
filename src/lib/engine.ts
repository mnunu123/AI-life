/**
 * 판단 엔진. 위험 노드 하나를 입력받아 모든 구역의 행동을 정한다.
 * 규칙이 전부다. 생성형 AI는 여기서 쓰지 않고, 문장을 만들 때만 쓴다(announce.ts).
 *
 *   위험 구역 자체          → HIDE       (가까운 매장 안으로, 문 잠금)
 *   위험 구역과 같은 층 인접  → LOCKDOWN   (지금 있는 매장 안에서 문 잠그고 대기)
 *   위험 구역을 피해 출구까지 갈 수 있음 → EVACUATE (경로 + 출구)
 *   피해서 갈 길이 없음       → INVACUATE  (실내 대피: 문에서 떨어져 대기)
 */
import { NODES, nodeById, neighbors, center, type BNode } from "./building";

export type Action = "HIDE" | "LOCKDOWN" | "EVACUATE" | "INVACUATE";

export interface ZoneDecision {
  node: string;
  floor: 1 | 2 | 3;
  name: string;
  action: Action;
  /** EVACUATE일 때 경로(노드 id 순서, 출발 구역 포함, 출구로 끝남) */
  route?: string[];
  exit?: string;
  /** 비상등·화살표 방향. 첫 이동 방향을 말로 */
  direction?: string;
  hops: number; // 위험 노드까지의 홉 수(참고용)
}

export interface Decision {
  threat: string;
  dangerSet: string[]; // 위험 + 인접
  zones: ZoneDecision[];
  computedMs: number;
}

const INF = Number.POSITIVE_INFINITY;

/** Dijkstra. blocked 집합은 지나가지 못한다. 목적지 집합 중 가장 가까운 곳까지의 경로를 돌려준다. */
export function shortestPath(
  from: string,
  targets: Set<string>,
  blocked: Set<string>,
): { path: string[]; cost: number } | null {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const done = new Set<string>();
  for (const n of NODES) dist.set(n.id, INF);
  dist.set(from, 0);

  while (true) {
    let u: string | null = null;
    let best = INF;
    for (const [id, d] of dist) {
      if (!done.has(id) && d < best) {
        best = d;
        u = id;
      }
    }
    if (u === null || best === INF) return null;
    if (targets.has(u)) {
      const path = [u];
      let cur = u;
      while (prev.has(cur)) {
        cur = prev.get(cur)!;
        path.unshift(cur);
      }
      return { path, cost: best };
    }
    done.add(u);
    for (const { id: v, cost } of neighbors(u)) {
      if (blocked.has(v) || done.has(v)) continue;
      const nd = best + cost;
      if (nd < dist.get(v)!) {
        dist.set(v, nd);
        prev.set(v, u);
      }
    }
  }
}

/** 같은 층에서 홉 수(엘리베이터 제외 edge 기준) */
export function hopsFrom(src: string): Map<string, number> {
  const d = new Map<string, number>([[src, 0]]);
  const q = [src];
  while (q.length) {
    const u = q.shift()!;
    for (const { id: v } of neighbors(u)) {
      if (!d.has(v)) {
        d.set(v, d.get(u)! + 1);
        q.push(v);
      }
    }
  }
  return d;
}

function directionWord(from: BNode, to: BNode): string {
  if (to.type === "stair") return `${to.name}`;
  // 같은 층의 에스컬레이터 노드는 '중앙 홀'을 지나가는 것이라 방향으로 말한다(탑승 아님)
  if (to.type === "escalator" && to.floor !== from.floor) return "에스컬레이터";
  if (to.type === "exit") return to.name;
  const a = center(from);
  const b = center(to);
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "동쪽" : "서쪽";
  return dy > 0 ? "남쪽" : "북쪽";
}

export function decide(threat: string): Decision {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const threatNode = nodeById.get(threat);
  if (!threatNode) throw new Error(`unknown node ${threat}`);

  // 위험 집합: 위험 노드 + 같은 층 인접 노드(구역·코어 모두)
  const dangerSet = new Set<string>([threat]);
  for (const { id } of neighbors(threat)) {
    const n = nodeById.get(id)!;
    if (n.floor === threatNode.floor && n.type !== "exit") dangerSet.add(id);
  }
  // 에스컬레이터는 위험이 타고 움직이는 동선이고 안내문도 '사용 금지'라 모든 층에서 막는다
  for (const n of NODES) if (n.type === "escalator") dangerSet.add(n.id);

  const exits = new Set(NODES.filter((n) => n.type === "exit").map((n) => n.id));
  const hops = hopsFrom(threat);

  const zones: ZoneDecision[] = [];
  for (const n of NODES) {
    if (n.type !== "zone") continue;
    const base = { node: n.id, floor: n.floor, name: n.name, hops: hops.get(n.id) ?? 99 };
    if (n.id === threat) {
      zones.push({ ...base, action: "HIDE" });
      continue;
    }
    if (dangerSet.has(n.id)) {
      zones.push({ ...base, action: "LOCKDOWN" });
      continue;
    }
    // 위험 층에 있지 않은 사람은 위험 층에 발을 들이지 않는다(그 층 전체를 막고 경로를 찾는다)
    const blocked = n.floor === threatNode.floor
      ? dangerSet
      : new Set([...dangerSet, ...NODES.filter((m) => m.floor === threatNode.floor && m.type !== "exit").map((m) => m.id)]);
    const sp = shortestPath(n.id, exits, blocked);
    if (!sp) {
      zones.push({ ...base, action: "INVACUATE" });
      continue;
    }
    const next = nodeById.get(sp.path[1])!;
    zones.push({
      ...base,
      action: "EVACUATE",
      route: sp.path,
      exit: sp.path[sp.path.length - 1],
      direction: directionWord(n, next),
    });
  }

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { threat, dangerSet: [...dangerSet], zones, computedMs: t1 - t0 };
}

/** 층별로 묶어서 안내문 생성기에 넘기기 좋은 형태 */
export interface FloorSummary {
  floor: 1 | 2 | 3;
  hide: string[];
  lockdown: string[];
  evacuate: { name: string; via: string; exit: string }[];
  invacuate: string[];
}

export function summarizeByFloor(d: Decision): FloorSummary[] {
  const out: FloorSummary[] = [1, 2, 3].map((f) => ({
    floor: f as 1 | 2 | 3, hide: [], lockdown: [], evacuate: [], invacuate: [],
  }));
  for (const z of d.zones) {
    const s = out[z.floor - 1];
    if (z.action === "HIDE") s.hide.push(z.name);
    else if (z.action === "LOCKDOWN") s.lockdown.push(z.name);
    else if (z.action === "INVACUATE") s.invacuate.push(z.name);
    else s.evacuate.push({ name: z.name, via: z.direction ?? "", exit: nodeById.get(z.exit!)!.name });
  }
  return out;
}
