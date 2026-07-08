import React from "react";
import {Composition} from "remotion";
import {SagExplainer} from "./SagExplainer";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="SagExplainer"
      component={SagExplainer}
      durationInFrames={7800}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{}}
    />
  );
};
