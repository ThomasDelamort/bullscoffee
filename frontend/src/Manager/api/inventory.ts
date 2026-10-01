import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiContext";
import type { Ingredient, StockMovement } from "../types";
import { numeric, toFormData, type ImageChange } from "./forms";
import { managerKeys, type MovementFilters } from "./keys";

const toIngredient = (i: Ingredient): Ingredient => numeric(i, "current_quantity", "minimum_stock_level");
const toMovement = (m: StockMovement): StockMovement => numeric(m, "quantity_change");

export function useIngredients() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.ingredients,
    queryFn: async () => (await api.get<Ingredient[]>("/ingredients")).map(toIngredient),
  });
}

export function useStockMovements(filters: MovementFilters = {}) {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.movementList(filters),
    queryFn: async () =>
      (await api.get<StockMovement[]>("/stock-movements", { ...filters })).map(toMovement),
  });
}

export interface IngredientFields {
  ingredient_name: string;
  unit_of_measure: string;
  minimum_stock_level: number;
}

export interface SaveIngredientInput {
  ingredientId: number | null;
  fields: IngredientFields;
  image: ImageChange;
  /** New ingredients only: logged as a count correction, since stock only moves through movements. */
  openingStock: number;
}

export function useSaveIngredient() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ingredientId, fields, image, openingStock }: SaveIngredientInput) => {
      const body = toFormData({ ...fields }, image);
      if (ingredientId !== null) return toIngredient(await api.put<Ingredient>(`/ingredients/${ingredientId}`, body));

      const created = toIngredient(await api.post<Ingredient>("/ingredients", body));
      if (openingStock > 0) {
        await api.post("/stock-movements", {
          ingredient_id: created.ingredient_id,
          quantity_change: openingStock,
          reason: "adjustment",
        });
      }
      return created;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: managerKeys.ingredients });
      void queryClient.invalidateQueries({ queryKey: managerKeys.movements });
      // Recipes and price lists carry the ingredient's name and unit.
      void queryClient.invalidateQueries({ queryKey: managerKeys.recipes });
      void queryClient.invalidateQueries({ queryKey: managerKeys.priceLists });
    },
  });
}

export function useSetIngredientActive() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ingredientId, is_active }: { ingredientId: number; is_active: boolean }) =>
      api.put<Ingredient>(`/ingredients/${ingredientId}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.ingredients }),
  });
}

export interface MovementInput {
  ingredient_id: number;
  /** Positive adds stock, negative removes it. */
  quantity_change: number;
  reason: "waste" | "adjustment";
}

export function useRecordMovement() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (movement: MovementInput) => api.post<StockMovement>("/stock-movements", movement),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: managerKeys.ingredients }),
        queryClient.invalidateQueries({ queryKey: managerKeys.movements }),
      ]),
  });
}
