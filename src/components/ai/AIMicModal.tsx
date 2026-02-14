import { useEffect, useMemo, useRef, useState } from "react";
import type { Account, Category } from "../../types/domain";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { Input } from "../Input";
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
  const [audioName, setAudioName] = useState<string>("audio.webm");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const audioUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob) : null),
    [audioBlob],
  );

  useEffect(() => {
    if (!open) return;
    setRecording(false);
    setAudioBlob(null);
    setAudioName("audio.webm");
    setSending(false);
    setError(null);
    setTranscript("");
    chunksRef.current = [];
  }, [open]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    setError(null);
    setTranscript("");
    chunksRef.current = [];
    try {
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
        setAudioName("audio.webm");
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
      setError("Grave ou selecione um áudio primeiro.");
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
        filename: audioName,
      });
      setTranscript(result.transcript);
      onSuggested(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao processar áudio.");
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
          <div className="flex items-center gap-2">
            {!recording ? (
              <Button onClick={startRecording} disabled={!canUse || sending} className="flex-1">
                <Icon name="mic" className="h-4 w-4" />
                Gravar
              </Button>
            ) : (
              <Button onClick={stopRecording} disabled={sending} className="flex-1">
                <Icon name="close" className="h-4 w-4" />
                Parar
              </Button>
            )}
            <label className="flex-1">
              <span className="sr-only">Selecionar arquivo de áudio</span>
              <Input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  setError(null);
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setAudioBlob(f);
                  setAudioName(f.name || "audio");
                }}
              />
            </label>
          </div>

          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
              Nenhum áudio selecionado.
            </div>
          )}

          {transcript ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-slate-700">Transcrição</p>
              <p className="text-sm text-slate-700">{transcript}</p>
            </div>
          ) : null}

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

