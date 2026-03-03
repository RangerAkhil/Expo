import { useRole } from "@/hooks/use-role";
import { useEventSettings } from "@/hooks/use-event-settings";
import { useStores } from "@/hooks/use-stores";
import { useUsers } from "@/hooks/use-users";
import { useProducts, usePurchaseProduct, useReleaseProduct, useReserveProduct, useUserPurchases } from "@/hooks/use-marketplace";
import { GroundLayout } from "@/components/GroundLayout";
import { OrganizerSidebar } from "@/components/Sidebar";
import { ShoppingCart, List, Grid3X3, History } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { isOrganizer, isUser, role } = useRole();
  const { data: settings, isLoading: loadingSettings } = useEventSettings();
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const { data: users = [], isLoading: loadingUsers } = useUsers();
  const { data: products = [] } = useProducts();
  const { toast } = useToast();

  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");
  const demoUser = useMemo(() => users.find((u: any) => u.role === "user") ?? null, [users]);
  const simulatedUserId = demoUser?.id ?? null;
  const { data: userPurchases = [] } = useUserPurchases(simulatedUserId);

  const reserveMutation = useReserveProduct();
  const purchaseMutation = usePurchaseProduct();
  const releaseMutation = useReleaseProduct();

  const cartItem = useMemo(() => {
    return products.find((p: any) => p.reservedById === simulatedUserId && p.status === 'reserved');
  }, [products, simulatedUserId]);

  const getReservationTimeLeft = (reservedAt: Date | null) => {
    if (!reservedAt) return "Reserved";
    const expiresAt = new Date(reservedAt).getTime() + 30 * 60 * 1000;
    const remainingMs = Math.max(0, expiresAt - Date.now());
    const mins = Math.ceil(remainingMs / 60_000);
    return `Reserved for ${mins}m`;
  };

  const handleUserStoreClick = (storeId: number, storeName: string) => {
    if (!simulatedUserId) {
      toast({
        title: "No user available",
        description: "Create/select a user profile to continue booking.",
        variant: "destructive",
      });
      return;
    }

    const storeProducts = products.filter((product: any) => product.storeId === storeId);
    if (storeProducts.length === 0) {
      toast({ title: storeName, description: "No products available in this store." });
      return;
    }

    const usersReservedProduct = storeProducts.find(
      (product: any) => product.status === "reserved" && product.reservedById === simulatedUserId
    );

    if (usersReservedProduct) {
      purchaseMutation.mutate(
        { productId: usersReservedProduct.id, userId: simulatedUserId },
        {
          onSuccess: () => {
            toast({
              title: "Purchase complete",
              description: `${usersReservedProduct.name} booked successfully.`,
            });
          },
          onError: () => {
            toast({
              title: "Purchase failed",
              description: "Reservation expired or item is no longer available.",
              variant: "destructive",
            });
          },
        }
      );
      return;
    }

    const firstAvailableProduct = storeProducts.find((product: any) => product.status === "available");
    if (!firstAvailableProduct) {
      toast({
        title: "Store not available",
        description: "All items are reserved or booked right now.",
        variant: "destructive",
      });
      return;
    }

    reserveMutation.mutate(
      { productId: firstAvailableProduct.id, userId: simulatedUserId },
      {
        onSuccess: () => {
          toast({
            title: "Added to cart",
            description: `${firstAvailableProduct.name} reserved for 30 minutes.`,
          });
        },
        onError: () => {
          toast({
            title: "Reservation failed",
            description: "Item is reserved or booked by another user.",
            variant: "destructive",
          });
        },
      }
    );
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

  const activeSettings = settings || { id: 1, width: 800, height: 600, shape: 'square' };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 p-6">
      <div className="max-w-[1600px] mx-auto space-y-8">

        {isOrganizer && (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Event Organizer Setup</h1>
              <p className="text-muted-foreground mt-1">Design the layout, add stores, and manage your event.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <OrganizerSidebar stores={stores} users={users} settings={activeSettings} />
              <div className="flex-1 w-full min-w-0">
                <GroundLayout settings={activeSettings} stores={stores} />
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
                      <CardDescription>Click on a store to view its products</CardDescription>
                    </CardHeader>
                    <GroundLayout
                      settings={activeSettings}
                      stores={stores}
                      isInteractive={false}
                      onStoreClick={(s) => {
                        handleUserStoreClick(s.id, s.name);
                      }}
                      currentUserCartId={cartItem?.id}
                      allProducts={products}
                      currentUserId={simulatedUserId}
                    />
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product: any) => {
                      const store = stores.find(s => s.id === product.storeId);
                      const isOwnReservation = product.reservedById === simulatedUserId;
                      const isOtherReservation = product.status === 'reserved' && !isOwnReservation;
                      const isBooked = product.status === 'booked';

                      return (
                        <Card key={product.id} className="flex flex-col">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>{store?.name}</CardDescription>
                              </div>
                              <Badge
                                className={
                                  isBooked ? "bg-green-500 hover:bg-green-600" :
                                    isOwnReservation ? "bg-blue-500 hover:bg-blue-600" :
                                      isOtherReservation ? "bg-yellow-500 hover:bg-yellow-600" :
                                        "bg-black"
                                }
                              >
                                {isBooked ? "Fully Booked" : isOwnReservation ? "In Your Cart" : isOtherReservation ? "In Process" : "Available"}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1">
                            <p className="text-sm text-muted-foreground mb-4">{product.description}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold">${product.price}</span>
                              <Button
                                disabled={isBooked || (product.status === 'reserved' && !isOwnReservation) || (!isOwnReservation && !!cartItem) || !simulatedUserId}
                                onClick={() =>
                                  reserveMutation.mutate(
                                    { productId: product.id, userId: simulatedUserId as number },
                                    {
                                      onSuccess: () => {
                                        toast({ title: "Added to cart", description: "Item reserved for 30 minutes." });
                                      },
                                      onError: () => {
                                        toast({
                                          title: "Reservation failed",
                                          description: "Item is reserved or booked by another user.",
                                          variant: "destructive",
                                        });
                                      },
                                    }
                                  )
                                }
                                size="sm"
                              >
                                {isOwnReservation ? "Already in Cart" : "Add to Cart"}
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
                          <p className="font-semibold">{cartItem.name}</p>
                          <p className="text-xs text-muted-foreground">{getReservationTimeLeft(cartItem.reservedAt)}</p>
                          <p className="mt-2 font-bold">${cartItem.price}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={() =>
                              purchaseMutation.mutate(
                                { productId: cartItem.id, userId: simulatedUserId as number },
                                {
                                  onSuccess: () => {
                                    toast({ title: "Purchase complete", description: "Item booked successfully." });
                                  },
                                  onError: () => {
                                    toast({
                                      title: "Purchase failed",
                                      description: "Reservation expired or item is no longer available.",
                                      variant: "destructive",
                                    });
                                  },
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
                                {
                                  onSuccess: () => {
                                    toast({ title: "Removed from cart", description: "Item is available again." });
                                  },
                                }
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
                          const product = products.find((prod: any) => prod.id === p.productId);
                          return (
                            <div key={p.id} className="flex items-center justify-between p-2 rounded bg-muted/50 text-xs">
                              <div>
                                <p className="font-medium">{product?.name || "Product"}</p>
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

                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Legend</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Your Selection</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>In Booking (Others)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Fully Booked</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
