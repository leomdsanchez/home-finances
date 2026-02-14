import type { Account, Category, Organization } from "../../types/domain";

export type ManualTransactionDraft = Partial<{
  mode: "expense" | "income" | "transfer";
  status: "realizado" | "previsto";
  accountId: string;
  toAccountId: string;
  categoryId: string | null;
  amount: string;
  exchangeRate: string;
  note: string;
  date: string; // YYYY-MM-DD
  step: "type" | "account" | "amount" | "details";
}>;

export type ManualTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  organization?: Organization | null;
  accounts: Account[];
  categories: Category[];
  loading?: boolean;
  initialDraft?: ManualTransactionDraft;
};
