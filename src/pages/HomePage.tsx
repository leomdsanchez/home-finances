import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../lib/supabaseClient";
import { useSession } from "../context/SessionContext";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { useOnboardingBootstrap } from "../hooks/useOnboardingBootstrap";
import {
  addUserToOrganization,
  createOrganization,
} from "../services/organizationService";

type Step = "auth" | "name" | "orgChoice" | "createOrg" | "joinOrg";
type AuthMode = "signin" | "signup" | null;
type AuthStep = "choice" | "email" | "password";

const LoadingSplash = ({ text }: { text?: string }) => (
  <div className="flex items-center justify-center gap-2 py-10">
    <Icon name="loader" className="h-6 w-6 animate-spin text-slate-400" />
    {text ? <span className="text-sm text-slate-500">{text}</span> : null}
  </div>
);

const EmptyState = ({ icon, text }: { icon: IconName; text: string }) => (
  <div className="flex items-center gap-2 text-slate-500">
    <Icon name={icon} className="h-4 w-4" />
    <p className="text-sm">{text}</p>
  </div>
);

const AuthFlow = ({
  mode,
  authStep,
  email,
  password,
  status,
  error,
  onSelectMode,
  onEmailChange,
  onPasswordChange,
  onEmailSubmit,
  onPasswordSubmit,
  onBack,
  showLoader,
}: {
  mode: AuthMode;
  authStep: AuthStep;
  email: string;
  password: string;
  status: string;
  error: string;
  showLoader: boolean;
  onSelectMode: (mode: AuthMode) => void;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onEmailSubmit: (e: React.FormEvent) => void;
  onPasswordSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) => {
  if (showLoader) {
    return <LoadingSplash text="Carregando..." />;
  }

  if (!mode || authStep === "choice") {
    return (
      <div className="space-y-3">
        <Button onClick={() => onSelectMode("signin")} trailingIcon="arrow-right">
          Entrar
        </Button>
        <Button variant="ghost" onClick={() => onSelectMode("signup")} trailingIcon="arrow-right">
          Criar conta
        </Button>
      </div>
    );
  }

  if (authStep === "email") {
    return (
      <form className="space-y-3" onSubmit={onEmailSubmit}>
        <Input
          icon="mail"
          name="email"
          type="email"
          placeholder="Seu email"
          autoComplete="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
          {status || "Continuar"}
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-3" onSubmit={onPasswordSubmit}>
      <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
        <span className="font-medium text-slate-700">{email}</span>
        <button
          type="button"
          className="text-[var(--color-accent)] hover:underline"
          onClick={onBack}
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
        onChange={(e) => onPasswordChange(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
        {status || (mode === "signup" ? "Criar conta" : "Entrar")}
      </Button>
    </form>
  );
};

const NameStep = ({
  fullName,
  onChange,
  onSubmit,
  error,
  status,
}: {
  fullName: string;
  onChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  status: string;
}) => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <Input
      name="fullName"
      placeholder="Seu nome"
      autoComplete="name"
      value={fullName}
      onChange={(e) => onChange(e.target.value)}
      required
    />
    {error && <p className="text-sm text-red-500">{error}</p>}
    <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
      {status || "Continuar"}
    </Button>
  </form>
);

const OrgChoice = ({
  onCreate,
  onJoin,
}: {
  onCreate: () => void;
  onJoin: () => void;
}) => (
  <div className="space-y-3">
    <Button onClick={onCreate} trailingIcon="arrow-right">
      Criar nova organização
    </Button>
    <Button variant="ghost" onClick={onJoin} trailingIcon="arrow-right">
      Entrar em uma existente
    </Button>
  </div>
);

const CreateOrgForm = ({
  orgName,
  orgCurrency,
  error,
  status,
  onChangeName,
  onChangeCurrency,
  onSubmit,
  onBack,
}: {
  orgName: string;
  orgCurrency: string;
  error: string;
  status: string;
  onChangeName: (val: string) => void;
  onChangeCurrency: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <Input
      name="orgName"
      placeholder="Nome da organização"
      value={orgName}
      onChange={(e) => onChangeName(e.target.value)}
      required
    />
    <div className="space-y-1">
      <label className="text-sm text-slate-600">Moeda base</label>
      <select
        className="input bg-white"
        name="orgCurrency"
        value={orgCurrency}
        onChange={(e) => onChangeCurrency(e.target.value)}
      >
        <option value="USD">USD</option>
        <option value="UYU">UYU</option>
        <option value="BRL">BRL</option>
        <option value="EUR">EUR</option>
      </select>
    </div>
    {error && <p className="text-sm text-red-500">{error}</p>}
    <div className="flex gap-2">
      <Button variant="ghost" onClick={onBack} type="button">
        Voltar
      </Button>
      <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
        {status || "Criar"}
      </Button>
    </div>
  </form>
);

const JoinOrgForm = ({
  joinOrgId,
  error,
  status,
  onChangeOrgId,
  onSubmit,
  onBack,
}: {
  joinOrgId: string;
  error: string;
  status: string;
  onChangeOrgId: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) => (
  <form className="space-y-3" onSubmit={onSubmit}>
    <Input
      name="orgId"
      placeholder="ID da organização"
      value={joinOrgId}
      onChange={(e) => onChangeOrgId(e.target.value)}
      required
    />
    {error && <p className="text-sm text-red-500">{error}</p>}
    <div className="flex gap-2">
      <Button variant="ghost" onClick={onBack} type="button">
        Voltar
      </Button>
      <Button type="submit" trailingIcon="arrow-right" disabled={!!status}>
        {status || "Entrar"}
      </Button>
    </div>
  </form>
);

const HomePage = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("choice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("USD");
  const [joinOrgId, setJoinOrgId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const { loading: bootstrapLoading, hasOrg, hasName } = useOnboardingBootstrap(session);

  useEffect(() => {
    if (!session) {
      setStep("auth");
      setAuthMode(null);
      setAuthStep("choice");
      return;
    }

    if (bootstrapLoading) return;

    if (hasOrg) {
      navigate("/quickadd", { replace: true });
      return;
    }

    setStep(hasName ? "orgChoice" : "name");
  }, [session, bootstrapLoading, hasOrg, hasName, navigate]);

  const handleModeSelect = (selected: AuthMode) => {
    setAuthMode(selected);
    setAuthStep("email");
    setEmail("");
    setPassword("");
    setError("");
    setStatus("");
  };

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Informe seu email para continuar.");
      return;
    }
    setAuthStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Entrando...");
    setError("");

    if (authMode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        setStatus("");
        return;
      }
      setStatus("");
      setStep("name");
      return;
    }

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setStatus("");
      return;
    }

    setStatus("");
    const nameExists = Boolean(data.session?.user.user_metadata?.name);
    setStep(nameExists ? "orgChoice" : "name");
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
    setStep("orgChoice");
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

    try {
      const org = await createOrganization(supabase, {
        name: orgName,
        baseCurrency: orgCurrency,
      });
      await addUserToOrganization(supabase, {
        organizationId: org.id,
        userId,
      });
      setStatus("");
      navigate("/quickadd", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar organização.");
      setStatus("");
    }
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

    try {
      await addUserToOrganization(supabase, {
        organizationId: joinOrgId,
        userId,
      });
      setStatus("");
      navigate("/quickadd", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar na organização.");
      setStatus("");
    }
  };

  const showOnboarding = useMemo(
    () => session && !bootstrapLoading && !hasOrg,
    [session, bootstrapLoading, hasOrg]
  );

  return (
    <main className="page-shell flex items-center justify-center">
      <div className="w-full max-w-sm space-y-3">
        {showOnboarding && step === "name" && (
          <NameStep
            fullName={fullName}
            onChange={setFullName}
            onSubmit={handleSaveName}
            error={error}
            status={status}
          />
        )}

        {showOnboarding && step === "orgChoice" && (
          <OrgChoice
            onCreate={() => {
              setError("");
              setStatus("");
              setStep("createOrg");
            }}
            onJoin={() => {
              setError("");
              setStatus("");
              setStep("joinOrg");
            }}
          />
        )}

        {showOnboarding && step === "createOrg" && (
          <CreateOrgForm
            orgName={orgName}
            orgCurrency={orgCurrency}
            error={error}
            status={status}
            onChangeName={setOrgName}
            onChangeCurrency={setOrgCurrency}
            onSubmit={handleCreateOrg}
            onBack={() => {
              setError("");
              setStatus("");
              setStep("orgChoice");
            }}
          />
        )}

        {showOnboarding && step === "joinOrg" && (
          <JoinOrgForm
            joinOrgId={joinOrgId}
            error={error}
            status={status}
            onChangeOrgId={setJoinOrgId}
            onSubmit={handleJoinOrg}
            onBack={() => {
              setError("");
              setStatus("");
              setStep("orgChoice");
            }}
          />
        )}

        {!session && (
          <AuthFlow
            mode={authMode}
            authStep={authStep}
            email={email}
            password={password}
            status={status}
            error={error}
            showLoader={bootstrapLoading}
            onSelectMode={handleModeSelect}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onEmailSubmit={handleEmailContinue}
            onPasswordSubmit={handlePasswordSubmit}
            onBack={() => {
              setAuthStep("email");
              setError("");
            }}
          />
        )}

        {!session && step !== "auth" && (
          <div className="mt-3">
            <EmptyState icon="mail" text="Entre para continuar." />
          </div>
        )}
      </div>
    </main>
  );
};

export default HomePage;
