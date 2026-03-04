import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Store as StoreIcon, Trash2 } from "lucide-react";
import type { EventSettings, Store, Product } from "@/types/models";
import { useUpdateStore } from "@/hooks/use-stores";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface GroundLayoutProps {
  settings: EventSettings;
  stores: Store[];
  isInteractive?: boolean;
  onStoreClick?: (store: Store) => void;
  currentUserCartId?: number;
  allProducts?: Product[];
  currentUserId?: number | null;
  onRequestDeleteStore?: (store: Store, bookedCount: number) => void;
}

export function GroundLayout({
  settings,
  stores,
  isInteractive = true,
  onStoreClick,
  currentUserCartId,
  allProducts = [],
  currentUserId,
  onRequestDeleteStore,
}: GroundLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const updateStore = useUpdateStore();
  const [positions, setPositions] = React.useState<Record<number, { x: number; y: number }>>({});
  const isCircular = settings.shape === "circular";
  const placedStores = stores.filter((s) => s.x !== 0 || s.y !== 0);
  const renderedStores = isInteractive ? placedStores : stores;
  const hasInitialized = React.useRef(false);
  const isDraggingRef = React.useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;

    const map: Record<number, { x: number; y: number }> = {};
    stores.forEach((store) => {
      map[store.id] = { x: store.x, y: store.y };
    });

    setPositions(map);
    hasInitialized.current = true;
  }, [stores]);

  useEffect(() => {
    if (!hasInitialized.current) return;
    setPositions((prev) => {
      let changed = false;
      const next: Record<number, { x: number; y: number }> = {};

      stores.forEach((store) => {
        const existing = prev[store.id];
        if (!existing || (store.x !== 0 || store.y !== 0)) {
          if (!existing || existing.x !== store.x || existing.y !== store.y) changed = true;
          next[store.id] = { x: store.x, y: store.y };
          return;
        }
        next[store.id] = existing;
      });

      if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
      return changed ? next : prev;
    });
  }, [stores]);

  const fallbackPositions = React.useMemo(() => {
    if (isInteractive) return {};
    const unplaced = stores.filter((store) => store.x === 0 && store.y === 0);
    const colWidth = 140;
    const rowHeight = 120;
    const cols = Math.max(1, Math.floor(settings.width / colWidth));
    const map: Record<number, { x: number; y: number }> = {};

    unplaced.forEach((store, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      map[store.id] = {
        x: 16 + col * colWidth,
        y: 16 + row * rowHeight,
      };
    });

    return map;
  }, [isInteractive, settings.width, stores]);

  const handleDrop = (e: React.DragEvent) => {
    if (!isInteractive) return;
    e.preventDefault();
    const storeId = e.dataTransfer.getData("storeId");
    if (!storeId || !containerRef.current) return;
    const id = parseInt(storeId, 10);
    const store = stores.find((entry) => entry.id === id);
    if (!store) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(settings.width - store.width, Math.round(e.clientX - rect.left - store.width / 2)));
    const y = Math.max(0, Math.min(settings.height - store.height, Math.round(e.clientY - rect.top - store.height / 2)));

    updateStore.mutate({ id, x, y });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isInteractive) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const totalArea = settings.width * settings.height;
  const usedArea = placedStores.reduce((acc, store) => acc + store.width * store.height, 0);
  const utilization = Math.min(100, Math.round((usedArea / totalArea) * 100)) || 0;

  return (
    <div className="flex flex-col gap-4 w-full">
      {isInteractive && (
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div>
            <h3 className="font-display font-semibold text-lg">Canvas Overview</h3>
            <p className="text-sm text-muted-foreground">Drag unplaced stores here to map them.</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Space Utilization</span>
              <Badge variant={utilization > 80 ? "destructive" : "secondary"}>{utilization}%</Badge>
            </div>
            <div className="w-48 h-2 bg-secondary rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${utilization}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="w-full overflow-auto bg-muted rounded-2xl border shadow-inner max-h-[700px] relative p-8 flex items-center justify-center">
        <div
          ref={containerRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative bg-blueprint shadow-xl border-2 border-primary/20 transition-all ${isCircular ? "bg-blueprint-circular" : "rounded-lg"}`}
          style={{
            width: settings.width,
            height: settings.height,
            minWidth: settings.width,
            minHeight: settings.height,
          }}
        >
          {renderedStores.map((store) => {
            const storeProducts = allProducts.filter((p) => p.storeId === store.id);
            const bookedCount = storeProducts.filter((p) => p.status === "booked").length;
            const myReservedCount = storeProducts.filter(
              (p) => p.status === "reserved" && p.reservedById === currentUserId,
            ).length;
            const otherReservedCount = storeProducts.filter(
              (p) => p.status === "reserved" && p.reservedById !== currentUserId,
            ).length;
            const hasPurchased = bookedCount > 0;
            const hasMyReservation = myReservedCount > 0;
            const hasOtherReservation = otherReservedCount > 0;

            return (
              <motion.div
                key={store.id}
                drag={isInteractive}
                dragListener={isInteractive}
                dragMomentum={false}
                dragElastic={0}
                transition={{ duration: 0 }}
                onPointerDown={(e) => {
                  if (isInteractive) e.stopPropagation();
                }}
                onDragStart={() => {
                  isDraggingRef.current = true;
                }}
                onDragEnd={(_, info) => {
                  if (!isInteractive || !containerRef.current) return;

                  const rawX = (positions[store.id]?.x || 0) + info.offset.x;
                  const rawY = (positions[store.id]?.y || 0) + info.offset.y;

                  const isOutside =
                    rawX + store.width * 0.5 < 0 ||
                    rawY + store.height * 0.5 < 0 ||
                    rawX + store.width * 0.5 > settings.width ||
                    rawY + store.height * 0.5 > settings.height;

                  if (isOutside) {
                    setPositions((prev) => ({
                      ...prev,
                      [store.id]: { x: 0, y: 0 },
                    }));

                    updateStore.mutate({ id: store.id, x: 0, y: 0 });
                    window.setTimeout(() => {
                      isDraggingRef.current = false;
                    }, 0);
                    return;
                  }

                  setPositions((prev) => ({
                    ...prev,
                    [store.id]: { x: rawX, y: rawY },
                  }));

                  updateStore.mutate({ id: store.id, x: rawX, y: rawY });
                  window.setTimeout(() => {
                    isDraggingRef.current = false;
                  }, 0);
                }}
                style={!isInteractive ? { cursor: onStoreClick ? "pointer" : "default" } : undefined}
                animate={
                  isInteractive
                    ? positions[store.id] ?? { x: store.x, y: store.y }
                    : store.x !== 0 || store.y !== 0
                      ? { x: store.x, y: store.y }
                      : fallbackPositions[store.id] ?? { x: 0, y: 0 }
                }
                className="inline-block"
              >
                {isInteractive && (
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestDeleteStore?.(store, bookedCount);
                      }}
                      className="p-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/80"
                      title="Delete store"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <div
                      onClick={(e) => {
                        if (isDraggingRef.current) {
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        onStoreClick?.(store);
                      }}
                      className="inline-flex flex-col items-center justify-center h-full p-1 overflow-hidden cursor-pointer"
                    >
                      <StoreIcon
                        className={`w-6 h-6 mb-1 opacity-80 ${hasPurchased ? "text-green-500" : hasMyReservation ? "text-blue-500" : hasOtherReservation ? "text-yellow-500" : "text-primary"}`}
                      />
                      <span className="font-semibold text-[10px] text-center px-1 truncate w-full">{store.name}</span>
                      {hasPurchased && <Badge className="bg-green-500 text-[8px] h-3 px-1 mt-1">Booked {bookedCount}</Badge>}
                      {hasMyReservation && <Badge className="bg-blue-500 text-[8px] h-3 px-1 mt-1">Reserved {myReservedCount}</Badge>}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold">{store.name}</h4>
                        <Badge variant="outline">{store.type}</Badge>
                      </div>
                      <div className="text-xs space-y-2">
                        <p className="font-medium">Products ({storeProducts.length})</p>
                        <div className="max-h-32 overflow-auto space-y-1">
                          {storeProducts.map((p) => (
                            <div key={p.id} className="flex justify-between items-center bg-muted/50 p-1.5 rounded">
                              <span>{p.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">${p.price}</span>
                                <div
                                  className={`w-2 h-2 rounded-full ${p.status === "booked" ? "bg-green-500" : p.reservedById === currentUserId ? "bg-blue-500" : p.status === "reserved" ? "bg-yellow-500" : "bg-primary/20"}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {isInteractive && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 "
                            onClick={() => updateStore.mutate({ id: store.id, x: 0, y: 0 })}
                          >
                            Remove
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => onRequestDeleteStore?.(store, bookedCount)}
                          >
                            Delete Store
                          </Button>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </motion.div>
            );
          })}

          {renderedStores.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-muted-foreground font-display font-medium text-xl opacity-50">Empty Canvas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
