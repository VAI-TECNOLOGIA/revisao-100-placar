# Revisão 100 — Placar ao vivo

Telão de contagem de inscritos (Revisionistas · Obreiros) do Revisão 100.

- `index.html` — o placar (fogo, decrescente "FALTAM X / cem é quando ninguém falta").
- `placar-data.json` — contagem atual, atualizada a cada ~5 min pela GitHub Action.
- `update-counts.mjs` — lê o Vercel Blob (inscrições) e regenera a contagem.

Publicado via GitHub Pages. Secret necessário: `BLOB_READ_WRITE_TOKEN`.
Ponte enquanto a conta Vercel está bloqueada; migrar para revisao100-sara.vercel.app/placar quando liberar.
