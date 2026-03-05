import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Furniture, FurnitureKind, Store } from "@/types/models";
import {
  snapToGrid,
  pixelToWorld,
  worldToPixel,
} from "@/lib/floor-plan-config";

const KIND_COLORS: Record<FurnitureKind, string> = {
  stairs: "#8D6E63",
  lobby: "#78909C",
  screen: "#37474F",
  pillar: "#90A4AE",
  bench: "#A1887F",
  table: "#6D4C41",
  stage: "#5D4037",
  barrier: "#CFD8DC",
  registration: "#455A64",
  restroom: "#546E7A",
  exit: "#C62828",
  column: "#607D8B",
  wall: "#37474F",
};

interface FurnitureMeshProps {
  furniture: Furniture;
  isInteractive: boolean;
  canvasWidth: number;
  canvasHeight: number;
  allFurniture: Furniture[];
  allStores: Store[];
  controlsRef: React.RefObject<{ enabled: boolean } | null>;
  onDragEnd: (furnitureId: number, x: number, y: number) => void;
  onRotate?: (furnitureId: number, rotation: number) => void;
}

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersectPoint = new THREE.Vector3();

export function FurnitureMesh({
  furniture,
  isInteractive,
  canvasWidth,
  canvasHeight,
  allFurniture,
  allStores,
  controlsRef,
  onDragEnd,
  onRotate,
}: FurnitureMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<[number, number]>([0, 0]);
  const activePointerId = useRef<number | null>(null);
  const { camera, gl, invalidate } = useThree();

  const color = KIND_COLORS[furniture.kind] ?? "#78909C";
  const w = furniture.width;
  const d = furniture.height;

  const [wx, , wz] = useMemo(
    () => pixelToWorld(furniture.x + w / 2, furniture.y + d / 2, canvasWidth, canvasHeight),
    [furniture.x, furniture.y, w, d, canvasWidth, canvasHeight],
  );

  const rotationRad = ((furniture.rotation ?? 0) * Math.PI) / 180;

  const [hovered, setHovered] = useState(false);
  const [overlapping, setOverlapping] = useState(false);

  const checkDragOverlap = useCallback(
    (groupX: number, groupZ: number) => {
      const pixel = worldToPixel(groupX, groupZ, canvasWidth, canvasHeight);
      const rawX = pixel.x - w / 2;
      const rawY = pixel.y - d / 2;
      const sx = snapToGrid(Math.max(0, Math.min(canvasWidth - w, rawX)));
      const sy = snapToGrid(Math.max(0, Math.min(canvasHeight - d, rawY)));
      for (const other of allFurniture) {
        if (other.id === furniture.id) continue;
        if (other.x === 0 && other.y === 0) continue;
        if (sx < other.x + other.width && sx + w > other.x && sy < other.y + other.height && sy + d > other.y) return true;
      }
      for (const store of allStores) {
        if (store.x === 0 && store.y === 0) continue;
        if (sx < store.x + store.width && sx + w > store.x && sy < store.y + store.height && sy + d > store.y) return true;
      }
      return false;
    },
    [allFurniture, allStores, furniture.id, w, d, canvasWidth, canvasHeight],
  );

  const getPointerIntersection = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
      return raycaster.ray.intersectPlane(groundPlane, intersectPoint);
    },
    [camera, gl],
  );

  const updateDragPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!groupRef.current) return;
      if (!getPointerIntersection(clientX, clientY)) return;

      const newX = intersectPoint.x + dragOffset.current[0];
      const newZ = intersectPoint.z + dragOffset.current[1];
      groupRef.current.position.x = newX;
      groupRef.current.position.z = newZ;

      setOverlapping(checkDragOverlap(newX, newZ));
      invalidate();
    },
    [getPointerIntersection, invalidate, checkDragOverlap],
  );

  const finishDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    activePointerId.current = null;
    setOverlapping(false);

    if (controlsRef.current) controlsRef.current.enabled = true;

    const group = groupRef.current;
    if (!group) return;

    const pixel = worldToPixel(group.position.x, group.position.z, canvasWidth, canvasHeight);
    const rawX = pixel.x - w / 2;
    const rawY = pixel.y - d / 2;
    const isOutside =
      rawX + w * 0.5 < 0 || rawY + d * 0.5 < 0 || rawX + w * 0.5 > canvasWidth || rawY + d * 0.5 > canvasHeight;
    if (isOutside) {
      onDragEnd(furniture.id, 0, 0);
    } else {
      const sx = snapToGrid(Math.max(0, Math.min(canvasWidth - w, rawX)));
      const sy = snapToGrid(Math.max(0, Math.min(canvasHeight - d, rawY)));
      onDragEnd(furniture.id, sx, sy);
    }
    invalidate();
  }, [controlsRef, canvasWidth, canvasHeight, w, d, furniture.id, onDragEnd, invalidate]);

  useEffect(() => {
    const handleWindowPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      updateDragPosition(event.clientX, event.clientY);
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (!dragging.current) return;
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      finishDrag();
    };

    const doc = gl.domElement.ownerDocument;
    doc.addEventListener("pointermove", handleWindowPointerMove);
    doc.addEventListener("pointerup", handleWindowPointerUp);
    doc.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      doc.removeEventListener("pointermove", handleWindowPointerMove);
      doc.removeEventListener("pointerup", handleWindowPointerUp);
      doc.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [gl, updateDragPosition, finishDrag]);

  const handlePointerDown = useCallback(
    (e: THREE.Event & { stopPropagation: () => void; nativeEvent: PointerEvent }) => {
      if (!isInteractive) return;
      if (e.nativeEvent.button !== 0) return;
      e.stopPropagation();
      dragging.current = true;
      activePointerId.current = e.nativeEvent.pointerId;
      if (controlsRef.current) controlsRef.current.enabled = false;
      const group = groupRef.current;
      if (group && getPointerIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY)) {
        dragOffset.current = [group.position.x - intersectPoint.x, group.position.z - intersectPoint.z];
      }
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
    },
    [isInteractive, controlsRef, getPointerIntersection],
  );

  const handlePointerMove = useCallback(
    (e: THREE.Event & { nativeEvent: PointerEvent }) => {
      if (!dragging.current || !groupRef.current) return;
      updateDragPosition(e.nativeEvent.clientX, e.nativeEvent.clientY);
    },
    [updateDragPosition],
  );

  const handlePointerUp = useCallback(
    (e: THREE.Event & { nativeEvent: PointerEvent }) => {
      if (!dragging.current) return;
      (e.nativeEvent.target as HTMLElement)?.releasePointerCapture?.(e.nativeEvent.pointerId);
      finishDrag();
    },
    [finishDrag],
  );

  const handleDoubleClick = useCallback(
    (e: THREE.Event & { stopPropagation: () => void }) => {
      if (!isInteractive || !onRotate) return;
      e.stopPropagation();
      const next = ((furniture.rotation ?? 0) + 90) % 360;
      onRotate(furniture.id, next);
    },
    [isInteractive, onRotate, furniture.id, furniture.rotation],
  );

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    gl.domElement.style.cursor = isInteractive ? "grab" : "default";
  }, [isInteractive, gl]);

  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    gl.domElement.style.cursor = "default";
  }, [gl]);

  const fontSize = Math.min(5, Math.max(2.5, Math.min(w, d) * 0.08));
  const kindH = getKindHeight(furniture.kind, w, d);

  return (
    <group
      ref={groupRef}
      position={[wx, 0, wz]}
      rotation={[0, rotationRad, 0]}
      onPointerDown={handlePointerDown as any}
      onPointerMove={handlePointerMove as any}
      onPointerUp={handlePointerUp as any}
      onDoubleClick={handleDoubleClick as any}
      onPointerEnter={handlePointerEnter as any}
      onPointerLeave={handlePointerLeave as any}
    >
      <KindGeometry kind={furniture.kind} w={w} d={d} color={color} />

      {/* Label on top */}
      <Text
        position={[0, kindH + 0.5, -d * 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontSize}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        maxWidth={Math.max(w, d) - 2}
      >
        {furniture.name}
      </Text>

      {/* Kind label */}
      <Text
        position={[0, kindH + 0.5, d * 0.15]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontSize * 0.6}
        color="rgba(255,255,255,0.7)"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
      >
        {furniture.kind.toUpperCase()}
      </Text>

      {/* Overlap warning */}
      {overlapping && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 4, d + 4]} />
          <meshBasicMaterial color="#FF0000" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      {/* Hover highlight */}
      {hovered && !overlapping && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 4, d + 4]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function getKindHeight(kind: FurnitureKind, _w: number, _d: number): number {
  switch (kind) {
    case "stairs": return 8;
    case "lobby": return 1;
    case "screen": return 15;
    case "pillar": return 20;
    case "bench": return 4;
    case "table": return 5;
    case "stage": return 4;
    case "barrier": return 10;
    case "registration": return 5;
    case "restroom": return 8;
    case "exit": return 8;
    case "column": return 18;
    case "wall": return 10;
    default: return 3;
  }
}

function KindGeometry({ kind, w, d, color }: { kind: FurnitureKind; w: number; d: number; color: string }) {
  switch (kind) {
    case "stairs":
      return (
        <group>
          {[0, 1, 2, 3, 4].map((step) => (
            <mesh key={step} position={[0, step * 1.6 + 0.8, (2 - step) * (d / 5)]}>
              <boxGeometry args={[w, 1.6, d / 5]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
          {/* Handrails */}
          <mesh position={[-w / 2 + 0.3, 5, 0]}>
            <boxGeometry args={[0.6, 10, d + 2]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
          <mesh position={[w / 2 - 0.3, 5, 0]}>
            <boxGeometry args={[0.6, 10, d + 2]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
        </group>
      );

    case "lobby":
      return (
        <group>
          {/* Floor area — slight elevation */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[w, 0.6, d]} />
            <meshStandardMaterial color="#B0BEC5" />
          </mesh>
          {/* Decorative border */}
          <mesh position={[0, 0.8, -d / 2 + 0.5]}>
            <boxGeometry args={[w, 1, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.8, d / 2 - 0.5]}>
            <boxGeometry args={[w, 1, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );

    case "screen":
      return (
        <group>
          {/* Stand post */}
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[2, 10, 2]} />
            <meshStandardMaterial color="#424242" />
          </mesh>
          {/* Frame */}
          <mesh position={[0, 12, 0]}>
            <boxGeometry args={[w, 7, 2]} />
            <meshStandardMaterial color="#212121" />
          </mesh>
          {/* Screen surface (glowing) */}
          <mesh position={[0, 12, 1.1]}>
            <boxGeometry args={[w - 3, 5.5, 0.1]} />
            <meshStandardMaterial color="#1565C0" emissive="#1565C0" emissiveIntensity={0.4} />
          </mesh>
        </group>
      );

    case "pillar":
      return (
        <group>
          {/* Base */}
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[Math.min(w, d) / 2 + 1, Math.min(w, d) / 2 + 1, 1, 8]} />
            <meshStandardMaterial color="#78909C" />
          </mesh>
          {/* Column */}
          <mesh position={[0, 10, 0]}>
            <cylinderGeometry args={[Math.min(w, d) / 2, Math.min(w, d) / 2, 20, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Capital */}
          <mesh position={[0, 20.5, 0]}>
            <cylinderGeometry args={[Math.min(w, d) / 2 + 1, Math.min(w, d) / 2, 1, 8]} />
            <meshStandardMaterial color="#78909C" />
          </mesh>
        </group>
      );

    case "column":
      return (
        <group>
          {/* Structural column — square */}
          <mesh position={[0, 9, 0]}>
            <boxGeometry args={[w, 18, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Base plate */}
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[w + 2, 0.4, d + 2]} />
            <meshStandardMaterial color="#455A64" />
          </mesh>
        </group>
      );

    case "bench":
      return (
        <group>
          {/* Seat */}
          <mesh position={[0, 2.2, 0.5]}>
            <boxGeometry args={[w, 1, d - 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 3.8, -d / 2 + 0.5]}>
            <boxGeometry args={[w, 2.2, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Legs */}
          {[[-w / 2 + 1.5, 1, -d / 2 + 1], [w / 2 - 1.5, 1, -d / 2 + 1], [-w / 2 + 1.5, 1, d / 2 - 1], [w / 2 - 1.5, 1, d / 2 - 1]].map(
            ([lx, ly, lz], i) => (
              <mesh key={i} position={[lx, ly, lz]}>
                <boxGeometry args={[1.2, 2, 1.2]} />
                <meshStandardMaterial color="#3E2723" />
              </mesh>
            ),
          )}
        </group>
      );

    case "table":
      return (
        <group>
          {/* Tabletop */}
          <mesh position={[0, 4.2, 0]}>
            <boxGeometry args={[w, 0.6, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Legs */}
          {[[-w / 2 + 1.5, 2, -d / 2 + 1.5], [w / 2 - 1.5, 2, -d / 2 + 1.5], [-w / 2 + 1.5, 2, d / 2 - 1.5], [w / 2 - 1.5, 2, d / 2 - 1.5]].map(
            ([lx, ly, lz], i) => (
              <mesh key={i} position={[lx, ly, lz]}>
                <boxGeometry args={[1, 4, 1]} />
                <meshStandardMaterial color="#3E2723" />
              </mesh>
            ),
          )}
        </group>
      );

    case "stage":
      return (
        <group>
          {/* Platform */}
          <mesh position={[0, 2, 0]}>
            <boxGeometry args={[w, 4, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Stage front trim */}
          <mesh position={[0, 0.3, d / 2 - 0.5]}>
            <boxGeometry args={[w + 2, 0.6, 1]} />
            <meshStandardMaterial color="#4E342E" />
          </mesh>
          {/* Stage steps */}
          <mesh position={[0, 1, d / 2 + 3]}>
            <boxGeometry args={[w * 0.3, 2, 5]} />
            <meshStandardMaterial color="#5D4037" />
          </mesh>
        </group>
      );

    case "barrier":
      return (
        <group>
          {/* Posts */}
          {Array.from({ length: Math.max(2, Math.round(w / 15)) }, (_, i) => {
            const spacing = w / (Math.max(2, Math.round(w / 15)) - 1);
            return (
              <mesh key={i} position={[-w / 2 + i * spacing, 4, 0]}>
                <cylinderGeometry args={[0.6, 0.6, 8, 8]} />
                <meshStandardMaterial color="#757575" />
              </mesh>
            );
          })}
          {/* Top rail */}
          <mesh position={[0, 7, 0]}>
            <boxGeometry args={[w, 0.8, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Mid rail */}
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[w, 0.5, d * 0.8]} />
            <meshStandardMaterial color="#BDBDBD" />
          </mesh>
        </group>
      );

    case "registration":
      return (
        <group>
          {/* Long counter desk */}
          <mesh position={[0, 3, 0]}>
            <boxGeometry args={[w, 6, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Desk surface (lighter) */}
          <mesh position={[0, 6.1, 0]}>
            <boxGeometry args={[w + 1, 0.3, d + 1]} />
            <meshStandardMaterial color="#78909C" />
          </mesh>
          {/* Back panel (signage area) */}
          <mesh position={[0, 8, -d / 2 - 0.5]}>
            <boxGeometry args={[w, 5, 1]} />
            <meshStandardMaterial color="#263238" />
          </mesh>
        </group>
      );

    case "restroom":
      return (
        <group>
          {/* Enclosed room */}
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[w, 8, d]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Door opening (front face cutout illusion) */}
          <mesh position={[0, 3, d / 2 + 0.1]}>
            <boxGeometry args={[w * 0.35, 5, 0.2]} />
            <meshStandardMaterial color="#37474F" />
          </mesh>
          {/* Roof */}
          <mesh position={[0, 8.2, 0]}>
            <boxGeometry args={[w + 1, 0.4, d + 1]} />
            <meshStandardMaterial color="#455A64" />
          </mesh>
        </group>
      );

    case "exit":
      return (
        <group>
          {/* Door frame */}
          <mesh position={[-w / 2 + 1, 4, 0]}>
            <boxGeometry args={[2, 8, d]} />
            <meshStandardMaterial color="#B71C1C" />
          </mesh>
          <mesh position={[w / 2 - 1, 4, 0]}>
            <boxGeometry args={[2, 8, d]} />
            <meshStandardMaterial color="#B71C1C" />
          </mesh>
          <mesh position={[0, 8, 0]}>
            <boxGeometry args={[w, 1, d]} />
            <meshStandardMaterial color="#B71C1C" />
          </mesh>
          {/* EXIT sign */}
          <mesh position={[0, 9, 0]}>
            <boxGeometry args={[w * 0.8, 2, 1]} />
            <meshStandardMaterial color="#D32F2F" emissive="#F44336" emissiveIntensity={0.5} />
          </mesh>
          {/* Floor area */}
          <mesh position={[0, 0.15, 0]}>
            <boxGeometry args={[w, 0.3, d]} />
            <meshStandardMaterial color="#FFCDD2" />
          </mesh>
        </group>
      );

    case "wall":
      return (
        <mesh position={[0, 5, 0]}>
          <boxGeometry args={[w, 10, d]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );

    default:
      return (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[w, 4, d]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
  }
}
