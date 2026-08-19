// Cada permissão diz o que a pessoa passa a poder fazer, e não a área onde isso acontece — a
// área já é o título do grupo. Sem isso, "Financeiro" aparecia duas vezes seguidas na tela de
// permissões: uma como seção, outra como o próprio interruptor.
const PERMISSION_LABELS: Record<string, string> = {
  manage_school_settings: 'Configurações da escola',
  manage_billing: 'Gerenciar financeiro',
  manage_people: 'Gerenciar pessoas',
  manage_enrollment: 'Gerenciar matrículas',
  manage_documents: 'Gerenciar documentos',
  approve_lesson_plans: 'Aprovar planos de aula',
  moderate_messages: 'Moderar mensagens',
  teach: 'Ensinar',
  view_billing_summary: 'Resumo financeiro',
};

const DOMAIN_LABELS: Record<string, string> = {
  school: 'Escola',
  billing: 'Financeiro',
  people: 'Pessoas',
  enrollment: 'Matrículas',
  documents: 'Documentos',
  academic: 'Acadêmico',
  communication: 'Comunicação',
};

export const permissionLabel = (key: string): string => PERMISSION_LABELS[key] ?? key;

export const permissionDomainLabel = (domain: string): string => DOMAIN_LABELS[domain] ?? domain;
