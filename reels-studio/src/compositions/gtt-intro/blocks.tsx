// Вариант «blocks»: буквы складываются из синих 3D-кубиков (пикселей) с «щелчком».
// Надпись растрируется в сетку 13 px; каждый занятый пиксель — лакированный кубик со скруглёнными рёбрами
// (InstancedMesh, MeshPhysicalMaterial с лаком, отражает студию). Кубики прилетают сверху и от камеры волной слева
// направо, на посадке — «щелчок» (короткий удар масштаба и вспышка). Когда все на местах — общий щелчок, по кубикам
// пробегает свет, и они «сплавляются» в гладкую надпись (кубики тают, чистая надпись проявляется поверх).
import React, {useLayoutEffect, useMemo, useRef} from "react";
import * as THREE from "three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {atDepth, CAM_Z} from "./stage3d";
import {inkAt, type Layout} from "./layout";
import {easeOutCubic, prog, rng, smooth} from "./util";

export const CELL = 13;
const PLANE_Z = 640; // кубики перед пирамидой (её передний угол не выходит дальше z ≈ 520)
const K = (CAM_Z - PLANE_Z) / CAM_Z; // масштаб, чтобы на экране клетка была ровно CELL px

type Cell = {x: number; y: number; xn: number; s: number; from: [number, number, number]; axis: THREE.Vector3; ang: number};

export const makeCells = (L: Layout): Cell[] => {
  const r = rng(777);
  const cells: Cell[] = [];
  const {l, r: right, t, b} = L.box;
  for (let y = t + CELL / 2 - 2; y < b + CELL / 2; y += CELL) {
    for (let x = l + CELL / 2 - 2; x < right + CELL / 2; x += CELL) {
      // клетка занята, если буква покрывает её центр или большую часть
      let cover = 0;
      for (const [ox, oy] of [
        [0, 0],
        [-3.5, -3.5],
        [3.5, -3.5],
        [-3.5, 3.5],
        [3.5, 3.5],
      ])
        cover += inkAt(L, x + ox, y + oy) > 128 ? 1 : 0;
      if (cover < 3) continue;
      const xn = (x - l) / (right - l);
      const line = y > (t + b) / 2 ? 1 : 0;
      cells.push({
        x,
        y,
        xn,
        s: 0.04 + xn * 0.5 + line * 0.05 + r() * 0.08,
        from: [x + (r() - 0.5) * 180, y - 260 - r() * 320, PLANE_Z + 600 + r() * 700],
        axis: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
        ang: (r() < 0.5 ? -1 : 1) * (1.6 + r() * 2.4),
      });
    }
  }
  return cells;
};

const FLY = 0.34;
export const BLOCKS_CLICK = 0.96; // общий щелчок
export const BLOCKS_MERGE: [number, number] = [1.02, 1.16]; // кубики тают, чистая надпись проявляется

const BLUE = new THREE.Color("#2563EB");
const FLASH = new THREE.Color("#E6F1FF").multiplyScalar(1.6);
const SWEEP = new THREE.Color("#BFE3FF").multiplyScalar(1.5);

// положение, поворот, масштаб и цвет кубика в момент tau (одна функция и для кадра, и для «под-кадров» размытия)
const o = new THREE.Object3D();
const col = new THREE.Color();
const cubeAt = (c: Cell, tau: number, zoom: number, box: Layout["box"], merge: number) => {
  if (tau < c.s) return null;
  const p = prog(tau, c.s, c.s + FLY);
  const e = easeOutCubic(p);
  const sweepX = box.l - 120 + (box.r - box.l + 240) * prog(tau, BLOCKS_CLICK - 0.06, BLOCKS_CLICK + 0.16);
  const sweepOn = prog(tau, BLOCKS_CLICK - 0.06, BLOCKS_CLICK) * (1 - prog(tau, BLOCKS_CLICK + 0.14, BLOCKS_CLICK + 0.2));
  const groupClick = Math.sin(Math.PI * prog(tau, BLOCKS_CLICK, BLOCKS_CLICK + 0.09));
  // точка на плоскости кубиков, которая на экране совпадает с клеткой надписи
  const [tx, ty] = atDepth(c.x, c.y, PLANE_Z);
  const [fx, fy] = atDepth(c.from[0], c.from[1], PLANE_Z);
  const click = Math.sin(Math.PI * prog(tau, c.s + FLY * 0.92, c.s + FLY + 0.1)); // удар на посадке
  o.position.set((fx + (tx - fx) * e) * zoom, (fy + (ty - fy) * e) * zoom, PLANE_Z + (c.from[2] - PLANE_Z) * (1 - e) - click * 9 - groupClick * 6);
  o.quaternion.setFromAxisAngle(c.axis, c.ang * Math.pow(1 - e, 2));
  const sc = zoom * CELL * K * (0.25 + 0.75 * e) * (1 + 0.16 * click - 0.07 * groupClick);
  o.scale.set(sc * (1 + merge * 0.1), sc * (1 + merge * 0.1), sc * (1 - merge * 0.75));
  o.updateMatrix();
  const flash = Math.sin(Math.PI * prog(tau, c.s + FLY * 0.88, c.s + FLY + 0.04));
  const sweep = sweepOn * Math.exp(-Math.pow((c.x - sweepX) / 42, 2));
  col.copy(BLUE).lerp(FLASH, flash * 0.4).lerp(SWEEP, Math.min(1, sweep * 0.6));
  return {m: o.matrix, c: col, pos: o.position.clone()};
};

const HIDDEN = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001).setPosition(0, 0, -5000);
const GHOSTS = 3; // «под-кадры» для размытия в движении (затвор 180°)

export const Blocks3D: React.FC<{cells: Cell[]; tau: number; box: Layout["box"]; zoom: number; fps: number}> = ({cells, tau, box, zoom, fps}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 3, 0.17), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const ghost = useRef<THREE.InstancedMesh>(null);
  const merge = smooth(prog(tau, BLOCKS_MERGE[0], BLOCKS_MERGE[1]));
  useLayoutEffect(() => {
    const m = mesh.current;
    const gm = ghost.current;
    if (!m || !gm) return;
    cells.forEach((c, i) => {
      const now = cubeAt(c, tau, zoom, box, merge);
      if (!now) {
        m.setMatrixAt(i, HIDDEN);
        m.setColorAt(i, BLUE);
      } else {
        m.setMatrixAt(i, now.m);
        m.setColorAt(i, now.c);
      }
      // быстрые кубики оставляют за собой полупрозрачный след из положений внутри половины кадра
      const pos = now?.pos;
      for (let j = 0; j < GHOSTS; j++) {
        const k = i * GHOSTS + j;
        const back = now ? cubeAt(c, tau - ((j + 1) / GHOSTS) * (0.5 / fps), zoom, box, merge) : null;
        if (!back || !pos || back.pos.distanceTo(pos) < 4) {
          gm.setMatrixAt(k, HIDDEN);
          gm.setColorAt(k, BLUE);
        } else {
          gm.setMatrixAt(k, back.m);
          gm.setColorAt(k, back.c);
        }
      }
    });
    m.instanceMatrix.needsUpdate = true;
    gm.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (gm.instanceColor) gm.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={mesh} args={[geo, undefined, cells.length]} frustumCulled={false}>
        <meshPhysicalMaterial
          color="#FFFFFF"
          roughness={0.34}
          metalness={0.02}
          specularIntensity={0.55}
          clearcoat={0.55}
          clearcoatRoughness={0.16}
          envMapIntensity={0.75}
          transparent
          opacity={1 - merge}
          depthWrite={merge < 0.5}
        />
      </instancedMesh>
      <instancedMesh ref={ghost} args={[geo, undefined, cells.length * GHOSTS]} frustumCulled={false}>
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} transparent opacity={0.32 * (1 - merge)} depthWrite={false} />
      </instancedMesh>
    </>
  );
};
