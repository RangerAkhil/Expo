import { useState, useSyncExternalStore } from "react";
import type { InsertStore, UpdateStoreRequest } from "@/types/models";
import { createStore, deleteStore, getStores, subscribeDemoStore, updateStore } from "@/lib/demo-store";

export function useStores() {
  const data = useSyncExternalStore(subscribeDemoStore, getStores, getStores);
  return { data, isLoading: false };
}

export function useCreateStore() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (data: InsertStore, opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      try {
        setIsPending(true);
        createStore(data);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function useUpdateStore() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (
      { id, ...updates }: { id: number } & UpdateStoreRequest,
      opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }
    ) => {
      try {
        setIsPending(true);
        updateStore(id, updates);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function useDeleteStore() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      try {
        setIsPending(true);
        deleteStore(id);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}
