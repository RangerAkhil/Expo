export type Shape = "fixed" | "circular";
export type UserRole = "organizer" | "user";
export type ProductStatus = "available" | "reserved" | "booked";

export type EventSettings = {
  id: number;
  width: number;
  height: number;
  shape: Shape;
};

export type User = {
  id: number;
  name: string;
  role: UserRole;
};

export type Store = {
  id: number;
  name: string;
  type: string;
  cost: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees: 0, 90, 180, 270
  assignedUserId: number | null;
};

export type Product = {
  id: number;
  storeId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  status: ProductStatus;
  reservedById: number | null;
  reservedAt: Date | null;
};

export type Purchase = {
  id: number;
  userId: number;
  productId: number;
  storeId: number;
  price: number;
  purchasedAt: Date;
};

export type InsertUser = {
  name: string;
  role?: UserRole;
};

export type InsertStore = {
  name: string;
  type: string;
  cost: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  assignedUserId?: number | null;
};

export type UpdateStoreRequest = Partial<InsertStore>;
export type UpdateEventSettingsRequest = Partial<Omit<EventSettings, "id">>;

export type FurnitureKind = "stairs" | "lobby" | "screen" | "pillar" | "bench" | "table" | "stage" | "barrier" | "registration" | "restroom" | "exit" | "column" | "wall";

export type Furniture = {
  id: number;
  name: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type InsertFurniture = {
  name: string;
  kind: FurnitureKind;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
};

export type UpdateFurnitureRequest = Partial<InsertFurniture>;

