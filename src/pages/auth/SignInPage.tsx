import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import supabase from "../../lib/supabaseClient";

const SignInPage = () => {
  const { session } = useSession();
  const [status, setStatus] = useState("");
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });

  if (session) return <Navigate to="/" />;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("Logging in...");
    const { error } = await supabase.auth.signInWithPassword({
      email: formValues.email,
      password: formValues.password,
    });
    if (error) {
      alert(error.message);
    }
    setStatus("");
  };
  return (
    <main className="page-shell flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <Link className="btn-ghost w-fit" to="/">
          ◄ Voltar
        </Link>
        <form
          className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70 space-y-4"
          onSubmit={handleSubmit}
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Entrar</h1>
            <p className="muted">Email e senha. Só isso.</p>
          </div>
          <div className="space-y-3">
            <input
              className="input"
              name="email"
              onChange={handleInputChange}
              type="email"
              placeholder="Email"
            />
            <input
              className="input"
              name="password"
              onChange={handleInputChange}
              type="password"
              placeholder="Senha"
            />
          </div>
          <button className="btn w-full" type="submit" disabled={!!status}>
            {status || "Entrar"}
          </button>
          <p className="muted text-center">
            Não tem conta?{" "}
            <Link className="text-[var(--color-accent)] hover:underline" to="/auth/sign-up">
              Criar conta
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
};

export default SignInPage;
