import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { listAccounts, createAccount, deleteAccount, updateAccount } from "../services/accountService";
import type { Account } from "../types/domain";

type State = {
  accounts: Account[];
  loading: boolean;
  error: string | null;
};

export const useAccounts = (organizationId?: string) => {
  const [state, setState] = useState<State>({
    accounts: [],
    loading: false,
    error: null,
  });

  const fetchAccounts = async () => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await listAccounts(supabase, organizationId);
      setState({ accounts: data, loading: false, error: null });
    } catch (err) {
      setState({
        accounts: [],
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao carregar contas",
      });
    }
  };

  const addAccount = async (params: {
    name: string;
    currency: string;
    type: Account["type"];
  }) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await createAccount(supabase, { organizationId, ...params });
      await fetchAccounts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao criar conta",
      }));
    }
  };

  const removeAccount = async (accountId: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteAccount(supabase, organizationId, accountId);
      await fetchAccounts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao remover conta",
      }));
    }
  };

  const editAccount = async (
    accountId: string,
    params: { name?: string; currency?: string; type?: Account["type"] },
  ) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await updateAccount(supabase, { organizationId, accountId, ...params });
      await fetchAccounts();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao atualizar conta",
      }));
    }
  };

  useEffect(() => {
    void fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return {
    ...state,
    refresh: fetchAccounts,
    addAccount,
    removeAccount,
    editAccount,
  };
};
