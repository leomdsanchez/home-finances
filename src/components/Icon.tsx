import {
  ArrowRight,
  Camera,
  Hand,
  Lock,
  LogOut,
  Mail,
  Mic,
  Keyboard,
  Loader2,
  MoreVertical,
  User,
  Building2,
  CreditCard,
  Tag,
  Wallet,
  Settings,
  Plus,
  Trash2,
  ArrowLeft,
  Copy,
  Pencil,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  X,
  type LucideProps,
} from "lucide-react";

type IconName =
  | "mail"
  | "lock"
  | "arrow-right"
  | "hand"
  | "camera"
  | "mic"
  | "logout"
  | "loader"
  | "keyboard"
  | "more"
  | "user"
  | "building"
  | "credit-card"
  | "tag"
  | "wallet"
  | "settings"
  | "plus"
  | "trash"
  | "arrow-left"
  | "copy"
  | "transfer"
  | "edit"
  | "arrow-down-right"
  | "arrow-up-right"
  | "close";

const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
  mail: Mail,
  lock: Lock,
  "arrow-right": ArrowRight,
  hand: Hand,
  camera: Camera,
  mic: Mic,
  logout: LogOut,
  loader: Loader2,
  keyboard: Keyboard,
  more: MoreVertical,
  user: User,
  building: Building2,
  "credit-card": CreditCard,
  tag: Tag,
  wallet: Wallet,
  settings: Settings,
  plus: Plus,
  trash: Trash2,
  "arrow-left": ArrowLeft,
  copy: Copy,
  transfer: ArrowLeftRight,
  edit: Pencil,
  "arrow-down-right": ArrowDownRight,
  "arrow-up-right": ArrowUpRight,
  close: X,
};

interface IconProps extends LucideProps {
  name: IconName;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  const Component = iconMap[name];
  return <Component className={className} {...props} />;
};

export type { IconName };
