import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { updateOrganization } from "../services/organizationService";
import supabase from "../lib/supabaseClient";
import { PageHeader } from "../components/PageHeader";
import { useExchangeDefaults } from "../hooks/useExchangeDefaults";

const OrganizationPage = () => {
  const { organization, loading, error, refresh } = useCurrentOrganization();
  const [name, setName] = useState(organization?.name ?? "");
  const [currency, setCurrency] = useState(organization?.baseCurrency ?? "USD");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    rates,
    loading: ratesLoading,
    error: ratesError,
    saveRate,
    removeRate,
  } = useExchangeDefaults(organization?.id);
  const [showRateModal, setShowRateModal] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState("USD");
  const [rateValue, setRateValue] = useState("1");
  const baseCurrency = organization?.baseCurrency ?? "USD";

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

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Taxas padrão</p>
              <p className="muted">Usadas como default em transferências e cálculos.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTargetCurrency(organization?.baseCurrency ?? "USD");
                setRateValue("1");
                setShowRateModal(true);
              }}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Adicionar taxa"
            >
              <Icon name="plus" className="h-4 w-4" />
            </button>
          </div>
          {ratesLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Icon name="loader" className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : ratesError ? (
            <p className="text-sm text-red-500">{ratesError}</p>
          ) : rates.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma taxa definida.</p>
          ) : (
            <div className="space-y-2">
              {rates.map((r) => (
                <div
                  key={`${r.fromCurrency}-${r.toCurrency}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {r.fromCurrency} → {r.toCurrency}
                    </p>
                    <p className="text-xs text-slate-500">Taxa: {r.rate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCurrency(r.toCurrency);
                        setRateValue(String(r.rate));
                        setShowRateModal(true);
                      }}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label="Editar taxa"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRate(r.fromCurrency, r.toCurrency)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label="Remover taxa"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {showRateModal && organization ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Nova taxa padrão</h2>
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label="Fechar modal"
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
                </button>
              </div>
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const rateNum = Number(rateValue);
                  if (!rateNum || rateNum <= 0) return;
                  await saveRate({
                    fromCurrency: organization.baseCurrency,
                    toCurrency: targetCurrency,
                    rate: rateNum,
                  });
                  setShowRateModal(false);
                }}
              >
                <div className="space-y-1">
                  <label className="text-sm text-slate-600">De</label>
                  <Input value={organization.baseCurrency} disabled />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-600">Para</label>
                  <select
                    className="input bg-white"
                    value={targetCurrency}
                    onChange={(e) => setTargetCurrency(e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="UYU">UYU</option>
                    <option value="BRL">BRL</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-slate-600">Taxa</label>
                  <Input
                    name="rate"
                    type="number"
                    step="0.0001"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {(() => {
                    const rateNum = Number(rateValue) || 0;
                    if (!rateNum) return <p>Preencha a taxa para ver a prévia.</p>;
                    // Taxa informada = base por destino (ex.: 7.5 UYU por 1 BRL)
                    const effectiveBuy = rateNum; // base -> destino
                    const effectiveSell = rateNum; // destino -> base
                    const baseSample = 1000;
                    const toAmount = baseSample / effectiveBuy;
                    const backAmount = toAmount * effectiveSell;
                    return (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          {baseSample.toLocaleString()} {baseCurrency} →{" "}
                          {toAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {targetCurrency}
                        </p>
                        <p className="text-xs text-slate-500">
                          {toAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                          {targetCurrency} →{" "}
                          {backAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}{" "}
                          {baseCurrency}
                        </p>
                        <p className="text-xs text-slate-500">Taxa: {effectiveBuy.toFixed(4)}</p>
                      </div>
                    );
                  })()}
                </div>
                <Button type="submit">Salvar</Button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export default OrganizationPage;
