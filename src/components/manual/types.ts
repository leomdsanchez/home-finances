import type { Account, Category, Organization } from "../../types/domain";

export type ManualTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  organization?: Organization | null;
  accounts: Account[];
  categories: Category[];
  loading?: boolean;
};
