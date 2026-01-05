import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { useSession } from "../context/SessionContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

const HomePage = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup" | null>(null);
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session) {
      navigate("/protected", { replace: true });
    }
  }, [session, navigate]);

  if (session) return <Navigate to="/protected" replace />;

  const handleModeSelect = (selected: "signin" | "signup") => {
    setMode(selected);
    setStep("email");
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Informe seu email para continuar.");
      return;
    }
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Entrando...");
    setError("");
    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        setStatus("");
        return;
      }
      // Após criar a conta, volta para login com email preenchido
      setMode("signin");
      setStep("password");
      setStatus("");
      return;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      }
    }
    setStatus("");
  };

  return (
    <main className="page-shell flex items-center justify-center">
      <div className="w-full max-w-sm">
        {!mode ? (
          <div className="space-y-3">
            <Button onClick={() => handleModeSelect("signin")} trailingIcon="arrow-right">
              Entrar
            </Button>
            <Button variant="ghost" onClick={() => handleModeSelect("signup")} trailingIcon="arrow-right">
              Criar conta
            </Button>
          </div>
        ) : step === "email" ? (
          <form className="space-y-3" onSubmit={handleEmailContinue}>
            <Input
              icon="mail"
              name="email"
              type="email"
              placeholder="Seu email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" trailingIcon="arrow-right">
              Continuar
            </Button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handlePasswordSubmit}>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
              <span className="font-medium text-slate-700">{email}</span>
              <button
                type="button"
                className="text-[var(--color-accent)] hover:underline"
                onClick={() => {
                  setMode(null);
                  setStep("email");
                }}
              >
                trocar
              </button>
            </div>
            <Input
              icon="lock"
              name="password"
              type="password"
              placeholder="Senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              trailingIcon="arrow-right"
              disabled={!!status}
            >
              {status || (mode === "signup" ? "Criar conta" : "Entrar")}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
};

export default HomePage;
