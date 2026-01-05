import type { SupabaseClient } from "@supabase/supabase-js";
import { fromDbCategory, toDbCategory, type NewCategoryInput } from "../mappers/category";
import type { Category } from "../types/domain";

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
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to list categories: ${error?.message ?? "unknown"}`);
  }

  return data.map(fromDbCategory);
};

export const updateCategory = async (
  client: SupabaseClient,
  params: { organizationId: string; categoryId: string; name: string }
): Promise<Category> => {
  const { organizationId, categoryId, name } = params;

  const { data, error } = await client
    .from("categories")
    .update({ name })
    .eq("id", categoryId)
    .eq("organization_id", organizationId)
    .select("id, organization_id, name")
    .single();

  if (error || !data) {
    throw new Error(`Failed to update category ${categoryId}: ${error?.message ?? "unknown"}`);
  }

  return fromDbCategory(data);
};

export const deleteCategory = async (
  client: SupabaseClient,
  organizationId: string,
  categoryId: string
): Promise<void> => {
  const { error } = await client
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to delete category ${categoryId}: ${error.message}`);
  }
};
