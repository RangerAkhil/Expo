import { useState, useSyncExternalStore } from "react";
import {
  getProducts,
  getPurchasesByUser,
  purchaseProduct,
  releaseProduct,
  reserveProduct,
  subscribeDemoStore,
} from "@/lib/demo-store";

export function useProducts() {
  const data = useSyncExternalStore(subscribeDemoStore, getProducts, getProducts);
  return { data, isLoading: false };
}

export function useUserPurchases(userId: number | null) {
  const data = useSyncExternalStore(
    subscribeDemoStore,
    () => (userId ? getPurchasesByUser(userId) : []),
    () => []
  );
  return { data, isLoading: false };
}

export function useReserveProduct() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (
      payload: { productId: number; userId: number },
      opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }
    ) => {
      try {
        setIsPending(true);
        reserveProduct(payload.productId, payload.userId);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function usePurchaseProduct() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (
      payload: { productId: number; userId: number },
      opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }
    ) => {
      try {
        setIsPending(true);
        purchaseProduct(payload.productId, payload.userId);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function useReleaseProduct() {
  const [isPending, setIsPending] = useState(false);
  return {
    isPending,
    mutate: (
      payload: { productId: number; userId: number },
      opts?: { onSuccess?: () => void; onError?: (error: unknown) => void }
    ) => {
      try {
        setIsPending(true);
        releaseProduct(payload.productId, payload.userId);
        opts?.onSuccess?.();
      } catch (error) {
        opts?.onError?.(error);
      } finally {
        setIsPending(false);
      }
    },
  };
}

