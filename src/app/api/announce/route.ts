import type { NextRequest } from "next/server";
import { decide } from "@/lib/engine";
import { buildLlmInput, templateAnnouncements, LLM_SYSTEM_PROMPT, type AnnouncementSet } from "@/lib/announce";
import { nodeById } from "@/lib/building";


/**
 * POST { threat: "2F-NE" } → AnnouncementSet
 * ANTHROPIC_API_KEY가 있으면 생성형 AI로 문장을 만들고, 없거나 실패하면 템플릿으로 돌려준다.
 * 판단(누가 어디로)은 항상 엔진이 하고, 여기서는 문장만 바꾼다.
 */
export async function POST(req: NextRequest) {
  let threat = "2F-NE";
  try {
    const body = await req.json();
    if (typeof body?.threat === "string" && nodeById.has(body.threat)) threat = body.threat;
  } catch {}

  const decision = decide(threat);
  const fallback = templateAnnouncements(decision);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json(fallback);

  const model = process.env.LLM_MODEL ?? "claude-haiku-5-5";
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system: LLM_SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(buildLlmInput(decision)) }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? "";
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const floors = fallback.floors.map((f) => {
      const g = json.floors?.find((x: { floor: number }) => x.floor === f.floor);
      return g?.ko ? { ...f, ko: String(g.ko), en: String(g.en ?? f.en) } : f;
    });
    const out: AnnouncementSet = { ...fallback, floors, source: "llm", model };
    return Response.json(out, { headers: { "x-llm-ms": String(Date.now() - t0) } });
  } catch (err) {
    console.warn("announce: llm failed, using template", (err as Error).message);
    return Response.json(fallback, { headers: { "x-llm-error": "1" } });
  }
}
