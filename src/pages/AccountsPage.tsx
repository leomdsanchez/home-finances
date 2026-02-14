import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useAccounts } from "../hooks/useAccounts";
import type { Account } from "../types/domain";

const accountTypes: { value: Account["type"]; label: string }[] = [
  { value: "bank", label: "Conta bancária" },
  { value: "card", label: "Cartão" },
  { value: "cash", label: "Dinheiro" },
  { value: "other", label: "Outro" },
];

const AccountsPage = () => {
  const { organization, loading: orgLoading, error: orgError } = useCurrentOrganization();
  const { accounts, loading, error, addAccount, removeAccount, editAccount } = useAccounts(organization?.id);

  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [type, setType] = useState<Account["type"]>("bank");
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = () => {
    setEditingAccount(null);
    setName("");
    setCurrency("USD");
    setType("bank");
    setShowModal(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setCurrency(account.currency);
    setType(account.type);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (editingAccount) {
      await editAccount(editingAccount.id, { name, currency, type });
    } else {
      await addAccount({ name, currency, type });
    }
    setName("");
    setCurrency("USD");
    setType("bank");
    setEditingAccount(null);
    setShowModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeAccount(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // error handled by hook
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="page-shell items-start">
      <div className="w-full max-w-md space-y-4">
        <PageHeader title="Contas" eyebrow="Cadastro" />

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Minhas contas</p>
              <p className="muted">Saldo e lançamentos usarão estas contas.</p>
            </div>
            {loading ? (
              <Icon name="loader" className="h-4 w-4 animate-spin text-slate-400" />
            ) : null}
          </div>
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-500">
              <p className="text-sm">Nenhuma conta ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{account.name}</p>
                    <p className="text-xs text-slate-500">
                      {accountTypes.find((t) => t.value === account.type)?.label ?? account.type} · {account.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(account)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label={`Editar ${account.name}`}
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(account)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label={`Remover ${account.name}`}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>

        <div className="fixed bottom-6 right-6">
          <button
            onClick={openCreateModal}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Nova conta"
          >
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingAccount ? "Editar conta" : "Nova conta"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label="Fechar modal"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
              {orgLoading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Icon name="loader" className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              ) : orgError ? (
                <p className="text-sm text-red-500">{orgError}</p>
              ) : organization ? (
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <Input
                    name="accountName"
                    placeholder="Nome da conta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-sm text-slate-600">Moeda</label>
                      <select
                        className="input bg-white"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="USD">USD</option>
                        <option value="UYU">UYU</option>
                        <option value="BRL">BRL</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-600">Tipo</label>
                      <select
                        className="input bg-white"
                        value={type}
                        onChange={(e) => setType(e.target.value as Account["type"])}
                      >
                        {accountTypes.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" trailingIcon={editingAccount ? "check" : "plus"} disabled={loading}>
                    {loading ? "Salvando..." : editingAccount ? "Salvar" : "Adicionar"}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-red-500">Nenhuma organização encontrada.</p>
              )}
            </div>
          </div>
        )}

        <ConfirmDialog
          open={!!deleteTarget}
          title="Remover conta"
          message={`Tem certeza que deseja remover "${deleteTarget?.name ?? ""}"? Todas as transações desta conta serão perdidas.`}
          confirmLabel="Remover"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      </div>
    </main>
  );
};

export default AccountsPage;
