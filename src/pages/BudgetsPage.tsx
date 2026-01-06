import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useCategories } from "../hooks/useCategories";
import { useBudgets } from "../hooks/useBudgets";
import { BudgetModal } from "../components/BudgetModal";
import type { Budget } from "../types/domain";

const BudgetsPage = () => {
  const { organization, loading: orgLoading, error: orgError } = useCurrentOrganization();
  const { categories, loading: catLoading, error: catError } = useCategories(organization?.id);
  const {
    budgets,
    loading: budgetLoading,
    error: budgetError,
    addBudget,
    removeBudget,
    editBudget,
  } = useBudgets(organization?.id);

  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const handleSaveBudget = async (params: {
    budgetId?: string;
    categoryId: string | null;
    amount: number;
    currency: string;
  }) => {
    if (params.budgetId) {
      await editBudget(params.budgetId, {
        categoryId: params.categoryId,
        amount: params.amount,
        currency: params.currency,
      });
    } else {
      await addBudget({
        categoryId: params.categoryId,
        amount: params.amount,
        currency: params.currency,
      });
    }
    setShowModal(false);
    setEditingBudget(null);
  };

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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingBudget(budget);
                        setShowModal(true);
                      }}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label="Editar orçamento"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeBudget(budget.id)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label="Remover orçamento"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => {
              setEditingBudget(null);
              setShowModal(true);
            }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Novo orçamento"
          >
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>

        <BudgetModal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBudget(null);
          }}
          categories={categories}
          organization={organization ?? undefined}
          initialBudget={editingBudget}
          onSubmit={handleSaveBudget}
          loading={budgetLoading}
          error={budgetError ?? undefined}
        />
      </div>
    </main>
  );
};

export default BudgetsPage;
