import { Link } from "react-router-dom";
import { useSession } from "../context/SessionContext";

const ProtectedPage = () => {
  const { session } = useSession();
  return (
    <main className="page-shell">
      <div className="page-grid max-w-3xl">
        <Link className="btn-ghost w-fit" to="/">
          ◄ Voltar
        </Link>
        <section className="card space-y-3">
          <h1 className="text-2xl font-semibold">Página protegida</h1>
          <p className="muted">
            Somente usuários autenticados podem ver esta área. Use como base para o dashboard e
            demais telas do app.
          </p>
          <div className="rounded-lg border border-white/10 bg-black/10 px-4 py-3">
            <p className="text-sm text-slate-200">
              Usuário logado: {session?.user.email ?? "Nenhum"}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProtectedPage;
