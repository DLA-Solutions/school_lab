export const copy = {
  meta: {
    title: 'Scholar Premium — Gestão à altura do legado da sua escola',
    description:
      'Uma plataforma em evolução para reunir a operação acadêmica, financeira, documental e a relação com as famílias de escolas particulares brasileiras.',
    ogTitle: 'Scholar Premium — Gestão à altura do legado da sua escola',
    ogDescription:
      'Uma plataforma em evolução para reunir a gestão de escolas particulares brasileiras.',
    canonical: 'https://scholarpremium.com.br/',
    themeColor: '#050b18',
  },
  navigation: {
    skipLink: 'Ir para o conteúdo principal',
    brandLabel: 'Scholar Premium — página inicial',
  },
  frame01: {
    kicker: 'Legado em movimento',
    headline: [
      'Toda escola constrói um legado.',
      'A gestão precisa estar à altura dele.',
    ],
    lead:
      'Uma plataforma para reunir a operação acadêmica, financeira, documental e a relação com as famílias — pensada para escolas particulares brasileiras.',
    ctaPrimary: 'Agendar demonstração',
    ctaSecondary: 'Acessar plataforma',
    ctaPrimaryHref: './agendar-demonstracao/',
    ctaSecondaryHref: 'https://scholarpremium.com.br/app/authentication/signin',
    signature: 'Scholar Premium, by DLA Solutions',
  },
  frame02: {
    headline: ['O problema não é falta de software.', 'É falta de confiança.'],
    statements: [
      {
        title: 'Sistemas instáveis',
        body: 'Quando a plataforma falha no meio do dia, a operação inteira para.',
      },
      {
        title: 'Processos manuais',
        body: 'Planilhas, cobranças repetidas e retrabalho consomem a equipe.',
      },
      {
        title: 'Comunicação fragmentada',
        body: 'Famílias e escola perdem o fio quando cada canal vira um silo.',
      },
      {
        title: 'Arquivos físicos',
        body: 'Documentos críticos ainda dependem de gavetas e cópias impressas.',
      },
    ],
  },
  frame03: {
    headline: 'Uma escola conectada',
    pillars: [
      {
        id: 'academico',
        title: 'Acadêmico',
        body: 'Chamada, boletins e rotina escolar em um fluxo pensado para o dia a dia da equipe.',
        status: 'Produto web em evolução',
        threadRole: 'Regra acadêmica',
      },
      {
        id: 'financeiro',
        title: 'Financeiro',
        body: 'Emissão e acompanhamento de boletos com automação financeira parceira já em operação.',
        status: 'Automação financeira parceira já em operação',
        threadRole: 'Linha do tempo de pagamentos',
      },
      {
        id: 'documentos',
        title: 'Documentos',
        body: 'Direção para arquivo digital com rastreabilidade e cuidado com registros sensíveis.',
        status: 'Em desenvolvimento',
        threadRole: 'Espinha do arquivo',
      },
      {
        id: 'familias',
        title: 'Famílias',
        body: 'Portal para responsáveis acompanhar informações essenciais com isolamento por família.',
        status: 'Em desenvolvimento',
        threadRole: 'Caminho de comunicação',
      },
    ],
  },
  frame05: {
    headline: 'Privacidade por desenho',
    lead: 'Dados de crianças exigem cuidado extra. O Scholar Premium parte do isolamento por escola e por família.',
    points: [
      {
        title: 'Isolamento por escola',
        body: 'Cada instituição opera em seu próprio espaço de dados, sem vazamento entre escolas.',
      },
      {
        title: 'Isolamento por família',
        body: 'Responsáveis acessam apenas os registros dos próprios alunos.',
      },
      {
        title: 'Dados sensíveis',
        body: 'Saúde, rotina e ocorrências recebem tratamento restrito conforme a LGPD.',
      },
    ],
    disclaimer:
      'Nenhuma certificação é exibida até aprovação formal para uso em marketing.',
  },
  frame06: {
    headline: [
      'Sua escola já constrói o futuro todos os dias.',
      'A gestão pode acompanhar.',
    ],
    ctaPrimary: 'Agendar demonstração',
    ctaSecondary: 'Acessar plataforma',
  },
  footer: {
    brand: 'Scholar Premium',
    attribution: 'Scholar Premium, by DLA Solutions',
    copyright: `© ${new Date().getFullYear()} DLA Solutions. Todos os direitos reservados.`,
  },
  noscript:
    'A experiência visual interativa está desativada, mas todo o conteúdo e os acessos continuam disponíveis.',
} as const;

export type Copy = typeof copy;
