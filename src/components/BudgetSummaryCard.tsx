import { useMemo } from "react";
import type { Budget } from "../types/domain";
import { Icon } from "./Icon";
import { formatAmount } from "../lib/currency";
import { useBudgetConsumption } from "../hooks/useBudgetConsumption";
import { currentMonthLabelPtBR } from "../lib/date";

type Props = {
  organizationId?: string;
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  refreshKey?: number;
  className?: string;
  onOpenBudgets?: () => void;
};

type SummaryLine = {
  currency: string;
  budgetTotal: number;
  spentTotal: number;
};

const clampPct = (value: number) => Math.min(Math.max(value, 0), 100);

export const BudgetSummaryCard = ({
  organizationId,
  budgets,
  loading,
  error,
  refreshKey = 0,
  className = "",
  onOpenBudgets,
}: Props) => {
  const { spentByBudget, loading: spentLoading, error: spentError } =
    useBudgetConsumption(organizationId, budgets, refreshKey);

  const hasError = error || spentError;
  const monthLabel = currentMonthLabelPtBR();

  const hasGeneralBudget = budgets.some((b) => b.categoryId === null);

  const overspentCount = useMemo(() => {
    return budgets.reduce((acc, b) => {
      const spent = spentByBudget[b.id] ?? 0;
      return acc + (spent > b.amount ? 1 : 0);
    }, 0);
  }, [budgets, spentByBudget]);

  const summaryLines = useMemo<SummaryLine[]>(() => {
    const byCurrency = new Map<string, { budgetTotal: number; spentTotal: number }>();

    budgets.forEach((b) => {
      const currency = b.currency?.toUpperCase?.() ?? b.currency;
      const entry = byCurrency.get(currency) ?? { budgetTotal: 0, spentTotal: 0 };

      // Summary rule:
      // - If there is a "general" budget, it represents the overall limit (so we only show that).
      // - Otherwise, show totals across category budgets (sum of limits + sum of their spends).
      if (hasGeneralBudget) {
        if (b.categoryId !== null) return;
        entry.budgetTotal += b.amount;
        entry.spentTotal += spentByBudget[b.id] ?? 0;
      } else {
        entry.budgetTotal += b.amount;
        entry.spentTotal += spentByBudget[b.id] ?? 0;
      }

      byCurrency.set(currency, entry);
    });

    return Array.from(byCurrency.entries())
      .map(([currency, v]) => ({ currency, ...v }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [budgets, hasGeneralBudget, spentByBudget]);

  return (
    <section className={`card p-4 space-y-3 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
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
            Ver mais
          </button>
        ) : null}
      </div>

      {hasError ? (
        <p className="text-sm text-red-500">{hasError}</p>
      ) : budgets.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum orçamento cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {overspentCount > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p className="font-semibold">Atenção</p>
              <p className="text-xs text-amber-700">
                {overspentCount} orçamento{overspentCount === 1 ? "" : "s"} estourado
                {overspentCount === 1 ? "" : "s"}.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            {summaryLines.map((line) => {
              const left = line.budgetTotal - line.spentTotal;
              const pctRaw =
                line.budgetTotal === 0 ? 0 : (line.spentTotal / line.budgetTotal) * 100;
              const pct = clampPct(pctRaw);
              const isOver = line.spentTotal > line.budgetTotal;
              return (
                <div
                  key={line.currency}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {hasGeneralBudget ? "Geral" : "Total"} ({line.currency})
                    </p>
                    <p className="text-xs text-slate-500">
                      Limite: {formatAmount(line.budgetTotal, line.currency)} · Gasto:{" "}
                      {formatAmount(line.spentTotal, line.currency)} ·{" "}
                      <span className={isOver ? "text-red-600 font-semibold" : ""}>
                        Restante: {formatAmount(left, line.currency)}
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${isOver ? "bg-red-500" : "bg-blue-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

