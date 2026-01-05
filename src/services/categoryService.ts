import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fromDbCategory,
  toDbCategory,
  type Category,
  type NewCategoryInput,
} from "../mappers/category";

export const createCategory = async (
  client: SupabaseClient,
  input: NewCategoryInput
): Promise<Category> => {
  const { data, error } = await client
    .from("categories")
    .insert(toDbCategory(input))
    .select("id, organization_id, name")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create category: ${error?.message ?? "unknown"}`);
  }

  return fromDbCategory(data);
};

export const listCategories = async (
  client: SupabaseClient,
  organizationId: string
): Promise<Category[]> => {
  const { data, error } = await client
    .from("categories")
    .select("id, organization_id, name")
    .eq("organization_id", organizationId);

  if (error || !data) {
    throw new Error(`Failed to list categories: ${error?.message ?? "unknown"}`);
  }

  return data.map(fromDbCategory);
};
