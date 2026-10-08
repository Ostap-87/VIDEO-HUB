import React from "react";
import {AbsoluteFill} from "remotion";
import {WavingFlag3D} from "./Flags";
export const FlagTest: React.FC = () => (
  <AbsoluteFill style={{background: "#000"}}>
    <WavingFlag3D src="интернет-материалы/флаги/cn-2560.png" at={0} until={10} />
  </AbsoluteFill>
);
