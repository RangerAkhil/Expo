import { ChevronDown, GripVertical, Pencil, Plus, RotateCcw, Trash2, Users, Armchair } from "lucide-react";
import type { Store, User, EventSettings, Furniture, FurnitureKind } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StoreForm, EventSettingsForm, FurnitureForm } from "./Forms";
import { useResetDemoStore, useUpdateStore } from "@/hooks/use-stores";
import { useCreateFurniture, useDeleteFurniture } from "@/hooks/use-furniture";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const FEET_TO_PIXELS = 10;
const BOOTH_TYPES = ["Food", "Tech", "Merchandise", "VIP", "Other"] as const;

const FURNITURE_PRESETS: { kind: FurnitureKind; label: string; widthFt: number; heightFt: number }[] = [
  { kind: "stairs",       label: "Stairs",       widthFt: 6,  heightFt: 4 },
  { kind: "lobby",        label: "Lobby",        widthFt: 15, heightFt: 10 },
  { kind: "screen",       label: "Screen",       widthFt: 8,  heightFt: 2 },
  { kind: "pillar",       label: "Pillar",       widthFt: 3,  heightFt: 3 },
  { kind: "bench",        label: "Bench",        widthFt: 6,  heightFt: 2 },
  { kind: "table",        label: "Table",        widthFt: 4,  heightFt: 3 },
  { kind: "stage",        label: "Stage",        widthFt: 20, heightFt: 12 },
  { kind: "barrier",      label: "Barrier",      widthFt: 10, heightFt: 1 },
  { kind: "registration", label: "Reg. Desk",    widthFt: 12, heightFt: 3 },
  { kind: "restroom",     label: "Restroom",     widthFt: 8,  heightFt: 6 },
  { kind: "exit",         label: "Exit",         widthFt: 5,  heightFt: 3 },
  { kind: "column",       label: "Column",       widthFt: 2,  heightFt: 2 },
  { kind: "wall",         label: "Wall",         widthFt: 15, heightFt: 1 },
];

type OrganizerSidebarProps = {
  stores: Store[];
  users: User[];
  settings: EventSettings;
  furniture: Furniture[];
  onRequestDeleteStore: (store: Store, bookedCount: number) => void;
  bookedCountByStoreId: Map<number, number>;
};

export function OrganizerSidebar({ stores, users, settings, furniture, onRequestDeleteStore, bookedCountByStoreId }: OrganizerSidebarProps) {
  const [isStoreOpen, setStoreOpen] = useState(false);
  const [isFurnitureFormOpen, setFurnitureFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", type: "", cost: 0, width: 5, height: 5 });
  const [isResetOpen, setResetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(true);
  const [furnitureOpen, setFurnitureOpen] = useState(true);
  const [usersOpen, setUsersOpen] = useState(false);
  const updateStore = useUpdateStore();
  const resetStore = useResetDemoStore();
  const createFurnitureMutation = useCreateFurniture();
  const deleteFurnitureMutation = useDeleteFurniture();
  const { toast } = useToast();

  const unplacedStores = stores.filter(s => s.x === 0 && s.y === 0);
  const placedStores = stores.filter(s => s.x !== 0 || s.y !== 0);
  const unplacedFurniture = furniture.filter(f => f.x === 0 && f.y === 0);
  const placedFurniture = furniture.filter(f => f.x !== 0 || f.y !== 0);

  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-4">
      {/* Counts header */}
      <div className="bg-card rounded-xl px-4 py-2.5 border shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">
          <span className="text-foreground font-bold">{stores.length}</span> total
          <span className="mx-1.5 text-border">|</span>
          <span className="text-foreground font-bold">{placedStores.length}</span> placed
          <span className="mx-1.5 text-border">|</span>
          <span className="text-foreground font-bold">{unplacedStores.length}</span> unplaced
        </p>
      </div>

      {/* Event Settings - Collapsible */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <h2 className="font-display font-bold text-sm">Event Settings</h2>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-4">
              <EventSettingsForm currentSettings={settings} />
              <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-destructive">Reset:</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={resetStore.isPending}
                  onClick={() => setResetOpen(true)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {resetStore.isPending ? "..." : "Reset"}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Inventory - Collapsible */}
      <Collapsible open={inventoryOpen} onOpenChange={setInventoryOpen}>
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden flex-1">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <h2 className="font-display font-bold text-sm">Inventory</h2>
            <div className="flex items-center gap-2">
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${inventoryOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Drag items onto canvas</p>
                <Dialog open={isStoreOpen} onOpenChange={setStoreOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="secondary" className="w-7 h-7 rounded-full">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Booth</DialogTitle>
                    </DialogHeader>
                    <StoreForm onSuccess={() => setStoreOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-auto">
                {unplacedStores.map(store => {
                  const wFt = store.width / FEET_TO_PIXELS;
                  const hFt = store.height / FEET_TO_PIXELS;
                  const previewW = Math.min(wFt * 2, 36);
                  const previewH = Math.min(hFt * 2, 28);

                  return (
                    <div
                      key={store.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("storeId", store.id.toString());
                      }}
                      className="group bg-muted p-2.5 rounded-xl border border-transparent hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all flex items-center gap-2.5"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      {/* Mini dimension preview */}
                      <div
                        className="flex-shrink-0 border border-primary/30 rounded bg-primary/5 flex items-center justify-center"
                        style={{ width: previewW, height: previewH }}
                      >
                        <span className="text-[7px] text-primary font-medium">{wFt}×{hFt}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{store.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {store.type} · ${store.cost}
                        </div>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6"
                          onClick={() => {
                            setEditingStore(store);
                            setEditFormData({
                              name: store.name,
                              type: store.type,
                              cost: store.cost,
                              width: Number((store.width / FEET_TO_PIXELS).toFixed(2)),
                              height: Number((store.height / FEET_TO_PIXELS).toFixed(2)),
                            });
                          }}
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-6 h-6 text-destructive hover:text-destructive"
                          onClick={() => onRequestDeleteStore(store, bookedCountByStoreId.get(store.id) ?? 0)}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {unplacedStores.length === 0 && (
                  <div className="text-center p-4 border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                    All booths are placed!
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Furniture & Props - Collapsible */}
      <Collapsible open={furnitureOpen} onOpenChange={setFurnitureOpen}>
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <h2 className="font-display font-bold text-sm flex items-center gap-2">
              <Armchair className="w-4 h-4 text-primary" /> Furniture & Props
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">{placedFurniture.length} placed</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${furnitureOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              {/* Preset buttons */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Quick Add Presets</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {FURNITURE_PRESETS.map((preset) => (
                    <button
                      key={preset.kind}
                      type="button"
                      className="text-[9px] px-1.5 py-1.5 rounded-lg border bg-muted hover:bg-muted/80 border-border transition-colors font-medium text-center leading-tight"
                      onClick={() => {
                        createFurnitureMutation.mutate({
                          name: preset.label,
                          kind: preset.kind,
                          width: preset.widthFt * FEET_TO_PIXELS,
                          height: preset.heightFt * FEET_TO_PIXELS,
                        }, {
                          onSuccess: () => toast({ title: "Added", description: `${preset.label} created. Drag it onto the canvas.` }),
                        });
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom add */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Drag items onto canvas</p>
                <Dialog open={isFurnitureFormOpen} onOpenChange={setFurnitureFormOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="secondary" className="w-7 h-7 rounded-full">
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Furniture</DialogTitle>
                    </DialogHeader>
                    <FurnitureForm onSuccess={() => setFurnitureFormOpen(false)} />
                  </DialogContent>
                </Dialog>
              </div>

              {/* Unplaced furniture list */}
              <div className="space-y-2 max-h-[240px] overflow-auto">
                {unplacedFurniture.map((item) => {
                  const wFt = item.width / FEET_TO_PIXELS;
                  const hFt = item.height / FEET_TO_PIXELS;
                  const previewW = Math.min(wFt * 2, 36);
                  const previewH = Math.min(hFt * 2, 28);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("furnitureId", item.id.toString());
                      }}
                      className="group bg-muted p-2.5 rounded-xl border border-transparent hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all flex items-center gap-2.5"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div
                        className="flex-shrink-0 border border-primary/30 rounded bg-primary/5 flex items-center justify-center"
                        style={{ width: previewW, height: previewH }}
                      >
                        <span className="text-[7px] text-primary font-medium">{wFt}x{hFt}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{item.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {item.kind}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-6 h-6 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFurnitureMutation.mutate(item.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
                {unplacedFurniture.length === 0 && (
                  <div className="text-center p-3 border-2 border-dashed rounded-xl text-muted-foreground text-xs">
                    All furniture placed!
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Edit Store Dialog */}
      <Dialog open={!!editingStore} onOpenChange={(open) => { if (!open) setEditingStore(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Booth</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingStore) return;
              updateStore.mutate(
                {
                  id: editingStore.id,
                  name: editFormData.name,
                  type: editFormData.type,
                  cost: Number(editFormData.cost),
                  width: Number(editFormData.width) * FEET_TO_PIXELS,
                  height: Number(editFormData.height) * FEET_TO_PIXELS,
                },
                { onSuccess: () => setEditingStore(null) }
              );
            }}
          >
            <div className="space-y-2">
              <Label>Booth Name</Label>
              <Input required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editFormData.type} onValueChange={(v) => setEditFormData({ ...editFormData, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BOOTH_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input required type="number" value={editFormData.cost} onChange={(e) => setEditFormData({ ...editFormData, cost: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Width (ft)</Label>
                <Input required type="number" value={editFormData.width} onChange={(e) => setEditFormData({ ...editFormData, width: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Height (ft)</Label>
                <Input required type="number" value={editFormData.height} onChange={(e) => setEditFormData({ ...editFormData, height: Number(e.target.value) })} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateStore.isPending}>
              {updateStore.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset dialog */}
      <AlertDialog open={isResetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear local storage and reset all organizer/user demo data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetStore.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={resetStore.isPending}
              onClick={() => {
                resetStore.mutate({
                  onSuccess: () => {
                    setResetOpen(false);
                    toast({ title: "Reset successful", description: "All local demo data has been reset." });
                  },
                  onError: () => {
                    toast({ title: "Reset failed", description: "Could not clear local storage.", variant: "destructive" });
                  },
                });
              }}
            >
              {resetStore.isPending ? "Resetting..." : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Users - Collapsible */}
      <Collapsible open={usersOpen} onOpenChange={setUsersOpen}>
        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <h2 className="font-display font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Users
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Demo Accounts</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${usersOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors">
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className="text-[10px] bg-secondary px-2 py-1 rounded-full uppercase">{u.role}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
