import { useEffect, useMemo, useRef, useState } from "react";
import type { Account, Category } from "../../types/domain";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { todayYMD } from "../../lib/date";
import {
  suggestTransactionFromAudio,
  type AiTransactionSuggestion,
} from "../../services/aiTransactionService";

type Props = {
  open: boolean;
  onClose: () => void;
  organizationId?: string;
  token?: string;
  accounts: Account[];
  categories: Category[];
  onSuggested: (result: {
    transcript: string;
    suggestion: AiTransactionSuggestion;
  }) => void;
};

export const AIMicModal = ({
  open,
  onClose,
  organizationId,
  token,
  accounts,
  categories,
  onSuggested,
}: Props) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRecorder, setHasRecorder] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const autoStartAttemptedRef = useRef(false);

  const audioUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob) : null),
    [audioBlob],
  );

  useEffect(() => {
    if (!open) return;
    setRecording(false);
    setAudioBlob(null);
    setSending(false);
    setError(null);
    chunksRef.current = [];
    autoStartAttemptedRef.current = false;
  }, [open]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!open) {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }
      stopStream();
      setRecording(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHasRecorder(typeof window !== "undefined" && "MediaRecorder" in window);
  }, [open]);

  const canUse = Boolean(organizationId && token && accounts.length > 0);

  useEffect(() => {
    if (!open) return;
    if (!canUse || sending) return;
    if (!hasRecorder) return;
    if (recording || audioBlob) return;
    if (autoStartAttemptedRef.current) return;

    autoStartAttemptedRef.current = true;
    void startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canUse, hasRecorder, sending, recording, audioBlob]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];
    try {
      if (!("MediaRecorder" in window)) {
        setError("Seu navegador não suporta gravação de áudio.");
        return;
      }
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setRecording(false);
        stopStream();
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao acessar o microfone.");
      stopStream();
      setRecording(false);
    }
  };

  const stopRecording = () => {
    setError(null);
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (!organizationId || !token) return;
    if (!audioBlob) {
      setError("Grave um áudio primeiro.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await suggestTransactionFromAudio({
        token,
        organizationId,
        today: todayYMD(),
        accounts,
        categories,
        audio: audioBlob,
        filename: "audio.webm",
      });
      onSuggested(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao processar áudio.");
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
            <h2 className="text-lg font-semibold text-slate-900">Lançamento com voz</h2>
            <p className="text-xs text-slate-500">
              Fale descrição, valor e conta. Ex.: &quot;Mercado, 120 reais, Nubank&quot;.
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  recording ? "bg-red-600 text-white" : "bg-white text-slate-700"
                } ring-1 ring-slate-200`}
              >
                <Icon name="mic" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                {recording ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    <p className="text-sm font-medium text-slate-900">Gravando...</p>
                  </div>
                ) : audioBlob ? (
                  <p className="text-sm font-medium text-slate-900">Pronto para enviar</p>
                ) : hasRecorder ? (
                  <p className="text-sm font-medium text-slate-900">Preparando microfone...</p>
                ) : (
                  <p className="text-sm font-medium text-slate-900">Áudio não suportado</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {recording
                    ? "Toque em parar para revisar, regravar ou enviar."
                    : audioBlob
                      ? "Você pode ouvir antes de enviar."
                      : "Se pedir permissão, permita o microfone."}
                </p>
              </div>
            </div>

            {audioUrl ? (
              <audio controls src={audioUrl} className="mt-3 w-full" />
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : !hasRecorder ? (
            <p className="text-xs text-slate-500">
              Seu navegador não suporta gravação de áudio via MediaRecorder.
            </p>
          ) : null}

          <div className="flex gap-2">
            {recording ? (
              <Button onClick={stopRecording} disabled={sending} className="flex-1">
                <Icon name="close" className="h-4 w-4" />
                Parar
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                disabled={!canUse || sending || !hasRecorder}
                className="flex-1"
              >
                <Icon name="mic" className="h-4 w-4" />
                {audioBlob ? "Regravar" : "Gravar"}
              </Button>
            )}

            <Button onClick={handleSend} disabled={!canUse || sending || recording || !audioBlob} className="flex-1">
              {sending ? (
                <>
                  <Icon name="loader" className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Icon name="check" className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>

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
