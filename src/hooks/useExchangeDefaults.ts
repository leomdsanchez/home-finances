import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import {
  deleteExchangeDefault,
  listExchangeDefaults,
  upsertExchangeDefault,
} from "../services/exchangeRateService";
import type { ExchangeDefault } from "../types/domain";

type State = {
  rates: ExchangeDefault[];
  loading: boolean;
  error: string | null;
};

export const useExchangeDefaults = (organizationId?: string) => {
  const [state, setState] = useState<State>({
    rates: [],
    loading: false,
    error: null,
  });

  const fetchRates = async () => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listExchangeDefaults(supabase, organizationId);
      setState({ rates: data, loading: false, error: null });
    } catch (err) {
      setState({
        rates: [],
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao carregar taxas",
      });
    }
  };

  const saveRate = async (params: { fromCurrency: string; toCurrency: string; rate: number }) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await upsertExchangeDefault(supabase, { organizationId, ...params });
      await fetchRates();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao salvar taxa",
      }));
    }
  };

  const removeRate = async (fromCurrency: string, toCurrency: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteExchangeDefault(supabase, { organizationId, fromCurrency, toCurrency });
      await fetchRates();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao remover taxa",
      }));
    }
  };

  useEffect(() => {
    void fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return { ...state, refresh: fetchRates, saveRate, removeRate };
};
