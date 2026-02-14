import { useCallback, useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

type BalanceMap = Map<string, number>;

type AccountBalanceRow = {
  account_id: string;
  balance: number | string | null;
};

export const useAccountBalances = (organizationId?: string) => {
  const [balances, setBalances] = useState<BalanceMap>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: supaError } = await supabase.rpc<
        "list_account_balances",
        { Args: { p_org_id: string }; Returns: AccountBalanceRow[] }
      >("list_account_balances", { p_org_id: organizationId });

      if (supaError) throw supaError;

      const map = new Map<string, number>();
      (data ?? []).forEach((row) =>
        map.set(row.account_id, Number(row.balance ?? 0))
      );
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
