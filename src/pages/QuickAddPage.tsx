import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useSession } from "../context/SessionContext";
import supabase from "../lib/supabaseClient";
import type { IconName } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useBudgets } from "../hooks/useBudgets";
import { ManualTransactionModal } from "../components/manual";
import { RecentTransactionsCard } from "../components/RecentTransactionsCard";
import { BudgetSummaryCard } from "../components/BudgetSummaryCard";

type QuickAction = {
  key: "manual" | "camera" | "mic";
  label: string;
  hint: string;
  icon: IconName;
};

type MenuItemKey =
  | "perfil"
  | "organizacao"
  | "contas"
  | "categorias"
  | "orcamentos"
  | "transacoes"
  | "config"
  | "logout";

type MenuItem = { key: MenuItemKey; label: string; icon: IconName };
type MenuEntry = MenuItem | { key: "divider" };
const menuEntries: MenuEntry[] = [
  { key: "transacoes", label: "Transações", icon: "list" },
  { key: "perfil", label: "Perfil", icon: "user" },
  { key: "organizacao", label: "Organização", icon: "building" },
  { key: "contas", label: "Contas", icon: "credit-card" },
  { key: "categorias", label: "Categorias", icon: "tag" },
  { key: "orcamentos", label: "Orçamentos", icon: "wallet" },
  { key: "config", label: "Configurações", icon: "settings" },
  { key: "divider" },
  { key: "logout", label: "Sair", icon: "logout" },
];

const QuickAddPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const { accounts, loading: accLoading } = useAccounts(organization?.id);
  const { categories, loading: catLoading } = useCategories(organization?.id);
  const {
    budgets,
    loading: budgetLoading,
    error: budgetError,
  } = useBudgets(organization?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const [recentsVersion, setRecentsVersion] = useState(0);
  const [balance, setBalance] = useState<{ value: number; missingRate: boolean } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const handleMenuSelect = async (key: MenuItemKey) => {
    setMenuOpen(false);
    if (key === "logout") {
      await supabase.auth.signOut();
      navigate("/", { replace: true });
      return;
    }
    const routes: Partial<Record<MenuItemKey, string>> = {
      perfil: "/perfil",
      organizacao: "/organizacao",
      categorias: "/categorias",
      contas: "/contas",
      orcamentos: "/orcamentos",
      transacoes: "/transacoes",
    };
    const target = routes[key];
    if (target) {
      navigate(target);
    }
  };

  const handleAction = (key: QuickAction["key"]) => {
    if (key === "manual") {
      setShowManualModal(true);
      setFabOpen(false);
      return;
    }
    // Navegações futuras para os demais fluxos.
    console.info("Ação selecionada:", key);
    setFabOpen(false);
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!organization || !session) return;
      setBalanceLoading(true);
      setBalanceError(null);
      try {
        const { data, error } = await supabase.functions.invoke<{
          balance: number;
          baseCurrency: string;
          missingRate: boolean;
        }>("balance", {
          body: { organizationId: organization.id },
          headers:
            session && import.meta.env.VITE_SUPABASE_ANON_KEY
              ? {
                  Authorization: `Bearer ${session.access_token}`,
                  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                }
              : undefined,
        });

        if (error) throw new Error(error.message);
        if (!data) return;

        setBalance({ value: data.balance, missingRate: data.missingRate });
      } catch (err) {
        setBalanceError(err instanceof Error ? err.message : "Falha ao calcular saldo.");
      } finally {
        setBalanceLoading(false);
      }
    };

    void fetchBalance();
  }, [organization, recentsVersion, session]);

  const formatBalanceValue = (value?: number, currency?: string) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "—";
    const code = currency ? currency.toUpperCase() : "";
    const decimals = code === "UYU" || ["ARS", "CLP", "COP", "MXN", "PYG", "DOP", "PEN"].includes(code) ? 0 : 2;
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const startHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
    }
    holdTimer.current = window.setTimeout(() => {
      setShowManualModal(true);
      setFabOpen(false);
    }, 400);
  };

  const endHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
      }
    },
    [],
  );

  return (
    <main className="page-shell items-start h-[100dvh] min-h-[100dvh] overflow-hidden">
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col gap-4 pt-1 pb-8 min-h-0">
        <header className="relative flex items-center justify-between pt-2 px-0">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
              Saldo
              {organization?.baseCurrency ? (
                <span className="ml-1 text-[0.65rem] font-medium text-slate-500">
                  ({organization.baseCurrency.toUpperCase()})
                </span>
              ) : null}
            </p>
            {balanceLoading || orgLoading ? (
              <div className="flex items-center gap-2 text-slate-500">
                <Icon name="loader" className="h-4 w-4 animate-spin" />
                <span className="text-sm">Calculando...</span>
              </div>
            ) : balanceError ? (
              <p className="text-sm text-red-500">{balanceError}</p>
            ) : balance ? (
              <>
                <p className="text-3xl font-semibold text-slate-900">
                  {formatBalanceValue(balance.value, organization?.baseCurrency ?? "USD")}
                </p>
                {balance.missingRate ? (
                  <p className="text-xs text-amber-600">
                    Faltam taxas para converter todas as moedas.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-500">Nenhum lançamento ainda.</p>
            )}
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/transacoes")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Transações"
            >
              <Icon name="list" className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Menu"
            >
              <Icon name="more" className="h-5 w-5" />
            </button>
            {menuOpen ? (
              <div
                ref={menuRef}
                className="absolute right-0 top-full mt-2 w-56 space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/80 z-20"
              >
                {menuEntries.map((item, idx) =>
                  item.key === "divider" ? (
                    <div key={`div-${idx}`} className="mx-1 my-1 h-px bg-slate-200" />
                  ) : (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() => {
                        handleMenuSelect(item.key);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50"
                    >
                      <Icon name={item.icon} className="h-4 w-4 text-slate-500" />
                      <span className="flex-1 text-left">{item.label}</span>
                    </button>
                  )
                )}
              </div>
            ) : null}
          </div>
        </header>

          <div className="relative flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full flex-col gap-4 px-0">
            <div className="shrink-0">
              <BudgetSummaryCard
                organizationId={organization?.id}
                budgets={budgets}
                loading={budgetLoading || orgLoading || catLoading}
                error={budgetError}
                refreshKey={recentsVersion}
                onOpenBudgets={() => navigate("/orcamentos")}
              />
            </div>
            <div className="relative flex-1 min-h-0 flex flex-col scrollbar-hide">
              <RecentTransactionsCard
                organizationId={organization?.id}
                accounts={accounts}
                refreshKey={recentsVersion}
                onDeleted={() => setRecentsVersion((v) => v + 1)}
                fill
                className="h-full"
              />
            </div>
          </div>
        </div>

      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-200 ${
            fabOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
          }`}
        >
          <button
            type="button"
            onClick={() => handleAction("manual")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ transitionDelay: fabOpen ? "40ms" : "0ms" }}
            aria-label="Lançamento manual"
          >
            <Icon name="keyboard" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction("camera")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ transitionDelay: fabOpen ? "80ms" : "0ms" }}
            aria-label="Lançar com imagem"
          >
            <Icon name="camera" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => handleAction("mic")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-xl"
            style={{ transitionDelay: fabOpen ? "120ms" : "0ms" }}
            aria-label="Lançar com áudio"
          >
            <Icon name="mic" className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          onClick={() => setFabOpen((v) => !v)}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-blue-700 active:bg-blue-800 ${
            fabOpen ? "rotate-45" : ""
          }`}
          aria-label="Ações rápidas"
        >
          <Icon name={fabOpen ? "close" : "plus"} className="h-6 w-6 transition" />
        </button>
      </div>

        <ManualTransactionModal
          open={showManualModal}
          onClose={() => setShowManualModal(false)}
          onSaved={() => setRecentsVersion((v) => v + 1)}
          organization={organization}
          accounts={accounts}
          categories={categories}
          loading={orgLoading || accLoading || catLoading}
        />
      </div>
    </main>
  );
};

export default QuickAddPage;
