export interface Category {
  category_id?: number;
  category_name: string;
  image_url: string;
}

export interface Product {
  product_id?: number;
  category_id: number;
  product_name: string;
  description: string;
  image_url: string;
  price: number;
  is_available: boolean;
  /** Whether the POS asks for a size; price is then the tall price. */
  has_sizes: boolean;
  created_at?: Date;
}
export interface NewProduct {
  category_id: number;
  product_name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_available: boolean;
  has_sizes: boolean;
}

export type ProductChanges = Partial<NewProduct>;

export interface RecipeLine {
  ingredient_id: number;
  quantity_required: number;
}

export interface RecipeRow extends RecipeLine {
  product_id: number;
  ingredient_name: string;
  unit_of_measure: string;
}
