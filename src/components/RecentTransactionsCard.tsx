import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabaseClient";
import type { Account, Transaction } from "../types/domain";
import { Icon } from "./Icon";

type TransferItem = {
  kind: "transfer";
  id: string;
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
  amount: number;
  currency: string;
  accountId: string;
  date: string;
  note: string | null;
};

type Item = TransferItem | SingleItem;

type Props = {
  organizationId?: string;
  accounts: Account[];
  defaultOpen?: boolean;
  limit?: number;
  refreshKey?: number;
};

export const RecentTransactionsCard = ({
  organizationId,
  accounts,
  defaultOpen = false,
  limit = 30,
  refreshKey = 0,
}: Props) => {
  const [open, setOpen] = useState(defaultOpen);
  const [recents, setRecents] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, `${acc.name} (${acc.currency})`));
    return map;
  }, [accounts]);

  useEffect(() => {
    const fetchRecents = async () => {
      if (!organizationId) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: supaError } = await supabase
          .from("transactions")
          .select("id, account_id, category_id, type, amount, currency, date, note, transfer_id, exchange_rate, created_at")
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50);

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
                amount: leg.amount,
                currency: leg.currency,
                accountId: leg.accountId,
                date: leg.date,
                note: leg.note,
              })
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
  }, [organizationId, limit, refreshKey]);

  const formatAmount = (value: number, currency: string) =>
    `${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency.toUpperCase()}`;

  return (
    <section className="card space-y-3">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">Últimos lançamentos</p>
          <p className="muted">Entradas, saídas e transferências.</p>
        </div>
        <Icon
          name="arrow-right"
          className={`h-4 w-4 text-slate-300 transition ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4">
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
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {recents.map((item) => {
                if (item.kind === "transfer") {
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                          <Icon name="transfer" className="h-4 w-4" />
                        </span>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold text-slate-900">Transferência</p>
                          <p className="text-xs text-slate-500">
                            {accountNameById.get(item.fromAccountId) ?? "Conta origem"} →{" "}
                            {accountNameById.get(item.toAccountId) ?? "Conta destino"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(item.date).toLocaleDateString("pt-BR")}
                          </p>
                          {item.note ? (
                            <p className="text-xs text-slate-500 line-clamp-1">{item.note}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-slate-900">
                          {formatAmount(item.amountTo, item.currencyTo)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Saída: {formatAmount(item.amountFrom, item.currencyFrom)}
                        </p>
                      </div>
                    </div>
                  );
                }

                const isExpense = item.kind === "expense";
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${
                          isExpense ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                        }`}
                      >
                        <Icon
                          name={isExpense ? "arrow-down-right" : "arrow-up-right"}
                          className="h-4 w-4"
                        />
                      </span>
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-slate-900">
                          {isExpense ? "Saída" : "Entrada"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {accountNameById.get(item.accountId) ?? "Conta"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(item.date).toLocaleDateString("pt-BR")}
                        </p>
                        {item.note ? (
                          <p className="text-xs text-slate-500 line-clamp-1">{item.note}</p>
                        ) : null}
                      </div>
                    </div>
                    <p
                      className={`text-sm font-semibold ${
                        isExpense ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {isExpense ? "-" : "+"}
                      {formatAmount(item.amount, item.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};
