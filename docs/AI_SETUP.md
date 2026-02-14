# AI (Voz e Imagem)

Este projeto usa **Supabase Edge Functions** para chamar a OpenAI com segurança (a chave **não** vai para o frontend).

## Variáveis
- `OPENAI_API_KEY` (obrigatória)
- `OPENAI_CHAT_MODEL` (opcional; default `gpt-4o-mini`)

## Configurar no Supabase (recomendado)
1) Defina os secrets no projeto:
   ```bash
   supabase secrets set OPENAI_API_KEY="SUA_CHAVE" OPENAI_CHAT_MODEL="gpt-4o-mini"
   ```

2) Deploy das funções:
   ```bash
   supabase functions deploy ai-transaction-audio
   supabase functions deploy ai-transaction-image
   ```

## Funções criadas
- `ai-transaction-audio`: recebe um áudio, transcreve (Whisper) e gera sugestão de lançamento.
- `ai-transaction-image`: recebe uma imagem (recibo) e gera sugestão de lançamento.

