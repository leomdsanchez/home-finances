import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { listCategories, createCategory, deleteCategory } from "../services/categoryService";
import type { Category } from "../types/domain";

type State = {
  categories: Category[];
  loading: boolean;
  error: string | null;
};

export const useCategories = (organizationId?: string) => {
  const [state, setState] = useState<State>({
    categories: [],
    loading: false,
    error: null,
  });

  const fetchCategories = async () => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listCategories(supabase, organizationId);
      setState({ categories: data, loading: false, error: null });
    } catch (err) {
      setState({
        categories: [],
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao carregar categorias",
      });
    }
  };

  const addCategory = async (name: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await createCategory(supabase, { organizationId, name });
      await fetchCategories();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao criar categoria",
      }));
    }
  };

  const removeCategory = async (categoryId: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteCategory(supabase, organizationId, categoryId);
      await fetchCategories();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao remover categoria",
      }));
    }
  };

  useEffect(() => {
    void fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return {
    ...state,
    refresh: fetchCategories,
    addCategory,
    removeCategory,
  };
};
