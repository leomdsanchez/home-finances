import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { useSession } from "../context/SessionContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

const HomePage = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup" | null>(null);
  const [step, setStep] = useState<"email" | "password">("email");
  const [onboardingStep, setOnboardingStep] = useState<
    "name" | "orgChoice" | "createOrg" | "joinOrg" | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("USD");
  const [joinOrgId, setJoinOrgId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const bootstrap = async () => {
      if (!session) {
        setOnboardingStep(null);
        return;
      }

      // Descobre se já existe organização vinculada (RLS garante apenas do usuário)
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .limit(1);

      if (orgError) {
        // Em caso de erro, força onboarding para evitar loop de redirect
        setOnboardingStep("name");
        return;
      }

      const nameExists = Boolean(session.user.user_metadata?.name);
      const orgExists = Boolean(orgs && orgs.length > 0);

      if (orgExists) {
        navigate("/dashboard", { replace: true });
        return;
      }

      setOnboardingStep(nameExists ? "orgChoice" : "name");
    };

    void bootstrap();
  }, [session, navigate]);

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
      setOnboardingStep("name");
      setStatus("");
      return;
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setStatus("");
        return;
      }
    }
    setStatus("");
    setOnboardingStep(session?.user.user_metadata?.name ? "orgChoice" : "name");
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Salvando...");
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({
      data: { name: fullName },
    });
    if (updateError) {
      setError(updateError.message);
      setStatus("");
      return;
    }
    setStatus("");
    setOnboardingStep("orgChoice");
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Criando organização...");
    setError("");
    const userId = session?.user.id;
    if (!userId) {
      setError("Sessão não encontrada.");
      setStatus("");
      return;
    }

    const orgId = crypto.randomUUID();
    const { error: orgError } = await supabase
      .from("organizations")
      .insert({ id: orgId, name: orgName, base_currency: orgCurrency });

    if (orgError) {
      setError(orgError?.message ?? "Não foi possível criar a organização.");
      setStatus("");
      return;
    }

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({ organization_id: orgId, user_id: userId });

    if (memberError) {
      setError(memberError.message);
      setStatus("");
      return;
    }

    setStatus("");
    navigate("/dashboard", { replace: true });
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Entrando...");
    setError("");
    const userId = session?.user.id;
    if (!userId) {
      setError("Sessão não encontrada.");
      setStatus("");
      return;
    }

    const { error } = await supabase
      .from("organization_members")
      .insert({ organization_id: joinOrgId, user_id: userId });

    if (error) {
      setError(error.message);
      setStatus("");
      return;
    }

    setStatus("");
    navigate("/dashboard", { replace: true });
  };

  const renderAuth = () => {
    if (!mode) {
      return (
        <div className="space-y-3">
          <Button onClick={() => handleModeSelect("signin")} trailingIcon="arrow-right">
            Entrar
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleModeSelect("signup")}
            trailingIcon="arrow-right"
          >
            Criar conta
          </Button>
        </div>
      );
    }

    if (step === "email") {
      return (
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
      );
    }

    return (
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
    );
  };

  const renderOnboarding = () => {
    if (onboardingStep === "name") {
      return (
        <form className="space-y-3" onSubmit={handleSaveName}>
          <Input
            name="fullName"
            placeholder="Seu nome"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
            {status || "Continuar"}
          </Button>
        </form>
      );
    }

    if (onboardingStep === "orgChoice") {
      return (
        <div className="space-y-3">
          <Button
            onClick={() => setOnboardingStep("createOrg")}
            trailingIcon="arrow-right"
          >
            Criar nova organização
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOnboardingStep("joinOrg")}
            trailingIcon="arrow-right"
          >
            Entrar em uma existente
          </Button>
        </div>
      );
    }

    if (onboardingStep === "createOrg") {
      return (
        <form className="space-y-3" onSubmit={handleCreateOrg}>
          <Input
            name="orgName"
            placeholder="Nome da organização"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="text-sm text-slate-600">Moeda base</label>
            <select
              className="input bg-white"
              name="orgCurrency"
              value={orgCurrency}
              onChange={(e) => setOrgCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="UYU">UYU</option>
              <option value="BRL">BRL</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOnboardingStep("orgChoice")}
              type="button"
            >
              Voltar
            </Button>
            <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
              {status || "Criar"}
            </Button>
          </div>
        </form>
      );
    }

    if (onboardingStep === "joinOrg") {
      return (
        <form className="space-y-3" onSubmit={handleJoinOrg}>
          <Input
            name="orgId"
            placeholder="ID da organização"
            value={joinOrgId}
            onChange={(e) => setJoinOrgId(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOnboardingStep("orgChoice")}
              type="button"
            >
              Voltar
            </Button>
            <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
              {status || "Entrar"}
            </Button>
          </div>
        </form>
      );
    }

    return null;
  };

  const showOnboarding = session && onboardingStep;

  return (
    <main className="page-shell flex items-center justify-center">
      <div className="w-full max-w-sm">
        {showOnboarding ? renderOnboarding() : renderAuth()}
      </div>
    </main>
  );
};

export default HomePage;
