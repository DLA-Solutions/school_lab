/**
 * Mirrors `User::PASSWORD_RULES` (`web/app/models/user.rb`), which is what actually decides.
 * Checking here only spares a round trip and lets someone see what is still missing as they type —
 * the API refuses a weak password whatever this file says.
 */
export const PASSWORD_RULES = [
  { key: 'length', label: 'Ao menos 10 caracteres', test: (v: string) => v.length >= 10 },
  { key: 'lowercase', label: 'Uma letra minúscula', test: (v: string) => /[a-z]/.test(v) },
  { key: 'uppercase', label: 'Uma letra maiúscula', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'digit', label: 'Um número', test: (v: string) => /\d/.test(v) },
  { key: 'symbol', label: 'Um símbolo (! @ # $ ...)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

export const isStrongPassword = (value: string) => PASSWORD_RULES.every((rule) => rule.test(value));
