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
    <section
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-lg shadow-slate-900/25 ${className}`.trim()}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-orange-400/20 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          {onOpenBudgets ? (
            <button
              type="button"
              onClick={onOpenBudgets}
              className="text-left transition hover:opacity-80"
            >
              <p className="text-sm font-semibold">Orçamentos</p>
              <p className="text-xs text-white/60">{monthLabel} · realizado</p>
            </button>
          ) : (
            <>
              <p className="text-sm font-semibold">Orçamentos</p>
              <p className="text-xs text-white/60">{monthLabel} · realizado</p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {overspentCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-[0.65rem] font-semibold text-red-100 ring-1 ring-red-300/30">
              <Icon name="alert" className="h-3.5 w-3.5" />
              {overspentCount}
            </span>
          ) : null}

          {loading || spentLoading ? (
            <Icon name="loader" className="h-4 w-4 animate-spin text-white/70" />
          ) : onOpenBudgets ? (
            <button
              type="button"
              onClick={onOpenBudgets}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/10 transition hover:bg-white/15"
            >
              Ver mais
            </button>
          ) : null}
        </div>
      </div>

      <div className="relative mt-4">
        {hasError ? (
          <p className="text-sm text-red-200">{hasError}</p>
        ) : budgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-4">
            <p className="text-sm text-white/70">Nenhum orçamento cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {summaryLines.map((line, idx) => {
              const left = line.budgetTotal - line.spentTotal;
              const pctRaw =
                line.budgetTotal === 0 ? 0 : (line.spentTotal / line.budgetTotal) * 100;
              const pct = clampPct(pctRaw);
              const isOver = line.spentTotal > line.budgetTotal;
              const barClass = isOver
                ? "bg-gradient-to-r from-red-300 via-red-500 to-red-700"
                : "bg-gradient-to-r from-orange-200 via-sky-400 to-blue-500";
              return (
                <div
                  key={line.currency}
                  className={idx === 0 ? "" : "pt-4 border-t border-white/10"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/70">
                        {hasGeneralBudget ? "Geral" : "Total"} · {line.currency}
                      </p>
                      <p className="mt-1 text-3xl font-semibold tracking-tight text-white">
                        {formatAmount(left, line.currency)}
                      </p>
                      <p className="mt-1 text-xs text-white/65">
                        {formatAmount(line.spentTotal, line.currency)} /{" "}
                        {formatAmount(line.budgetTotal, line.currency)}
                      </p>
                    </div>
                    {isOver ? (
                      <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-1 text-[0.65rem] font-semibold text-red-100 ring-1 ring-red-300/30">
                        Estourado
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full ${barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
