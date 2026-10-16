"""
내레이션 길이에 맞춰 타임라인을 다시 잡는다.

입력: public/narration/manifest.json (make_tts.py가 만든 것), src/script.ts의 BASE_SCENE·BASE_CAPTIONS
출력: src/timing.json  { scenes, captions, total }   ← script.ts가 이걸 읽는다
      src/narration.json [{ file, at, dur }]        ← Main의 <Narration>이 이걸 읽는다

규칙
- 데모 구간은 실시간 캡처라 길이 45초 고정. 자막은 앵커 시각보다 앞당기지 않고, 겹치면 뒤로 민다.
- 나머지 씬은 자막 구간별로 늘린다(워프): 자막 i의 구간이 내레이션+숨 만큼 안 되면 그 구간만 늘리고, 줄이진 않는다.
  씬 안의 애니메이션은 FrameScale(warp)로 그 구간만 같은 비율로 느려진다.
- 자막 표시 창 = 내레이션 시작 ~ 끝 + 0.3초 (다음 자막 시작 전까지).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GAP = 0.45      # 문장 사이 숨
TAIL = 0.6      # 씬 끝 여유
DEMO_LEN = 45.0


def read_base():
    src = open(os.path.join(ROOT, "src", "script.ts"), encoding="utf-8").read()
    sc = {}
    for m in re.finditer(r"(\w+):\s*\{\s*from:\s*([\d.]+),\s*to:\s*([\d.]+)\s*\}", src.split("BASE_SCENE = {", 1)[1].split("} as const", 1)[0]):
        sc[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    return sc


def main(man_path):
    man = json.load(open(man_path, encoding="utf-8"))
    base = read_base()
    order = ["open", "iso", "evidence", "proposal", "demo", "results", "close"]
    by_scene = {k: [] for k in order}
    for m in man:
        for k in order:
            a, b = base[k]
            if a <= m["base_from"] < b:
                by_scene[k].append(m)
                break

    scenes, caps, clips = {}, [], []
    cursor = 0.0
    for k in order:
        a, b = base[k]
        L0 = b - a
        items = sorted(by_scene[k], key=lambda m: m["base_from"])
        offs = [m["base_from"] - a for m in items]
        durs = [m["dur"] for m in items]

        if k == "demo":
            s = 1.0
            L = DEMO_LEN
            starts = []
            prev_end = 0.0
            for o, d in zip(offs, durs):
                st = max(o, prev_end + GAP)
                starts.append(st)
                prev_end = st + d
            if prev_end + TAIL > L:
                print(f"[경고] 데모 자막이 {prev_end + TAIL:.1f}초로 45초를 넘습니다. 데모 클립 tempo를 올려 다시 생성하세요.", file=sys.stderr)
        else:
            # 구간별 워프: 자막 i의 구간 [offs[i], offs[i+1])을 내레이션이 들어갈 만큼만 늘린다(줄이진 않는다).
            # 첫 자막 앞 구간은 그대로.
            warp = [(0.0, 0.0)]
            acc = 0.0
            edges = [0.0] + offs + [L0]
            starts = []
            for i in range(len(edges) - 1):
                b0, b1 = edges[i], edges[i + 1]
                base_len = b1 - b0
                if i == 0:
                    need = base_len
                else:
                    j = i - 1
                    need = durs[j] + (GAP if j + 1 < len(items) else TAIL)
                    starts.append(acc)
                act_len = max(base_len, need)
                acc += act_len
                warp.append((round(b1, 3), round(acc, 3)))
            L = acc
            s = L / L0 if L0 else 1.0

        scenes[k] = {"from": round(cursor, 3), "to": round(cursor + L, 3), "stretch": round(s, 4)}
        if k != "demo":
            scenes[k]["warp"] = [[a, b] for a, b in warp]
        for i, (m, st) in enumerate(zip(items, starts)):
            at = cursor + st
            nxt_start = cursor + starts[i + 1] if i + 1 < len(items) else cursor + L
            to = min(at + m["dur"] + 0.3, nxt_start - 0.1)
            caps.append({"from": round(at, 3), "to": round(to, 3), "text": m["text"]})
            clips.append({"file": m["file"], "at": round(at, 3), "dur": m["dur"]})
        print(f"{k:9s} base {L0:5.1f}s → {L:5.1f}s  (x{s:.2f})  자막 {len(items)}")
        cursor += L

    total = round(cursor, 2)
    json.dump({"scenes": {k: {kk: vv for kk, vv in v.items() if kk != "stretch"} for k, v in scenes.items()}, "captions": caps, "total": total},
              open(os.path.join(ROOT, "src", "timing.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(clips, open(os.path.join(ROOT, "src", "narration.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"총 길이 {total:.1f}초 ({int(total // 60)}분 {total % 60:.0f}초)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "public", "narration", "manifest.json"))
