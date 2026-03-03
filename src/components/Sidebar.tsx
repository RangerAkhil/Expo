import { GripVertical, Plus, Users } from "lucide-react";
import type { Store, User, EventSettings } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StoreForm, EventSettingsForm } from "./Forms";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateStore } from "@/hooks/use-stores";
import { useState } from "react";

export function OrganizerSidebar({ stores, users, settings }: { stores: Store[], users: User[], settings: EventSettings }) {
  const [isStoreOpen, setStoreOpen] = useState(false);
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
              
              <div className="w-32" onClick={(e) => e.stopPropagation()}>
                <Select 
                  value={store.assignedUserId ? store.assignedUserId.toString() : "unassigned"} 
                  onValueChange={(val) => {
                    const userId = val === "unassigned" ? null : parseInt(val);
                    updateStore.mutate({ id: store.id, assignedUserId: userId });
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Assign User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="text-muted-foreground italic">Unassigned</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
