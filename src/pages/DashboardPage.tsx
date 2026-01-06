import { useEffect, useState } from "react";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { RecentTransactionsCard } from "../components/RecentTransactionsCard";
import type { Account } from "../types/domain";

const DashboardPage = () => {
  const { organization } = useCurrentOrganization();
  const { accounts, loading: accLoading } = useAccounts(organization?.id);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const renderAccountChip = (acc: Account) => {
    const active = selectedAccountId === acc.id;
    return (
      <button
        key={acc.id}
        type="button"
        onClick={() => setSelectedAccountId(acc.id)}
        className={`flex min-w-[180px] flex-col rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
          active
            ? "border-blue-600 bg-blue-50 text-blue-900"
            : "border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50"
        }`}
      >
        <span className="text-sm font-semibold">{acc.name}</span>
        <span className="text-xs text-slate-500">{acc.currency}</span>
      </button>
    );
  };

  return (
    <main className="page-shell items-start h-[100dvh] min-h-[100dvh]">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 pt-1 pb-6 min-h-0">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-[0.08em] text-slate-500">Dashboard</p>
          <h1 className="text-2xl font-semibold text-slate-900">Movimentos por conta</h1>
        </header>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">Contas</p>
              {accLoading ? <span className="text-xs text-slate-500">Carregando...</span> : null}
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex items-stretch gap-3 pb-1">
                {accounts.map(renderAccountChip)}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <RecentTransactionsCard
              organizationId={organization?.id}
              accounts={accounts}
              accountId={selectedAccountId}
              refreshKey={0}
              fill
              className="h-full"
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
