import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const pickRecorderMimeType = () => {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  // Try a few common types (not all browsers support all).
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) ?? null;
};

const audioFilenameForMime = (mime: string | undefined | null) => {
  const m = (mime ?? "").toLowerCase();
  if (m.includes("mp4")) return "audio.m4a";
  if (m.includes("mpeg") || m.includes("mp3")) return "audio.mp3";
  if (m.includes("wav")) return "audio.wav";
  if (m.includes("ogg")) return "audio.ogg";
  return "audio.webm";
};

const micErrorMessage = (err: unknown) => {
  const anyErr = err as { name?: string; message?: string };
  const name = typeof anyErr?.name === "string" ? anyErr.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Permissão do microfone negada.";
  }
  if (name === "NotFoundError") {
    return "Nenhum microfone encontrado.";
  }
  if (name === "NotReadableError") {
    return "Não foi possível acessar o microfone (talvez esteja em uso).";
  }
  const message = err instanceof Error ? err.message : typeof anyErr?.message === "string" ? anyErr.message : "";
  return message || "Falha ao acessar o microfone.";
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
  const [starting, setStarting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingReady, setRecordingReady] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRecorder, setHasRecorder] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const autoStartAttemptedRef = useRef(false);
  const openRef = useRef(open);
  const recordingReadyRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const audioUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob) : null),
    [audioBlob],
  );

  useEffect(() => {
    if (!open) return;
    setStarting(false);
    setRecording(false);
    setRecordingReady(false);
    recordingReadyRef.current = false;
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
      setStarting(false);
      setRecording(false);
      setRecordingReady(false);
      recordingReadyRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setHasRecorder(typeof window !== "undefined" && "MediaRecorder" in window);
  }, [open]);

  const canUse = Boolean(organizationId && token && accounts.length > 0);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setStarting(true);
    setRecording(false);
    setRecordingReady(false);
    recordingReadyRef.current = false;
    chunksRef.current = [];
    try {
      if (!("MediaRecorder" in window)) {
        setError("Seu navegador não suporta gravação de áudio.");
        setStarting(false);
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Seu navegador não permite acesso ao microfone.");
        setStarting(false);
        return;
      }
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!openRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        setStarting(false);
        return;
      }
      streamRef.current = stream;

      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => {
        if (!openRef.current) return;
        setStarting(false);
        setRecording(true);
        setRecordingReady(false);
        recordingReadyRef.current = false;
      };
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        if (!recordingReadyRef.current && e.data && e.data.size > 0 && openRef.current) {
          // Some browsers show "recording" before the encoder is actually emitting data.
          // We only show the "Gravando..." indicator after the first chunk arrives,
          // so the user doesn't start speaking too early and lose the beginning.
          recordingReadyRef.current = true;
          setRecordingReady(true);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!openRef.current) return;
        if (!blob.size) {
          setAudioBlob(null);
          setError("Áudio vazio. Tente gravar novamente.");
        } else {
          setAudioBlob(blob);
        }
        setStarting(false);
        setRecording(false);
        setRecordingReady(false);
        recordingReadyRef.current = false;
        stopStream();
      };

      recorder.start(250);
    } catch (err) {
      setError(micErrorMessage(err));
      stopStream();
      setStarting(false);
      setRecording(false);
      setRecordingReady(false);
      recordingReadyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!canUse || sending) return;
    if (!hasRecorder) return;
    if (starting || recording || audioBlob) return;
    if (autoStartAttemptedRef.current) return;

    autoStartAttemptedRef.current = true;
    void startRecording();
  }, [open, canUse, hasRecorder, sending, starting, recording, audioBlob, startRecording]);

  const stopRecording = useCallback(() => {
    setError(null);
    // If we're still starting up, cancel cleanly to avoid getting stuck.
    if (starting && !recording) {
      try {
        mediaRecorderRef.current?.stop();
      } catch {
        // ignore
      }
      stopStream();
      chunksRef.current = [];
      setStarting(false);
      setRecording(false);
      setRecordingReady(false);
      recordingReadyRef.current = false;
      return;
    }
    try {
      mediaRecorderRef.current?.stop();
    } catch {
      // ignore
    }
  }, [recording, starting]);

  const handleSend = useCallback(async () => {
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
        filename: audioFilenameForMime(audioBlob.type),
      });
      onSuggested(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao processar áudio.");
    } finally {
      setSending(false);
    }
  }, [accounts, audioBlob, categories, onClose, onSuggested, organizationId, token]);

  if (!open) return null;

  const showRecording = recording && recordingReady;
  const showStarting = starting || (recording && !recordingReady);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Lançamento com voz</h2>
            <p className="text-xs text-slate-500">
              Aguarde o ponto vermelho e fale descrição, valor e conta. Ex.: &quot;Mercado, 120 reais, Nubank&quot;.
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
                  showRecording
                    ? "bg-red-600 text-white"
                    : showStarting
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-700"
                } ring-1 ring-slate-200`}
              >
                <Icon name="mic" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                {showRecording ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    <p className="text-sm font-medium text-slate-900">Gravando...</p>
                  </div>
                ) : showStarting ? (
                  <div className="flex items-center gap-2">
                    <Icon name="loader" className="h-4 w-4 animate-spin text-slate-500" />
                    <p className="text-sm font-medium text-slate-900">Iniciando...</p>
                  </div>
                ) : audioBlob ? (
                  <p className="text-sm font-medium text-slate-900">Pronto para enviar</p>
                ) : hasRecorder ? (
                  <p className="text-sm font-medium text-slate-900">Preparando microfone...</p>
                ) : (
                  <p className="text-sm font-medium text-slate-900">Áudio não suportado</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {showRecording
                    ? "Toque em parar para revisar, regravar ou enviar."
                    : showStarting
                      ? "Aguarde aparecer 'Gravando...' antes de falar."
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
            ) : starting ? (
              <Button onClick={stopRecording} disabled={sending} className="flex-1">
                <Icon name="loader" className="h-4 w-4 animate-spin" />
                Iniciando...
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
