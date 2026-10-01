import { queryOptions, useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ApiClient } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { Delivery, DeliveryDetails, DeliveryItem, Supplier, SupplierIngredient } from "../types";
import { numeric, toFormData, type ImageChange } from "./forms";
import { managerKeys } from "./keys";

const toPrice = (p: SupplierIngredient): SupplierIngredient => numeric(p, "unit_price");
const toDelivery = (d: Delivery): Delivery => numeric(d, "total_cost", "item_count");
const toDeliveryItem = (i: DeliveryItem): DeliveryItem => numeric(i, "quantity_received", "unit_cost");

export function useSuppliers() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.suppliers,
    queryFn: () => api.get<Supplier[]>("/suppliers"),
  });
}

/* ----------------------------- Price lists ----------------------------- */

const priceListQuery = (api: ApiClient, supplierId: number) =>
  queryOptions({
    queryKey: managerKeys.priceList(supplierId),
    queryFn: async () =>
      (await api.get<SupplierIngredient[]>(`/suppliers/${supplierId}/ingredients`)).map(toPrice),
  });

export function usePriceList(supplierId: number | null) {
  const api = useApi();
  return useQuery({ ...priceListQuery(api, supplierId ?? 0), enabled: supplierId !== null });
}

export interface PriceListIndex {
  /** Supplier id → price list; a supplier is missing until its list has loaded. */
  prices: ReadonlyMap<number, SupplierIngredient[]>;
  loaded: boolean;
}

/** Price lists for many suppliers, one cached query each. Pass a memoised id list. */
export function usePriceLists(supplierIds: readonly number[]): PriceListIndex {
  const api = useApi();
  const combine = useCallback(
    (results: UseQueryResult<SupplierIngredient[]>[]): PriceListIndex => {
      const prices = new Map<number, SupplierIngredient[]>();
      results.forEach((r, i) => {
        if (r.data) prices.set(supplierIds[i]!, r.data);
      });
      return { prices, loaded: results.every((r) => r.isSuccess) };
    },
    [supplierIds],
  );
  return useQueries({ queries: supplierIds.map((id) => priceListQuery(api, id)), combine });
}

/* ------------------------------ Deliveries ----------------------------- */

export function useDeliveries() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.deliveryList,
    queryFn: async () => (await api.get<Delivery[]>("/deliveries")).map(toDelivery),
  });
}

export function useDelivery(deliveryId: number | null) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.delivery(deliveryId ?? 0),
    queryFn: async (): Promise<DeliveryDetails> => {
      const d = await api.get<DeliveryDetails>(`/deliveries/${deliveryId}`);
      return { ...toDelivery(d), items: d.items.map(toDeliveryItem) };
    },
    enabled: deliveryId !== null,
  });
}

/* ------------------------------ Mutations ------------------------------ */

export interface SupplierFields {
  supplier_name: string;
  contact_person: string | null;
  supplier_email: string;
  contact_number: string | null;
  supplier_address: string | null;
}

export function useSaveSupplier() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, fields, image }: { supplierId: number | null; fields: SupplierFields; image: ImageChange }) => {
      const body = toFormData({ ...fields }, image);
      return supplierId === null
        ? api.post<Supplier>("/suppliers", body)
        : api.put<Supplier>(`/suppliers/${supplierId}`, body);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: managerKeys.suppliers }),
        // Delivery rows show the supplier's name.
        queryClient.invalidateQueries({ queryKey: managerKeys.deliveries }),
      ]),
  });
}

export function useSetSupplierActive() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ supplierId, is_active }: { supplierId: number; is_active: boolean }) =>
      api.put<Supplier>(`/suppliers/${supplierId}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.suppliers }),
  });
}

export function useSavePriceList() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      prices,
    }: {
      supplierId: number;
      prices: Pick<SupplierIngredient, "ingredient_id" | "unit_price">[];
    }) =>
      (await api.put<SupplierIngredient[]>(`/suppliers/${supplierId}/ingredients`, { ingredients: prices })).map(toPrice),
    onSuccess: (saved, { supplierId }) => queryClient.setQueryData(managerKeys.priceList(supplierId), saved),
  });
}

export interface DeliveryInput {
  supplier_id: number;
  /** YYYY-MM-DD */
  delivery_date: string;
  items: Pick<DeliveryItem, "ingredient_id" | "quantity_received" | "unit_cost">[];
}

/** Records the delivery; the backend adds every item to stock in the same transaction. */
export function useRecordDelivery() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delivery: DeliveryInput) => api.post<DeliveryDetails>("/deliveries", delivery),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: managerKeys.deliveries }),
        queryClient.invalidateQueries({ queryKey: managerKeys.ingredients }),
        queryClient.invalidateQueries({ queryKey: managerKeys.movements }),
      ]),
  });
}
