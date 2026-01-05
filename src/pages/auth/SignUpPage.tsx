import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useSession } from "../../context/SessionContext";
import supabase from "../../lib/supabaseClient";

const SignUpPage = () => {
  const { session } = useSession();
  if (session) return <Navigate to="/" />;
  const [status, setStatus] = useState("");
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("Creating account...");
    const { error } = await supabase.auth.signUp({
      email: formValues.email,
      password: formValues.password,
    });
    if (error) {
      alert(error.message);
    }
    setStatus("");
  };

  return (
    <main className="page-shell">
      <div className="page-grid max-w-2xl">
        <div className="flex items-center justify-between">
          <Link className="btn-ghost" to="/">
            ◄ Voltar
          </Link>
          <p className="pill">Novo acesso</p>
        </div>
        <form className="form-card" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Criar conta</h1>
            <p className="muted">App de demonstração — use um email/senha seguros.</p>
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
            {status || "Criar conta"}
          </button>
          <p className="muted">
            Já tem conta?{" "}
            <Link className="text-emerald-300 hover:underline" to="/auth/sign-in">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
};

export default SignUpPage;
