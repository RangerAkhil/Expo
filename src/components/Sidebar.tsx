import { GripVertical, Plus, Users } from "lucide-react";
import type { Store, User, EventSettings } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StoreForm, EventSettingsForm } from "./Forms";
import { useUpdateStore } from "@/hooks/use-stores";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizerSidebarProps = {
  stores: Store[];
  users: User[];
  settings: EventSettings;
  onRequestDeleteStore: (store: Store, bookedCount: number) => void;
  bookedCountByStoreId: Map<number, number>;
};

export function OrganizerSidebar({ stores, users, settings, onRequestDeleteStore, bookedCountByStoreId }: OrganizerSidebarProps) {
  const [isStoreOpen, setStoreOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", type: "", cost: 0, width: 50, height: 50 });
  const updateStore = useUpdateStore();

  const unplacedStores = stores.filter(s => s.x === 0 && s.y === 0);

  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-6">
      <div className="bg-card rounded-2xl p-5 border shadow-sm flex flex-col gap-4">
        <h2 className="font-display font-bold text-lg border-b pb-2">Event Settings</h2>
        <EventSettingsForm currentSettings={settings} />
      </div>

      <div className="bg-card rounded-2xl p-5 border shadow-sm flex flex-col gap-4 flex-1">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="font-display font-bold text-lg">Inventory</h2>
          <Dialog open={isStoreOpen} onOpenChange={setStoreOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Store</DialogTitle>
              </DialogHeader>
              <StoreForm onSuccess={() => setStoreOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-xs text-muted-foreground">Drag items below onto the canvas</p>
        
        <div className="flex-1 overflow-auto space-y-3">
          {unplacedStores.map(store => (
            <div 
              key={store.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("storeId", store.id.toString());
              }}
              className="group bg-muted p-3 rounded-xl border border-transparent hover:border-primary/50 cursor-grab active:cursor-grabbing transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{store.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{store.type} • {store.width}x{store.height}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    setEditingStore(store);
                    setEditFormData({
                      name: store.name,
                      type: store.type,
                      cost: store.cost,
                      width: store.width,
                      height: store.height,
                    });
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 px-2 text-xs"
                  onClick={() => onRequestDeleteStore(store, bookedCountByStoreId.get(store.id) ?? 0)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {unplacedStores.length === 0 && (
            <div className="text-center p-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
              All stores are placed!
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!editingStore} onOpenChange={(open) => { if (!open) setEditingStore(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
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
                  width: Number(editFormData.width),
                  height: Number(editFormData.height),
                },
                { onSuccess: () => setEditingStore(null) }
              );
            }}
          >
            <div className="space-y-2">
              <Label>Store Name</Label>
              <Input required value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Input required value={editFormData.type} onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input required type="number" value={editFormData.cost} onChange={(e) => setEditFormData({ ...editFormData, cost: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Width</Label>
                <Input required type="number" value={editFormData.width} onChange={(e) => setEditFormData({ ...editFormData, width: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Height</Label>
                <Input required type="number" value={editFormData.height} onChange={(e) => setEditFormData({ ...editFormData, height: Number(e.target.value) })} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateStore.isPending}>
              {updateStore.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-card rounded-2xl p-5 border shadow-sm">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Users
          </h2>
          <span className="text-xs text-muted-foreground">Fixed Demo Accounts</span>
        </div>
        <div className="space-y-2 max-h-[200px] overflow-auto">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors">
              <span className="text-sm font-medium">{u.name}</span>
              <span className="text-[10px] bg-secondary px-2 py-1 rounded-full uppercase">{u.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
