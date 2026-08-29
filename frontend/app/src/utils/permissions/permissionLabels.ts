/**
 * O nome de cada permissão, dito por inteiro: a ação e a área.
 *
 * A tela de permissões mostrava estes nomes sob um título de domínio que repetia a área —
 * "Financeiro" e logo abaixo "Financeiro" de novo. O título saiu e o nome ficou, porque é o nome
 * que precisa se explicar sozinho: é ele que o leitor de tela anuncia e é ele que aparece fora
 * desta tela.
 */
const PERMISSION_LABELS: Record<string, string> = {
  manage_school_settings: 'Configurações da escola',
  manage_billing: 'Gerenciar financeiro',
  manage_people: 'Gerenciar pessoas',
  manage_enrollment: 'Gerenciar matrículas',
  manage_documents: 'Gerenciar documentos',
  manage_academic: 'Gerenciar acadêmico',
  approve_lesson_plans: 'Aprovar planos de aula',
  moderate_messages: 'Moderar mensagens',
  teach: 'Ensinar',
  view_billing_summary: 'Resumo financeiro',
};

export const permissionLabel = (key: string): string => PERMISSION_LABELS[key] ?? key;
