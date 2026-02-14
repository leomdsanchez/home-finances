import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../lib/supabaseClient";
import type { Account, Category, Transaction } from "../types/domain";
import { Icon } from "./Icon";
import { ConfirmDialog } from "./ConfirmDialog";
import { Button } from "./Button";
import { Input } from "./Input";
import {
  deleteTransaction,
  deleteTransfer,
  updateTransaction,
  updateTransferStatus,
} from "../services/transactionService";
import { formatAmount } from "../lib/currency";
import { formatYMDToPtBR } from "../lib/date";

type TransferItem = {
  kind: "transfer";
  id: string;
  status: Transaction["status"];
  fromAccountId: string;
  toAccountId: string;
  amountFrom: number;
  amountTo: number;
  currencyFrom: string;
  currencyTo: string;
  date: string;
  note: string | null;
};

type SingleItem = {
  kind: "expense" | "income";
  id: string;
  status: Transaction["status"];
  categoryId: string | null;
  amount: number;
  currency: string;
  accountId: string;
  date: string;
  note: string | null;
};

type Item = TransferItem | SingleItem;

type DeleteTarget =
  | { kind: "transaction"; id: string; label: string }
  | { kind: "transfer"; id: string; label: string };

type EditState = {
  transactionId: string;
  currency: string;
  amount: string;
  note: string;
  date: string;
  categoryId: string | null;
  status: Transaction["status"];
};

type TransferEditState = {
  transferId: string;
  title: string;
  status: Transaction["status"];
};

type Props = {
  organizationId?: string;
  accounts: Account[];
  categories: Category[];
  limit?: number;
  refreshKey?: number;
  fill?: boolean;
  className?: string;
  accountId?: string | null;
  onDeleted?: () => void;
};

export const RecentTransactionsCard = ({
  organizationId,
  accounts,
  categories,
  limit = 30,
  refreshKey = 0,
  fill = false,
  className = "",
  accountId = null,
  onDeleted,
}: Props) => {
  const [recents, setRecents] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<TransferEditState | null>(null);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [openActionsKey, setOpenActionsKey] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, `${acc.name} (${acc.currency})`));
    return map;
  }, [accounts]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  useEffect(() => {
    const fetchRecents = async () => {
      if (!organizationId) return;
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from("transactions")
          .select(
            "id, account_id, category_id, type, status, amount, currency, date, note, transfer_id, exchange_rate, created_at",
          )
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50);

        if (accountId) {
          query = query.eq("account_id", accountId);
        }

        const { data, error: supaError } = await query;

        if (supaError) throw new Error(supaError.message);
        if (!data) return;

        const byTransfer = new Map<string, Transaction[]>();
        const singles: Transaction[] = [];

        data.forEach((row) => {
          const tx: Transaction = {
            id: row.id,
            organizationId,
            accountId: row.account_id,
            categoryId: row.category_id ?? null,
            type: row.type,
            status: row.status,
            amount: row.amount,
            currency: row.currency,
            date: row.date,
            note: row.note,
            transferId: row.transfer_id,
            exchangeRate: row.exchange_rate ?? 1,
            createdAt: row.created_at,
          };

          if (tx.transferId) {
            const arr = byTransfer.get(tx.transferId) ?? [];
            arr.push(tx);
            byTransfer.set(tx.transferId, arr);
          } else {
            singles.push(tx);
          }
        });

        const items: Item[] = [];

        singles.forEach((tx) => {
          items.push({
            kind: tx.type,
            id: tx.id,
            status: tx.status,
            categoryId: tx.categoryId ?? null,
            amount: tx.amount,
            currency: tx.currency,
            accountId: tx.accountId,
            date: tx.date,
            note: tx.note,
          });
        });

        byTransfer.forEach((legs, transferId) => {
          const from = legs.find((l) => l.type === "expense");
          const to = legs.find((l) => l.type === "income");
          if (from && to) {
            items.push({
              kind: "transfer",
              id: transferId,
              status: from.status === "previsto" || to.status === "previsto" ? "previsto" : "realizado",
              fromAccountId: from.accountId,
              toAccountId: to.accountId,
              amountFrom: from.amount,
              amountTo: to.amount,
              currencyFrom: from.currency,
              currencyTo: to.currency,
              date: from.date >= to.date ? from.date : to.date,
              note: from.note || to.note || null,
            });
          } else {
            legs.forEach((leg) =>
              items.push({
                kind: leg.type,
                id: leg.id,
                status: leg.status,
                categoryId: leg.categoryId ?? null,
                amount: leg.amount,
                currency: leg.currency,
                accountId: leg.accountId,
                date: leg.date,
                note: leg.note,
              }),
            );
          }
        });

        items.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
        setRecents(items.slice(0, limit));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar lançamentos.");
      } finally {
        setLoading(false);
      }
    };

    void fetchRecents();
  }, [organizationId, limit, refreshKey, accountId, internalRefresh]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (openActionsKey && actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setOpenActionsKey(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openActionsKey]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !organizationId) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "transfer") {
        await deleteTransfer(supabase, organizationId, deleteTarget.id);
      } else {
        await deleteTransaction(supabase, organizationId, deleteTarget.id);
      }
      setDeleteTarget(null);
      setInternalRefresh((v) => v + 1);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setDeleting(false);
    }
  };

  const handleStartEdit = (item: SingleItem) => {
    setEditError(null);
    setEditing({
      transactionId: item.id,
      currency: item.currency,
      amount: String(item.amount ?? ""),
      note: item.note ?? "",
      date: item.date,
      categoryId: item.categoryId ?? null,
      status: item.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing || !organizationId) return;

    const parsedAmount = Number(editing.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setEditError("Informe um valor válido.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await updateTransaction(supabase, {
        organizationId,
        transactionId: editing.transactionId,
        amount: parsedAmount,
        note: editing.note || null,
        date: editing.date,
        categoryId: editing.categoryId,
        status: editing.status,
      });
      setEditing(null);
      setInternalRefresh((v) => v + 1);
      // This also refreshes balances/budgets in the parent.
      onDeleted?.();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveTransferEdit = async () => {
    if (!editingTransfer || !organizationId) return;
    setTransferSaving(true);
    setTransferError(null);
    try {
      await updateTransferStatus(supabase, {
        organizationId,
        transferId: editingTransfer.transferId,
        status: editingTransfer.status,
      });
      setEditingTransfer(null);
      setInternalRefresh((v) => v + 1);
      // This also refreshes balances/budgets in the parent.
      onDeleted?.();
    } catch (err) {
      setTransferError(err instanceof Error ? err.message : "Falha ao salvar.");
    } finally {
      setTransferSaving(false);
    }
  };

  const containerClassName = `space-y-3 ${fill ? "flex min-h-0 flex-col" : ""} ${className}`.trim();

  return (
    <section className={containerClassName}>
      <div className={`${fill ? "sticky top-0 z-10 py-2" : ""}`}>
        <p className="text-sm font-semibold text-slate-800">Últimos lançamentos</p>
      </div>
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          className={`relative space-y-2 ${
            fill
              ? "flex-1 min-h-0 overflow-y-auto pb-4 px-2 scrollbar-hide"
              : "max-h-72 overflow-y-auto scrollbar-hide"
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Icon name="loader" className="h-4 w-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : recents.length === 0 ? (
            <div className="text-center text-slate-500">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon name="mic" className="h-5 w-5" />
                </span>
                <p className="text-sm">Nenhum lançamento ainda. Adicione o primeiro.</p>
              </div>
            </div>
          ) : (
            recents.map((item) => {
            if (item.kind === "transfer") {
              const title = item.note && item.note.trim().length > 0 ? item.note : "Transferência";
              const key = `transfer:${item.id}`;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-1">
                      <Icon name="transfer" className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="space-y-1 text-sm min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-slate-900 line-clamp-2">{title}</p>
                        {item.status === "previsto" ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                            Previsto
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <Icon name="arrow-up-right" className="h-3 w-3 text-slate-500" />
                          {accountNameById.get(item.fromAccountId) ?? "Conta origem"}
                        </p>
                        <p className="flex items-center gap-1">
                          <Icon name="arrow-down-right" className="h-3 w-3 text-slate-500" />
                          {accountNameById.get(item.toAccountId) ?? "Conta destino"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-right text-sm text-slate-900">
                      <p className="font-semibold">{formatAmount(item.amountTo, item.currencyTo)}</p>
                      <p className="text-xs text-slate-500">
                        {formatYMDToPtBR(item.date)}
                      </p>
                      <p className="text-xs text-slate-500">{formatAmount(item.amountFrom, item.currencyFrom)}</p>
                    </div>
                    <div
                      className="relative"
                      ref={openActionsKey === key ? actionsRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenActionsKey((prev) => (prev === key ? null : key))}
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
                                transferId: item.id,
                                title,
                                status: item.status,
                              });
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
                              setDeleteTarget({ kind: "transfer", id: item.id, label: title });
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

            const isExpense = item.kind === "expense";
            const title = item.note && item.note.trim().length > 0 ? item.note : isExpense ? "Saída" : "Entrada";
            const key = `tx:${item.id}`;
            const categoryName = item.categoryId ? categoryNameById.get(item.categoryId) : null;
            return (
              <div
                key={item.id}
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
                      {item.status === "previsto" ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                          Previsto
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">
                      {accountNameById.get(item.accountId) ?? "Conta"}
                      {categoryName ? ` · ${categoryName}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="text-right text-sm font-semibold text-slate-900">
                    {isExpense ? "-" : "+"}
                    {formatAmount(item.amount, item.currency)}
                    <p className="text-xs font-normal text-slate-500">
                      {formatYMDToPtBR(item.date)}
                    </p>
                  </div>
                  <div
                    className="relative"
                    ref={openActionsKey === key ? actionsRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenActionsKey((prev) => (prev === key ? null : key))}
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
                            handleStartEdit(item);
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
                            setDeleteTarget({ kind: "transaction", id: item.id, label: title });
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
          })
        )}
        </div>
      </div>

      {/* Edit modal */}
      {editing ? (
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
                    ({editing.currency?.toUpperCase?.() ?? editing.currency})
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
              {editError ? <p className="text-sm text-red-500">{editError}</p> : null}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setEditing(null)}
                  className="flex-1"
                  disabled={editSaving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={editSaving} className="flex-1">
                  {editSaving ? (
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
      ) : null}

      {/* Transfer edit modal */}
      {editingTransfer ? (
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
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remover lançamento"
        message={`Tem certeza que deseja remover "${deleteTarget?.label ?? ""}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </section>
  );
};
