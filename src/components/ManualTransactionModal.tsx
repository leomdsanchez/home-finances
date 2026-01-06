import { useEffect, useState } from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import { Icon } from "./Icon";
import type { Account, Category, Organization } from "../types/domain";
import supabase from "../lib/supabaseClient";
import { createTransaction, createTransfer } from "../services/transactionService";

type Props = {
  open: boolean;
  onClose: () => void;
  organization?: Organization | null;
  accounts: Account[];
  categories: Category[];
  loading?: boolean;
};

export const ManualTransactionModal = ({
  open,
  onClose,
  organization,
  accounts,
  categories,
  loading,
}: Props) => {
  const [mode, setMode] = useState<"expense" | "income" | "transfer">("expense");
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAccountId(accounts[0]?.id ?? "");
      setToAccountId(accounts[1]?.id ?? accounts[0]?.id ?? "");
      setCategoryId(null);
      setAmount("");
      setExchangeRate("1");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      setMode("expense");
      setError(null);
    }
  }, [open, accounts, categories]);

  const canSubmit =
    !!organization &&
    !loading &&
    !!accountId &&
    (mode === "transfer" ? !!toAccountId && !!exchangeRate && Number(exchangeRate) > 0 : true) &&
    !!amount &&
    Number(amount) > 0 &&
    note.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      setError("Selecione uma conta.");
      return;
    }
    const category = categoryId ? categories.find((c) => c.id === categoryId) : null;
    if (!note.trim()) {
      setError("Descreva o lançamento.");
      return;
    }
    if (!category && mode !== "transfer") return setError("Selecione uma categoria.");

    if (mode === "transfer") {
      const toAcc = accounts.find((a) => a.id === toAccountId);
      if (!toAcc) return setError("Selecione a conta de destino.");
      if (toAcc.id === account.id) return setError("Escolha contas diferentes.");
      if (!exchangeRate || Number(exchangeRate) <= 0) return setError("Preencha a taxa.");
      setSaving(true);
      setError(null);
      try {
        await createTransfer(supabase, {
          organizationId: organization.id,
          fromAccountId: account.id,
          toAccountId: toAcc.id,
          categoryId: category?.id ?? null,
          amount: Number(amount),
          exchangeRate: Number(exchangeRate),
          currencyFrom: account.currency,
          currencyTo: toAcc.currency,
          date,
          note: note || null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar transferência.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createTransaction(supabase, {
        organizationId: organization.id,
        accountId: account.id,
        categoryId: category?.id ?? null,
        type: mode,
        amount: Number(amount),
        currency: account.currency,
        date,
        note: note || null,
        transferId: null,
        exchangeRate: 1,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Lançamento manual</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Fechar modal"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Icon name="loader" className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : !organization ? (
          <p className="text-sm text-red-500">Organização não encontrada.</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-red-500">Cadastre uma conta antes de lançar.</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-red-500">Cadastre uma categoria antes de lançar.</p>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1 text-sm font-medium">
              <button
                type="button"
                onClick={() => setMode("expense")}
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "expense" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Saída
              </button>
              <button
                type="button"
                onClick={() => setMode("income")}
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "income" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setMode("transfer")}
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "transfer" ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
                }`}
              >
                Transferência
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Conta</label>
              <select
                className="input bg-white"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
            </div>

            {mode === "transfer" && (
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Conta de destino</label>
                <select
                  className="input bg-white"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Categoria</label>
              <select
                className="input bg-white"
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value || null)}
              >
                <option value="">Sem categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-sm text-slate-600">Valor</label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              {mode === "transfer" && (
                <div className="space-y-1">
                  <label className="text-sm text-slate-600">Taxa</label>
                  <Input
                    name="exchangeRate"
                    type="number"
                    step="0.0001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Data</label>
              <Input
                name="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-slate-600">Nota (opcional)</label>
              <Input
                name="note"
                placeholder="Descrição rápida"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" disabled={!canSubmit || saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
