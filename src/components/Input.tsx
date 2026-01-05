import { forwardRef } from "react";
import { Icon, IconName } from "./Icon";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName;
}

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className, ...props }, ref) => (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,_rgb(37,_99,_235)_40%,_white)]">
      {icon ? (
        <Icon
          name={icon}
          className="h-5 w-5 text-slate-400"
          aria-hidden="true"
        />
      ) : null}
      <input
        ref={ref}
        className={cx(
          "w-full rounded-lg border-none bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0",
          className
        )}
        {...props}
      />
    </div>
  )
);

Input.displayName = "Input";
