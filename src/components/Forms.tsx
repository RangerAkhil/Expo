import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStore } from "@/hooks/use-stores";
import { useCreateUser } from "@/hooks/use-users";
import { useUpdateEventSettings } from "@/hooks/use-event-settings";
import type { EventSettings, Shape, UserRole } from "@/types/models";

const FEET_TO_PIXELS = 10;

export function StoreForm({ onSuccess }: { onSuccess: () => void }) {
  const createStore = useCreateStore();
  const [formData, setFormData] = useState({
    name: "", type: "", cost: 0, width: 5, height: 5
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStore.mutate({
      ...formData,
      x: 0, y: 0,
      cost: Number(formData.cost),
      width: Number(formData.width) * FEET_TO_PIXELS,
      height: Number(formData.height) * FEET_TO_PIXELS
    }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Store Name</Label>
        <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Main Stage..." />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Input required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} placeholder="Food, Tech, VIP..." />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Cost ($)</Label>
          <Input required type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Width (sq ft)</Label>
          <Input required type="number" value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Height (sq ft)</Label>
          <Input required type="number" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} />
        </div>
      </div>
      <Button type="submit" disabled={createStore.isPending} className="w-full">
        {createStore.isPending ? "Adding..." : "Add Store"}
      </Button>
    </form>
  );
}

export function EventSettingsForm({ currentSettings }: { currentSettings: EventSettings }) {
  const updateSettings = useUpdateEventSettings();
  const [formData, setFormData] = useState({
    width: currentSettings.width,
    height: currentSettings.height,
    shape: currentSettings.shape
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({
      width: Number(formData.width),
      height: Number(formData.height),
      shape: formData.shape
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Canvas Width</Label>
          <Input required type="number" value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Canvas Height</Label>
          <Input required type="number" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Shape</Label>
        <Select value={formData.shape} onValueChange={(v) => setFormData({ ...formData, shape: v as Shape })}>
          <SelectTrigger>
            <SelectValue placeholder="Select shape" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="circular">Circular</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={updateSettings.isPending} className="w-full">
        {updateSettings.isPending ? "Saving..." : "Save Configuration"}
      </Button>
    </form>
  );
}

export function UserForm({ onSuccess }: { onSuccess: () => void }) {
  const createUser = useCreateUser();
  const [formData, setFormData] = useState<{ name: string; role: UserRole }>({ name: "", role: "user" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(formData, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>User Name</Label>
        <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}>
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="organizer">Organizer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={createUser.isPending} className="w-full">
        {createUser.isPending ? "Creating..." : "Create User"}
      </Button>
    </form>
  );
}
