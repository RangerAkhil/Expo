import { useState, useSyncExternalStore } from "react";
import type { InsertFurniture, UpdateFurnitureRequest } from "@/types/models";
import { createFurniture, deleteFurniture, getFurniture, subscribeDemoStore, updateFurniture } from "@/lib/demo-store";

export function useFurniture() {
  const data = useSyncExternalStore(subscribeDemoStore, getFurniture, getFurniture);
  return { data, isLoading: false };
}

export function useCreateFurniture() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (data: InsertFurniture, opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      try {
        setIsPending(true);
        createFurniture(data);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function useUpdateFurniture() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (
      { id, ...updates }: { id: number } & UpdateFurnitureRequest,
      opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }
    ) => {
      try {
        setIsPending(true);
        updateFurniture(id, updates);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function useDeleteFurniture() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      try {
        setIsPending(true);
        deleteFurniture(id);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}
