# Tailwind 4.1 (preview) - Guia rápido

## Instalação feita
- Dependências: `tailwindcss`, `@tailwindcss/vite`.
- Vite plugin: `tailwindcss()` adicionado em `vite.config.ts`.
- CSS de entrada (`src/index.css`): `@import "tailwindcss";` no topo (dispensa `@tailwind base/components/utilities`).

## Como usar
- Escreva utilitários normalmente nas classes (ex.: `flex gap-4`, `bg-slate-900`).
- Tokens/tema podem ser definidos via `@theme { ... }` no CSS se precisar de cores/fontes custom.
- Safelist/scan: use `@source` no CSS (pode usar `@source inline("foo")` para safelist), se necessário.
- Não é obrigatório `tailwind.config.js`; se quiser, adicione `@config "./tailwind.config.js";` no CSS de entrada.

## Mudanças principais vs v3
- `ring` padrão mudou; se precisar 3px, use `ring-3`.
- `outline-none` virou `outline-hidden`.
- Escalas: `shadow-sm` -> `shadow-xs`, `rounded-sm` -> `rounded-xs`.
- Opacidades agora são com `/`: `bg-black/50`, `text-black/50`.

## Passos para o build
- Nada extra: Vite já aplica o plugin.
- Se trocar ícones do PWA, lembre de adicionar PNGs 192/512 no manifest (atualmente usa `vite.svg`).
