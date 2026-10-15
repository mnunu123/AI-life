// 플레이스홀더 탐지 JSON. 세준이 모델이 뽑은 실제 결과(같은 스키마)로 교체한다.
// 스키마: { placeholder, camera, fps, durationS, frames: [{ t, boxes: [{ cls, conf, x, y, w, h }] }] }  (x,y,w,h는 0~1 정규화)
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("public/detections", { recursive: true });
const fps = 30, durationS = 14;
function gen(camera, seed) {
  const frames = [];
  for (let i = 0; i < fps * durationS; i++) {
    const t = i / fps;
    const boxes = [];
    // 사람 박스(참고용)와 흉기 박스. 2초 뒤부터 등장해서 좌→우로 이동
    if (t > 2) {
      const px = 0.15 + ((t - 2) / 12) * 0.6 + 0.02 * Math.sin(t * 3 + seed);
      const py = 0.35 + 0.02 * Math.cos(t * 2 + seed);
      boxes.push({ cls: "person", conf: 0.93, x: px, y: py, w: 0.12, h: 0.45 });
      if (t > 3.2) boxes.push({ cls: "knife", conf: 0.82 + 0.08 * Math.sin(t + seed), x: px + 0.09, y: py + 0.22, w: 0.05, h: 0.08 });
    }
    frames.push({ t: +t.toFixed(3), boxes });
  }
  return { placeholder: true, camera, fps, durationS, frames };
}
for (const [cam, seed] of [["CAM-2F-03", 1], ["CAM-2F-01", 2], ["CAM-3F-01", 3]]) {
  writeFileSync(`public/detections/${cam}.json`, JSON.stringify(gen(cam, seed)));
}
console.log("ok");
