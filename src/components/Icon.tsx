type IconName = "mail" | "lock" | "arrow-right";

const iconPaths: Record<IconName, string> = {
  mail: "M4 6h16M4 6v12h16V6M4 6l8 7 8-7",
  lock: "M12 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 21h14a2 2 0 0 0 2-2v-7H3v7a2 2 0 0 0 2 2ZM7 10V7a5 5 0 1 1 10 0v3",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
};

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
}

export const Icon = ({ name, className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="1.5"
    stroke="currentColor"
    className={className}
    {...props}
  >
    <path d={iconPaths[name]} />
  </svg>
);

export type { IconName };
