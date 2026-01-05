import { Icon, IconName } from "./Icon";

type Variant = "primary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  trailingIcon?: IconName;
}

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export const Button = ({
  children,
  className,
  variant = "primary",
  trailingIcon,
  ...props
}: ButtonProps) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white h-11 w-full";

  const variants: Record<Variant, string> = {
    primary:
      "bg-blue-600 text-white border border-blue-200 shadow-sm hover:-translate-y-0.5 hover:bg-blue-700 focus-visible:ring-blue-300",
    ghost:
      "bg-white text-slate-900 border border-slate-200 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:ring-blue-200",
  };

  return (
    <button
      className={cx(base, variants[variant], className)}
      {...props}
      type={props.type ?? "button"}
    >
      <span className="inline-flex items-center gap-2">
        {children}
        {trailingIcon ? (
          <Icon
            name={trailingIcon}
            className="h-4 w-4"
            aria-hidden="true"
          />
        ) : null}
      </span>
    </button>
  );
};
