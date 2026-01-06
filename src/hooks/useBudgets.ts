import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { listBudgets, createBudget, deleteBudget, updateBudget } from "../services/budgetService";
import type { Budget } from "../types/domain";

type State = {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
};

type CreateParams = {
  categoryId: string | null;
  amount: number;
  currency: string;
};

export const useBudgets = (organizationId?: string) => {
  const [state, setState] = useState<State>({
    budgets: [],
    loading: false,
    error: null,
  });

  const fetchBudgets = async () => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listBudgets(supabase, organizationId);
      setState({ budgets: data, loading: false, error: null });
    } catch (err) {
      setState({
        budgets: [],
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao carregar orçamentos",
      });
    }
  };

  const addBudget = async (params: CreateParams) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await createBudget(supabase, { organizationId, ...params });
      await fetchBudgets();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao criar orçamento",
      }));
    }
  };

  const removeBudget = async (budgetId: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteBudget(supabase, organizationId, budgetId);
      await fetchBudgets();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao remover orçamento",
      }));
    }
  };

  const editBudget = async (
    budgetId: string,
    params: { categoryId: string | null; amount: number; currency: string }
  ) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await updateBudget(supabase, { organizationId, budgetId, ...params });
      await fetchBudgets();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao atualizar orçamento",
      }));
    }
  };

  useEffect(() => {
    void fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return {
    ...state,
    refresh: fetchBudgets,
    addBudget,
    removeBudget,
    editBudget,
  };
};
