// Lê o Vercel Blob (inscrições) e escreve placar-data.json com a contagem DEDUPLICADA.
// Regra: cada pessoa conta 1 vez, mesmo que tenha enviado o formulário mais de uma vez.
// Chave de deduplicação (em ordem de prioridade): telefone > e-mail > nome+tipo.
import { list } from '@vercel/blob';
import { writeFileSync } from 'fs';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PREFIX = 'inscricoes/';

const normPhone = (v) => {
  if (!v) return '';
  let d = String(v).replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2); // remove DDI
  d = d.replace(/^0+/, '');
  // normaliza celular com/sem 9º dígito: DDD + últimos 8
  if (d.length === 11) d = d.slice(0, 2) + d.slice(3);
  return d;
};
const normText = (v) => String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

const keyOf = (it) => {
  const tel = normPhone(it.telefone || it.whatsapp || it.celular || it.fone || it.phone);
  if (tel.length >= 8) return 'tel:' + tel;
  const email = normText(it.email || it.mail);
  if (email.includes('@')) return 'email:' + email;
  const nome = normText(it.nome || it.name);
  if (nome) return 'nome:' + nome + '|' + normText(it.tipo);
  return null; // sem identificador: não conta (evita lixo)
};

const seen = new Map(); // key -> tipo
let cursor, lidos = 0, invalidos = 0;
do {
  const page = await list({ prefix: PREFIX, token: TOKEN, cursor, limit: 1000 });
  const items = await Promise.all(
    page.blobs.filter(b => b.pathname.endsWith('.json')).map(async b => {
      const r = await fetch(b.url, { headers: { Authorization: 'Bearer ' + TOKEN } });
      if (!r.ok) return null;
      try { return await r.json(); } catch { return null; }
    })
  );
  for (const it of items) {
    lidos++;
    if (!it) { invalidos++; continue; }
    const tipo = normText(it.tipo);
    if (tipo !== 'revisionista' && tipo !== 'obreiro') { invalidos++; continue; }
    const k = keyOf(it);
    if (!k) { invalidos++; continue; }
    if (!seen.has(k)) seen.set(k, tipo); // 1ª inscrição vale; repetições são ignoradas
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

let rev = 0, obr = 0;
for (const tipo of seen.values()) tipo === 'revisionista' ? rev++ : obr++;

const dup = lidos - invalidos - seen.size;
const data = { revisionistas: rev, obreiros: obr, total: rev + obr, metaRev: 100, metaObr: 100, ts: new Date().toISOString() };
writeFileSync('placar-data.json', JSON.stringify(data));
console.log('contagem:', JSON.stringify(data));
console.log(`auditoria: ${lidos} arquivos lidos · ${dup} duplicados removidos · ${invalidos} invalidos ignorados`);
