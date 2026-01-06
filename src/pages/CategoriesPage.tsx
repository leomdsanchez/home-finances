import { useState } from "react";
import { useCurrentOrganization } from "../hooks/useCurrentOrganization";
import { useCategories } from "../hooks/useCategories";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";

const CategoriesPage = () => {
  const { organization, loading: orgLoading, error: orgError } = useCurrentOrganization();
  const { categories, loading, error, addCategory, removeCategory, editCategory } =
    useCategories(organization?.id);
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) return;
    if (editingId) {
      await editCategory(editingId, newCategory);
    } else {
      await addCategory(newCategory);
    }
    setNewCategory("");
    setEditingId(null);
    setShowModal(false);
  };

  return (
    <main className="page-shell items-start">
      <div className="w-full max-w-md space-y-4">
        <PageHeader title="Categorias" eyebrow="Cadastro" />

        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Lista</p>
              <p className="muted">Categorias da organização.</p>
            </div>
            {loading ? (
              <Icon name="loader" className="h-4 w-4 animate-spin text-slate-400" />
            ) : null}
          </div>
          {categories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-slate-500">
              <p className="text-sm">Nenhuma categoria ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <span className="text-sm text-slate-800">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingId(cat.id);
                        setNewCategory(cat.name);
                        setShowModal(true);
                      }}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label={`Editar ${cat.name}`}
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      aria-label={`Remover ${cat.name}`}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Botão flutuante para nova categoria */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setShowModal(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Nova categoria"
          >
            <Icon name="plus" className="h-5 w-5" />
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Editar categoria" : "Nova categoria"}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingId(null);
                    setNewCategory("");
                  }}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  aria-label="Fechar modal"
                >
                  <Icon name="arrow-left" className="h-4 w-4" />
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
                    name="category"
                    placeholder="Nome da categoria"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <Button type="submit" trailingIcon={editingId ? undefined : "plus"} disabled={loading}>
                    {loading ? "Salvando..." : editingId ? "Salvar" : "Adicionar"}
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-red-500">Nenhuma organização encontrada.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CategoriesPage;
