import {
  ArrowRight,
  Camera,
  Hand,
  Lock,
  LogOut,
  Mail,
  Mic,
  Loader2,
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
  | "loader";

const iconMap: Record<IconName, React.ComponentType<LucideProps>> = {
  mail: Mail,
  lock: Lock,
  "arrow-right": ArrowRight,
  hand: Hand,
  camera: Camera,
  mic: Mic,
  logout: LogOut,
  loader: Loader2,
};

interface IconProps extends LucideProps {
  name: IconName;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  const Component = iconMap[name];
  return <Component className={className} {...props} />;
};

export type { IconName };
