import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useCategories } from "../hooks/useCategories";
import { useBudgets } from "../hooks/useBudgets";

const BudgetsPage = () => {
  const { organization, loading: orgLoading, error: orgError } = useCurrentOrganization();
  const { categories, loading: catLoading, error: catError } = useCategories(organization?.id);
  const {
    budgets,
    loading: budgetLoading,
    error: budgetError,
    addBudget,
    removeBudget,
  } = useBudgets(organization?.id);

  const [showModal, setShowModal] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("USD");

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    await addBudget({
      categoryId,
      amount: Number(amount),
      currency,
    });
    setAmount("");
    setCategoryId(null);
    setCurrency("USD");
    setShowModal(false);
  };

  useEffect(() => {
    if (organization?.baseCurrency) {
      setCurrency(organization.baseCurrency);
    }
  }, [organization?.baseCurrency]);

  const canRender = !orgLoading && !catLoading && organization;

  return (
    <main className="page-shell items-start">
      <div className="w-full max-w-md space-y-4">
        <PageHeader title="Orçamentos" eyebrow="Planejamento" />

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Limites por categoria</p>
              <p className="muted">Um limite geral ou por categoria, sem mês.</p>
            </div>
            {budgetLoading ? (
              <Icon name="loader" className="h-4 w-4 animate-spin text-slate-400" />
            ) : null}
          </div>
          {orgError || catError || budgetError ? (
            <p className="text-sm text-red-500">
              {orgError || catError || budgetError}
            </p>
          ) : budgets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-500">
              <p className="text-sm">Nenhum orçamento ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {budgets.map((budget) => (
                <div
                  key={budget.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {budget.categoryId
                        ? categoryNameById.get(budget.categoryId) ?? "Categoria"
                        : "Geral"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {budget.amount} {budget.currency}
                    </p>
                  </div>
                  <button
                    onClick={() => removeBudget(budget.id)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    aria-label="Remover orçamento"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Novo orçamento"
          >
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Novo orçamento</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label="Fechar modal"
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
                </button>
              </div>
              {canRender ? (
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
                  {budgetError && <p className="text-sm text-red-500">{budgetError}</p>}
                  <Button type="submit" trailingIcon="plus" disabled={budgetLoading}>
                    {budgetLoading ? "Salvando..." : "Adicionar"}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-red-500">
                  {orgError || catError || "Carregando dados..."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default BudgetsPage;
