import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

type Props = {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
};

export const PageHeader = ({ title, eyebrow, onBack }: Props) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleBack}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label="Voltar"
      >
        <Icon name="arrow-left" className="h-5 w-5" />
      </button>
      <div>
        {eyebrow ? (
          <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      </div>
    </div>
  );
};
