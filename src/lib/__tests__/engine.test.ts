import { describe, it, expect } from "vitest";
import { decide, summarizeByFloor } from "../engine";
import { templateAnnouncements } from "../announce";
import { NODES, EDGES, nodeById } from "../building";

describe("building graph", () => {
  it("every edge references existing nodes", () => {
    for (const e of EDGES) {
      expect(nodeById.has(e.a), e.a).toBe(true);
      expect(nodeById.has(e.b), e.b).toBe(true);
    }
  });
  it("has 24 zones, 4 exits", () => {
    expect(NODES.filter((n) => n.type === "zone")).toHaveLength(24);
    expect(NODES.filter((n) => n.type === "exit")).toHaveLength(4);
  });
});

describe("decide: threat at 2F 식당가 동", () => {
  const d = decide("2F-NE");
  const byId = Object.fromEntries(d.zones.map((z) => [z.node, z]));

  it("threat zone hides, same-floor neighbours lock down", () => {
    expect(byId["2F-NE"].action).toBe("HIDE");
    expect(byId["2F-N"].action).toBe("LOCKDOWN");
    expect(byId["2F-E"].action).toBe("LOCKDOWN");
  });
  it("blocks the east stair on 2F and the 2F escalator", () => {
    expect(d.dangerSet).toContain("ST-E-2");
    expect(d.dangerSet).toContain("ESC-2");
  });
  it("2F west side evacuates via the west stair, never through danger", () => {
    const z = byId["2F-NW"];
    expect(z.action).toBe("EVACUATE");
    expect(z.route).toContain("ST-W-2");
    for (const id of z.route!) expect(d.dangerSet).not.toContain(id);
  });
  it("1F zones all evacuate", () => {
    for (const z of d.zones.filter((z) => z.floor === 1)) expect(z.action).toBe("EVACUATE");
  });
  it("3F 주차장 통로 exits directly to E3", () => {
    expect(byId["3F-NE"].exit).toBe("EXIT-E3");
  });
  it("no evacuation route uses an elevator", () => {
    for (const z of d.zones) if (z.route) for (const id of z.route) expect(id.startsWith("EV-")).toBe(false);
  });
  it("computes in well under a second", () => {
    expect(d.computedMs).toBeLessThan(200);
  });
});

describe("decide: threat moves to 3F 중앙홀", () => {
  const d = decide("3F-S");
  const byId = Object.fromEntries(d.zones.map((z) => [z.node, z]));
  it("zones off the threat floor never route through the threat floor", () => {
    for (const z of d.zones) if (z.floor !== 3 && z.route) for (const id of z.route) expect(nodeById.get(id)!.floor === 3 && nodeById.get(id)!.type !== "exit", `${z.node} via ${id}`).toBe(false);
  });
  it("3F centre hides, 3F SW/SE lock down, 2F now evacuates", () => {
    expect(byId["3F-S"].action).toBe("HIDE");
    expect(byId["3F-SW"].action).toBe("LOCKDOWN");
    expect(byId["3F-SE"].action).toBe("LOCKDOWN");
    expect(byId["2F-NE"].action).toBe("EVACUATE");
  });
});

describe("announcements", () => {
  const d = decide("2F-NE");
  const a = templateAnnouncements(d);
  it("one announcement per floor, mentions the threat zone on its floor", () => {
    expect(a.floors).toHaveLength(3);
    expect(a.floors[1].ko).toContain("식당가 동");
    expect(a.floors[1].ko).toContain("문을 잠그");
  });
  it("floor summaries partition all zones", () => {
    const s = summarizeByFloor(d);
    const total = s.reduce((n, f) => n + f.hide.length + f.lockdown.length + f.evacuate.length + f.invacuate.length, 0);
    expect(total).toBe(24);
  });
});
