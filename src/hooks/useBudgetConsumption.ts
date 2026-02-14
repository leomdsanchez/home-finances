import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import type { Budget } from "../types/domain";
import { todayYMD } from "../lib/date";

type ExpenseTotalRow = {
  category_id: string | null;
  currency: string;
  total: number | string | null;
};

type State = {
  totals: Map<string, number>;
  loading: boolean;
  error: string | null;
};

const UNCATEGORIZED = "__uncategorized__";

export const useBudgetConsumption = (
  organizationId?: string,
  budgets: Budget[] = [],
  refreshKey = 0,
) => {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [state, setState] = useState<State>({
    totals: new Map(),
    loading: false,
    error: null,
  });

  useEffect(() => {
    const fetchTotals = async () => {
      if (!organizationId || budgets.length === 0) {
        setState((prev) => ({ ...prev, totals: new Map(), loading: false, error: null }));
        return;
      }
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { data, error } = await supabase.rpc<
          "list_month_expense_totals",
          {
            Args: { p_org_id: string; p_month: string };
            Returns: ExpenseTotalRow[];
          }
        >("list_month_expense_totals", {
          p_org_id: organizationId,
          p_month: todayYMD(),
        });
        if (error) throw error;

        const totals = new Map<string, number>();
        (data ?? []).forEach((row) => {
          const currency = row.currency?.toUpperCase?.() ?? row.currency;
          const catKey = row.category_id ?? UNCATEGORIZED;
          const total = Number(row.total ?? 0);
          const key = `${catKey}|${currency}`;
          totals.set(key, (totals.get(key) ?? 0) + total);

          const allKey = `all|${currency}`;
          totals.set(allKey, (totals.get(allKey) ?? 0) + total);
        });

        setState((prev) => ({ ...prev, totals, loading: false, error: null }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          totals: new Map(),
          loading: false,
          error: err instanceof Error ? err.message : "Falha ao carregar consumo do mês.",
        }));
      }
    };

    void fetchTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, budgets.length, monthKey, refreshKey]);

  const spentByBudget = useMemo(() => {
    const map: Record<string, number> = {};
    budgets.forEach((budget) => {
      const currency = budget.currency?.toUpperCase?.() ?? budget.currency;
      const key = budget.categoryId
        ? `${budget.categoryId}|${currency}`
        : `all|${currency}`;
      map[budget.id] = state.totals.get(key) ?? 0;
    });
    return map;
  }, [budgets, state.totals]);

  return {
    spentByBudget,
    totals: state.totals,
    loading: state.loading,
    error: state.error,
  };
};
