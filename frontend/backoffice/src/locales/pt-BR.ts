/**
 * The product's default catalogue, and the source of truth for what keys exist — `MessageKey` is
 * derived from it, so English is checked against this file at compile time.
 *
 * Keys read `area.thing`: the screen first, then what the string is for. A message used on more
 * than one screen goes under `common`.
 */
const ptBR = {
  'nav.dashboard': 'Dashboard',
  'nav.schools': 'Escolas',
  'nav.backoffice': 'Backoffice',
  'nav.language': 'Idioma',

  'shell.notificationsComingSoon': 'Em breve',

  'backoffice.dashboard.title': 'Dashboard',
  'backoffice.dashboard.subtitle': 'Visão geral do onboarding na plataforma.',
  'backoffice.dashboard.onboarding.title': 'Escolas por status de onboarding',
  'backoffice.dashboard.loading': 'Carregando indicadores',
  'backoffice.dashboard.loadError': 'Não foi possível carregar os indicadores.',
  'backoffice.dashboard.noAccess.title': 'Sem acesso a esta área',
  'backoffice.dashboard.noAccess.description':
    'O dashboard da plataforma está disponível apenas para operadores do backoffice.',
  'backoffice.dashboard.status.provisioning': 'Em provisionamento',
  'backoffice.dashboard.status.pendingHandoff': 'Aguardando repasse',
  'backoffice.dashboard.status.active': 'Ativa',
  'backoffice.dashboard.link.provisioning': 'Ver em provisionamento',
  'backoffice.dashboard.link.pendingHandoff': 'Ver aguardando repasse',
  'backoffice.dashboard.viewSchools': 'Ver todas as escolas',
} as const;

export default ptBR;
