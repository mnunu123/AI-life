/**
 * 안내문. 템플릿 생성기는 서버 라우트의 폴백이자 테스트 기준이다.
 * 생성형 AI는 같은 입력(FloorSummary)을 받아 더 자연스러운 문장을 만든다.
 */
import { nodeById } from "./building";
import type { Decision, FloorSummary } from "./engine";
import { summarizeByFloor } from "./engine";
import { eunNeun, euro } from "./ko";

export interface FloorAnnouncement {
  floor: 1 | 2 | 3;
  ko: string;
  en: string;
  /** 비상등 방향 요약: 구역명 → 방향 */
  lights: { zone: string; direction: string }[];
}

export interface AnnouncementSet {
  threatFloor: 1 | 2 | 3;
  threatName: string;
  floors: FloorAnnouncement[];
  source: "template" | "llm";
  model?: string;
}

const join = (names: string[]) => names.join(", ");

/** 같은 경로(방향+출구)끼리 묶는다. */
function groupEvac(ev: FloorSummary["evacuate"]) {
  const m = new Map<string, string[]>();
  for (const e of ev) {
    const k = `${e.via}|${e.exit}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(e.name);
  }
  return [...m.entries()].map(([k, names]) => {
    const [via, exit] = k.split("|");
    return { names, via, exit };
  });
}

/** 출구만으로 묶는다(위험이 없는 층용). */
function groupByExit(ev: FloorSummary["evacuate"]) {
  const m = new Map<string, string[]>();
  for (const e of ev) {
    if (!m.has(e.exit)) m.set(e.exit, []);
    m.get(e.exit)!.push(e.name);
  }
  return [...m.entries()].map(([exit, names]) => ({ exit, names }));
}

export function templateAnnouncements(d: Decision): AnnouncementSet {
  const threat = nodeById.get(d.threat)!;
  const floors = summarizeByFloor(d).map<FloorAnnouncement>((s) => {
    const ko: string[] = [];
    const en: string[] = [];
    const onThreatFloor = s.floor === threat.floor;

    if (onThreatFloor) {
      ko.push(`${s.floor}층 ${threat.name}에서 위험 상황입니다.`);
      en.push(`Danger at ${threat.name} on floor ${s.floor}.`);
    } else {
      ko.push(`${threat.floor}층에서 위험 상황입니다. ${s.floor}층은 가까운 출구로 나가세요.`);
      en.push(`Danger on floor ${threat.floor}. Floor ${s.floor}, leave by the nearest exit.`);
    }
    if (s.hide.length) {
      ko.push(`${join(s.hide)}에 계신 분은 가장 가까운 매장으로 들어가 문을 잠그세요.`);
      en.push(`If you are in ${join(s.hide)}, enter the nearest shop and lock the door.`);
    }
    if (s.lockdown.length) {
      const n = join(s.lockdown);
      ko.push(`${n}${eunNeun(n)} 지금 있는 매장 안에서 문을 잠그고 움직이지 마세요.`);
      en.push(`${n}: stay inside, lock the door, do not move.`);
    }
    if (onThreatFloor) {
      for (const g of groupEvac(s.evacuate)) {
        const n = join(g.names);
        if (g.via === g.exit) {
          ko.push(`${n}${eunNeun(n)} 바로 ${g.exit}${euro(g.exit)} 나가세요.`);
          en.push(`${n}: exit now via ${g.exit}.`);
        } else {
          ko.push(`${n}${eunNeun(n)} ${g.via}${euro(g.via)} 이동해 ${g.exit}${euro(g.exit)} 나가세요.`);
          en.push(`${n}: go ${g.via}, then exit via ${g.exit}.`);
        }
      }
    } else {
      const groups = groupByExit(s.evacuate);
      if (groups.length === 1 && !s.hide.length && !s.lockdown.length && !s.invacuate.length) {
        const g = groups[0];
        ko.push(`${s.floor}층 전체는 ${g.exit}${euro(g.exit)} 나가세요.`);
        en.push(`Everyone on floor ${s.floor}: exit via ${g.exit}.`);
      } else {
        for (const g of groups) {
          const n = join(g.names);
          ko.push(`${n}${eunNeun(n)} ${g.exit}${euro(g.exit)} 나가세요.`);
          en.push(`${n}: exit via ${g.exit}.`);
        }
      }
    }
    if (s.invacuate.length) {
      const n = join(s.invacuate);
      ko.push(`${n}${eunNeun(n)} 출입문에서 떨어져 안에서 대기하세요.`);
      en.push(`${n}: stay away from doors and wait inside.`);
    }
    ko.push("에스컬레이터와 엘리베이터는 사용하지 마세요.");
    en.push("Do not use escalators or elevators.");

    const lights = d.zones
      .filter((z) => z.floor === s.floor && z.action === "EVACUATE")
      .map((z) => ({ zone: z.name, direction: z.direction ?? "" }));
    return { floor: s.floor, ko: ko.join(" "), en: en.join(" "), lights };
  });
  return { threatFloor: threat.floor, threatName: threat.name, floors, source: "template" };
}

/** LLM에 넘길 입력. 엔진 결과를 그대로 주되, 문장만 만들게 한다. */
export function buildLlmInput(d: Decision) {
  const threat = nodeById.get(d.threat)!;
  return {
    threat: { floor: threat.floor, zone: threat.name },
    floors: summarizeByFloor(d).map((s) => ({
      floor: s.floor,
      hide: s.hide,
      lockdown: s.lockdown,
      evacuate: groupEvac(s.evacuate),
      invacuate: s.invacuate,
    })),
  };
}

export const LLM_SYSTEM_PROMPT = `너는 다중이용시설 관제실의 안내방송 작성기다.
입력은 판단 엔진이 이미 정한 결과다. 행동(숨기/봉쇄/대피/실내 대피), 경로, 출구를 바꾸거나 빼거나 더하지 마라.
층마다 안내문 하나를 쓴다. 규칙:
- 한국어 안내문은 2~4문장, 100자 안팎. 첫 문장은 어디에서 무슨 일인지. 그다음 구역 이름을 부르며 할 일.
- 위험이 있는 층은 구역마다 구체적으로, 위험이 없는 층은 출구별로 묶어서 짧게.
- 쉬운 말. 존댓말. 비유·감탄·위로 금지. "침착하게"는 쓰지 않는다.
- 에스컬레이터·엘리베이터 사용 금지를 마지막에 한 번.
- 영어는 한 문장으로 요약.
- 출력은 JSON만: {"floors":[{"floor":1,"ko":"...","en":"..."},{"floor":2,...},{"floor":3,...}]}`;
