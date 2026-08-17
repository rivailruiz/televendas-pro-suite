export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Prazo médio de um prazo de pagamento = média dos dias das parcelas
// (prazos_em_dias / numero_de_parcelas). A coluna prazo_medio no banco
// existe mas quase nunca vem preenchida (dado legado/import); o valor que
// o usuário efetivamente vê e cadastra em Cadastro de Prazos é este
// calculado, então é ele que precisa ser usado em qualquer lugar que
// dependa de "prazo médio" (ex.: filtro de prazos na Digitação de Pedido),
// senão o filtro nunca bate com o que a tela mostra.
export const calcularPrazoMedio = (
  prazosEmDias?: string | number | unknown[] | null,
  numParcelas?: number | null
): number => {
  if (prazosEmDias == null || !numParcelas || numParcelas <= 0) return 0;
  const prazosStr = Array.isArray(prazosEmDias) ? prazosEmDias.join(',') : String(prazosEmDias);
  const dias = prazosStr
    .split(/[,;/\s]+/)
    .map((d) => parseInt(d.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 0);
  if (dias.length === 0) return 0;
  const soma = dias.reduce((acc, d) => acc + d, 0);
  return Math.round(soma / numParcelas);
};

export const formatDate = (date: string): string => {
  // Datas vindas do backend (ex.: "2026-07-15" ou "2026-07-15T00:00:00.000Z") representam
  // um dia-calendário sem horário. Usar new Date(date).toLocaleDateString() interpreta a
  // string como meia-noite UTC e depois formata no fuso local do navegador, o que pode
  // exibir o dia anterior (ex.: 14/07 em vez de 15/07) em fusos atrás de UTC.
  // Por isso lemos os componentes em UTC em vez de local.
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
};
