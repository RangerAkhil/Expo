import { useSyncExternalStore, useState } from "react";
import type { UpdateEventSettingsRequest } from "@/types/models";
import { getEventSettings, subscribeDemoStore, updateEventSettings } from "@/lib/demo-store";

export function useEventSettings() {
  const data = useSyncExternalStore(subscribeDemoStore, getEventSettings, getEventSettings);
  return { data, isLoading: false };
}

export function useUpdateEventSettings() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (updates: UpdateEventSettingsRequest, opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
      try {
        setIsPending(true);
        updateEventSettings(updates);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}
