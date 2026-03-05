import type { Store } from "@/types/models";
import { FEET_TO_PIXELS } from "@/lib/floor-plan-config";

interface BoothTooltipProps {
  store: Store | null;
  status: string;
  x: number;
  y: number;
  visible: boolean;
}

export function BoothTooltip({ store, status, x, y, visible }: BoothTooltipProps) {
  if (!visible || !store) return null;

  const widthFt = store.width / FEET_TO_PIXELS;
  const heightFt = store.height / FEET_TO_PIXELS;

  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{
        left: x,
        top: y - 10,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs space-y-0.5 min-w-[140px]">
        <p className="font-bold text-sm">{store.name}</p>
        <p className="text-muted-foreground">{store.type} Booth &middot; ${store.cost}</p>
        <p className="text-muted-foreground">
          {widthFt}&times;{heightFt} ft ({widthFt * heightFt} sq ft)
        </p>
        <p className="font-medium capitalize">{status}</p>
      </div>
    </div>
  );
}
