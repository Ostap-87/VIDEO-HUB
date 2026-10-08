// Превью бренда Aura Robotics: логотип-печать и маскот проходят все жесты (композиция AuraPreview в Studio).
import React from "react";
import {AbsoluteFill} from "remotion";
import {AuraBadge} from "./AuraBadge";
import {AuraMascot, type MascotPlan} from "./AuraMascot";

const plan: MascotPlan = {
  stays: [
    {at: 1.2, x: 760, y: 1500, face: -0.3},
    {at: 4.2, x: 300, y: 1500, face: 0.4},
    {at: 7.0, x: 300, y: 900, face: 0.4},
    {at: 11.0, x: 760, y: 1500, face: -0.3},
  ],
  gestures: [
    {at: 1.4, kind: "wave"},
    {at: 4.4, kind: "present"},
    {at: 5.8, kind: "push"},
    {at: 7.2, kind: "tick"},
    {at: 8.2, kind: "point"},
    {at: 11.2, kind: "jump"},
    {at: 13.0, kind: "scan"},
  ],
};

export const AuraPreview: React.FC = () => (
  <AbsoluteFill style={{background: "linear-gradient(180deg, #F8F6F3, #E9E6E1)"}}>
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(38,38,38,0.07) 2px, transparent 2px), linear-gradient(90deg, rgba(38,38,38,0.07) 2px, transparent 2px)",
        backgroundSize: "90px 90px",
      }}
    />
    <div style={{position: "absolute", top: 90, left: "50%", translate: "-50% 0"}}>
      <AuraBadge size={250} />
    </div>
    <AuraMascot plan={plan} />
  </AbsoluteFill>
);
