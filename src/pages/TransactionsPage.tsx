import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useTransactions } from "../hooks/useTransactions";
import type { Transaction, Category } from "../types/domain";
import type { TransactionFilters } from "../services/transactionService";
import { formatAmount } from "../lib/currency";
import { formatYMDToPtBR } from "../lib/date";

type EditState = {
  transaction: Transaction;
  amount: string;
  note: string;
  date: string;
  categoryId: string | null;
  status: Transaction["status"];
};

type DeleteTarget =
  | { kind: "transaction"; id: string; label: string }
  | { kind: "transfer"; id: string; label: string };

type TransferEditState = {
  transferId: string;
  title: string;
  status: Transaction["status"];
};

const TransactionsPage = () => {
  const { organization } = useCurrentOrganization();
  const { accounts } = useAccounts(organization?.id);
  const { categories } = useCategories(organization?.id);
  const {
    transactions,
    loading,
    loadingMore,
    error,
    hasMore,
    filters,
    loadMore,
    applyFilters,
    removeTransaction,
    removeTransfer,
    editTransferStatus,
    editTransaction,
  } = useTransactions(organization?.id);

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<TransactionFilters>({});
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferEditState | null>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openActionsKey, setOpenActionsKey] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, `${acc.name} (${acc.currency})`));
    return map;
  }, [accounts]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const handleApplyFilters = () => {
    applyFilters(localFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    applyFilters({});
    setShowFilters(false);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined && v !== "");

  const handleStartEdit = (tx: Transaction) => {
    setEditing({
      transaction: tx,
      amount: String(tx.amount ?? ""),
      note: tx.note ?? "",
      date: tx.date,
      categoryId: tx.categoryId,
      status: tx.status,
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const parsedAmount = Number(editing.amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        setEditError("Valor inválido.");
        return;
      }
      await editTransaction(editing.transaction.id, {
        amount: parsedAmount,
        note: editing.note || null,
        date: editing.date,
        categoryId: editing.categoryId,
        status: editing.status,
      });
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveTransferEdit = async () => {
    if (!editingTransfer) return;
    setTransferSaving(true);
    setTransferError(null);
    try {
      await editTransferStatus(editingTransfer.transferId, editingTransfer.status);
      setEditingTransfer(null);
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setTransferSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "transfer") {
        await removeTransfer(deleteTarget.id);
      } else {
        await removeTransaction(deleteTarget.id);
      }
      setDeleteTarget(null);
    } catch {
      // error handled by hook
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (openActionsKey && actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setOpenActionsKey(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openActionsKey]);

  // Group transfers
  type DisplayItem =
    | { kind: "single"; tx: Transaction }
    | {
        kind: "transfer";
        transferId: string;
        from: Transaction;
        to: Transaction;
      };

  const displayItems = useMemo(() => {
    const byTransfer = new Map<string, Transaction[]>();
    const singles: Transaction[] = [];

    transactions.forEach((tx) => {
      if (tx.transferId) {
        const arr = byTransfer.get(tx.transferId) ?? [];
        arr.push(tx);
        byTransfer.set(tx.transferId, arr);
      } else {
        singles.push(tx);
      }
    });

    const items: DisplayItem[] = [];

    singles.forEach((tx) => items.push({ kind: "single", tx }));

    byTransfer.forEach((legs, transferId) => {
      const from = legs.find((l) => l.type === "expense");
      const to = legs.find((l) => l.type === "income");
      if (from && to) {
        items.push({ kind: "transfer", transferId, from, to });
      } else {
        legs.forEach((tx) => items.push({ kind: "single", tx }));
      }
    });

    items.sort((a, b) => {
      const dateA = a.kind === "transfer" ? a.from.date : a.tx.date;
      const dateB = b.kind === "transfer" ? b.from.date : b.tx.date;
      return dateB > dateA ? 1 : dateB < dateA ? -1 : 0;
    });

    return items;
  }, [transactions]);

  return (
    <main className="page-shell items-start h-[100dvh] min-h-[100dvh]">
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-4 pt-1 pb-8 min-h-0">
        <PageHeader title="Transações" eyebrow="Histórico" />

        {/* Filter toggle + search */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              icon="search"
              placeholder="Buscar por descrição..."
              value={localFilters.search ?? ""}
              onChange={(e) =>
                setLocalFilters((f) => ({ ...f, search: e.target.value || undefined }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplyFilters();
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
              hasActiveFilters
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700"
            }`}
            aria-label="Filtros"
          >
            <Icon name="filter" className="h-4 w-4" />
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Status</label>
                <select
                  className="input bg-white"
                  value={localFilters.status ?? ""}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      status: (e.target.value as "realizado" | "previsto") || undefined,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="realizado">Realizado</option>
                  <option value="previsto">Previsto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Tipo</label>
                <select
                  className="input bg-white"
                  value={localFilters.type ?? ""}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      type: (e.target.value as "income" | "expense") || undefined,
                    }))
                  }
                >
                  <option value="">Todos</option>
                  <option value="expense">Saída</option>
                  <option value="income">Entrada</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Conta</label>
                <select
                  className="input bg-white"
                  value={localFilters.accountId ?? ""}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      accountId: e.target.value || undefined,
                    }))
                  }
                >
                  <option value="">Todas</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Categoria</label>
              <select
                className="input bg-white"
                value={localFilters.categoryId ?? ""}
                onChange={(e) =>
                  setLocalFilters((f) => ({
                    ...f,
                    categoryId: e.target.value || undefined,
                  }))
                }
              >
                <option value="">Todas</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">De</label>
                <Input
                  type="date"
                  value={localFilters.dateFrom ?? ""}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      dateFrom: e.target.value || undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Até</label>
                <Input
                  type="date"
                  value={localFilters.dateTo ?? ""}
                  onChange={(e) =>
                    setLocalFilters((f) => ({
                      ...f,
                      dateTo: e.target.value || undefined,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleClearFilters} className="flex-1">
                Limpar
              </Button>
              <Button onClick={handleApplyFilters} className="flex-1">
                Aplicar
              </Button>
            </div>
          </div>
        )}

        {/* Transaction list */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pb-4 scrollbar-hide">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 py-8 justify-center">
                <Icon name="loader" className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : error ? (
              <p className="text-sm text-red-500 py-4">{error}</p>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-slate-500 py-12">
                <Icon name="list" className="h-8 w-8" />
                <p className="text-sm">
                  {hasActiveFilters
                    ? "Nenhuma transação encontrada com esses filtros."
                    : "Nenhuma transação registrada."}
                </p>
              </div>
            ) : (
              <>
                {displayItems.map((item) => {
                  if (item.kind === "transfer") {
                    const title =
                      item.from.note?.trim() || item.to.note?.trim() || "Transferência";
                    const key = `transfer:${item.transferId}`;
                    return (
                      <div
                        key={item.transferId}
                        className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-3"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-1">
                            <Icon name="transfer" className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="space-y-1 text-sm min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="font-semibold text-slate-900 line-clamp-2">{title}</p>
                              {item.from.status === "previsto" || item.to.status === "previsto" ? (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                                  Previsto
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-slate-500 space-y-0.5">
                              <p className="flex items-center gap-1">
                                <Icon name="arrow-up-right" className="h-3 w-3 text-slate-500" />
                                {accountNameById.get(item.from.accountId) ?? "Conta origem"}
                              </p>
                              <p className="flex items-center gap-1">
                                <Icon name="arrow-down-right" className="h-3 w-3 text-slate-500" />
                                {accountNameById.get(item.to.accountId) ?? "Conta destino"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="text-right text-sm text-slate-900">
                            <p className="font-semibold">
                              {formatAmount(item.to.amount, item.to.currency)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatYMDToPtBR(item.from.date)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatAmount(item.from.amount, item.from.currency)}
                            </p>
                          </div>
                          <div
                            className="relative"
                            ref={openActionsKey === key ? actionsRef : undefined}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpenActionsKey((prev) => (prev === key ? null : key))
                              }
                              className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                              aria-label="Mais ações"
                            >
                              <Icon name="more" className="h-4 w-4" />
                            </button>
                            {openActionsKey === key ? (
                              <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/80 z-10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionsKey(null);
                                    setEditingTransfer({
                                      transferId: item.transferId,
                                      title,
                                      status: item.from.status,
                                    });
                                    setTransferError(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50"
                                >
                                  <Icon name="edit" className="h-4 w-4 text-slate-500" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionsKey(null);
                                    setDeleteTarget({
                                      kind: "transfer",
                                      id: item.transferId,
                                      label: title,
                                    });
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                  Remover
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const tx = item.tx;
                  const isExpense = tx.type === "expense";
                  const title = tx.note?.trim() || (isExpense ? "Saída" : "Entrada");
                  const categoryName = tx.categoryId
                    ? categoryNameById.get(tx.categoryId)
                    : null;
                  const key = `tx:${tx.id}`;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-3"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-1">
                          <Icon
                            name={isExpense ? "arrow-up-right" : "arrow-down-right"}
                            className={`h-4 w-4 ${isExpense ? "text-red-500" : "text-emerald-600"}`}
                          />
                        </div>
                        <div className="space-y-1 text-sm min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="font-semibold text-slate-900 line-clamp-2">{title}</p>
                            {tx.status === "previsto" ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                                Previsto
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500">
                            {accountNameById.get(tx.accountId) ?? "Conta"}
                            {categoryName ? ` · ${categoryName}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="text-right text-sm font-semibold text-slate-900">
                          {isExpense ? "-" : "+"}
                          {formatAmount(tx.amount, tx.currency)}
                          <p className="text-xs font-normal text-slate-500">
                            {formatYMDToPtBR(tx.date)}
                          </p>
                        </div>
                        <div
                          className="relative"
                          ref={openActionsKey === key ? actionsRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionsKey((prev) => (prev === key ? null : key))
                            }
                            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Mais ações"
                          >
                            <Icon name="more" className="h-4 w-4" />
                          </button>
                          {openActionsKey === key ? (
                            <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/80 z-10">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionsKey(null);
                                  handleStartEdit(tx);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50"
                              >
                                <Icon name="edit" className="h-4 w-4 text-slate-500" />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionsKey(null);
                                  setDeleteTarget({
                                    kind: "transaction",
                                    id: tx.id,
                                    label: title,
                                  });
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                                Remover
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      onClick={loadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Icon name="loader" className="h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        "Carregar mais"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Editar transação</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Fechar"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">
                  Valor{" "}
                  <span className="text-xs text-slate-400">
                    ({editing.transaction.currency?.toUpperCase?.() ?? editing.transaction.currency})
                  </span>
                </label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Status</label>
                <select
                  className="input bg-white"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as Transaction["status"],
                    })
                  }
                >
                  <option value="realizado">Realizado</option>
                  <option value="previsto">Previsto</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Nota</label>
                <Input
                  value={editing.note}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  placeholder="Descrição"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Data</label>
                <Input
                  type="date"
                  value={editing.date}
                  onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Categoria</label>
                <select
                  className="input bg-white"
                  value={editing.categoryId ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, categoryId: e.target.value || null })
                  }
                >
                  <option value="">Sem categoria</option>
                  {categories.map((cat: Category) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <Button onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer edit modal */}
      {editingTransfer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
          onClick={() => setEditingTransfer(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Editar transferência</h2>
                <p className="text-xs text-slate-500 line-clamp-1">{editingTransfer.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTransfer(null)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Fechar"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Status</label>
                <select
                  className="input bg-white"
                  value={editingTransfer.status}
                  onChange={(e) =>
                    setEditingTransfer({
                      ...editingTransfer,
                      status: e.target.value as Transaction["status"],
                    })
                  }
                >
                  <option value="realizado">Realizado</option>
                  <option value="previsto">Previsto</option>
                </select>
              </div>
              {transferError ? <p className="text-sm text-red-500">{transferError}</p> : null}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditingTransfer(null)}
                  className="flex-1"
                  disabled={transferSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveTransferEdit}
                  className="flex-1"
                  disabled={transferSaving}
                >
                  {transferSaving ? (
                    <>
                      <Icon name="loader" className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Remover lançamento"
        message={`Tem certeza que deseja remover "${deleteTarget?.label ?? ""}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </main>
  );
};

export default TransactionsPage;
