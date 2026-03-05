import type {
  EventSettings,
  Furniture,
  InsertFurniture,
  InsertStore,
  InsertUser,
  Product,
  Purchase,
  Store,
  UpdateEventSettingsRequest,
  UpdateFurnitureRequest,
  UpdateStoreRequest,
  User,
} from "@/types/models";

const STORAGE_KEY = "expo-org-demo-store-v2";
const CHANGE_EVENT = "expo-org-demo-store-changed";
const RESERVATION_WINDOW_MS = 30 * 60 * 1000;

type SerializedProduct = Omit<Product, "reservedAt"> & {
  reservedAt: string | null;
};

type SerializedPurchase = Omit<Purchase, "purchasedAt"> & {
  purchasedAt: string;
};

type DemoData = {
  eventSettings: EventSettings;
  users: User[];
  stores: Store[];
  products: SerializedProduct[];
  purchases: SerializedPurchase[];
  furniture: Furniture[];
  nextIds: {
    store: number;
    product: number;
    purchase: number;
    furniture: number;
  };
};

// ═══════════════════════════════════════════════════════════════════════
// REALISTIC EXHIBITION HALL LAYOUT — 1250 × 700 px (125 ft × 70 ft)
//
// Canvas layout (pixel coords, 10px = 1ft):
//
//   y=0    ┌──EXIT──┬────────── LIFT LOBBY ──────────┬──EXIT──┐
//   y=50   │        │       MAIN ENTRANCE             │        │
//   y=90   │        │     REGISTRATION DESKS          │        │
//          │        │                                  │        │
//   y=150  │  A1 A2 A3 A4    (aisle)    A5 A6 A7 A8  │        │  ROW A
//   y=240  │                                          │        │
//   y=310  │  B1 B2 B3 B4    (aisle)    B5 B6 B7 B8  │        │  ROW B
//   y=400  │                                          │        │
//   y=470  │  C1 C2 C3 C4    (aisle)    C5 C6 C7     │        │  ROW C
//   y=550  │                                          │        │
//   y=560  │  WC  ┌──── MAIN STAGE ────┐    F&B AREA │        │
//   y=700  └──EXIT┴─────── PILLARS ────┴─────EXIT────┘
// ═══════════════════════════════════════════════════════════════════════

const seedData: DemoData = {
  eventSettings: { id: 1, width: 1250, height: 700, shape: "fixed" },
  users: [
    { id: 1, name: "Event Organizer", role: "organizer" },
    { id: 2, name: "Demo User", role: "user" },
  ],
  stores: [
    // ── ROW A — y=150, standard 80×80 booths ────────────────────────
    // Left block (x starts at 60, gap 10px between booths)
    { id: 1,  name: "Gourmet Bites",   type: "Food",        cost: 500,  x: 60,   y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 2,  name: "TechZone",        type: "Tech",        cost: 800,  x: 150,  y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 3,  name: "Merch Corner",    type: "Merchandise", cost: 400,  x: 240,  y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 4,  name: "VIP Lounge",      type: "VIP",         cost: 1200, x: 330,  y: 150, width: 100, height: 80, rotation: 0, assignedUserId: null },
    // Right block (after 120px central aisle at ~550)
    { id: 5,  name: "Street Eats",     type: "Food",        cost: 350,  x: 560,  y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 6,  name: "Gadget Hub",      type: "Tech",        cost: 600,  x: 650,  y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 7,  name: "Fan Store",       type: "Merchandise", cost: 300,  x: 740,  y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 8,  name: "Artisan Crafts",  type: "Merchandise", cost: 450,  x: 830,  y: 150, width: 80, height: 80, rotation: 0, assignedUserId: null },
    // Premium corner booth (end of row A right)
    { id: 9,  name: "Elite Box",       type: "VIP",         cost: 1000, x: 920,  y: 150, width: 100, height: 80, rotation: 0, assignedUserId: null },

    // ── ROW B — y=310, standard 80×80 booths ────────────────────────
    { id: 10, name: "Taco Stand",      type: "Food",        cost: 350,  x: 60,   y: 310, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 11, name: "Pixel Labs",      type: "Tech",        cost: 700,  x: 150,  y: 310, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 12, name: "Retro Gear",      type: "Merchandise", cost: 380,  x: 240,  y: 310, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 13, name: "Gold Pass",       type: "VIP",         cost: 1500, x: 330,  y: 310, width: 100, height: 80, rotation: 0, assignedUserId: null },
    { id: 14, name: "Smoothie Bar",    type: "Food",        cost: 400,  x: 560,  y: 310, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 15, name: "Drone Zone",      type: "Tech",        cost: 850,  x: 650,  y: 310, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 16, name: "Vinyl Records",   type: "Merchandise", cost: 320,  x: 740,  y: 310, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 17, name: "AI Demos",        type: "Tech",        cost: 900,  x: 830,  y: 310, width: 100, height: 80, rotation: 0, assignedUserId: null },

    // ── ROW C — y=470, mixed sizes ──────────────────────────────────
    { id: 18, name: "Sushi Station",   type: "Food",        cost: 550,  x: 60,   y: 470, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 19, name: "VR Arcade",       type: "Tech",        cost: 750,  x: 150,  y: 470, width: 100, height: 80, rotation: 0, assignedUserId: null },
    { id: 20, name: "Sticker Shop",    type: "Merchandise", cost: 200,  x: 260,  y: 470, width: 80, height: 80, rotation: 0, assignedUserId: null },
    { id: 21, name: "Platinum Suite",  type: "VIP",         cost: 2000, x: 350,  y: 470, width: 120, height: 80, rotation: 0, assignedUserId: null },
    { id: 22, name: "BBQ Pit",         type: "Food",        cost: 600,  x: 560,  y: 470, width: 100, height: 80, rotation: 0, assignedUserId: null },
    { id: 23, name: "Robotics Lab",    type: "Tech",        cost: 950,  x: 670,  y: 470, width: 100, height: 80, rotation: 0, assignedUserId: null },

    // ── Unplaced booth (available in sidebar) ───────────────────────
    { id: 24, name: "Pop-Up Stage",    type: "VIP",         cost: 900,  x: 0,    y: 0,   width: 120, height: 80, rotation: 0, assignedUserId: null },
  ],
  products: [
    { id: 1,  storeId: 1,  name: "Gourmet Bites Slot",   description: "Book Gourmet Bites booth (Row A-1).",  price: 500,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 2,  storeId: 2,  name: "TechZone Slot",         description: "Book TechZone booth (Row A-2).",       price: 800,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 3,  storeId: 3,  name: "Merch Corner Slot",     description: "Book Merch Corner booth (Row A-3).",   price: 400,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 4,  storeId: 4,  name: "VIP Lounge Slot",       description: "Book VIP Lounge booth (Row A-4).",     price: 1200, imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 5,  storeId: 5,  name: "Street Eats Slot",      description: "Book Street Eats booth (Row A-5).",    price: 350,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 6,  storeId: 6,  name: "Gadget Hub Slot",       description: "Book Gadget Hub booth (Row A-6).",     price: 600,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 7,  storeId: 7,  name: "Fan Store Slot",        description: "Book Fan Store booth (Row A-7).",      price: 300,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 8,  storeId: 8,  name: "Artisan Crafts Slot",   description: "Book Artisan Crafts booth (Row A-8).", price: 450,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 9,  storeId: 9,  name: "Elite Box Slot",        description: "Book Elite Box booth (Row A-9).",      price: 1000, imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 10, storeId: 10, name: "Taco Stand Slot",       description: "Book Taco Stand booth (Row B-1).",     price: 350,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 11, storeId: 11, name: "Pixel Labs Slot",       description: "Book Pixel Labs booth (Row B-2).",     price: 700,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 12, storeId: 12, name: "Retro Gear Slot",       description: "Book Retro Gear booth (Row B-3).",     price: 380,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 13, storeId: 13, name: "Gold Pass Slot",        description: "Book Gold Pass booth (Row B-4).",      price: 1500, imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 14, storeId: 14, name: "Smoothie Bar Slot",     description: "Book Smoothie Bar booth (Row B-5).",   price: 400,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 15, storeId: 15, name: "Drone Zone Slot",       description: "Book Drone Zone booth (Row B-6).",     price: 850,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 16, storeId: 16, name: "Vinyl Records Slot",    description: "Book Vinyl Records booth (Row B-7).",  price: 320,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 17, storeId: 17, name: "AI Demos Slot",         description: "Book AI Demos booth (Row B-8).",       price: 900,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 18, storeId: 18, name: "Sushi Station Slot",    description: "Book Sushi Station booth (Row C-1).",  price: 550,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 19, storeId: 19, name: "VR Arcade Slot",        description: "Book VR Arcade booth (Row C-2).",      price: 750,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 20, storeId: 20, name: "Sticker Shop Slot",     description: "Book Sticker Shop booth (Row C-3).",   price: 200,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 21, storeId: 21, name: "Platinum Suite Slot",   description: "Book Platinum Suite booth (Row C-4).", price: 2000, imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 22, storeId: 22, name: "BBQ Pit Slot",          description: "Book BBQ Pit booth (Row C-5).",        price: 600,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 23, storeId: 23, name: "Robotics Lab Slot",     description: "Book Robotics Lab booth (Row C-6).",   price: 950,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
    { id: 24, storeId: 24, name: "Pop-Up Stage Slot",     description: "Book Pop-Up Stage booth.",             price: 900,  imageUrl: null, status: "available", reservedById: null, reservedAt: null },
  ],
  purchases: [],
  furniture: [
    // ═══ ENTRANCE INFRASTRUCTURE ═══════════════════════════════════
    // Emergency exits — top corners
    { id: 1,  name: "Exit NW",             kind: "exit",         x: 10,   y: 5,   width: 50,  height: 30, rotation: 0 },
    { id: 2,  name: "Exit NE",             kind: "exit",         x: 1190, y: 5,   width: 50,  height: 30, rotation: 0 },
    // Registration desks — below entrance
    { id: 3,  name: "Registration Desk A", kind: "registration", x: 250,  y: 95,  width: 150, height: 30, rotation: 0 },
    { id: 4,  name: "Registration Desk B", kind: "registration", x: 550,  y: 95,  width: 150, height: 30, rotation: 0 },
    { id: 5,  name: "Registration Desk C", kind: "registration", x: 850,  y: 95,  width: 150, height: 30, rotation: 0 },

    // ═══ LEFT WALL INFRASTRUCTURE ══════════════════════════════════
    // Stairwell — left side
    { id: 6,  name: "Stairwell West",      kind: "stairs",       x: 10,   y: 150, width: 40,  height: 60, rotation: 0 },
    // Wall section left side
    { id: 7,  name: "West Wall",           kind: "wall",         x: 0,    y: 60,  width: 10,  height: 80, rotation: 0 },

    // ═══ RIGHT WALL INFRASTRUCTURE ═════════════════════════════════
    // Info screens — between rows on the right
    { id: 8,  name: "Info Screen A",       kind: "screen",       x: 1060, y: 160, width: 60,  height: 20, rotation: 0 },
    { id: 9,  name: "Info Screen B",       kind: "screen",       x: 1060, y: 320, width: 60,  height: 20, rotation: 0 },
    { id: 10, name: "Wayfinding Screen",   kind: "screen",       x: 1060, y: 480, width: 60,  height: 20, rotation: 0 },

    // ═══ CENTRAL AISLE FURNITURE ═══════════════════════════════════
    // Benches in aisle rest areas (between rows)
    { id: 11, name: "Bench A1",            kind: "bench",        x: 460,  y: 245, width: 60,  height: 20, rotation: 0 },
    { id: 12, name: "Bench A2",            kind: "bench",        x: 460,  y: 270, width: 60,  height: 20, rotation: 0 },
    { id: 13, name: "Bench B1",            kind: "bench",        x: 460,  y: 405, width: 60,  height: 20, rotation: 0 },
    { id: 14, name: "Bench B2",            kind: "bench",        x: 460,  y: 430, width: 60,  height: 20, rotation: 0 },

    // ═══ MAIN STAGE — bottom center ════════════════════════════════
    { id: 15, name: "Main Stage",          kind: "stage",        x: 200,  y: 580, width: 250, height: 100, rotation: 0 },

    // ═══ F&B AREA — bottom right (tables) ══════════════════════════
    { id: 16, name: "F&B Table 1",         kind: "table",        x: 950,  y: 580, width: 50,  height: 40, rotation: 0 },
    { id: 17, name: "F&B Table 2",         kind: "table",        x: 1010, y: 580, width: 50,  height: 40, rotation: 0 },
    { id: 18, name: "F&B Table 3",         kind: "table",        x: 1070, y: 580, width: 50,  height: 40, rotation: 0 },
    { id: 19, name: "F&B Table 4",         kind: "table",        x: 950,  y: 640, width: 50,  height: 40, rotation: 0 },
    { id: 20, name: "F&B Table 5",         kind: "table",        x: 1010, y: 640, width: 50,  height: 40, rotation: 0 },
    { id: 21, name: "F&B Table 6",         kind: "table",        x: 1070, y: 640, width: 50,  height: 40, rotation: 0 },

    // ═══ RESTROOMS — bottom left ═══════════════════════════════════
    { id: 22, name: "Restroom M",          kind: "restroom",     x: 20,   y: 580, width: 60,  height: 50, rotation: 0 },
    { id: 23, name: "Restroom F",          kind: "restroom",     x: 90,   y: 580, width: 60,  height: 50, rotation: 0 },

    // ═══ EMERGENCY EXITS — bottom corners ══════════════════════════
    { id: 24, name: "Exit SW",             kind: "exit",         x: 10,   y: 660, width: 50,  height: 30, rotation: 0 },
    { id: 25, name: "Exit SE",             kind: "exit",         x: 1190, y: 660, width: 50,  height: 30, rotation: 0 },

    // ═══ STRUCTURAL COLUMNS — grid pattern ═════════════════════════
    { id: 26, name: "Column A1",           kind: "column",       x: 440,  y: 150, width: 15,  height: 15, rotation: 0 },
    { id: 27, name: "Column A2",           kind: "column",       x: 540,  y: 150, width: 15,  height: 15, rotation: 0 },
    { id: 28, name: "Column B1",           kind: "column",       x: 440,  y: 310, width: 15,  height: 15, rotation: 0 },
    { id: 29, name: "Column B2",           kind: "column",       x: 540,  y: 310, width: 15,  height: 15, rotation: 0 },
    { id: 30, name: "Column C1",           kind: "column",       x: 440,  y: 470, width: 15,  height: 15, rotation: 0 },
    { id: 31, name: "Column C2",           kind: "column",       x: 540,  y: 470, width: 15,  height: 15, rotation: 0 },

    // ═══ BARRIERS — aisle boundary markers ═════════════════════════
    { id: 32, name: "Barrier Row A Left",  kind: "barrier",      x: 60,   y: 140, width: 370, height: 5,  rotation: 0 },
    { id: 33, name: "Barrier Row A Right", kind: "barrier",      x: 560,  y: 140, width: 460, height: 5,  rotation: 0 },
    { id: 34, name: "Barrier Row B Left",  kind: "barrier",      x: 60,   y: 300, width: 370, height: 5,  rotation: 0 },
    { id: 35, name: "Barrier Row B Right", kind: "barrier",      x: 560,  y: 300, width: 370, height: 5,  rotation: 0 },
    { id: 36, name: "Barrier Row C Left",  kind: "barrier",      x: 60,   y: 460, width: 410, height: 5,  rotation: 0 },
    { id: 37, name: "Barrier Row C Right", kind: "barrier",      x: 560,  y: 460, width: 210, height: 5,  rotation: 0 },

    // ═══ STAIRWELL — right side ════════════════════════════════════
    { id: 38, name: "Stairwell East",      kind: "stairs",       x: 1180, y: 350, width: 40,  height: 60, rotation: 0 },

    // ═══ LOBBY AREA — sitting near entrance ════════════════════════
    { id: 39, name: "Lobby Seating",       kind: "lobby",        x: 60,   y: 60,  width: 150, height: 50, rotation: 0 },
    { id: 40, name: "Sponsor Screen",      kind: "screen",       x: 1120, y: 60,  width: 80,  height: 20, rotation: 0 },
  ],
  nextIds: {
    store: 25,
    product: 25,
    purchase: 1,
    furniture: 41,
  },
};

function cloneSeedData(): DemoData {
  return JSON.parse(JSON.stringify(seedData)) as DemoData;
}

function ensureBrowser(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function serializeProduct(product: Product): SerializedProduct {
  return {
    ...product,
    reservedAt: product.reservedAt ? product.reservedAt.toISOString() : null,
  };
}

function deserializeProduct(product: SerializedProduct): Product {
  return {
    ...product,
    reservedAt: product.reservedAt ? new Date(product.reservedAt) : null,
  };
}

function deserializePurchase(purchase: SerializedPurchase): Purchase {
  return {
    ...purchase,
    purchasedAt: new Date(purchase.purchasedAt),
  };
}

function cleanupExpiredReservations(data: DemoData): DemoData {
  const now = Date.now();
  let changed = false;
  const products = data.products.map<SerializedProduct>((product) => {
    if (product.status !== "reserved" || !product.reservedAt) return product;
    const isExpired = now - new Date(product.reservedAt).getTime() >= RESERVATION_WINDOW_MS;
    if (!isExpired) return product;
    changed = true;
    return { ...product, status: "available" as const, reservedById: null, reservedAt: null };
  });
  return changed ? { ...data, products } : data;
}

function readData(): DemoData {
  const storage = ensureBrowser();
  if (!storage) return cloneSeedData();

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = cloneSeedData();
    storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as DemoData;
    // Backward compat: add furniture if missing from older localStorage
    if (!parsed.furniture) parsed.furniture = [];
    if (!parsed.nextIds.furniture) parsed.nextIds.furniture = 1;
    const cleaned = cleanupExpiredReservations(parsed);
    if (cleaned !== parsed) {
      storage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    const seeded = cloneSeedData();
    storage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

// Snapshot caching to prevent infinite re-renders
const snapshotCache = new Map<string, { json: string; snapshot: any }>();

function getOrCreateSnapshot<T>(key: string, getter: () => T): T {
  const current = readData();
  const json = JSON.stringify(current);
  const cached = snapshotCache.get(key);

  if (cached && cached.json === json) {
    return cached.snapshot as T;
  }

  const snapshot = getter();
  snapshotCache.set(key, { json, snapshot });
  return snapshot;
}

function emitChange() {
  snapshotCache.clear();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function writeData(data: DemoData) {
  const storage = ensureBrowser();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
  emitChange();
}

let watcherStarted = false;
function startReservationWatcher() {
  if (watcherStarted || typeof window === "undefined") return;
  watcherStarted = true;
  window.setInterval(() => {
    const current = readData();
    const cleaned = cleanupExpiredReservations(current);
    if (cleaned !== current) {
      writeData(cleaned);
    }
  }, 10_000);
}

export function subscribeDemoStore(onStoreChange: () => void): () => void {
  startReservationWatcher();
  if (typeof window === "undefined") return () => { };

  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function getEventSettings(): EventSettings {
  return getOrCreateSnapshot("eventSettings", () => readData().eventSettings);
}

export function updateEventSettings(updates: UpdateEventSettingsRequest): EventSettings {
  const current = readData();
  const next: DemoData = {
    ...current,
    eventSettings: { ...current.eventSettings, ...updates },
  };
  writeData(next);
  return next.eventSettings;
}

export function getUsers(): User[] {
  return getOrCreateSnapshot("users", () => readData().users);
}

export function createUser(user: InsertUser): User {
  const current = readData();
  const requestedRole = user.role ?? "user";
  const isCoreUser = current.users.some((existing) => existing.role === requestedRole);
  if (isCoreUser && (requestedRole === "user" || requestedRole === "organizer")) {
    throw new Error("Demo mode supports only one organizer and one user.");
  }

  const nextId = Math.max(0, ...current.users.map((u) => u.id)) + 1;
  const created: User = { id: nextId, name: user.name, role: requestedRole };
  const next: DemoData = {
    ...current,
    users: [...current.users, created],
  };
  writeData(next);
  return created;
}

export function getStores(): Store[] {
  return getOrCreateSnapshot("stores", () => readData().stores);
}

export function createStore(store: InsertStore): Store {
  const current = readData();
  const createdStore: Store = {
    id: current.nextIds.store,
    name: store.name,
    type: store.type,
    cost: store.cost,
    x: store.x ?? 0,
    y: store.y ?? 0,
    width: store.width ?? 50,
    height: store.height ?? 50,
    rotation: store.rotation ?? 0,
    assignedUserId: store.assignedUserId ?? null,
  };

  const createdProduct: SerializedProduct = serializeProduct({
    id: current.nextIds.product,
    storeId: createdStore.id,
    name: `${createdStore.name} Slot`,
    description: `Book ${createdStore.name} in this demo store.`,
    price: createdStore.cost,
    imageUrl: null,
    status: "available",
    reservedById: null,
    reservedAt: null,
  });

  const next: DemoData = {
    ...current,
    stores: [...current.stores, createdStore],
    products: [...current.products, createdProduct],
    nextIds: {
      ...current.nextIds,
      store: current.nextIds.store + 1,
      product: current.nextIds.product + 1,
    },
  };
  writeData(next);
  return createdStore;
}

export function updateStore(id: number, updates: UpdateStoreRequest): Store {
  const current = readData();
  const index = current.stores.findIndex((store) => store.id === id);
  if (index < 0) throw new Error("Store not found.");

  const updated: Store = { ...current.stores[index], ...updates };
  const stores = [...current.stores];
  stores[index] = updated;
  writeData({ ...current, stores });
  return updated;
}

export function deleteStore(id: number): void {
  const current = readData();
  const next: DemoData = {
    ...current,
    stores: current.stores.filter((store) => store.id !== id),
    products: current.products.filter((product) => product.storeId !== id),
    purchases: current.purchases.filter((purchase) => purchase.storeId !== id),
  };
  writeData(next);
}

export function getFurniture(): Furniture[] {
  return getOrCreateSnapshot("furniture", () => readData().furniture);
}

export function createFurniture(input: InsertFurniture): Furniture {
  const current = readData();
  const created: Furniture = {
    id: current.nextIds.furniture,
    name: input.name,
    kind: input.kind,
    x: input.x ?? 0,
    y: input.y ?? 0,
    width: input.width ?? 60,
    height: input.height ?? 40,
    rotation: input.rotation ?? 0,
  };
  const next: DemoData = {
    ...current,
    furniture: [...current.furniture, created],
    nextIds: { ...current.nextIds, furniture: current.nextIds.furniture + 1 },
  };
  writeData(next);
  return created;
}

export function updateFurniture(id: number, updates: UpdateFurnitureRequest): Furniture {
  const current = readData();
  const index = current.furniture.findIndex((f) => f.id === id);
  if (index < 0) throw new Error("Furniture not found.");
  const updated: Furniture = { ...current.furniture[index], ...updates };
  const furniture = [...current.furniture];
  furniture[index] = updated;
  writeData({ ...current, furniture });
  return updated;
}

export function deleteFurniture(id: number): void {
  const current = readData();
  writeData({ ...current, furniture: current.furniture.filter((f) => f.id !== id) });
}

export function resetDemoStore(): void {
  const storage = ensureBrowser();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  emitChange();
}

export function getProducts(): Product[] {
  return getOrCreateSnapshot("products", () => readData().products.map(deserializeProduct));
}

export function reserveProduct(productId: number, userId: number): Product {
  const current = readData();
  const product = current.products.find((entry) => entry.id === productId);
  if (!product) throw new Error("Product not found.");

  const nowIso = new Date().toISOString();

  const products = current.products.map<SerializedProduct>((entry) => {
    const isUsersExistingReservation = entry.status === "reserved" && entry.reservedById === userId;
    if (isUsersExistingReservation && entry.id !== productId) {
      return { ...entry, status: "available" as const, reservedById: null, reservedAt: null };
    }
    return entry;
  });

  const currentProduct = products.find((entry) => entry.id === productId);
  if (!currentProduct || currentProduct.status === "booked") {
    throw new Error("Product is already booked.");
  }
  if (currentProduct.status === "reserved" && currentProduct.reservedById !== userId) {
    throw new Error("Product is currently reserved by another user.");
  }

  const nextProducts = products.map<SerializedProduct>((entry) =>
    entry.id === productId
      ? { ...entry, status: "reserved" as const, reservedById: userId, reservedAt: nowIso }
      : entry
  );
  const next = { ...current, products: nextProducts };
  writeData(next);

  const reserved = nextProducts.find((entry) => entry.id === productId);
  if (!reserved) throw new Error("Failed to reserve product.");
  return deserializeProduct(reserved);
}

export function releaseProduct(productId: number, userId: number): void {
  const current = readData();
  const nextProducts = current.products.map<SerializedProduct>((entry) => {
    if (entry.id !== productId) return entry;
    if (entry.status !== "reserved" || entry.reservedById !== userId) return entry;
    return { ...entry, status: "available" as const, reservedById: null, reservedAt: null };
  });
  writeData({ ...current, products: nextProducts });
}

export function purchaseProduct(productId: number, userId: number): Purchase {
  const current = readData();
  const target = current.products.find((product) => product.id === productId);
  if (!target || target.status !== "reserved" || target.reservedById !== userId) {
    throw new Error("Product must be reserved by the current user before purchase.");
  }

  const purchasedAt = new Date().toISOString();
  const purchase: SerializedPurchase = {
    id: current.nextIds.purchase,
    userId,
    productId: target.id,
    storeId: target.storeId,
    price: target.price,
    purchasedAt,
  };

  const products = current.products.map<SerializedProduct>((entry) =>
    entry.id === productId
      ? { ...entry, status: "booked" as const, reservedById: null, reservedAt: null }
      : entry
  );

  const next: DemoData = {
    ...current,
    products,
    purchases: [purchase, ...current.purchases],
    nextIds: { ...current.nextIds, purchase: current.nextIds.purchase + 1 },
  };
  writeData(next);
  return deserializePurchase(purchase);
}

export function getPurchasesByUser(userId: number): Purchase[] {
  return getOrCreateSnapshot(`purchases_${userId}`, () =>
    readData()
      .purchases
      .filter((purchase) => purchase.userId === userId)
      .map(deserializePurchase)
  );
}
