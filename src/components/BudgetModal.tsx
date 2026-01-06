import { useEffect, useState } from "react";
import type { Budget, Category, Organization } from "../types/domain";
import { Icon } from "./Icon";
import { Input } from "./Input";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  organization?: Organization | null;
  initialBudget?: Budget | null;
  onSubmit: (params: { budgetId?: string; categoryId: string | null; amount: number; currency: string }) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
};

export const BudgetModal = ({
  open,
  onClose,
  categories,
  organization,
  initialBudget,
  onSubmit,
  loading = false,
  error = null,
}: Props) => {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>(organization?.baseCurrency ?? "USD");

  useEffect(() => {
    if (!open) return;
    setCategoryId(initialBudget?.categoryId ?? null);
    setAmount(initialBudget ? String(initialBudget.amount) : "");
    setCurrency(initialBudget?.currency ?? organization?.baseCurrency ?? "USD");
  }, [open, initialBudget, organization?.baseCurrency]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    await onSubmit({
      budgetId: initialBudget?.id,
      categoryId,
      amount: Number(amount),
      currency,
    });
  };

  const closeAndReset = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            {initialBudget ? "Editar orçamento" : "Novo orçamento"}
          </h2>
          <button
            onClick={closeAndReset}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Fechar modal"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Categoria</label>
            <select
              className="input bg-white"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value || null)}
            >
              <option value="">Geral</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            <div className="space-y-1">
              <label className="text-sm text-slate-600">Moeda</label>
              <select
                className="input bg-white"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="UYU">UYU</option>
                <option value="BRL">BRL</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            type="submit"
            trailingIcon={initialBudget ? undefined : "plus"}
            disabled={loading}
          >
            {loading ? "Salvando..." : initialBudget ? "Salvar" : "Adicionar"}
          </Button>
        </form>
      </div>
    </div>
  );
};
