import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const C = {
  bg: "#0E1118",
  panel: "#171E2B",
  line: "#2E3747",
  ink: "#E8ECF2",
  muted: "#8E98AA",
  red: "#FF4D4F",
  amber: "#F5B942",
  green: "#3DD68C",
  blue: "#5BA8FF",
};

export const FONT = "Pretendard Variable";

let loaded: Promise<void> | null = null;
export const ensureFont = () => {
  if (!loaded) {
    loaded = loadFont({ family: FONT, url: staticFile("fonts/PretendardVariable.woff2"), weight: "45 920" });
  }
  return loaded;
};

export const ease = (x: number) => 1 - Math.pow(1 - x, 3);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
