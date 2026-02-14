import { useMemo } from "react";
import type { Budget, Category } from "../types/domain";
import { Icon } from "./Icon";
import { formatAmount } from "../lib/currency";
import { useBudgetConsumption } from "../hooks/useBudgetConsumption";
import { currentMonthLabelPtBR } from "../lib/date";

type Props = {
  organizationId?: string;
  budgets: Budget[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  refreshKey?: number;
  className?: string;
  onEdit?: (budget: Budget) => void;
  onOpenBudgets?: () => void;
};

export const BudgetCarousel = ({
  organizationId,
  budgets,
  categories,
  loading,
  error,
  refreshKey = 0,
  className = "",
  onEdit,
  onOpenBudgets,
}: Props) => {
  const { spentByBudget, loading: spentLoading, error: spentError } =
    useBudgetConsumption(organizationId, budgets, refreshKey);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const sortedBudgets = useMemo(() => {
    const general: Budget[] = [];
    const byCategory: Budget[] = [];
    budgets.forEach((b) => (b.categoryId ? byCategory.push(b) : general.push(b)));
    return [...general, ...byCategory];
  }, [budgets]);

  const hasError = error || spentError;
  const monthLabel = currentMonthLabelPtBR();

  return (
    <section className={`flex h-full flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between px-1">
        <div>
          {onOpenBudgets ? (
            <button
              type="button"
              onClick={onOpenBudgets}
              className="text-left transition hover:opacity-80"
            >
              <p className="text-sm font-semibold text-slate-800">Orçamentos</p>
              <p className="text-xs text-slate-500">Consumo em {monthLabel} (realizado)</p>
            </button>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-800">Orçamentos</p>
              <p className="text-xs text-slate-500">Consumo em {monthLabel} (realizado)</p>
            </>
          )}
        </div>
        {loading || spentLoading ? (
          <Icon name="loader" className="h-4 w-4 animate-spin text-slate-400" />
        ) : onOpenBudgets ? (
          <button
            type="button"
            onClick={onOpenBudgets}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Ver detalhes
          </button>
        ) : null}
      </div>

      <div className="flex-1 min-h-0">
        {hasError ? (
          <p className="text-sm text-red-500 px-1">{hasError}</p>
        ) : budgets.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center">
            <p className="text-sm text-slate-500">Nenhum orçamento cadastrado ainda.</p>
          </div>
        ) : (
          <div className="h-full overflow-x-auto scrollbar-hide snap-x snap-mandatory px-2">
            <div className="flex h-full items-start gap-3 pr-2">
              {sortedBudgets.map((budget) => {
                const spent = spentByBudget[budget.id] ?? 0;
                const left = budget.amount - spent;
                const pctRaw = budget.amount === 0 ? 0 : (spent / budget.amount) * 100;
                const pct = Math.min(Math.max(pctRaw, 0), 100);
                const label = budget.categoryId
                  ? categoryNameById.get(budget.categoryId) ?? "Categoria"
                  : "Geral";
                const isOver = spent > budget.amount;
                const barColor = isOver
                  ? "linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)"
                  : "linear-gradient(90deg, #2e8cff 0%, #1d4ed8 50%, #0b3fbf 100%)";

                return (
                  <article
                    key={budget.id}
                    className="flex h-full min-w-[240px] flex-col justify-between rounded-3xl bg-slate-900 p-4 text-white shadow-lg shadow-slate-900/20 snap-start"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                            <Icon name="tag" className="h-4 w-4 text-orange-200" />
                          </span>
                          {label}
                        </p>
                        <p className="text-xs text-orange-100/80">
                          {pct ? `${pct.toFixed(0)}% gasto` : "Nenhum gasto registrado"}
                        </p>
                      </div>
                      {onEdit ? (
                        <button
                          type="button"
                          onClick={() => onEdit(budget)}
                          className="rounded-full p-2 text-orange-100/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                          aria-label="Editar orçamento"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                      ) : (
                        <Icon name="edit" className="h-4 w-4 text-orange-100/80" />
                      )}
                  </div>

                  <div className="space-y-2 pt-3">
                      <div className="space-y-1">
                        <p className="text-3xl font-semibold tracking-tight">
                          {formatAmount(left, budget.currency)}
                        </p>
                        <p className="text-xs text-orange-50/80">
                          Restante para gastar{" "}
                          <span className="text-orange-100/70">
                            (limite: {formatAmount(budget.amount, budget.currency)})
                          </span>
                        </p>
                      </div>
                      <div className="h-[20px] rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width,background] duration-200"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                        {isOver ? (
                          <p className="pt-1 text-xs text-red-200">Ultrapassou o limite.</p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
