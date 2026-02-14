import { useCallback, useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

type BalanceMap = Map<string, number>;

export const useAccountBalances = (organizationId?: string) => {
  const [balances, setBalances] = useState<BalanceMap>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase
        .from("transactions")
        .select("account_id, type, amount")
        .eq("organization_id", organizationId);

      if (supaError) throw supaError;

      const map = new Map<string, number>();
      (data ?? []).forEach((row: { account_id: string; type: string; amount: number }) => {
        const current = map.get(row.account_id) ?? 0;
        const sign = row.type === "income" ? 1 : -1;
        map.set(row.account_id, current + sign * row.amount);
      });
      setBalances(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao calcular saldos");
      setBalances(new Map());
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refresh: fetchBalances };
};
