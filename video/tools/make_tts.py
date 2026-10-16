"""
자막 대본(src/script.ts의 BASE_CAPTIONS)을 Typecast API로 읽어 narration/NN.wav + manifest.json을 만든다.

사용:
  export TYPECAST_API_KEY=...            # 키는 환경변수로만. 레포에 넣지 않는다.
  python tools/make_tts.py voices         # 음성 목록을 narration/voices.json에 저장하고 남성 음성 후보를 출력
  python tools/make_tts.py sample --voice <voice_id> [--text "..."]   # 한 문장만 뽑아 sample_<voice>.wav 로 (음성 고를 때)
  python tools/make_tts.py gen --voice <voice_id> [--tempo 1.0] [--out public/narration]
  python tools/make_tts.py manifest [--out public/narration]   # 이미 있는 wav로 manifest만 다시

표준 라이브러리만 쓴다(requests 불필요). 세준 컴퓨터에서도 그대로 돌아간다.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
API = "https://api.typecast.ai"


def key():
    k = os.environ.get("TYPECAST_API_KEY")
    if not k:
        sys.exit("TYPECAST_API_KEY 환경변수가 없습니다.")
    return k


def captions():
    """script.ts에서 BASE_CAPTIONS를 읽는다. { from, to, text } 순서대로."""
    src = open(os.path.join(ROOT, "src", "script.ts"), encoding="utf-8").read()
    body = src.split("BASE_CAPTIONS: Caption[] = [", 1)[1].split("\n];", 1)[0]
    out = []
    for m in re.finditer(r'from:\s*([\d.]+),\s*to:\s*([\d.]+),\s*text:\s*"((?:[^"\\]|\\.)*)"', body):
        out.append({"from": float(m.group(1)), "to": float(m.group(2)), "text": m.group(3).replace('\\"', '"')})
    if not out:
        sys.exit("자막을 못 읽었습니다. script.ts 형식을 확인하세요.")
    return out


def req(path, data=None, accept_bytes=False, timeout=90):
    r = urllib.request.Request(API + path, method="POST" if data is not None else "GET")
    r.add_header("X-API-KEY", key())
    r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, data=json.dumps(data).encode() if data is not None else None, timeout=timeout) as resp:
            b = resp.read()
            return b if accept_bytes else json.loads(b)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} {path}: {e.read()[:500]!r}")


def wav_duration(path):
    if path.lower().endswith(".wav"):
        with wave.open(path, "rb") as w:
            return w.getnframes() / w.getframerate()
    # mp3 등은 ffprobe
    import subprocess
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def find_clip(out, i):
    for ext in ("wav", "mp3"):
        p = os.path.join(out, f"{i:02d}.{ext}")
        if os.path.exists(p):
            return p
    return None


def cmd_voices(args):
    data = req("/v1/voices")
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "voices.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    items = data if isinstance(data, list) else data.get("voices") or data.get("data") or []
    print(f"{len(items)}개 음성. 남성/한국어로 보이는 것:")
    for v in items:
        s = json.dumps(v, ensure_ascii=False)
        if re.search(r'"(gender|sex)"\s*:\s*"?(male|m)\b', s, re.I) or re.search(r"male", s, re.I):
            print(" ", v.get("voice_id") or v.get("id"), "|", v.get("voice_name") or v.get("name"), "|", v.get("model"), "|", (v.get("emotions") or "")[:60] if isinstance(v.get("emotions"), str) else v.get("emotions"))
    print("전체 목록은", os.path.join(args.out, "voices.json"))


def write_manifest(out, caps):
    man = []
    for i, c in enumerate(caps):
        p = find_clip(out, i)
        if not p:
            continue
        man.append({"file": os.path.basename(p), "idx": i, "text": c["text"], "base_from": c["from"], "base_to": c["to"], "dur": round(wav_duration(p), 3)})
    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    total = sum(m["dur"] for m in man)
    print(f"manifest: {len(man)}개, 총 {total:.1f}초")
    return man


def cmd_gen(args):
    caps = captions()
    os.makedirs(args.out, exist_ok=True)
    for i, c in enumerate(caps):
        fn = os.path.join(args.out, f"{i:02d}.wav")
        if os.path.exists(fn) and not args.force:
            print("skip", fn)
            continue
        body = {
            "voice_id": args.voice,
            "text": c["text"],
            "model": args.model,
            "language": "kor",
            "prompt": {"emotion_preset": args.emotion, "emotion_intensity": 1},
            "output": {"volume": 100, "audio_pitch": 0, "audio_tempo": args.tempo, "audio_format": "wav"},
            "seed": 42,
        }
        audio = req("/v1/text-to-speech", body, accept_bytes=True)
        with open(fn, "wb") as f:
            f.write(audio)
        print(f"{i:02d} {wav_duration(fn):5.2f}s  {c['text'][:40]}")
        time.sleep(0.3)
    write_manifest(args.out, caps)


def cmd_sample(args):
    os.makedirs(args.out, exist_ok=True)
    text = args.text or "빠진 건 탐지가 아닙니다. 탐지 뒤 60초, 누가 어디로 가야 하는가입니다."
    body = {
        "voice_id": args.voice, "text": text, "model": args.model, "language": "kor",
        "prompt": {"emotion_preset": args.emotion, "emotion_intensity": 1},
        "output": {"volume": 100, "audio_pitch": 0, "audio_tempo": args.tempo, "audio_format": "wav"}, "seed": 42,
    }
    audio = req("/v1/text-to-speech", body, accept_bytes=True)
    fn = os.path.join(args.out, f"sample_{args.voice}.wav")
    open(fn, "wb").write(audio)
    print("wrote", fn, f"{wav_duration(fn):.2f}s")


def cmd_manifest(args):
    write_manifest(args.out, captions())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("voices"); p.add_argument("--out", default=os.path.join(ROOT, "public", "narration"))
    p = sub.add_parser("gen")
    p.add_argument("--voice", required=True)
    p.add_argument("--model", default="ssfm-v30")
    p.add_argument("--emotion", default="normal")
    p.add_argument("--tempo", type=float, default=1.0)
    p.add_argument("--force", action="store_true")
    p.add_argument("--out", default=os.path.join(ROOT, "public", "narration"))
    p = sub.add_parser("sample")
    p.add_argument("--voice", required=True)
    p.add_argument("--text")
    p.add_argument("--model", default="ssfm-v30")
    p.add_argument("--emotion", default="normal")
    p.add_argument("--tempo", type=float, default=1.0)
    p.add_argument("--out", default=os.path.join(ROOT, "public", "narration"))
    p = sub.add_parser("manifest"); p.add_argument("--out", default=os.path.join(ROOT, "public", "narration"))
    a = ap.parse_args()
    {"voices": cmd_voices, "sample": cmd_sample, "gen": cmd_gen, "manifest": cmd_manifest}[a.cmd](a)
