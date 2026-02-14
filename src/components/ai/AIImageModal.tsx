import { useEffect, useMemo, useState } from "react";
import type { Account, Category } from "../../types/domain";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Input } from "../Input";
import { todayYMD } from "../../lib/date";
import {
  suggestTransactionFromImage,
  type AiTransactionSuggestion,
} from "../../services/aiTransactionService";

type Props = {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  token?: string;
  accounts: Account[];
  categories: Category[];
  onSuggested: (result: { suggestion: AiTransactionSuggestion }) => void;
};

export const AIImageModal = ({
  open,
  onClose,
  organizationId,
  token,
  accounts,
  categories,
  onSuggested,
}: Props) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  useEffect(() => {
    if (!open) return;
    setImageFile(null);
    setSending(false);
    setError(null);
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleSend = async () => {
    if (!organizationId || !token) return;
    if (!imageFile) {
      setError("Selecione uma imagem primeiro.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await suggestTransactionFromImage({
        token,
        organizationId,
        today: todayYMD(),
        accounts,
        categories,
        image: imageFile,
        filename: imageFile.name || "image.jpg",
      });
      onSuggested(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao processar imagem.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  const canUse = Boolean(organizationId && token && accounts.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Lançamento com imagem</h2>
            <p className="text-xs text-slate-500">
              Envie um recibo ou comprovante. Você pode editar tudo antes de salvar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Fechar"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              setError(null);
              const f = e.target.files?.[0];
              if (!f) return;
              setImageFile(f);
            }}
          />

          {previewUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <img src={previewUrl} alt="Prévia" className="h-56 w-full object-cover" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
              Nenhuma imagem selecionada.
            </div>
          )}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <Button onClick={handleSend} disabled={!canUse || sending} className="w-full">
            {sending ? (
              <>
                <Icon name="loader" className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Icon name="check" className="h-4 w-4" />
                Gerar lançamento
              </>
            )}
          </Button>

          {!canUse ? (
            <p className="text-xs text-slate-500">
              Você precisa estar logado e ter contas cadastradas.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};
