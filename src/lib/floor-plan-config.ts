// Floor plan configuration – pure data, no React
// Canvas: 1250 × 700 px   (125 ft × 70 ft at 10 px/ft)
//
// ┌─────────────────────────────────────────────────────────────────┐
// │  EXIT                  LIFT LOBBY              EXIT             │ ← 0–50 px
// │                       ENTRANCE                                  │ ← 50–100 px
// │       REGISTRATION DESK (long counter)                          │ ← ~100
// │ ┌──┐  ┌──┐  ┌──┐  ┌──┐       ┌──┐  ┌──┐  ┌──┐  ┌──┐          │
// │ │  │  │  │  │  │  │  │ AISLE  │  │  │  │  │  │  │  │          │ ← Row A
// │ └──┘  └──┘  └──┘  └──┘   A   └──┘  └──┘  └──┘  └──┘          │
// │                                                                 │
// │ ┌──┐  ┌──┐  ┌──┐  ┌──┐       ┌──┐  ┌──┐  ┌──┐  ┌──┐          │
// │ │  │  │  │  │  │  │  │ AISLE  │  │  │  │  │  │  │  │          │ ← Row B
// │ └──┘  └──┘  └──┘  └──┘   B   └──┘  └──┘  └──┘  └──┘          │
// │                                                                 │
// │ ┌──┐  ┌──┐  ┌──┐  ┌──┐       ┌──┐  ┌──┐  ┌──┐  ┌──┐          │
// │ │  │  │  │  │  │  │  │ AISLE  │  │  │  │  │  │  │  │          │ ← Row C
// │ └──┘  └──┘  └──┘  └──┘   C   └──┘  └──┘  └──┘  └──┘          │
// │                                                                 │
// │  WC ┌─────────────── MAIN STAGE ───────────────┐  F&B AREA     │ ← Bottom
// │     └──────────────────────────────────────────-┘  (tables)     │
// │  EXIT                PILLARS                      EXIT          │
// └─────────────────────────────────────────────────────────────────┘

export const FEET_TO_PIXELS = 10;
export const GRID_SNAP = 10; // 1 ft

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SNAP) * GRID_SNAP;
}

// ── Color palette ──────────────────────────────────────────────

export const FLOOR_COLORS = {
  hallBg: "#2C3E50",
  hallStroke: "#1A252F",
  boothFill: "#FFFFFF",
  boothStroke: "#5BA8C0",
  aisle: "#34495E",
  grid: "rgba(255,255,255,0.04)",
  gridMajor: "rgba(255,255,255,0.08)",
  wall: "#1A252F",
  label: "#FFFFFF",
  labelMuted: "rgba(255,255,255,0.55)",
  entrance: "#FFFFFF",
  entranceBg: "rgba(52,152,219,0.15)",
  fnb: "#FFFFFF",
  fnbBg: "rgba(230,126,34,0.12)",
  lobby: "#FFFFFF",
  lobbyBg: "rgba(52,152,219,0.12)",
  poster: "#FFFFFF",
  posterBg: "rgba(155,89,182,0.10)",
  pillar: "#4A6274",
  pillarStroke: "#34495E",
} as const;

export const STATUS_COLORS = {
  available: { fill: "#FFFFFF", stroke: "#27AE60", badge: "#27AE60" },
  reserved:  { fill: "#FEF9E7", stroke: "#F39C12", badge: "#E67E22" },
  booked:    { fill: "#FDEDEC", stroke: "#E74C3C", badge: "#C0392B" },
} as const;

export const TYPE_COLORS: Record<string, string> = {
  Food: "#E67E22",
  Tech: "#2980B9",
  Merchandise: "#8E44AD",
  VIP: "#F1C40F",
};

// ── Zone / structural definitions ──────────────────────────────

export type FloorZone = {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  labelColor: string;
};

const ZONE_DEFS: FloorZone[] = [
  // Top center: Lift Lobby
  {
    id: "lobby",
    label: "LIFT LOBBY",
    x: 0.38, y: 0.0, w: 0.24, h: 0.06,
    fill: FLOOR_COLORS.lobbyBg,
    stroke: "rgba(255,255,255,0.3)",
    labelColor: FLOOR_COLORS.lobby,
  },
  // Below lobby: Main Entrance
  {
    id: "entrance",
    label: "MAIN ENTRANCE",
    x: 0.34, y: 0.06, w: 0.32, h: 0.06,
    fill: FLOOR_COLORS.entranceBg,
    stroke: "rgba(52,152,219,0.4)",
    labelColor: FLOOR_COLORS.entrance,
  },
  // Aisle A label zone (between row A and row B)
  {
    id: "aisleA",
    label: "AISLE A",
    x: 0.46, y: 0.285, w: 0.08, h: 0.03,
    fill: "transparent",
    stroke: "transparent",
    labelColor: "rgba(255,255,255,0.35)",
  },
  // Aisle B label zone
  {
    id: "aisleB",
    label: "AISLE B",
    x: 0.46, y: 0.465, w: 0.08, h: 0.03,
    fill: "transparent",
    stroke: "transparent",
    labelColor: "rgba(255,255,255,0.35)",
  },
  // Aisle C label zone
  {
    id: "aisleC",
    label: "AISLE C",
    x: 0.46, y: 0.645, w: 0.08, h: 0.03,
    fill: "transparent",
    stroke: "transparent",
    labelColor: "rgba(255,255,255,0.35)",
  },
  // Bottom right: F&B Area
  {
    id: "fnb",
    label: "F & B AREA",
    x: 0.74, y: 0.78, w: 0.24, h: 0.20,
    fill: FLOOR_COLORS.fnbBg,
    stroke: "rgba(230,126,34,0.3)",
    labelColor: FLOOR_COLORS.fnb,
  },
  // Left side bottom: Poster/Meeting Area
  {
    id: "poster",
    label: "MEETING AREA",
    x: 0.01, y: 0.78, w: 0.12, h: 0.20,
    fill: FLOOR_COLORS.posterBg,
    stroke: "rgba(155,89,182,0.25)",
    labelColor: FLOOR_COLORS.poster,
  },
];

type PillarDef = { x: number; y: number };

// Structural column grid (realistic convention center columns)
const PILLAR_DEFS: PillarDef[] = [
  // Row of columns across the middle
  { x: 0.15, y: 0.30 },
  { x: 0.50, y: 0.30 },
  { x: 0.85, y: 0.30 },
  { x: 0.15, y: 0.50 },
  { x: 0.50, y: 0.50 },
  { x: 0.85, y: 0.50 },
  { x: 0.15, y: 0.70 },
  { x: 0.50, y: 0.70 },
  { x: 0.85, y: 0.70 },
];

export type BuiltFloorPlan = {
  zones: { id: string; label: string; x: number; y: number; w: number; h: number; fill: string; stroke: string; labelColor: string }[];
  pillars: { x: number; y: number; radius: number }[];
  arrows: { points: number[]; label: string }[];
  pillarBoxLabel: { x: number; y: number };
};

export function buildFloorPlan(width: number, height: number): BuiltFloorPlan {
  const zones = ZONE_DEFS.map((z) => ({
    id: z.id,
    label: z.label,
    x: Math.round(z.x * width),
    y: Math.round(z.y * height),
    w: Math.round(z.w * width),
    h: Math.round(z.h * height),
    fill: z.fill,
    stroke: z.stroke,
    labelColor: z.labelColor,
  }));

  const pillars = PILLAR_DEFS.map((p) => ({
    x: Math.round(p.x * width),
    y: Math.round(p.y * height),
    radius: 4,
  }));

  // Entrance arrows pointing downward into the hall
  const entranceZone = zones.find((z) => z.id === "entrance")!;
  const arrowCenterX = entranceZone.x + entranceZone.w / 2;
  const arrows = [
    {
      points: [arrowCenterX - 40, entranceZone.y + entranceZone.h + 5, arrowCenterX - 40, entranceZone.y + entranceZone.h + 30],
      label: "",
    },
    {
      points: [arrowCenterX, entranceZone.y + entranceZone.h + 5, arrowCenterX, entranceZone.y + entranceZone.h + 30],
      label: "",
    },
    {
      points: [arrowCenterX + 40, entranceZone.y + entranceZone.h + 5, arrowCenterX + 40, entranceZone.y + entranceZone.h + 30],
      label: "",
    },
  ];

  const pillarBoxLabel = {
    x: Math.round(0.48 * width),
    y: Math.round(0.32 * height),
  };

  return { zones, pillars, arrows, pillarBoxLabel };
}

// ── 2D ↔ 3D coordinate converters ────────────────────────────

/** Convert 2D pixel coords (top-left origin) to 3D world coords (centered origin, XZ plane). */
export function pixelToWorld(
  px: number,
  py: number,
  width: number,
  height: number,
): [number, number, number] {
  return [px - width / 2, 0, py - height / 2];
}

/** Convert 3D world coords (XZ plane) back to 2D pixel coords. */
export function worldToPixel(
  wx: number,
  wz: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: wx + width / 2, y: wz + height / 2 };
}
