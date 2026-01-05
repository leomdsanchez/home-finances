import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  return (
    <main className="page-shell">
      <div className="page-grid max-w-xl">
        <section className="card space-y-3 text-center">
          <p className="pill mx-auto">404</p>
          <h1 className="text-2xl font-semibold">Página não encontrada</h1>
          <p className="muted">O caminho acessado não existe. Volte para a página inicial.</p>
          <div className="flex justify-center">
            <Link className="btn" to="/">
              Ir para Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};

export default NotFoundPage;
