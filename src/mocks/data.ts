export const usuarios = [
  { usuario: 'alex', senha: '1234', nome: 'ALEX' }
];

export const clientes = [
  { id: 889, nome: '10 REGIMENTO DE CAVALARIA MECANIZADO', cidade: 'BELA VISTA', uf: 'MS', bairro: 'CENTRO', fone: '67984064798', contato: '' },
  { id: 435, nome: '11 REGIMENTO DE CAVALARIA MECANIZADO', cidade: 'PONTA PORA', uf: 'MS', bairro: 'CENTRO', fone: '67984064798', contato: '' },
  { id: 721, nome: '17 BATALHAO DE FRONTEIRA', cidade: 'CORUMBA', uf: 'MS', bairro: 'CENTRO', fone: '67984064798', contato: '' },
  { id: 466, nome: '20 REGIMENTO DE CAVALARIA BLINDADA', cidade: 'CAMPO GRANDE', uf: 'MS', bairro: 'SOBRINHO', fone: '67984064798', contato: '' },
  { id: 6845, nome: '3 BATERIA DE ARTILHARIA ANTIAEREA', cidade: 'TRES LAGOAS', uf: 'MS', bairro: 'JD PRIMAVERIL', fone: '67984064798', contato: '' },
  { id: 8850, nome: '3 F COM DE PROD DE LIMP. HIG E DESCARTAVEIS', cidade: 'CAMPO GRANDE', uf: 'MS', bairro: 'MONTE CASTELO', fone: '67984064798', contato: '' },
  { id: 4443, nome: '3B INDUSTRIA E COMERCIO DE ARTEF', cidade: 'JOSE BONIFACIO', uf: 'SP', bairro: 'POLO INDUSTRIAL', fone: '67984064798', contato: '' },
  { id: 16231, nome: '50.127.127 VALMIR FLORES AFONSO BEZERRA', cidade: 'PONTA PORA', uf: 'MS', bairro: 'JARDIM UNIVERSITARIO', fone: '67984064798', contato: '' },
  { id: 1032, nome: 'A. A. GODOI DROGARIA', cidade: 'AGUA BOA', uf: 'MS', bairro: 'CENTRO', fone: '67984064798', contato: 'ALINE' },
  { id: 16053, nome: 'ACONCHEGO DA VOVO CASA DE IDOSO LTDA', cidade: 'CAMPO GRANDE', uf: 'MS', bairro: 'TIRADENTES', fone: '67984064798', contato: '' },
  { id: 10158, nome: 'ADRIANE OLIVEIRA BARBOSA', cidade: 'CAMPO GRANDE', uf: 'MS', bairro: 'AERO RANCHO', fone: '67984064798', contato: '' },
  { id: 8864, nome: 'AGILIZA CLINICA ODONTOLOGICA EIRELI', cidade: 'CAMPO GRANDE', uf: 'MS', bairro: 'JARDIM ANACHE', fone: '67984064798', contato: 'FERNANDA' }
];

export const representantes = [
  { id: '017', nome: 'ALEXANDRE FERREIRA' },
  { id: '002', nome: 'CARLOS SILVA' },
  { id: '005', nome: 'MARIA SANTOS' }
];

export const produtos = [
  { id: 1722, descricao: 'AES ANTITROMBO AD 18-18 BRANCA ESTERIL', un: 'UN', preco: 104.3164, categoria: 'A' },
  { id: 1723, descricao: 'AGULHA HIPODERMICA 25X6 DESCARTAVEL', un: 'UN', preco: 0.2850, categoria: 'B' },
  { id: 1724, descricao: 'ALCOOL 70% GEL 500G', un: 'UN', preco: 12.5000, categoria: 'A' },
  { id: 1725, descricao: 'LUVA PROCEDIMENTO M LATEX C/100', un: 'CX', preco: 32.4500, categoria: 'A' },
  { id: 1726, descricao: 'MASCARA CIRURGICA TRIPLA C/50', un: 'CX', preco: 18.9000, categoria: 'B' },
  { id: 1727, descricao: 'SERINGA 10ML DESCARTAVEL', un: 'UN', preco: 0.8500, categoria: 'B' },
  { id: 1728, descricao: 'ALGODAO HIDROFILO 500G', un: 'PC', preco: 15.7500, categoria: 'A' },
  { id: 1729, descricao: 'ATADURA CREPE 15CM X 1,8M', un: 'UN', preco: 2.4500, categoria: 'C' }
];

export const operacoes = [
  'VENDA DE MERCADORIA',
  'BONIFICACAO',
  'VENDA PARA ENTREGA FUTURA',
  'DEVOLUCAO DE MERCADORIA'
];

export const situacoes = ['Pendentes', 'Faturados', 'Cancelados'];

export const formasPagamento = [
  'A VISTA',
  'BOLETO BANCARIO',
  'CARTAO DE CREDITO',
  'DUPLICATA'
];

export const tabelas = ['TABELA 01', 'TABELA 02', 'TABELA ESPECIAL'];

export const pedidos = [
  {
    id: 2546,
    data: '2025-10-16',
    operacao: 'VENDA DE MERCADORIA',
    clienteId: 889,
    clienteNome: '10 REGIMENTO DE CAVALARIA MECANIZADO',
    representanteId: '017',
    representanteNome: 'ALEXANDRE FERREIRA',
    tabela: 'TABELA 01',
    formaPagamento: 'BOLETO BANCARIO',
    prazo: '30 DIAS',
    boleto: true,
    rede: 'REDE SUL',
    especial: false,
    situacao: 'Pendentes',
    valor: 190.0,
    itens: [
      {
        produtoId: 1722,
        descricao: 'AES ANTITROMBO AD 18-18 BRANCA ESTERIL',
        av: 1,
        un: 'UN',
        c: 2,
        quant: 2,
        descontoPerc: 8.9309,
        preco: 104.3164,
        liquido: 95.0,
        total: 190.0,
        obs: ''
      }
    ],
    totais: {
      bruto: 208.63,
      descontos: 18.63,
      descontosPerc: 8.93,
      icmsRepasse: 0,
      liquido: 190.0
    },
    observacaoCliente: '',
    observacaoPedido: '',
    observacaoNF: ''
  }
];

export const itinerarios = [
  { id: 8850, razaoSocial: '3 F COM DE PROD DE LIMP. HIG E DESCARTAVEIS EI', contato: '', fone: '67984064798', horario: '', dtBase: '01/01/2025', representanteId: '017', cidade: 'CAMPO GRANDE', visita: 'SEMANAL' },
  { id: 16231, razaoSocial: '50.127.127 VALMIR FLORES AFONSO BEZERRA', contato: '', fone: '67984064798', horario: '', dtBase: '', representanteId: '017', cidade: 'PONTA PORA', visita: 'MENSAL' },
  { id: 1032, razaoSocial: 'A. A. GODOI DROGARIA', contato: 'ALINE', fone: '67984064798', horario: '09:00', dtBase: '01/01/2025', representanteId: '017', cidade: 'AGUA BOA', visita: 'QUINZENAL' }
];
