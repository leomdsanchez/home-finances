import { useCallback, useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import {
  listTransactionsPaginated,
  deleteTransaction,
  deleteTransfer,
  updateTransaction,
  updateTransferStatus,
  type TransactionFilters,
} from "../services/transactionService";
import type { Transaction } from "../types/domain";

const PAGE_SIZE = 30;

type State = {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
};

export const useTransactions = (organizationId?: string) => {
  const [state, setState] = useState<State>({
    transactions: [],
    total: 0,
    loading: false,
    loadingMore: false,
    error: null,
  });
  const [filters, setFilters] = useState<TransactionFilters>({});

  const fetchTransactions = useCallback(
    async (offset = 0, append = false) => {
      if (!organizationId) return;
      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));
      try {
        const result = await listTransactionsPaginated(
          supabase,
          organizationId,
          filters,
          offset,
          PAGE_SIZE,
        );
        setState((prev) => ({
          transactions: append
            ? [...prev.transactions, ...result.data]
            : result.data,
          total: result.count,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: err instanceof Error ? err.message : "Falha ao carregar transações",
        }));
      }
    },
    [organizationId, filters],
  );

  useEffect(() => {
    void fetchTransactions(0, false);
  }, [fetchTransactions]);

  const loadMore = () => {
    if (state.loadingMore || state.transactions.length >= state.total) return;
    void fetchTransactions(state.transactions.length, true);
  };

  const applyFilters = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  const removeTransaction = async (transactionId: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteTransaction(supabase, organizationId, transactionId);
      await fetchTransactions(0, false);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao remover transação",
      }));
    }
  };

  const removeTransfer = async (transferId: string) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await deleteTransfer(supabase, organizationId, transferId);
      await fetchTransactions(0, false);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao remover transferência",
      }));
    }
  };

  const editTransferStatus = async (transferId: string, status: "realizado" | "previsto") => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await updateTransferStatus(supabase, { organizationId, transferId, status });
      await fetchTransactions(0, false);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao atualizar transferência",
      }));
    }
  };

  const editTransaction = async (
    transactionId: string,
    params: {
      amount?: number;
      note?: string | null;
      date?: string;
      categoryId?: string | null;
      status?: "realizado" | "previsto";
    },
  ) => {
    if (!organizationId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await updateTransaction(supabase, {
        organizationId,
        transactionId,
        ...params,
      });
      await fetchTransactions(0, false);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Falha ao atualizar transação",
      }));
    }
  };

  const hasMore = state.transactions.length < state.total;

  return {
    ...state,
    filters,
    hasMore,
    refresh: () => fetchTransactions(0, false),
    loadMore,
    applyFilters,
    removeTransaction,
    removeTransfer,
    editTransferStatus,
    editTransaction,
  };
};
