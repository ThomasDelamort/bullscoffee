import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { Discount } from "../types";
import { numeric } from "./forms";
import { managerKeys } from "./keys";

const toDiscount = (d: Discount): Discount => numeric(d, "value");

export function useDiscounts() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.discounts,
    queryFn: async () => (await api.get<Discount[]>("/discounts")).map(toDiscount),
  });
}

export type DiscountFields = Omit<Discount, "discount_id">;

export function useSaveDiscount() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ discountId, fields }: { discountId: number | null; fields: Partial<DiscountFields> }) =>
      discountId === null
        ? api.post<Discount>("/discounts", fields)
        : api.patch<Discount>(`/discounts/${discountId}`, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.discounts }),
  });
}

export function useDeleteDiscount() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (discountId: number) => api.delete(`/discounts/${discountId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.discounts }),
  });
}
