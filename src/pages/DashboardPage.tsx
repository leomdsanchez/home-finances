import { useEffect, useState } from "react";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountBalances } from "../hooks/useAccountBalances";
import { RecentTransactionsCard } from "../components/RecentTransactionsCard";
import { formatAmount } from "../lib/currency";
import type { Account } from "../types/domain";

const DashboardPage = () => {
  const { organization } = useCurrentOrganization();
  const { accounts, loading: accLoading } = useAccounts(organization?.id);
  const { balances, refresh: refreshBalances } = useAccountBalances(organization?.id);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const handleDeleted = () => {
    setRefreshKey((v) => v + 1);
    refreshBalances();
  };

  const renderAccountCard = (acc: Account) => {
    const active = selectedAccountId === acc.id;
    const balance = balances.get(acc.id);
    return (
      <button
        key={acc.id}
        type="button"
        onClick={() => setSelectedAccountId(acc.id)}
        className={`flex min-h-[110px] min-w-[220px] flex-col justify-between rounded-3xl bg-slate-900 p-3 text-left text-white shadow-lg shadow-slate-900/20 snap-start transition hover:translate-y-[-2px] ${
          active ? "ring-2 ring-blue-400/60" : ""
        }`}
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold">{acc.name}</p>
          <p className="text-xs text-orange-100/80">{acc.currency}</p>
        </div>
        <p className="text-lg font-semibold tracking-tight">
          {balance !== undefined ? formatAmount(balance, acc.currency) : "—"}
        </p>
      </button>
    );
  };

  return (
    <main className="page-shell items-start h-[100dvh] min-h-[100dvh]">
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-4 pt-1 pb-8 min-h-0">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-[0.08em] text-slate-500">Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-900">Contas e movimentos</h1>
        </header>

        <div className="relative flex-1 min-h-0">
          <div className="flex h-full flex-col gap-4 px-0">
            <div className="h-40 shrink-0 overflow-hidden">
              <div className="flex items-center justify-between px-1 mb-2">
                <p className="text-sm font-semibold text-slate-800">Contas</p>
                {accLoading ? (
                  <span className="text-xs text-slate-500">Carregando...</span>
                ) : null}
            </div>
            <div className="h-full overflow-x-auto scrollbar-hide snap-x snap-mandatory">
              <div className="flex h-full items-start gap-3 pr-2">
                {accounts.map(renderAccountCard)}
              </div>
            </div>
          </div>

            <div className="relative flex-1 min-h-0 flex flex-col scrollbar-hide">
              <RecentTransactionsCard
                organizationId={organization?.id}
                accounts={accounts}
                accountId={selectedAccountId}
                refreshKey={refreshKey}
                onDeleted={handleDeleted}
                fill
                className="h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
