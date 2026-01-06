import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useSession } from "../context/SessionContext";
import supabase from "../lib/supabaseClient";
import type { IconName } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { ManualTransactionModal } from "../components/ManualTransactionModal";

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

const DashboardPage = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const { organization, loading: orgLoading } = useCurrentOrganization();
  const { accounts, loading: accLoading } = useAccounts(organization?.id);
  const { categories, loading: catLoading } = useCategories(organization?.id);
  const [showRecents, setShowRecents] = useState(false);
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
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-500">
              <EmptyState icon="mic" text="Nenhum lançamento ainda. Adicione o primeiro." />
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

export default DashboardPage;
