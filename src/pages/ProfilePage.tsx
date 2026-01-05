import { useEffect, useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Icon } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";

const ProfilePage = () => {
  const { name, email, loading, error, updateName } = useProfile();
  const [draftName, setDraftName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await updateName(draftName);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao salvar nome");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-shell items-start">
      <div className="w-full max-w-md space-y-4">
        <PageHeader title="Perfil" eyebrow="Conta" />

        <section className="card space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">Dados pessoais</p>
            <p className="muted">Edite seu nome. Email é apenas leitura.</p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Icon name="loader" className="h-5 w-5 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : (
            <form className="space-y-3" onSubmit={handleSubmit}>
              <Input
                name="name"
                placeholder="Seu nome"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <Input name="email" value={email} disabled />
              {error && <p className="text-sm text-red-500">{error}</p>}
              {saveError && <p className="text-sm text-red-500">{saveError}</p>}
              <Button type="submit" disabled={saving} trailingIcon="arrow-right">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;
