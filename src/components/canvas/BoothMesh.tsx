import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Store } from "@/types/models";
import {
  FEET_TO_PIXELS,
  STATUS_COLORS,
  TYPE_COLORS,
  snapToGrid,
  pixelToWorld,
  worldToPixel,
} from "@/lib/floor-plan-config";

interface BoothMeshProps {
  store: Store;
  status: "available" | "reserved" | "booked";
  isInteractive: boolean;
  isDraggable: boolean;
  canvasWidth: number;
  canvasHeight: number;
  otherStores: Store[];
  controlsRef: React.RefObject<{ enabled: boolean } | null>;
  onDragStart?: () => void;
  onDragEnd: (storeId: number, x: number, y: number) => void;
  onClick: (store: Store) => void;
  onRotate?: (storeId: number, rotation: number) => void;
  onPointerEnter?: (store: Store, clientX: number, clientY: number) => void;
  onPointerLeave?: () => void;
}

const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const intersectPoint = new THREE.Vector3();

function darken(hex: string, factor: number): string {
  const cleaned = hex.replace("#", "");
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

export function BoothMesh({
  store,
  status,
  isInteractive,
  isDraggable,
  canvasWidth,
  canvasHeight,
  controlsRef,
  onDragStart,
  onDragEnd,
  onClick,
  onRotate,
  otherStores,
  onPointerEnter,
  onPointerLeave,
}: BoothMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<[number, number]>([0, 0]);
  const activePointerId = useRef<number | null>(null);
  const { camera, gl, invalidate } = useThree();

  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.available;
  const typeColor = TYPE_COLORS[store.type] ?? "#5B9EC4";

  const w = store.width;
  const d = store.height; // depth in 3D (z-axis)

  // Dimensions in feet for display
  const wFt = w / FEET_TO_PIXELS;
  const dFt = d / FEET_TO_PIXELS;

  // Wall heights scaled to booth size
  const WALL_H = Math.min(14, Math.max(6, Math.min(w, d) * 0.14));
  const SIDE_H = WALL_H * 0.6;
  const FRONT_H = WALL_H * 0.35;
  const COUNTER_H = WALL_H * 0.28;
  const FLOOR_H = 0.5;
  const WALL_T = 1; // wall thickness

  // Position: convert pixel center to world coords
  const [wx, , wz] = useMemo(
    () => pixelToWorld(store.x + w / 2, store.y + d / 2, canvasWidth, canvasHeight),
    [store.x, store.y, w, d, canvasWidth, canvasHeight],
  );

  // Rotation in radians (store.rotation is degrees: 0, 90, 180, 270)
  const rotationRad = ((store.rotation ?? 0) * Math.PI) / 180;

  // Status colors
  const statusEmissive = useMemo(() => {
    if (status === "booked") return "#EF5350";
    if (status === "reserved") return "#FFC107";
    return "#4CAF50";
  }, [status]);

  const statusLabel = status === "booked" ? "BOOKED" : status === "reserved" ? "RESERVED" : "OPEN";

  // ── Pointer events for dragging ──────────────────────────

  const [hovered, setHovered] = useState(false);
  const [overlapping, setOverlapping] = useState(false);

  // Check if current world position overlaps any other store
  const checkDragOverlap = useCallback(
    (groupX: number, groupZ: number) => {
      const pixel = worldToPixel(groupX, groupZ, canvasWidth, canvasHeight);
      const rawX = pixel.x - w / 2;
      const rawY = pixel.y - d / 2;
      const sx = snapToGrid(Math.max(0, Math.min(canvasWidth - w, rawX)));
      const sy = snapToGrid(Math.max(0, Math.min(canvasHeight - d, rawY)));
      for (const other of otherStores) {
        if (other.id === store.id) continue;
        if (other.x === 0 && other.y === 0) continue;
        if (
          sx < other.x + other.width &&
          sx + w > other.x &&
          sy < other.y + other.height &&
          sy + d > other.y
        ) {
          return true;
        }
      }
      return false;
    },
    [otherStores, store.id, w, d, canvasWidth, canvasHeight],
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
      rawX + w * 0.5 < 0 ||
      rawY + d * 0.5 < 0 ||
      rawX + w * 0.5 > canvasWidth ||
      rawY + d * 0.5 > canvasHeight;

    if (isOutside) {
      onDragEnd(store.id, 0, 0);
    } else {
      const sx = snapToGrid(Math.max(0, Math.min(canvasWidth - w, rawX)));
      const sy = snapToGrid(Math.max(0, Math.min(canvasHeight - d, rawY)));
      onDragEnd(store.id, sx, sy);
    }

    invalidate();
  }, [controlsRef, canvasWidth, canvasHeight, w, d, store.id, onDragEnd, invalidate]);

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
      if (!isDraggable) return;
      if (e.nativeEvent.button !== 0) return; // left-click only
      e.stopPropagation();

      dragging.current = true;
      activePointerId.current = e.nativeEvent.pointerId;
      onDragStart?.();

      if (controlsRef.current) controlsRef.current.enabled = false;
      const group = groupRef.current;
      if (group && getPointerIntersection(e.nativeEvent.clientX, e.nativeEvent.clientY)) {
        dragOffset.current = [group.position.x - intersectPoint.x, group.position.z - intersectPoint.z];
      }

      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
    },
    [isDraggable, controlsRef, onDragStart, getPointerIntersection],
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

  const handleClick = useCallback(
    (e: THREE.Event & { stopPropagation: () => void }) => {
      if (dragging.current) return;
      e.stopPropagation();
      onClick(store);
    },
    [onClick, store],
  );

  const handleDoubleClick = useCallback(
    (e: THREE.Event & { stopPropagation: () => void }) => {
      if (!isDraggable || !onRotate) return;
      e.stopPropagation();
      const current = store.rotation ?? 0;
      const next = (current + 90) % 360;
      onRotate(store.id, next);
    },
    [isDraggable, onRotate, store.id, store.rotation],
  );

  const handlePointerEnter = useCallback(
    (e: THREE.Event & { nativeEvent: PointerEvent }) => {
      setHovered(true);
      gl.domElement.style.cursor = isDraggable ? "grab" : "pointer";
      onPointerEnter?.(store, e.nativeEvent.clientX, e.nativeEvent.clientY);
    },
    [isDraggable, gl, onPointerEnter, store],
  );

  const handlePointerLeaveHandler = useCallback(() => {
    setHovered(false);
    gl.domElement.style.cursor = "default";
    onPointerLeave?.();
  }, [gl, onPointerLeave]);

  const sideColor = darken(typeColor, 0.75);
  const frontColor = darken(typeColor, 0.6);
  const counterColor = darken(typeColor, 0.55);

  // Font sizes scaled to booth dimensions
  const fontName = Math.min(6, Math.max(3, w * 0.065));
  const fontType = Math.min(4, Math.max(2, w * 0.04));
  const fontPrice = Math.min(5, Math.max(2.5, w * 0.05));
  const fontId = Math.min(10, Math.max(4, w * 0.1));
  const fontDims = Math.min(3.5, Math.max(2, w * 0.035));
  const fontStatus = Math.min(3.5, Math.max(2, w * 0.035));

  // Text Y position (flat on booth floor, just above surface)
  const textY = FLOOR_H + 0.15;

  return (
    <group
      ref={groupRef}
      position={[wx, 0, wz]}
      rotation={[0, rotationRad, 0]}
      onPointerDown={handlePointerDown as any}
      onPointerMove={handlePointerMove as any}
      onPointerUp={handlePointerUp as any}
      onClick={handleClick as any}
      onDoubleClick={handleDoubleClick as any}
      onPointerEnter={handlePointerEnter as any}
      onPointerLeave={handlePointerLeaveHandler as any}
    >
      {/* ── Floor base ── */}
      <mesh position={[0, FLOOR_H / 2, 0]}>
        <boxGeometry args={[w, FLOOR_H, d]} />
        <meshStandardMaterial color={colors.fill} />
      </mesh>

      {/* ── Type accent stripe along top edge of floor ── */}
      <mesh position={[0, FLOOR_H + 0.05, -d / 2 + 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 3]} />
        <meshBasicMaterial color={typeColor} depthWrite={false} />
      </mesh>

      {/* ── Back wall (tallest, type-colored) ── */}
      <mesh position={[0, WALL_H / 2, -d / 2 + WALL_T / 2]}>
        <boxGeometry args={[w, WALL_H, WALL_T]} />
        <meshStandardMaterial color={typeColor} />
      </mesh>

      {/* ── Left wall ── */}
      <mesh position={[-w / 2 + WALL_T / 2, SIDE_H / 2, 0]}>
        <boxGeometry args={[WALL_T, SIDE_H, d]} />
        <meshStandardMaterial color={sideColor} />
      </mesh>

      {/* ── Right wall ── */}
      <mesh position={[w / 2 - WALL_T / 2, SIDE_H / 2, 0]}>
        <boxGeometry args={[WALL_T, SIDE_H, d]} />
        <meshStandardMaterial color={sideColor} />
      </mesh>

      {/* ── Front wall (low facade) ── */}
      <mesh position={[0, FRONT_H / 2, d / 2 - WALL_T / 2]}>
        <boxGeometry args={[w, FRONT_H, WALL_T]} />
        <meshStandardMaterial color={frontColor} />
      </mesh>

      {/* ── Counter / reception desk (inside, near front) ── */}
      <mesh position={[0, COUNTER_H / 2, d / 2 - 3]}>
        <boxGeometry args={[w * 0.7, COUNTER_H, 2]} />
        <meshStandardMaterial color={counterColor} />
      </mesh>

      {/* ── Status sphere on top-right of back wall ── */}
      <mesh position={[w / 2 - 3, WALL_H + 2, -d / 2 + 1]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshStandardMaterial
          color={statusEmissive}
          emissive={statusEmissive}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* ═══ BACK WALL SIGNAGE (visible when rotated to see walls) ═══ */}

      {/* Name on back wall (front face, facing into booth / towards viewer) */}
      <Text
        position={[0, WALL_H * 0.55, -d / 2 + WALL_T / 2 + 0.1]}
        fontSize={Math.min(6, w * 0.07)}
        color="#FFFFFF"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 4}
      >
        {store.name}
      </Text>

      {/* Number watermark on back wall */}
      <Text
        position={[0, WALL_H * 0.3, -d / 2 + WALL_T / 2 + 0.05]}
        fontSize={Math.min(10, w * 0.12)}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.15}
        fontWeight="bold"
      >
        #{store.id}
      </Text>

      {/* Type + Price on back wall */}
      <Text
        position={[0, WALL_H * 0.75, -d / 2 + WALL_T / 2 + 0.1]}
        fontSize={Math.min(3.5, w * 0.04)}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.85}
      >
        {store.type.toUpperCase()} · ${store.cost}
      </Text>

      {/* Name on back wall (rear face, facing outward) */}
      <Text
        position={[0, WALL_H * 0.55, -d / 2 - WALL_T / 2 - 0.1]}
        rotation={[0, Math.PI, 0]}
        fontSize={Math.min(6, w * 0.07)}
        color="#FFFFFF"
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 4}
      >
        {store.name}
      </Text>

      {/* Number watermark on back wall rear */}
      <Text
        position={[0, WALL_H * 0.3, -d / 2 - WALL_T / 2 - 0.05]}
        rotation={[0, Math.PI, 0]}
        fontSize={Math.min(10, w * 0.12)}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.15}
        fontWeight="bold"
      >
        #{store.id}
      </Text>

      {/* ═══ FLAT LABELS ON BOOTH FLOOR (visible from top-down) ═══ */}

      {/* Booth number watermark — large, semi-transparent, centered */}
      <Text
        position={[0, textY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontId}
        color={typeColor}
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.18}
        fontWeight="bold"
      >
        #{store.id}
      </Text>

      {/* Store name — bold, top area */}
      <Text
        position={[0, textY, -d * 0.2]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontName}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        maxWidth={w - 6}
      >
        {store.name}
      </Text>

      {/* Type label — smaller, below name */}
      <Text
        position={[0, textY, -d * 0.04]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontType}
        color="#666666"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        {store.type.toUpperCase()}
      </Text>

      {/* Price — bold, center area */}
      <Text
        position={[0, textY, d * 0.12]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontPrice}
        color="#222222"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        ${store.cost}
      </Text>

      {/* Dimensions — bottom area */}
      <Text
        position={[0, textY, d * 0.28]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontDims}
        color="#777777"
        anchorX="center"
        anchorY="middle"
      >
        {wFt}x{dFt} ft
      </Text>

      {/* Status badge — flat colored pill on floor */}
      <mesh position={[0, FLOOR_H + 0.08, d * 0.40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[Math.min(w * 0.6, 30), fontStatus * 2.5]} />
        <meshBasicMaterial color={colors.badge} depthWrite={false} transparent opacity={0.9} />
      </mesh>
      <Text
        position={[0, FLOOR_H + 0.12, d * 0.40]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={fontStatus}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {statusLabel}
      </Text>

      {/* Direction arrow — points toward front (positive Z) */}
      <mesh position={[0, FLOOR_H + 0.1, d * 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 3, 3, 1, 0, Math.PI * 2]} />
        <meshBasicMaterial color={typeColor} transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Triangle arrow pointing to front */}
      <mesh position={[0, FLOOR_H + 0.12, d * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 3]} />
        <meshBasicMaterial color={typeColor} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Overlap warning (red) ── */}
      {overlapping && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 4, d + 4]} />
          <meshBasicMaterial
            color="#FF0000"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* ── Hover highlight ── */}
      {hovered && !overlapping && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w + 4, d + 4]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={0.15}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
