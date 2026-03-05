import { useMemo } from "react";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import {
  FLOOR_COLORS,
  buildFloorPlan,
  pixelToWorld,
} from "@/lib/floor-plan-config";

interface FloorPlaneProps {
  width: number;
  height: number;
}

export function FloorPlane({ width, height }: FloorPlaneProps) {
  const plan = useMemo(() => buildFloorPlan(width, height), [width, height]);

  // Build grid lines (minor every 50px, major every 100px)
  const gridLines = useMemo(() => {
    const lines: { points: [number, number, number][]; major: boolean }[] = [];
    for (let x = 0; x <= width; x += 50) {
      const [wx1, , wz1] = pixelToWorld(x, 0, width, height);
      const [wx2, , wz2] = pixelToWorld(x, height, width, height);
      lines.push({ points: [[wx1, 0.05, wz1], [wx2, 0.05, wz2]], major: x % 100 === 0 });
    }
    for (let y = 0; y <= height; y += 50) {
      const [wx1, , wz1] = pixelToWorld(0, y, width, height);
      const [wx2, , wz2] = pixelToWorld(width, y, width, height);
      lines.push({ points: [[wx1, 0.05, wz1], [wx2, 0.05, wz2]], major: y % 100 === 0 });
    }
    return lines;
  }, [width, height]);

  // Zone planes
  const zones = useMemo(
    () =>
      plan.zones.map((z) => {
        const [cx, , cz] = pixelToWorld(z.x + z.w / 2, z.y + z.h / 2, width, height);
        return { ...z, cx, cz };
      }),
    [plan.zones, width, height],
  );

  // Pillars
  const pillars = useMemo(
    () =>
      plan.pillars.map((p) => {
        const [cx, , cz] = pixelToWorld(p.x, p.y, width, height);
        return { ...p, cx, cz };
      }),
    [plan.pillars, width, height],
  );

  // Wall boundary corners
  const wallPoints = useMemo(() => {
    const tl = pixelToWorld(0, 0, width, height);
    const tr = pixelToWorld(width, 0, width, height);
    const br = pixelToWorld(width, height, width, height);
    const bl = pixelToWorld(0, height, width, height);
    return [
      [tl[0], 0.1, tl[2]] as [number, number, number],
      [tr[0], 0.1, tr[2]] as [number, number, number],
      [br[0], 0.1, br[2]] as [number, number, number],
      [bl[0], 0.1, bl[2]] as [number, number, number],
      [tl[0], 0.1, tl[2]] as [number, number, number],
    ];
  }, [width, height]);

  // Entrance arrows
  const arrowData = useMemo(() => {
    return plan.arrows.map((a) => {
      const [x1, , z1] = pixelToWorld(a.points[0], a.points[1], width, height);
      const [x2, , z2] = pixelToWorld(a.points[2], a.points[3], width, height);
      return {
        points: [
          [x1, 0.15, z1] as [number, number, number],
          [x2, 0.15, z2] as [number, number, number],
        ],
      };
    });
  }, [plan.arrows, width, height]);

  // Title position
  const titlePos = useMemo(() => {
    const [tx, , tz] = pixelToWorld(width - 100, 20, width, height);
    return [tx, 0.15, tz] as [number, number, number];
  }, [width, height]);

  return (
    <group>
      {/* Ground mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={FLOOR_COLORS.hallBg} />
      </mesh>

      {/* Grid lines */}
      {gridLines.map((line, i) => (
        <Line
          key={`grid-${i}`}
          points={line.points}
          color={line.major ? FLOOR_COLORS.gridMajor : FLOOR_COLORS.grid}
          lineWidth={line.major ? 1 : 0.5}
          transparent
          opacity={line.major ? 0.25 : 0.1}
        />
      ))}

      {/* Wall boundary */}
      <Line
        points={wallPoints}
        color={FLOOR_COLORS.wall}
        lineWidth={3}
      />

      {/* Zones */}
      {zones.map((zone) => (
        <group key={zone.id}>
          {/* Zone fill */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.cx, 0.02, zone.cz]}>
            <planeGeometry args={[zone.w, zone.h]} />
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={0.06}
              depthWrite={false}
            />
          </mesh>
          {/* Zone border */}
          <Line
            points={[
              [zone.cx - zone.w / 2, 0.08, zone.cz - zone.h / 2],
              [zone.cx + zone.w / 2, 0.08, zone.cz - zone.h / 2],
              [zone.cx + zone.w / 2, 0.08, zone.cz + zone.h / 2],
              [zone.cx - zone.w / 2, 0.08, zone.cz + zone.h / 2],
              [zone.cx - zone.w / 2, 0.08, zone.cz - zone.h / 2],
            ]}
            color="rgba(255,255,255,0.3)"
            lineWidth={1}
            transparent
            opacity={0.4}
          />
          {/* Zone label */}
          <Text
            position={[zone.cx, 0.12, zone.cz]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={zone.id === "poster" ? 7 : 9}
            color={zone.labelColor}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            letterSpacing={0.08}
          >
            {zone.label}
          </Text>
        </group>
      ))}

      {/* Entrance arrows */}
      {arrowData.map((arrow, i) => (
        <Line
          key={`arrow-${i}`}
          points={arrow.points}
          color="#FFFFFF"
          lineWidth={2}
          transparent
          opacity={0.5}
        />
      ))}

      {/* Pillars */}
      {pillars.map((pillar, i) => (
        <mesh key={`pillar-${i}`} position={[pillar.cx, 3, pillar.cz]}>
          <cylinderGeometry args={[pillar.radius, pillar.radius, 6, 16]} />
          <meshStandardMaterial
            color={FLOOR_COLORS.pillar}
          />
        </mesh>
      ))}

      {/* Structural grid label */}
      {(() => {
        const [lx, , lz] = pixelToWorld(
          plan.pillarBoxLabel.x + 40,
          plan.pillarBoxLabel.y + 9,
          width,
          height,
        );
        return (
          <Text
            position={[lx, 0.12, lz]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={6}
            color={FLOOR_COLORS.labelMuted}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            letterSpacing={0.1}
          >
            STRUCTURAL GRID
          </Text>
        );
      })()}

      {/* Title watermark */}
      <Text
        position={titlePos}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={12}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        letterSpacing={0.2}
        fillOpacity={0.15}
      >
        EXHIBITION HALL
      </Text>
    </group>
  );
}
