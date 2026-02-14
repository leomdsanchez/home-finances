import { useEffect, useMemo, useRef, useState } from "react";
import type { Account, Category } from "../../types/domain";
import { Button } from "../Button";
import { Icon } from "../Icon";
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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const canUse = Boolean(organizationId && token && accounts.length > 0);

  const handleSend = async (file?: File) => {
    if (!organizationId || !token) return;
    const f = file ?? imageFile;
    if (!f) {
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
        image: f,
        filename: f.name || "image.jpg",
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
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={!canUse || sending}
              className="flex-1"
            >
              <Icon name="camera" className="h-4 w-4" />
              Câmera
            </Button>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canUse || sending}
              className="flex-1"
            >
              <Icon name="file-image" className="h-4 w-4" />
              Arquivo
            </Button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              setError(null);
              const target = e.target as HTMLInputElement;
              const f = target.files?.[0];
              // Allow selecting the same file again after an error.
              target.value = "";
              if (!f) return;
              setImageFile(f);
              void handleSend(f);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              setError(null);
              const target = e.target as HTMLInputElement;
              const f = target.files?.[0];
              // Allow selecting the same file again after an error.
              target.value = "";
              if (!f) return;
              setImageFile(f);
              void handleSend(f);
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

          {sending ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              <Icon name="loader" className="h-4 w-4 animate-spin" />
              Analisando imagem...
            </div>
          ) : imageFile ? (
            <Button
              type="button"
              onClick={() => void handleSend(imageFile)}
              disabled={!canUse}
              className="w-full"
            >
              <Icon name="check" className="h-4 w-4" />
              Analisar novamente
            </Button>
          ) : null}

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
