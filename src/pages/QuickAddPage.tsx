import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useSession } from "../context/SessionContext";
import supabase from "../lib/supabaseClient";
import type { IconName } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { ManualTransactionModal } from "../components/manual";
import type { Transaction } from "../types/domain";

const EmptyState = ({
  icon,
  text,
}: {
  icon: IconName;
  text: string;
}) => (
  <div className="flex flex-col items-center gap-2 text-slate-500">
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
      <Icon name={icon} className="h-5 w-5" />
    </span>
    <p className="text-sm">{text}</p>
  </div>
);

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
  const [showRecents, setShowRecents] = useState(false);
  const [recents, setRecents] = useState<
    Array<
      | {
          kind: "expense" | "income";
          id: string;
          amount: number;
          currency: string;
          accountId: string;
          date: string;
          note: string | null;
        }
      | {
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
        }
    >
  >([]);
  const [recentsLoading, setRecentsLoading] = useState(false);
  const [recentsError, setRecentsError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  const displayName = useMemo(() => {
    return (
      session?.user.user_metadata?.name ||
      session?.user.email?.split("@")[0] ||
      "Você"
    );
  }, [session]);

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
    const fetchRecents = async () => {
      if (!organization) return;
      setRecentsLoading(true);
      setRecentsError(null);
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select("id, account_id, type, amount, currency, date, note, transfer_id, created_at")
          .eq("organization_id", organization.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw new Error(error.message);
        if (!data) return;

        const byTransfer = new Map<string, Transaction[]>();
        const singles: Transaction[] = [];

        data.forEach((row) => {
          if (row.transfer_id) {
            const arr = byTransfer.get(row.transfer_id) ?? [];
            arr.push({
              id: row.id,
              organizationId: organization.id,
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
            } as Transaction);
            byTransfer.set(row.transfer_id, arr);
          } else {
            singles.push({
              id: row.id,
              organizationId: organization.id,
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
            } as Transaction);
          }
        });

        const items: typeof recents = [];

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
            // fallback: tratar perna isolada como despesa/receita
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
        setRecents(items.slice(0, 30));
      } catch (err) {
        setRecentsError(err instanceof Error ? err.message : "Falha ao carregar lançamentos.");
      } finally {
        setRecentsLoading(false);
      }
    };

    void fetchRecents();
  }, [organization]);

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => map.set(acc.id, `${acc.name} (${acc.currency})`));
    return map;
  }, [accounts]);

  const formatAmount = (value: number, currency: string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);

  return (
    <main className="page-shell items-start">
      <div className="flex w-full max-w-md flex-col gap-5 pt-1">
        <header className="relative flex items-center justify-between pt-2">
          <div>
            <p className="text-xs uppercase tracking-[0.08em] text-slate-500">
              Olá
            </p>
            <p className="text-xl font-semibold text-slate-900">{displayName}</p>
          </div>
          <div className="relative">
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
                className="absolute right-0 mt-2 w-56 space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg shadow-slate-200/80"
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

        <section className="card space-y-3">
          <button
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowRecents((prev) => !prev)}
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">Últimos lançamentos</p>
              <p className="muted">Toque para visualizar.</p>
            </div>
            <Icon
              name="arrow-right"
              className={`h-4 w-4 text-slate-300 transition ${showRecents ? "rotate-90" : ""}`}
            />
          </button>
          {showRecents ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4">
              {recentsLoading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Icon name="loader" className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              ) : recentsError ? (
                <p className="text-sm text-red-500">{recentsError}</p>
              ) : recents.length === 0 ? (
                <div className="text-center text-slate-500">
                  <EmptyState icon="mic" text="Nenhum lançamento ainda. Adicione o primeiro." />
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

        <ManualTransactionModal
          open={showManualModal}
          onClose={() => setShowManualModal(false)}
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
