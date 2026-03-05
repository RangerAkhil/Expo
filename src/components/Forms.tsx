import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateStore } from "@/hooks/use-stores";
import { useCreateUser } from "@/hooks/use-users";
import { useUpdateEventSettings } from "@/hooks/use-event-settings";
import type { EventSettings, FurnitureKind, Shape, UserRole } from "@/types/models";
import { useCreateFurniture } from "@/hooks/use-furniture";

const FEET_TO_PIXELS = 10;

const BOOTH_PRESETS = [
  { label: "Compact 8×8",   widthFt: 8,  heightFt: 8 },
  { label: "Standard 10×10", widthFt: 10, heightFt: 10 },
  { label: "Corner 20×10",  widthFt: 20, heightFt: 10 },
  { label: "Premium 15×15", widthFt: 15, heightFt: 15 },
  { label: "Large 20×20",   widthFt: 20, heightFt: 20 },
  { label: "VIP 25×15",     widthFt: 25, heightFt: 15 },
] as const;

const BOOTH_TYPES = ["Food", "Tech", "Merchandise", "VIP", "Other"] as const;

export function StoreForm({ onSuccess }: { onSuccess: () => void }) {
  const createStore = useCreateStore();
  const [formData, setFormData] = useState({
    name: "", type: "Food", cost: 0, width: 10, height: 10
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

  const applyPreset = (preset: typeof BOOTH_PRESETS[number]) => {
    setFormData((prev) => ({ ...prev, width: preset.widthFt, height: preset.heightFt }));
  };

  const previewW = Math.min(formData.width * 3, 180);
  const previewH = Math.min(formData.height * 3, 120);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Quick-select presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          {BOOTH_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`text-[10px] px-2 py-1.5 rounded-lg border transition-colors font-medium ${
                formData.width === preset.widthFt && formData.height === preset.heightFt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted hover:bg-muted/80 border-border"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Booth Name</Label>
        <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Main Stage..." />
      </div>
      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
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
          <Input required type="number" value={formData.cost} onChange={e => setFormData({ ...formData, cost: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Width (ft)</Label>
          <Input required type="number" value={formData.width} onChange={e => setFormData({ ...formData, width: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Height (ft)</Label>
          <Input required type="number" value={formData.height} onChange={e => setFormData({ ...formData, height: Number(e.target.value) })} />
        </div>
      </div>

      {/* Visual size preview */}
      <div className="flex flex-col items-center gap-1 py-2">
        <Label className="text-xs text-muted-foreground">Size Preview</Label>
        <div
          className="border-2 border-dashed border-primary/40 rounded-md bg-primary/5 flex items-center justify-center"
          style={{ width: previewW, height: previewH }}
        >
          <span className="text-[10px] font-medium text-primary">
            {formData.width}×{formData.height} ft
          </span>
        </div>
      </div>

      <Button type="submit" disabled={createStore.isPending} className="w-full">
        {createStore.isPending ? "Adding..." : "Add Booth"}
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

const FURNITURE_KINDS: { value: FurnitureKind; label: string }[] = [
  { value: "stairs", label: "Stairs" },
  { value: "lobby", label: "Lobby Area" },
  { value: "screen", label: "Display Screen" },
  { value: "pillar", label: "Pillar" },
  { value: "bench", label: "Bench" },
  { value: "table", label: "Table" },
  { value: "stage", label: "Stage" },
  { value: "barrier", label: "Barrier" },
  { value: "registration", label: "Registration Desk" },
  { value: "restroom", label: "Restroom" },
  { value: "exit", label: "Emergency Exit" },
  { value: "column", label: "Structural Column" },
  { value: "wall", label: "Wall Section" },
];

export function FurnitureForm({ onSuccess }: { onSuccess: () => void }) {
  const createFurniture = useCreateFurniture();
  const [formData, setFormData] = useState({
    name: "",
    kind: "table" as FurnitureKind,
    width: 4,
    height: 3,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFurniture.mutate(
      {
        name: formData.name,
        kind: formData.kind,
        width: Number(formData.width) * FEET_TO_PIXELS,
        height: Number(formData.height) * FEET_TO_PIXELS,
      },
      { onSuccess },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Custom Table..." />
      </div>
      <div className="space-y-2">
        <Label>Kind</Label>
        <Select value={formData.kind} onValueChange={(v) => setFormData({ ...formData, kind: v as FurnitureKind })}>
          <SelectTrigger>
            <SelectValue placeholder="Select kind" />
          </SelectTrigger>
          <SelectContent>
            {FURNITURE_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Width (ft)</Label>
          <Input required type="number" value={formData.width} onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Height (ft)</Label>
          <Input required type="number" value={formData.height} onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })} />
        </div>
      </div>
      <Button type="submit" disabled={createFurniture.isPending} className="w-full">
        {createFurniture.isPending ? "Adding..." : "Add Furniture"}
      </Button>
    </form>
  );
}
