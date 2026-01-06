import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useSession } from "../context/SessionContext";
import supabase from "../lib/supabaseClient";
import type { IconName } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { ManualTransactionModal } from "../components/manual";
import { RecentTransactionsCard } from "../components/RecentTransactionsCard";

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
  | "config"
  | "logout";

type MenuItem = { key: MenuItemKey; label: string; icon: IconName };
type MenuEntry = MenuItem | { key: "divider" };
const menuEntries: MenuEntry[] = [
  { key: "perfil", label: "Perfil", icon: "user" },
  { key: "organizacao", label: "Organização", icon: "building" },
  { key: "contas", label: "Contas", icon: "credit-card" },
  { key: "categorias", label: "Categorias", icon: "tag" },
  { key: "orcamentos", label: "Orçamentos", icon: "wallet" },
  { key: "config", label: "Configurações", icon: "settings" },
  { key: "divider" },
  { key: "logout", label: "Sair", icon: "logout" },
];

const actions: QuickAction[] = [
  {
    key: "manual",
    label: "Lançamento manual",
    hint: "Digita e salva",
    icon: "keyboard",
  },
  {
    key: "camera",
    label: "Com imagem",
    hint: "Fotografa o recibo",
    icon: "camera",
  },
  {
    key: "mic",
    label: "Com áudio",
    hint: "Fala e converte",
    icon: "mic",
  },
];

const QuickAddPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const { accounts, loading: accLoading } = useAccounts(organization?.id);
  const { categories, loading: catLoading } = useCategories(organization?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
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
    };
    const target = routes[key];
    if (target) {
      navigate(target);
    }
  };

  const handleAction = (key: QuickAction["key"]) => {
    if (key === "manual") {
      setShowManualModal(true);
      return;
    }
    // Aqui entram as navegações futuras para os demais fluxos.
    console.info("Ação selecionada:", key);
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
    const label = currency ? currency.toUpperCase() : "";
    const noCents = label === "UYU";
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: noCents ? 0 : 2,
      maximumFractionDigits: noCents ? 0 : 2,
    });
  };

  return (
    <main className="page-shell items-start">
      <div className="flex w-full max-w-md flex-col gap-5 pt-1">
        <header className="relative flex items-center justify-between pt-2">
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
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Dashboard"
            >
              <Icon name="dashboard" className="h-5 w-5" />
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
                      onClick={() => handleMenuSelect(item.key)}
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

        <section className="card space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Adicionar despesa</p>
            <p className="muted">Escolha o jeito mais rápido pra você.</p>
          </div>
          <div className="grid gap-2">
            {actions.map((action) => (
              <button
                key={action.key}
                onClick={() => handleAction(action.key)}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                    <Icon name={action.icon} className="h-5 w-5" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                    <p className="text-xs text-slate-500">{action.hint}</p>
                  </div>
                </div>
                <Icon name="arrow-right" className="h-4 w-4 text-slate-300" />
              </button>
            ))}
          </div>
        </section>

        <RecentTransactionsCard
          organizationId={organization?.id}
          accounts={accounts}
          refreshKey={recentsVersion}
        />

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
