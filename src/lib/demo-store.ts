import type {
  EventSettings,
  InsertStore,
  InsertUser,
  Product,
  Purchase,
  Store,
  UpdateEventSettingsRequest,
  UpdateStoreRequest,
  User,
} from "@/types/models";

const STORAGE_KEY = "expo-org-demo-store-v1";
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
  nextIds: {
    store: number;
    product: number;
    purchase: number;
  };
};

const seedData: DemoData = {
  eventSettings: { id: 1, width: 800, height: 600, shape: "rectangular" },
  users: [
    { id: 1, name: "Event Organizer", role: "organizer" },
    { id: 2, name: "Demo User", role: "user" },
  ],
  stores: [
    { id: 1, name: "Unicorn", type: "Food", cost: 100, x: 100, y: 100, width: 120, height: 100, assignedUserId: 2 },
    { id: 2, name: "Gold", type: "Merchandise", cost: 200, x: 300, y: 100, width: 120, height: 100, assignedUserId: 2 },
  ],
  products: [
    {
      id: 1,
      storeId: 1,
      name: "Burger",
      description: "Delicious beef burger",
      price: 15,
      imageUrl: null,
      status: "available",
      reservedById: null,
      reservedAt: null,
    },
    {
      id: 2,
      storeId: 1,
      name: "Fries",
      description: "Crispy golden fries",
      price: 5,
      imageUrl: null,
      status: "available",
      reservedById: null,
      reservedAt: null,
    },
    {
      id: 3,
      storeId: 2,
      name: "Event T-Shirt",
      description: "Limited edition event tee",
      price: 25,
      imageUrl: null,
      status: "available",
      reservedById: null,
      reservedAt: null,
    },
  ],
  purchases: [],
  nextIds: {
    store: 3,
    product: 4,
    purchase: 1,
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
  };
  writeData(next);
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
