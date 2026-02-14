# AI (Voz e Imagem)

Este projeto usa **Supabase Edge Functions** para chamar a OpenAI com segurança (a chave **não** vai para o frontend).

## Variáveis
- `OPENAI_API_KEY` (obrigatória)
- `OPENAI_CHAT_MODEL` (opcional; default `gpt-4o-mini`, recomendado `gpt-5.2`)
- `OPENAI_REASONING_EFFORT` (opcional; `low | medium | high`; aplicado apenas em `gpt-5.x`)

## Configurar no Supabase (recomendado)
1) Defina os secrets no projeto:
   ```bash
   # Exemplo (reasoner):
   supabase secrets set OPENAI_API_KEY="SUA_CHAVE" OPENAI_CHAT_MODEL="gpt-5.2" OPENAI_REASONING_EFFORT="high"
   ```

2) Deploy das funções:
   ```bash
   # Obs: se o seu projeto estiver emitindo JWT com chaves assimétricas (ex.: ES256)
   # e o gateway retornar "Invalid JWT", faça deploy com --no-verify-jwt.
   # As funções validam o usuário internamente via auth.getUser().
   supabase functions deploy ai-transaction-audio --no-verify-jwt
   supabase functions deploy ai-transaction-image --no-verify-jwt
   ```

## Funções criadas
- `ai-transaction-audio`: recebe um áudio, transcreve (Whisper) e gera sugestão de lançamento.
- `ai-transaction-image`: recebe uma imagem (recibo) e gera sugestão de lançamento.
