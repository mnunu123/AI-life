import { Composition } from "remotion";
import { Main, FPS, DURATION_FRAMES, defaultProps } from "./Main";

export const Root = () => (
  <Composition id="Main" component={Main} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={defaultProps} />
);
