import { useRole } from "@/hooks/use-role";
import { useEventSettings } from "@/hooks/use-event-settings";
import { useDeleteStore, useStores } from "@/hooks/use-stores";
import { useFurniture } from "@/hooks/use-furniture";
import { useUsers } from "@/hooks/use-users";
import { useProducts, usePurchaseProduct, useReleaseProduct, useReserveProduct, useUserPurchases } from "@/hooks/use-marketplace";
import { GroundLayout } from "@/components/GroundLayout";
import { OrganizerSidebar } from "@/components/Sidebar";
import { ShoppingCart, List, Grid3X3, History, MapPin, DollarSign, CheckCircle2, LayoutGrid, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Store } from "@/types/models";

const FEET_TO_PIXELS = 10;

export default function Dashboard() {
  const { isOrganizer, isUser, role } = useRole();
  const { data: settings, isLoading: loadingSettings } = useEventSettings();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: products = [] } = useProducts();
  const { data: furnitureItems = [] } = useFurniture();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");
  const [detailStore, setDetailStore] = useState<Store | null>(null);
  const demoUser = useMemo(() => users.find((u: any) => u.role === "user") ?? null, [users]);
  const simulatedUserId = demoUser?.id ?? null;
  const { data: userPurchases = [] } = useUserPurchases(simulatedUserId);

  const reserveMutation = useReserveProduct();
  const purchaseMutation = usePurchaseProduct();
  const releaseMutation = useReleaseProduct();
  const deleteStoreMutation = useDeleteStore();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; bookedCount: number } | null>(null);

  const primaryProductByStore = useMemo(() => {
    const map = new Map<number, any>();
    stores.forEach((store: any) => {
      const relatedProducts = products
        .filter((product: any) => product.storeId === store.id)
        .sort((a: any, b: any) => a.id - b.id);
      if (relatedProducts.length > 0) {
        map.set(store.id, relatedProducts[0]);
      }
    });
    return map;
  }, [products, stores]);

  const cartItem = useMemo(() => {
    return products.find((p: any) => p.reservedById === simulatedUserId && p.status === 'reserved');
  }, [products, simulatedUserId]);

  const visibleStores = useMemo(() => {
    return stores.filter((store: any) => store.x !== 0 || store.y !== 0);
  }, [stores]);

  const bookedCountByStoreId = useMemo(() => {
    const map = new Map<number, number>();
    products.forEach((product: any) => {
      if (product.status !== "booked") return;
      map.set(product.storeId, (map.get(product.storeId) ?? 0) + 1);
    });
    return map;
  }, [products]);

  // Stats
  const totalValue = stores.reduce((sum, s) => sum + s.cost, 0);
  const placedCount = visibleStores.length;
  const bookedTotal = Array.from(bookedCountByStoreId.values()).reduce((a, b) => a + b, 0);

  const getReservationTimeLeft = (reservedAt: Date | null) => {
    if (!reservedAt) return "Reserved";
    const expiresAt = new Date(reservedAt).getTime() + 30 * 60 * 1000;
    const remainingMs = Math.max(0, expiresAt - Date.now());
    const mins = Math.ceil(remainingMs / 60_000);
    return `Reserved for ${mins}m`;
  };

  const handleUserStoreClick = (storeId: number, storeName: string) => {
    if (!simulatedUserId) {
      toast({ title: "No user available", description: "Create/select a user profile to continue booking.", variant: "destructive" });
      return;
    }

    const storeProduct = primaryProductByStore.get(storeId);
    if (!storeProduct) {
      toast({ title: storeName, description: "Store is not configured for booking yet." });
      return;
    }

    if (storeProduct.status === "reserved" && storeProduct.reservedById === simulatedUserId) {
      purchaseMutation.mutate(
        { productId: storeProduct.id, userId: simulatedUserId },
        {
          onSuccess: () => {
            toast({ title: "Purchase complete", description: `${storeName} booked successfully.` });
            setDetailStore(null);
          },
          onError: () => {
            toast({ title: "Purchase failed", description: "Reservation expired or item is no longer available.", variant: "destructive" });
          },
        }
      );
      return;
    }

    if (cartItem && cartItem.storeId !== storeId) {
      toast({ title: "One item at a time", description: "Complete or remove your current cart item before selecting another.", variant: "destructive" });
      return;
    }

    if (storeProduct.status !== "available") {
      toast({ title: "Store not available", description: "This store is currently reserved or booked.", variant: "destructive" });
      return;
    }

    reserveMutation.mutate(
      { productId: storeProduct.id, userId: simulatedUserId },
      {
        onSuccess: () => {
          toast({ title: "Added to cart", description: `${storeName} reserved for 30 minutes.` });
        },
        onError: () => {
          toast({ title: "Reservation failed", description: "Store is reserved or booked by another user.", variant: "destructive" });
        },
      }
    );
  };

  const handleRequestDeleteStore = (store: any, bookedCount: number) => {
    setDeleteTarget({ id: store.id, name: store.name, bookedCount });
  };

  const handleConfirmDeleteStore = () => {
    if (!deleteTarget) return;
    deleteStoreMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast({
          title: "Store deleted",
          description: deleteTarget.bookedCount > 0 ? "Store and related purchase history were removed." : "Store removed successfully.",
        });
        setDeleteTarget(null);
      },
      onError: () => {
        toast({ title: "Delete failed", description: "Unable to delete this store.", variant: "destructive" });
      },
    });
  };

  // User clicks booth on floor plan → open detail modal
  const handleUserFloorClick = (store: Store) => {
    setDetailStore(store);
  };

  if (loadingSettings || loadingStores || loadingUsers) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const activeSettings = settings || { id: 1, width: 800, height: 600, shape: 'square' as const };

  // Detail modal data
  const detailProduct = detailStore ? primaryProductByStore.get(detailStore.id) : null;
  const detailIsOwnReservation = detailProduct?.reservedById === simulatedUserId;
  const detailStatus = detailProduct?.status ?? "available";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 p-6">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {isOrganizer && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Event Organizer Setup</h1>
              <p className="text-muted-foreground mt-1">Design the layout, add booths, and manage your exhibition.</p>
            </div>

            {/* Organizer stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><LayoutGrid className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{stores.length}</p>
                    <p className="text-xs text-muted-foreground">Total Booths</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10"><MapPin className="w-4 h-4 text-green-600" /></div>
                  <div>
                    <p className="text-2xl font-bold">{placedCount}</p>
                    <p className="text-xs text-muted-foreground">Placed on Map</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10"><DollarSign className="w-4 h-4 text-blue-600" /></div>
                  <div>
                    <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10"><CheckCircle2 className="w-4 h-4 text-orange-600" /></div>
                  <div>
                    <p className="text-2xl font-bold">{bookedTotal}</p>
                    <p className="text-xs text-muted-foreground">Booked</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <OrganizerSidebar
                stores={stores}
                users={users}
                settings={activeSettings}
                furniture={furnitureItems}
                bookedCountByStoreId={bookedCountByStoreId}
                onRequestDeleteStore={handleRequestDeleteStore}
              />
              <div className="flex-1 w-full min-w-0">
                <GroundLayout
                  settings={activeSettings}
                  stores={stores}
                  furniture={furnitureItems}
                  allProducts={products}
                  currentUserId={simulatedUserId}
                  onRequestDeleteStore={handleRequestDeleteStore}
                />
              </div>
            </div>
          </div>
        )}

        {(role === "demo" || (isUser && isOrganizer)) && (
          <div className="border-t-2 border-dashed border-border py-4">
            <span className="bg-muted px-4 py-1 rounded-full text-xs font-bold tracking-widest text-muted-foreground uppercase relative -top-7">Store Shopping Experience</span>
          </div>
        )}

        {isUser && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Marketplace</h1>
                <p className="text-muted-foreground mt-1">
                  Browse and purchase as <span className="font-medium">{demoUser?.name ?? "Demo User"}</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-auto">
                  <TabsList>
                    <TabsTrigger value="visual"><Grid3X3 className="w-4 h-4 mr-2" />Visual</TabsTrigger>
                    <TabsTrigger value="list"><List className="w-4 h-4 mr-2" />List</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                {viewMode === "visual" ? (
                  <Card className="p-6">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle>Floor Plan</CardTitle>
                      <CardDescription>Click on a booth to see details. Hover for quick info.</CardDescription>
                    </CardHeader>
                    <GroundLayout
                      settings={activeSettings}
                      stores={stores}
                      furniture={furnitureItems}
                      isInteractive={false}
                      onStoreClick={handleUserFloorClick}
                      currentUserCartId={cartItem?.id}
                      allProducts={products}
                      currentUserId={simulatedUserId}
                    />
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleStores.map((store: any) => {
                      const storeProduct = primaryProductByStore.get(store.id);
                      const isOwnReservation = storeProduct?.reservedById === simulatedUserId;
                      const isOtherReservation = storeProduct?.status === "reserved" && !isOwnReservation;
                      const isBooked = storeProduct?.status === "booked";
                      const isMissingInventory = !storeProduct;
                      const wFt = store.width / FEET_TO_PIXELS;
                      const hFt = store.height / FEET_TO_PIXELS;

                      return (
                        <Card key={store.id} className="flex flex-col">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                {/* Type indicator dot */}
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  store.type === "Food" ? "bg-orange-500" :
                                  store.type === "Tech" ? "bg-blue-500" :
                                  store.type === "Merchandise" ? "bg-purple-500" :
                                  store.type === "VIP" ? "bg-yellow-500" : "bg-gray-400"
                                }`} />
                                <div>
                                  <CardTitle className="text-sm">{store.name}</CardTitle>
                                  <CardDescription className="text-xs">{store.type} · {wFt}×{hFt} ft ({wFt * hFt} sq ft)</CardDescription>
                                </div>
                              </div>
                              <Badge
                                className={
                                  isMissingInventory ? "bg-muted text-muted-foreground" :
                                    isBooked ? "bg-green-500 hover:bg-green-600" :
                                      isOwnReservation ? "bg-blue-500 hover:bg-blue-600" :
                                        isOtherReservation ? "bg-yellow-500 hover:bg-yellow-600" :
                                          "bg-black"
                                }
                              >
                                {isMissingInventory ? "Not Configured" : isBooked ? "Fully Booked" : isOwnReservation ? "In Your Cart" : isOtherReservation ? "In Process" : "Available"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">${store.cost}</span>
                              <Button
                                disabled={isMissingInventory || isBooked || isOtherReservation || (!isOwnReservation && !!cartItem) || !simulatedUserId}
                                onClick={() => handleUserStoreClick(store.id, store.name)}
                                size="sm"
                              >
                                {isOwnReservation ? "Complete Purchase" : "Add to Cart"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Your Cart
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cartItem ? (
                      <div className="space-y-4">
                        <div className="p-3 bg-card rounded-lg border shadow-sm">
                          <p className="font-semibold">{visibleStores.find((s: any) => s.id === cartItem.storeId)?.name ?? stores.find((s: any) => s.id === cartItem.storeId)?.name ?? cartItem.name}</p>
                          <p className="text-xs text-muted-foreground">{getReservationTimeLeft(cartItem.reservedAt)}</p>
                          <p className="mt-2 font-bold">${cartItem.price}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() =>
                              purchaseMutation.mutate(
                                { productId: cartItem.id, userId: simulatedUserId as number },
                                {
                                  onSuccess: () => { toast({ title: "Purchase complete", description: "Store booked successfully." }); },
                                  onError: () => { toast({ title: "Purchase failed", description: "Reservation expired or item is no longer available.", variant: "destructive" }); },
                                }
                              )
                            }
                            className="w-full"
                          >
                            Complete Purchase
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() =>
                              releaseMutation.mutate(
                                { productId: cartItem.id, userId: simulatedUserId as number },
                                { onSuccess: () => { toast({ title: "Removed from cart", description: "Store is available again." }); } }
                              )
                            }
                            className="w-full"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4 italic">Cart is empty</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Purchase History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userPurchases.length > 0 ? (
                        userPurchases.map((p: any) => {
                          const store = visibleStores.find((entry: any) => entry.id === p.storeId) ?? stores.find((entry: any) => entry.id === p.storeId);
                          return (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                              <div>
                                <p className="font-medium">{store?.name || "Store"}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(p.purchasedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="font-bold">${p.price}</span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">No purchases yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Status legend - polished */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status Legend</h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-green-500/20 border border-green-500" />
                        <span>Available</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500" />
                        <span>Your Selection</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500" />
                        <span>Reserved (Others)</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500" />
                        <span>Fully Booked</span>
                      </div>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Booth Types</h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full bg-orange-500" />Food</div>
                        <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full bg-blue-500" />Tech</div>
                        <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full bg-purple-500" />Merchandise</div>
                        <div className="flex items-center gap-1.5 text-[10px]"><div className="w-2 h-2 rounded-full bg-yellow-500" />VIP</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete store alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.bookedCount
                ? `"${deleteTarget.name}" has ${deleteTarget.bookedCount} booked record(s). Deleting it will also remove those purchased entries from user history.`
                : `Delete "${deleteTarget?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStoreMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteStore}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteStoreMutation.isPending}
            >
              {deleteStoreMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Booth detail modal (user view) */}
      <Dialog open={!!detailStore} onOpenChange={(open) => { if (!open) setDetailStore(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                detailStore?.type === "Food" ? "bg-orange-500" :
                detailStore?.type === "Tech" ? "bg-blue-500" :
                detailStore?.type === "Merchandise" ? "bg-purple-500" :
                detailStore?.type === "VIP" ? "bg-yellow-500" : "bg-gray-400"
              }`} />
              {detailStore?.name}
            </DialogTitle>
          </DialogHeader>
          {detailStore && (
            <div className="space-y-4">
              {/* Visual preview */}
              <div className="flex justify-center py-2">
                <div
                  className={`border-2 rounded-md flex items-center justify-center ${
                    detailStatus === "booked" ? "border-red-400 bg-red-50" :
                    detailStatus === "reserved" ? "border-yellow-400 bg-yellow-50" :
                    "border-green-400 bg-green-50"
                  }`}
                  style={{
                    width: Math.min(detailStore.width * 0.8, 200),
                    height: Math.min(detailStore.height * 0.8, 140),
                  }}
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {detailStore.width / FEET_TO_PIXELS}×{detailStore.height / FEET_TO_PIXELS} ft
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-semibold">{detailStore.type}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-semibold">${detailStore.cost}</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Dimensions</p>
                  <p className="font-semibold">{detailStore.width / FEET_TO_PIXELS}×{detailStore.height / FEET_TO_PIXELS} ft</p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Area</p>
                  <p className="font-semibold">{(detailStore.width / FEET_TO_PIXELS) * (detailStore.height / FEET_TO_PIXELS)} sq ft</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Badge className={
                  detailStatus === "booked" ? "bg-red-500" :
                  detailStatus === "reserved" ? "bg-yellow-500" :
                  "bg-green-500"
                }>
                  {detailStatus === "booked" ? "Booked" : detailStatus === "reserved" ? "Reserved" : "Available"}
                </Badge>

                <div className="flex gap-2">
                  {detailIsOwnReservation && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          releaseMutation.mutate(
                            { productId: detailProduct.id, userId: simulatedUserId as number },
                            {
                              onSuccess: () => {
                                toast({ title: "Removed from cart", description: "Store is available again." });
                                setDetailStore(null);
                              },
                            }
                          );
                        }}
                      >
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUserStoreClick(detailStore.id, detailStore.name)}
                      >
                        Complete Purchase
                      </Button>
                    </>
                  )}
                  {detailStatus === "available" && !detailIsOwnReservation && (
                    <Button
                      size="sm"
                      disabled={!!cartItem || !simulatedUserId}
                      onClick={() => {
                        handleUserStoreClick(detailStore.id, detailStore.name);
                        setDetailStore(null);
                      }}
                    >
                      Reserve Booth
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
