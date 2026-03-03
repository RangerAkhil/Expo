import { useState, useSyncExternalStore } from "react";
import type { InsertUser } from "@/types/models";
import { createUser, getUsers, subscribeDemoStore } from "@/lib/demo-store";

export function useUsers() {
  const data = useSyncExternalStore(subscribeDemoStore, getUsers, getUsers);
  return { data, isLoading: false };
}

export function useCreateUser() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (data: InsertUser, opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      try {
        setIsPending(true);
        createUser(data);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}
