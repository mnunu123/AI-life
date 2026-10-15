"use client";
import { useEffect, useRef } from "react";
import { cameraById } from "@/lib/building";

export interface DetBox { cls: string; conf: number; x: number; y: number; w: number; h: number }
export interface DetFile { placeholder?: boolean; camera: string; fps: number; durationS: number; frames: { t: number; boxes: DetBox[] }[] }

interface Props {
  camera: string | null;
  clip: string | null;
  det: DetFile | null;
  /** 이벤트 시작 뒤 지난 시간(ms) → 클립 재생 위치 */
  sinceEventMs: number;
  capture: boolean;
  status: "idle" | "detect" | "move";
}

export function CctvPanel({ camera, clip, det, sinceEventMs, capture, status }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cam = camera ? cameraById.get(camera) : null;
  const clipT = det ? (sinceEventMs / 1000) % det.durationS : 0;

  // 영상 위치 동기화. 재생 모드에선 play()로 흘려보내고, 캡처 모드에선 currentTime을 직접 맞춘다.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return;
    if (capture) {
      v.pause();
      if (Math.abs(v.currentTime - clipT) > 0.03) v.currentTime = clipT;
    } else if (v.paused && status !== "idle") {
      v.currentTime = clipT;
      v.play().catch(() => {});
    }
  }, [clip, clipT, capture, status]);

  useEffect(() => {
    const v = videoRef.current;
    if (v && status === "idle") { v.pause(); v.currentTime = 0; }
  }, [status]);

  // 탐지 박스 오버레이
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!det || status === "idle") return;
    const frame = det.frames[Math.min(det.frames.length - 1, Math.floor(clipT * det.fps))];
    if (!frame) return;
    for (const b of frame.boxes) {
      const x = b.x * c.width, y = b.y * c.height, w = b.w * c.width, h = b.h * c.height;
      const knife = b.cls !== "person";
      ctx.lineWidth = knife ? 3 : 1.5;
      ctx.strokeStyle = knife ? "#FF4D4F" : "rgba(232,236,242,0.6)";
      ctx.strokeRect(x, y, w, h);
      const label = `${knife ? "흉기" : "사람"} ${(b.conf * 100).toFixed(0)}%`;
      ctx.font = `${knife ? "600 " : ""}14px Pretendard, sans-serif`;
      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = knife ? "#FF4D4F" : "rgba(20,26,38,0.85)";
      ctx.fillRect(x, y - 20, tw, 20);
      ctx.fillStyle = knife ? "#1A0A0A" : "#E8ECF2";
      ctx.fillText(label, x + 5, y - 5);
    }
  }, [det, clipT, status]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[15px] font-semibold">
          {cam ? `${cam.id}` : "대기 중"}
          <span className="ml-2 text-muted font-normal">{cam?.label ?? "탐지 이벤트 없음"}</span>
        </div>
        <div className={`text-[13px] font-semibold ${status === "idle" ? "text-muted" : "text-threat"}`}>
          {status === "idle" ? "평시 관제" : "● 탐지 중"}
        </div>
      </div>
      <div className="relative aspect-video rounded-md overflow-hidden bg-[#0C1017] ring-1 ring-line">
        {clip ? (
          <video ref={videoRef} muted playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover" key={clip}>
            <source src={clip.replace(/\.mp4$/, ".webm")} type="video/webm" />
            <source src={clip} type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted text-[14px]">
            시나리오를 재생하면 탐지 카메라 영상이 여기에 뜹니다
          </div>
        )}
        <canvas ref={canvasRef} width={1280} height={720} className="absolute inset-0 w-full h-full" />
        {det?.placeholder && status !== "idle" && (
          <div className="absolute left-2 bottom-2 rounded bg-black/60 px-2 py-1 text-[11px] text-muted">
            플레이스홀더 영상 · 공개 데이터셋 클립으로 교체 예정
          </div>
        )}
      </div>
    </div>
  );
}
