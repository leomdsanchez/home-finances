import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { updateOrganization } from "../services/organizationService";
import supabase from "../lib/supabaseClient";
import { PageHeader } from "../components/PageHeader";

const OrganizationPage = () => {
  const { organization, loading, error, refresh } = useCurrentOrganization();
  const [name, setName] = useState(organization?.name ?? "");
  const [currency, setCurrency] = useState(organization?.baseCurrency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sincroniza estado quando a org for carregada
  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setCurrency(organization.baseCurrency);
    }
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateOrganization(supabase, {
        organizationId: organization.id,
        name,
        baseCurrency: currency,
      });
      await refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar organização");
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 text-slate-500">
          <Icon name="loader" className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      );
    }

    if (error || !organization) {
      return (
        <div className="space-y-2 text-sm text-red-500">
          <p>{error ?? "Organização não encontrada."}</p>
          <Button variant="ghost" onClick={() => refresh()}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    return (
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Input
          name="orgName"
          placeholder="Nome da organização"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="space-y-1">
          <label className="text-sm text-slate-600">Moeda base</label>
          <select
            className="input bg-white"
            name="orgCurrency"
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
          <label className="text-sm text-slate-600">ID da organização</label>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-600 break-all">{organization.id}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(organization.id)}
              className="ml-auto rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Copiar ID"
            >
              <Icon name="copy" className="h-4 w-4" />
            </button>
          </div>
        </div>
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
        <Button type="submit" trailingIcon="arrow-right" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    );
  };

  return (
    <main className="page-shell items-start">
      <div className="w-full max-w-md space-y-4">
        <PageHeader title="Organização" eyebrow="Conta" />
        <section className="card space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Dados da organização</p>
            <p className="muted">Atualize nome e moeda base.</p>
          </div>
          {renderContent()}
        </section>
      </div>
    </main>
  );
};

export default OrganizationPage;
