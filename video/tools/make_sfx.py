"""
효과음을 코드로 합성한다. 외부 샘플 없이 numpy/scipy만 쓴다.
출력: video/public/sfx/*.wav (44.1 kHz, 16-bit, 스테레오)
"""
import numpy as np
from scipy import signal
from scipy.io import wavfile
import os

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sfx")
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    sus = max(0, n - a - d - r)
    e = np.concatenate([
        np.linspace(0, 1, max(a, 1)),
        np.linspace(1, s, max(d, 1)),
        np.full(sus, s),
        np.linspace(s, 0, max(r, 1)),
    ])
    return e[:n] if len(e) >= n else np.pad(e, (0, n - len(e)))


def lowpass(x, fc, order=4):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def highpass(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def bandpass(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def brown(n):
    w = rng.standard_normal(n)
    b = np.cumsum(w)
    b -= np.linspace(b[0], b[-1], n)
    return b / (np.max(np.abs(b)) + 1e-9)


def tail(x, delays=(0.06, 0.13, 0.21), gains=(0.35, 0.2, 0.1)):
    """아주 짧은 잔향 흉내"""
    out = x.copy()
    for d, g in zip(delays, gains):
        k = int(d * SR)
        y = np.zeros_like(x)
        y[k:] = x[:-k] * g
        out += lowpass(y, 5000)
    return out


def norm(x, peak_db):
    x = x / (np.max(np.abs(x)) + 1e-9)
    return x * (10 ** (peak_db / 20))


def stereo(x, pan=0.0, width=0.0):
    """pan -1..1, width: 좌우 미세 지연으로 넓힘"""
    l = x * np.sqrt(0.5 * (1 - pan))
    r = x * np.sqrt(0.5 * (1 + pan))
    if width > 0:
        k = int(width * SR)
        r = np.concatenate([np.zeros(k), r[:-k]])
    return np.stack([l, r], axis=1)


def save(name, st):
    st = np.clip(st, -1, 1)
    wavfile.write(os.path.join(OUT, name), SR, (st * 32767).astype(np.int16))
    print("wrote", name, f"{st.shape[0] / SR:.2f}s")


# ---------- 1. 오프닝 드론 (14초) ----------
def drone(dur=30):
    t = t_axis(dur)
    sub = 0.6 * np.sin(2 * np.pi * 48 * t) + 0.35 * np.sin(2 * np.pi * 96.5 * t) + 0.15 * np.sin(2 * np.pi * 144 * t)
    trem = 1 + 0.08 * np.sin(2 * np.pi * 0.35 * t)
    noise = lowpass(brown(len(t)), 220) * 0.5
    x = (sub * trem + noise)
    e = np.minimum(1, t / 3.0)
    return norm(x * e, -16)


# ---------- 2. 시계 틱 ----------
def tick(freq=420, dur=0.09, click=True):
    t = t_axis(dur)
    tone = np.sin(2 * np.pi * freq * t) * np.exp(-t * 55)
    x = tone
    if click:
        c = rng.standard_normal(len(t)) * np.exp(-t * 900)
        x = x + bandpass(c, 1800, 5000) * 0.6
    return norm(x, -14)


# ---------- 3. 둔탁한 저음 (thud) ----------
def thud(dur=0.7, f0=70, f1=34):
    t = t_axis(dur)
    f = f0 * (f1 / f0) ** (t / 0.25)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7)
    n = lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 40) * 0.5
    return norm(tail(x + n), -6)


# ---------- 4. 전환 휘시 ----------
def whoosh(dur=0.7):
    n = int(SR * dur)
    t = t_axis(dur)
    w = rng.standard_normal(n)
    # 중심 주파수 400 → 2800 → 700
    fc = 400 + 2400 * np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5
    # 블록별 밴드패스 (간단한 스윕)
    out = np.zeros(n)
    blk = 1024
    for i in range(0, n, blk):
        f = float(np.clip(fc[i], 150, 6000))
        seg = w[i:i + blk]
        b, a = signal.butter(2, [max(50, f * 0.6) / (SR / 2), min(SR / 2 - 100, f * 1.5) / (SR / 2)], "band")
        out[i:i + blk] = signal.lfilter(b, a, seg)
    env = np.sin(np.pi * t / dur) ** 2
    return norm(out * env, -13)


# ---------- 5. 탐지 알림 ----------
def alert():
    def beep(f, d):
        t = t_axis(d)
        x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 3 * f * t)
        return x * env_adsr(len(t), 0.005, 0.02, 0.8, 0.03)
    gap = np.zeros(int(0.06 * SR))
    x = np.concatenate([beep(1046, 0.07), gap, beep(1318, 0.11), np.zeros(int(0.35 * SR))])
    return norm(tail(x), -9)


# ---------- 6. 안내방송 차임 (딩동댕) ----------
def chime():
    notes = [(659.25, 0.0), (523.25, 0.32), (783.99, 0.64)]
    dur = 1.7
    x = np.zeros(int(SR * dur))
    for f, st in notes:
        t = t_axis(dur - st)
        tone = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 3.2)
        k = int(st * SR)
        x[k:k + len(tone)] += tone
    return norm(tail(x, (0.08, 0.17, 0.29), (0.3, 0.18, 0.1)), -11)


# ---------- 7. UI 블립 ----------
def blip(f0=880, f1=1240, dur=0.13, db=-18):
    t = t_axis(dur)
    f = f0 + (f1 - f0) * np.minimum(1, t / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_adsr(len(t), 0.004, 0.03, 0.5, 0.07)
    return norm(x, db)


def confirm():
    a = blip(660, 660, 0.12, -16)
    b = blip(990, 990, 0.22, -16)
    return np.concatenate([a, np.zeros(int(0.02 * SR)), b])


def deny():
    t = t_axis(0.28)
    x = signal.square(2 * np.pi * 150 * t) * 0.5 + np.sin(2 * np.pi * 150 * t)
    x = lowpass(x, 1200) * env_adsr(len(t), 0.005, 0.05, 0.7, 0.1)
    return norm(x, -15)


# ---------- 8. 타이핑 ----------
def typing(dur, rate, db=-22):
    n = int(SR * dur)
    x = np.zeros(n)
    times = np.arange(0, dur, 1 / rate) + rng.uniform(-0.006, 0.006, size=int(dur * rate) + 1)[: len(np.arange(0, dur, 1 / rate))]
    for ti in times:
        k = int(max(0, ti) * SR)
        c = rng.standard_normal(int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / SR * 700)
        c = bandpass(c, 2500, 7000) * rng.uniform(0.5, 1.0)
        if k + len(c) < n:
            x[k:k + len(c)] += c
    return norm(x, db)


# ---------- 9. 카운터 래칫 ----------
def ratchet(dur=2.4, rate=38):
    n = int(SR * dur)
    x = np.zeros(n)
    tt = np.arange(0, dur, 1 / rate)
    for i, ti in enumerate(tt):
        k = int(ti * SR)
        f = 1200 + 900 * (i / len(tt))
        t = t_axis(0.02)
        c = np.sin(2 * np.pi * f * t) * np.exp(-t * 350)
        if k + len(c) < n:
            x[k:k + len(c)] += c
    return norm(x, -20)


# ---------- 10. 배경 패드 ----------
def pad(freqs, dur, attack=2.5, release=2.0, db=-26, shimmer=0.25):
    t = t_axis(dur)
    x = np.zeros(len(t))
    for i, f in enumerate(freqs):
        det = 1 + 0.0025 * (i % 2 * 2 - 1)
        lfo = 1 + 0.06 * np.sin(2 * np.pi * (0.07 + 0.013 * i) * t + i)
        x += (np.sin(2 * np.pi * f * det * t) + 0.5 * np.sin(2 * np.pi * f / det * t + 0.3) + shimmer * np.sin(2 * np.pi * 2 * f * t)) * lfo / len(freqs)
    # 아주 느린 필터 움직임
    x = lowpass(x, 900)
    e = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / release)
    return norm(x * e, db)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    save("drone_open.wav", stereo(drone(), 0, 0.0004))
    save("tick.wav", stereo(tick()))
    save("tick_soft.wav", stereo(tick(520, 0.06, False) * 0.5))
    save("thud.wav", stereo(thud()))
    save("whoosh.wav", stereo(whoosh(), 0, 0.0009))
    save("alert.wav", stereo(alert()))
    save("chime.wav", stereo(chime(), 0, 0.0006))
    save("blip.wav", stereo(blip()))
    save("confirm.wav", stereo(confirm()))
    save("deny.wav", stereo(deny()))
    save("typing_fast.wav", stereo(typing(4.0, 18.75)))
    save("typing_slow.wav", stereo(typing(2.0, 7.5, -18)))
    save("ratchet.wav", stereo(ratchet(5.0, 38)))
    # A단조 → 문제 구간, Cmaj7 → 제안·데모·결과, F→C 해결 → 마무리
    save("pad_problem.wav", stereo(pad([110, 130.81, 164.81, 220], 140, 3, 0.01, -27, 0.2), 0, 0.0007))
    save("pad_solution.wav", stereo(pad([130.81, 164.81, 196, 246.94, 329.63], 160, 3, 0.01, -27, 0.3), 0, 0.0007))
    save("pad_close.wav", stereo(pad([174.61, 220, 261.63, 349.23, 523.25], 60, 2.5, 0.01, -24, 0.35), 0, 0.0007))
