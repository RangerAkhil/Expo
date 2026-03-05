import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ZoomIn, ZoomOut, Maximize, RotateCcw } from "lucide-react";
import type { EventSettings, Store, Product, Furniture } from "@/types/models";
import { useUpdateStore } from "@/hooks/use-stores";
import { useUpdateFurniture } from "@/hooks/use-furniture";
import { FurnitureMesh } from "@/components/canvas/FurnitureMesh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { snapToGrid, worldToPixel } from "@/lib/floor-plan-config";
import { FloorPlane } from "@/components/canvas/FloorPlane";
import { BoothMesh } from "@/components/canvas/BoothMesh";
import { BoothTooltip } from "@/components/canvas/BoothTooltip";
import { SceneControls, type CameraApi } from "@/components/canvas/SceneControls";

interface GroundLayoutProps {
  settings: EventSettings;
  stores: Store[];
  furniture?: Furniture[];
  isInteractive?: boolean;
  onStoreClick?: (store: Store) => void;
  currentUserCartId?: number;
  allProducts?: Product[];
  currentUserId?: number | null;
  onRequestDeleteStore?: (store: Store, bookedCount: number) => void;
}

/** Apply initial zoom once on mount. */
function ZoomSyncer({ fitZoom }: { fitZoom: number }) {
  const { camera, invalidate } = useThree();
  const applied = useRef(false);

  useEffect(() => {
    if (!applied.current) {
      (camera as THREE.OrthographicCamera).zoom = fitZoom;
      camera.updateProjectionMatrix();
      invalidate();
      applied.current = true;
    }
  }, [fitZoom, camera, invalidate]);

  return null;
}

export function GroundLayout({
  settings,
  stores,
  furniture = [],
  isInteractive = true,
  onStoreClick,
  allProducts = [],
}: GroundLayoutProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cameraApiRef = useRef<CameraApi>(null);
  const updateStore = useUpdateStore();
  const updateFurnitureMutation = useUpdateFurniture();

  const [containerWidth, setContainerWidth] = useState(800);
  const [fitZoom, setFitZoom] = useState(1);

  // Fixed canvas height based on aspect ratio
  const canvasHeight = Math.min(700, Math.round(containerWidth * (settings.height / settings.width)));

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    store: Store | null;
    status: string;
    x: number;
    y: number;
    visible: boolean;
  }>({ store: null, status: "", x: 0, y: 0, visible: false });

  const placedStores = stores.filter((s) => s.x !== 0 || s.y !== 0);
  const placedFurniture = furniture.filter((f) => f.x !== 0 || f.y !== 0);

  // ── Responsive sizing ──────────────────────────────────────
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const cw = entry.contentRect.width;
      if (cw > 0) {
        setContainerWidth(cw);
        const ch = Math.min(700, Math.round(cw * (settings.height / settings.width)));
        const zoomX = cw / settings.width;
        const zoomY = ch / settings.height;
        setFitZoom(Math.min(zoomX, zoomY) * 0.9);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.width, settings.height]);

  // ── Overlap detection (checks both stores and furniture) ─
  const checkOverlap = useCallback(
    (itemId: number, x: number, y: number, w: number, h: number, kind: "store" | "furniture" = "store"): boolean => {
      for (const other of stores) {
        if (kind === "store" && other.id === itemId) continue;
        if (other.x === 0 && other.y === 0) continue;
        if (x < other.x + other.width && x + w > other.x && y < other.y + other.height && y + h > other.y) {
          return true;
        }
      }
      for (const other of furniture) {
        if (kind === "furniture" && other.id === itemId) continue;
        if (other.x === 0 && other.y === 0) continue;
        if (x < other.x + other.width && x + w > other.x && y < other.y + other.height && y + h > other.y) {
          return true;
        }
      }
      return false;
    },
    [stores, furniture],
  );

  // ── Utilization ──────────────────────────────────────────
  const totalArea = settings.width * settings.height;
  const usedArea = placedStores.reduce((acc, s) => acc + s.width * s.height, 0)
    + placedFurniture.reduce((acc, f) => acc + f.width * f.height, 0);
  const utilization = Math.min(100, Math.round((usedArea / totalArea) * 100)) || 0;

  // ── Sidebar DnD bridge ──────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!isInteractive) return;
      e.preventDefault();

      const rect = wrapperRef.current?.getBoundingClientRect();
      const api = cameraApiRef.current;
      if (!rect || !api) return;

      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const cam = api.getCamera();
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(ndcX, ndcY), cam);
      const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (!rc.ray.intersectPlane(ground, hit)) return;
      const pixel = worldToPixel(hit.x, hit.z, settings.width, settings.height);

      // Handle store drops
      const storeId = e.dataTransfer.getData("storeId");
      if (storeId) {
        const id = parseInt(storeId, 10);
        const store = stores.find((s) => s.id === id);
        if (!store) return;
        const x = snapToGrid(Math.max(0, Math.min(settings.width - store.width, pixel.x - store.width / 2)));
        const y = snapToGrid(Math.max(0, Math.min(settings.height - store.height, pixel.y - store.height / 2)));
        if (checkOverlap(id, x, y, store.width, store.height, "store")) return;
        updateStore.mutate({ id, x, y });
        return;
      }

      // Handle furniture drops
      const furnitureId = e.dataTransfer.getData("furnitureId");
      if (furnitureId) {
        const id = parseInt(furnitureId, 10);
        const item = furniture.find((f) => f.id === id);
        if (!item) return;
        const x = snapToGrid(Math.max(0, Math.min(settings.width - item.width, pixel.x - item.width / 2)));
        const y = snapToGrid(Math.max(0, Math.min(settings.height - item.height, pixel.y - item.height / 2)));
        if (checkOverlap(id, x, y, item.width, item.height, "furniture")) return;
        updateFurnitureMutation.mutate({ id, x, y });
      }
    },
    [isInteractive, stores, furniture, settings, updateStore, updateFurnitureMutation, checkOverlap],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isInteractive) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [isInteractive],
  );

  // ── Booth drag callbacks ────────────────────────────────
  const handleBoothDragStart = useCallback(() => {}, []);

  const handleBoothDragEnd = useCallback(
    (storeId: number, x: number, y: number) => {
      if (x === 0 && y === 0) {
        updateStore.mutate({ id: storeId, x: 0, y: 0 });
        return;
      }
      const store = stores.find((s) => s.id === storeId);
      if (!store) return;
      if (checkOverlap(storeId, x, y, store.width, store.height, "store")) {
        updateStore.mutate({ id: storeId, x: store.x, y: store.y });
        return;
      }
      updateStore.mutate({ id: storeId, x, y });
    },
    [updateStore, stores, checkOverlap],
  );

  // ── Furniture drag callbacks ──────────────────────────
  const handleFurnitureDragEnd = useCallback(
    (furnitureId: number, x: number, y: number) => {
      if (x === 0 && y === 0) {
        updateFurnitureMutation.mutate({ id: furnitureId, x: 0, y: 0 });
        return;
      }
      const item = furniture.find((f) => f.id === furnitureId);
      if (!item) return;
      if (checkOverlap(furnitureId, x, y, item.width, item.height, "furniture")) {
        updateFurnitureMutation.mutate({ id: furnitureId, x: item.x, y: item.y });
        return;
      }
      updateFurnitureMutation.mutate({ id: furnitureId, x, y });
    },
    [updateFurnitureMutation, furniture, checkOverlap],
  );

  const handleFurnitureRotate = useCallback(
    (furnitureId: number, rotation: number) => {
      updateFurnitureMutation.mutate({ id: furnitureId, rotation });
    },
    [updateFurnitureMutation],
  );

  // ── Booth rotate (right-click in organizer mode) ───────
  const handleBoothRotate = useCallback(
    (storeId: number, rotation: number) => {
      updateStore.mutate({ id: storeId, rotation });
    },
    [updateStore],
  );

  // ── Booth click ─────────────────────────────────────────
  const handleBoothClick = useCallback(
    (store: Store) => {
      onStoreClick?.(store);
    },
    [onStoreClick],
  );

  // ── Tooltip handlers ────────────────────────────────────
  const handlePointerEnter = useCallback(
    (store: Store, clientX: number, clientY: number) => {
      if (isInteractive) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      setTooltip({
        store,
        status: getBoothStatus(store, allProducts),
        x: clientX - rect.left,
        y: clientY - rect.top,
        visible: true,
      });
    },
    [isInteractive, allProducts],
  );

  const handlePointerLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  // ── Zoom controls ───────────────────────────────────────
  const handleZoomIn = () => cameraApiRef.current?.zoomIn();
  const handleZoomOut = () => cameraApiRef.current?.zoomOut();
  const handleReset = () => cameraApiRef.current?.reset();
  const handleFitToScreen = () => cameraApiRef.current?.fitToScreen();

  const controlsRef = cameraApiRef.current?.controlsRef ?? { current: null };

  return (
    <div className="flex flex-col gap-4 w-full">
      {isInteractive && (
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div>
            <h3 className="font-display font-semibold text-lg">Canvas Overview</h3>
            <p className="text-sm text-muted-foreground">
              Drag booths onto the floor plan. Double-click a booth to rotate it.
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Space Utilization</span>
              <Badge variant={utilization > 80 ? "destructive" : "secondary"}>
                {utilization}%
              </Badge>
            </div>
            <div className="w-48 h-2 bg-secondary rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div
        ref={wrapperRef}
        className="w-full overflow-hidden bg-muted rounded-2xl border shadow-inner relative"
        style={{ height: canvasHeight }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Canvas
          orthographic
          camera={{
            position: [0, 500, 0],
            up: [0, 0, -1],
            zoom: fitZoom,
            near: 0.1,
            far: 2000,
          }}
          frameloop="always"
          style={{ width: "100%", height: "100%" }}
          gl={{ antialias: true, alpha: false }}
        >
          <color attach="background" args={["#2a2a2a"]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[400, 600, 300]} intensity={0.8} />

          <ZoomSyncer fitZoom={fitZoom} />
          <SceneControls ref={cameraApiRef} initialZoom={fitZoom} />

          <FloorPlane width={settings.width} height={settings.height} />

          {placedStores.map((store) => {
            const status = getBoothStatus(store, allProducts) as
              | "available"
              | "reserved"
              | "booked";

            return (
              <BoothMesh
                key={store.id}
                store={store}
                status={status}
                isInteractive={isInteractive}
                isDraggable={isInteractive}
                canvasWidth={settings.width}
                canvasHeight={settings.height}
                otherStores={placedStores}
                controlsRef={controlsRef}
                onDragStart={handleBoothDragStart}
                onDragEnd={handleBoothDragEnd}
                onClick={handleBoothClick}
                onRotate={isInteractive ? handleBoothRotate : undefined}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
              />
            );
          })}

          {placedFurniture.map((item) => (
            <FurnitureMesh
              key={`f-${item.id}`}
              furniture={item}
              isInteractive={isInteractive}
              canvasWidth={settings.width}
              canvasHeight={settings.height}
              allFurniture={placedFurniture}
              allStores={placedStores}
              controlsRef={controlsRef}
              onDragEnd={handleFurnitureDragEnd}
              onRotate={isInteractive ? handleFurnitureRotate : undefined}
            />
          ))}
        </Canvas>

        <BoothTooltip
          store={tooltip.store}
          status={tooltip.status}
          x={tooltip.x}
          y={tooltip.y}
          visible={tooltip.visible}
        />

        {placedStores.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground font-display font-medium text-xl opacity-50">
              Empty Canvas
            </p>
          </div>
        )}

        {/* Zoom controls */}
        <div className="canvas-controls">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium min-w-[40px] text-center tabular-nums">
            {Math.round((cameraApiRef.current?.getZoom() ?? fitZoom) * 100)}%
          </span>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border" />
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleFitToScreen} title="Fit to Screen">
            <Maximize className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={handleReset} title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────

function getBoothStatus(store: Store, allProducts: Product[]): string {
  const storeProducts = allProducts.filter((p) => p.storeId === store.id);
  const primaryProduct = storeProducts[0];
  return primaryProduct?.status ?? "available";
}
