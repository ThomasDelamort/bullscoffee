import { queryOptions, useMutation, useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ApiClient } from "../../lib/api";
import { useApi } from "../../lib/apiContext";
import type { Category, Product, ProductIngredient } from "../types";
import { numeric, toFormData, type ImageChange } from "./forms";
import { managerKeys } from "./keys";

const toProduct = (p: Product): Product => ({ ...numeric(p, "price"), has_sizes: Boolean(p.has_sizes) });
const toRecipeLine = (r: ProductIngredient): ProductIngredient => numeric(r, "quantity_required");
const byName = <T>(name: (row: T) => string) => (a: T, b: T) => name(a).localeCompare(name(b));

export function useProducts() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.products,
    queryFn: async () =>
      (await api.get<Product[]>("/products")).map(toProduct).sort(byName((p) => p.product_name)),
  });
}

export function useCategories() {
  const api = useApi();
  return useQuery({
    queryKey: managerKeys.categories,
    queryFn: () => api.get<Category[]>("/categories"),
  });
}

/* ------------------------------- Recipes ------------------------------- */

const recipeQuery = (api: ApiClient, productId: number) =>
  queryOptions({
    queryKey: managerKeys.recipe(productId),
    queryFn: async () =>
      (await api.get<ProductIngredient[]>(`/products/${productId}/ingredients`)).map(toRecipeLine),
    // Recipes change rarely and only from this console, which invalidates them itself.
    staleTime: 5 * 60_000,
  });

export function useRecipe(productId: number | null) {
  const api = useApi();
  return useQuery({ ...recipeQuery(api, productId ?? 0), enabled: productId !== null });
}

export interface RecipeIndex {
  /** Product id → recipe; a product is missing until its recipe has loaded. */
  recipes: ReadonlyMap<number, ProductIngredient[]>;
  /** True once every requested recipe is in. */
  loaded: boolean;
}

/**
 * Recipes for many products at once. The API serves one recipe per request,
 * so each is its own cached query: saving one product refetches only its own.
 * Pass a memoised id list; it's the cache key for the combined result.
 */
export function useRecipes(productIds: readonly number[]): RecipeIndex {
  const api = useApi();
  const combine = useCallback(
    (results: UseQueryResult<ProductIngredient[]>[]): RecipeIndex => {
      const recipes = new Map<number, ProductIngredient[]>();
      results.forEach((r, i) => {
        if (r.data) recipes.set(productIds[i]!, r.data);
      });
      return { recipes, loaded: results.every((r) => r.isSuccess) };
    },
    [productIds],
  );
  return useQueries({ queries: productIds.map((id) => recipeQuery(api, id)), combine });
}

/* ------------------------------ Mutations ------------------------------ */

export interface ProductFields {
  category_id: number;
  product_name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  has_sizes: boolean;
}

export interface SaveProductInput {
  /** null creates a new product. */
  productId: number | null;
  fields: ProductFields;
  image: ImageChange;
  recipe: Pick<ProductIngredient, "ingredient_id" | "quantity_required">[];
}

/** Saves the product, then replaces its recipe (a separate endpoint). */
export function useSaveProduct() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, fields, image, recipe }: SaveProductInput) => {
      const body = toFormData({ ...fields }, image);
      const saved = toProduct(
        productId === null
          ? await api.post<Product>("/products", body)
          : await api.put<Product>(`/products/${productId}`, body),
      );
      if (productId !== null || recipe.length > 0) {
        await api.put(`/products/${saved.product_id}/ingredients`, { ingredients: recipe });
      }
      return saved;
    },
    onSettled: (saved) => {
      void queryClient.invalidateQueries({ queryKey: managerKeys.products });
      if (saved) void queryClient.invalidateQueries({ queryKey: managerKeys.recipe(saved.product_id) });
    },
  });
}

type ProductPatch = Partial<Pick<Product, "category_id" | "is_available">>;

/** Inline edits from the product table; applied to the cache straight away. */
export function useUpdateProduct() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, changes }: { productId: number; changes: ProductPatch }) =>
      api.put<Product>(`/products/${productId}`, changes).then(toProduct),
    onMutate: async ({ productId, changes }) => {
      await queryClient.cancelQueries({ queryKey: managerKeys.products });
      const previous = queryClient.getQueryData<Product[]>(managerKeys.products);
      queryClient.setQueryData<Product[]>(managerKeys.products, (rows) =>
        rows?.map((p) => (p.product_id === productId ? { ...p, ...changes } : p)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(managerKeys.products, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: managerKeys.products }),
  });
}

export function useDeleteProduct() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: number) => api.delete(`/products/${productId}`),
    onSuccess: (_data, productId) => {
      queryClient.removeQueries({ queryKey: managerKeys.recipe(productId) });
      return queryClient.invalidateQueries({ queryKey: managerKeys.products });
    },
  });
}

export interface SaveCategoryInput {
  categoryId: number | null;
  category_name: string;
  image: ImageChange;
}

export function useSaveCategory() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, category_name, image }: SaveCategoryInput) => {
      const body = toFormData({ category_name }, image);
      return categoryId === null
        ? api.post<Category>("/categories", body)
        : api.put<Category>(`/categories/${categoryId}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.categories }),
  });
}

export function useDeleteCategory() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) => api.delete(`/categories/${categoryId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: managerKeys.categories }),
  });
}
