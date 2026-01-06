import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  type InputHTMLAttributes,
  type FormEvent,
  type ReactNode,
} from "react";
import { Input } from "../Input";
import { Button } from "../Button";
import { Icon } from "../Icon";
import type { ManualTransactionModalProps } from "./types";
import type { Account } from "../../types/domain";
import supabase from "../../lib/supabaseClient";
import { createTransaction, createTransfer } from "../../services/transactionService";
import { useExchangeDefaults } from "../../hooks/useExchangeDefaults";

type Mode = "expense" | "income" | "transfer";
type StepId = "type" | "account" | "amount" | "details";

const STEP_ORDER: StepId[] = ["type", "account", "amount", "details"];
const ZERO_DECIMAL_CURRENCIES = new Set(["ARS", "CLP", "COP", "MXN", "PYG", "DOP", "UYU", "PEN"]);
const TWO_DECIMAL_CURRENCIES = new Set(["BRL", "USD", "EUR"]);

type FormState = {
  mode: Mode;
  accountId: string;
  toAccountId: string;
  categoryId: string | null;
  amount: string;
  exchangeRate: string;
  note: string;
  date: string;
  step: StepId;
};

type FormAction =
  | { type: "reset"; payload: { accounts: Account[] } }
  | { type: "setField"; field: keyof FormState; value: string | null }
  | { type: "setMode"; mode: Mode }
  | { type: "setStep"; step: StepId };

const createInitialState = (accounts: Account[]): FormState => ({
  mode: "expense",
  accountId: accounts[0]?.id ?? "",
  toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
  categoryId: null,
  amount: "",
  exchangeRate: "1",
  note: "",
  date: new Date().toISOString().slice(0, 10),
  step: "type",
});

const formReducer = (state: FormState, action: FormAction): FormState => {
  switch (action.type) {
    case "reset":
      return createInitialState(action.payload.accounts);
    case "setMode":
      return { ...state, mode: action.mode };
    case "setField":
      return { ...state, [action.field]: action.value as FormState[typeof action.field] };
    case "setStep":
      return { ...state, step: action.step };
    default:
      return state;
  }
};

const getCurrencyDecimals = (code?: string) => {
  if (!code) return 2;
  if (ZERO_DECIMAL_CURRENCIES.has(code.toUpperCase())) return 0;
  if (TWO_DECIMAL_CURRENCIES.has(code.toUpperCase())) return 2;
  return 2;
};

const formatAmount = (value: string, decimals: number) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const formatInt = (n: number) => n.toLocaleString("pt-BR").replace(/,/g, ".");

  if (decimals === 0) {
    const intVal = parseInt(digits, 10);
    return Number.isFinite(intVal) ? formatInt(intVal) : "";
  }

  const padded = digits.padStart(decimals + 1, "0");
  const intRaw = parseInt(padded.slice(0, -decimals), 10);
  const fraction = padded.slice(-decimals);
  const intFormatted = Number.isFinite(intRaw) ? formatInt(intRaw) : "0";
  return `${intFormatted},${fraction}`;
};

const parseAmountToNumber = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

type LabeledSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

const LabeledSelect = ({ label, value, onChange, children }: LabeledSelectProps) => (
  <div className="space-y-1">
    <label className="text-sm text-slate-600">{label}</label>
    <select className="input bg-white" value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  </div>
);

type LabeledInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
};

const LabeledInput = ({ label, helperText, ...props }: LabeledInputProps) => (
  <div className="space-y-1">
    <label className="text-sm text-slate-600">{label}</label>
    <Input {...props} />
    {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
  </div>
);

type ModeToggleProps = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

const ModeToggle = ({ mode, onChange }: ModeToggleProps) => (
  <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1 text-sm font-medium">
    {[
      { key: "expense", label: "Saída", icon: "arrow-up-right" as const, color: "text-red-600" },
      { key: "income", label: "Entrada", icon: "arrow-down-right" as const, color: "text-green-600" },
      { key: "transfer", label: "Transf.", icon: "transfer" as const, color: "text-purple-600" },
    ].map(({ key, label, icon, color }) => {
      const active = mode === key;
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key as Mode)}
          className={`flex-1 rounded-full px-3 py-2 transition ${
            active ? "bg-white shadow-sm text-slate-900" : "text-slate-500"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ${color}`}
            >
              <Icon name={icon} className="h-4 w-4" />
            </span>
            {active ? label : null}
          </span>
        </button>
      );
    })}
  </div>
);

export const ManualTransactionModal = ({
  open,
  onClose,
  onSaved,
  organization,
  accounts,
  categories,
  loading,
}: ManualTransactionModalProps) => {
  const [form, dispatch] = useReducer(formReducer, accounts, (accs) =>
    createInitialState(accs),
  );
  const { rates } = useExchangeDefaults(organization?.id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string | null) => {
    setError(null);
    dispatch({ type: "setField", field, value });
  };

  useEffect(() => {
    if (open) {
      dispatch({ type: "reset", payload: { accounts } });
      dispatch({ type: "setStep", step: "type" });
      setError(null);
    }
  }, [open, accounts, categories]);

  const account = useMemo(
    () => accounts.find((a) => a.id === form.accountId) ?? accounts[0],
    [accounts, form.accountId],
  );
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === form.toAccountId) ?? accounts[1],
    [accounts, form.toAccountId],
  );

  const decimals = getCurrencyDecimals(account?.currency);
  const toDecimals = getCurrencyDecimals(toAccount?.currency);
  const amountValue = parseAmountToNumber(form.amount);
  const exchangeRateNumber = Number(form.exchangeRate) || 0;
  const convertedAmount =
    form.mode === "transfer" && amountValue > 0 && exchangeRateNumber > 0
      ? amountValue / exchangeRateNumber
      : null;

  const defaultExchangeRate = useMemo(() => {
    if (!account || !toAccount) return null;
    const match = rates.find(
      (rate) =>
        rate.fromCurrency.toUpperCase() === account.currency.toUpperCase() &&
        rate.toCurrency.toUpperCase() === toAccount.currency.toUpperCase(),
    );
    return match?.rate ?? null;
  }, [account, toAccount, rates]);

  useEffect(() => {
    if (form.mode !== "transfer") return;
    if (!account || !toAccount) return;
    if (!defaultExchangeRate) return;
    dispatch({
      type: "setField",
      field: "exchangeRate",
      value: defaultExchangeRate.toString(),
    });
  }, [account, toAccount, defaultExchangeRate, form.mode]);

  const setStep = (step: StepId) => dispatch({ type: "setStep", step });

  const goToNext = () => {
    const currentIndex = STEP_ORDER.indexOf(form.step);
    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1]);
      setError(null);
    }
  };

  const goToPrev = () => {
    const currentIndex = STEP_ORDER.indexOf(form.step);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
      setError(null);
    }
  };

  const validateStep = (step: StepId): string | null => {
    if (step === "account") {
      if (!form.accountId) return "Selecione uma conta.";
      if (form.mode === "transfer") {
        if (!form.toAccountId) return "Selecione a conta de destino.";
        if (form.toAccountId === form.accountId) return "Contas devem ser diferentes.";
      }
    }

    if (step === "amount") {
      if (!form.amount) return "Informe o valor.";
      if (amountValue <= 0) return "Valor deve ser maior que zero.";
      if (form.mode === "transfer" && (!form.exchangeRate || Number(form.exchangeRate) <= 0))
        return "Preencha a taxa.";
    }

    if (step === "details") {
      if (!form.note.trim()) return "Descreva o lançamento.";
    }

    return null;
  };

  const validateAll = () => {
    for (const step of STEP_ORDER) {
      const msg = validateStep(step);
      if (msg) return msg;
    }
    return null;
  };

  const canSubmit =
    !!organization &&
    !loading &&
    !validateAll();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationMessage = validateAll();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    if (!organization) return;
    const account = accounts.find((a) => a.id === form.accountId);
    if (!account) {
      setError("Selecione uma conta.");
      return;
    }
    const category = form.categoryId ? categories.find((c) => c.id === form.categoryId) : null;
    if (!form.note.trim()) {
      setError("Descreva o lançamento.");
      return;
    }

    if (form.mode === "transfer") {
      const toAcc = accounts.find((a) => a.id === form.toAccountId);
      if (!toAcc) return setError("Selecione a conta de destino.");
      if (toAcc.id === account.id) return setError("Escolha contas diferentes.");
      if (!form.exchangeRate || Number(form.exchangeRate) <= 0)
        return setError("Preencha a taxa.");
      setSaving(true);
      setError(null);
      try {
        await createTransfer(supabase, {
          organizationId: organization.id,
          fromAccountId: account.id,
          toAccountId: toAcc.id,
          categoryId: category?.id ?? null,
          amount: amountValue,
          exchangeRate: Number(form.exchangeRate),
          currencyFrom: account.currency,
          currencyTo: toAcc.currency,
          date: form.date,
          note: form.note || null,
        });
        onClose();
        onSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao salvar transferência.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createTransaction(supabase, {
        organizationId: organization.id,
        accountId: account.id,
        categoryId: category?.id ?? null,
        type: form.mode,
        amount: amountValue,
        currency: account.currency,
        date: form.date,
        note: form.note || null,
        transferId: null,
        exchangeRate: 1,
      });
      onClose();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Lançamento manual</h2>
            <p className="text-xs text-slate-500">
              Etapa {STEP_ORDER.indexOf(form.step) + 1} de {STEP_ORDER.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            aria-label="Fechar modal"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Icon name="loader" className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : !organization ? (
          <p className="text-sm text-red-500">Organização não encontrada.</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-red-500">Cadastre uma conta antes de lançar.</p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {form.step === "type" && (
              <div className="space-y-4">
                <ModeToggle
                  mode={form.mode}
                  onChange={(mode) => {
                    dispatch({ type: "setMode", mode });
                    setError(null);
                  }}
                />
                <LabeledInput
                  label="Data"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField("date", e.target.value)}
                />
              </div>
            )}

            {form.step === "account" && (
              <div className="space-y-3">
                <LabeledSelect
                  label={form.mode === "transfer" ? "Conta de origem" : "Conta"}
                  value={form.accountId}
                  onChange={(value) => updateField("accountId", value)}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currency})
                    </option>
                  ))}
                </LabeledSelect>

                {form.mode === "transfer" && (
                  <LabeledSelect
                    label="Conta de destino"
                    value={form.toAccountId}
                    onChange={(value) => updateField("toAccountId", value)}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </LabeledSelect>
                )}
              </div>
            )}

            {form.step === "amount" && (
              <div className="space-y-3">
                <LabeledInput
                  label={`Valor (${account?.currency ?? "moeda"})`}
                  name="amount"
                  placeholder="0,00"
                  inputMode="decimal"
                  autoFocus
                  value={form.amount}
                  onChange={(e) => {
                    const formatted = formatAmount(e.target.value, decimals);
                    updateField("amount", formatted);
                  }}
                  helperText={
                    decimals === 0
                      ? "Sem centavos para pesos; digite só números."
                      : "Digite o valor seguido dos centavos, sem precisar usar vírgula."
                  }
                />
                {form.mode === "transfer" && (
                  <>
                    <LabeledInput
                      label={`Taxa ${account?.currency ?? ""} → ${toAccount?.currency ?? ""}`}
                      name="exchangeRate"
                      type="number"
                      step="0.0001"
                      value={form.exchangeRate}
                      onChange={(e) => updateField("exchangeRate", e.target.value)}
                      helperText={
                        defaultExchangeRate
                          ? `Padrão: ${defaultExchangeRate} ${account?.currency} = 1 ${toAccount?.currency}`
                          : "Quantos da moeda de origem valem 1 da moeda destino."
                      }
                    />
                    {convertedAmount !== null ? (
                      <p className="text-xs text-slate-500">
                        ≈ {convertedAmount.toFixed(toDecimals)} {toAccount?.currency}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {form.step === "details" && (
              <div className="space-y-3">
                <LabeledInput
                  label="Nota"
                  name="note"
                  placeholder="Descrição rápida"
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                />
                {form.mode !== "transfer" ? (
                  <LabeledSelect
                    label="Categoria (opcional)"
                    value={form.categoryId ?? ""}
                    onChange={(value) => updateField("categoryId", value || null)}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </LabeledSelect>
                ) : (
                  <p className="text-xs text-slate-500">Transferências não usam categoria.</p>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="w-auto flex-1"
                onClick={goToPrev}
                disabled={form.step === "type" || saving}
              >
                <Icon name="arrow-left" className="h-4 w-4" />
              </Button>

              {form.step === "details" ? (
                <Button type="submit" disabled={!canSubmit || saving} className="w-auto flex-1">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-auto flex-1"
                  type="button"
                  onClick={() => {
                    const msg = validateStep(form.step);
                    if (msg) return setError(msg);
                    goToNext();
                  }}
                >
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
