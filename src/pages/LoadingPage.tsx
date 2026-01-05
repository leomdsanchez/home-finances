const LoadingPage = () => {
  return (
    <main className="page-shell">
      <div className="page-grid max-w-xl">
        <section className="card flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
          <p className="text-sm text-slate-200">Carregando sessão...</p>
        </section>
      </div>
    </main>
  );
};

export default LoadingPage;
