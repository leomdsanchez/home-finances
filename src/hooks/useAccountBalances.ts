import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";

type BalanceMap = Map<string, number>;

export const useAccountBalances = (organizationId?: string) => {
  const [balances, setBalances] = useState<BalanceMap>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!organizationId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("account_id, type, amount")
          .eq("organization_id", organizationId);

        if (error) throw error;

        const map = new Map<string, number>();
        (data ?? []).forEach((row: { account_id: string; type: string; amount: number }) => {
          const current = map.get(row.account_id) ?? 0;
          const sign = row.type === "income" ? 1 : -1;
          map.set(row.account_id, current + sign * row.amount);
        });
        setBalances(map);
      } catch {
        setBalances(new Map());
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [organizationId]);

  return { balances, loading };
};
