```SQL
// Fintech-first — executable schema (DBML)
// Auth: Devise (web session) + refresh_tokens (API JWT)
// Narrative DSL + LGPD notes: docs/modeling/001-fintech-first.md

Table school_groups {
  id integer [primary key, increment]
  name varchar [note: 'Network/holding — optional']
  headquarters_cnpj varchar
  created_at timestamp
  updated_at timestamp
}

Table schools {
  id integer [primary key, increment]
  school_group_id integer [note: 'Nullable — only when part of a network']
  name varchar [note: 'E.g. Example School — Downtown Unit']
  cnpj varchar
  address varchar
  saas_plan varchar
  created_at timestamp
  updated_at timestamp
}

// --- Identity (Devise) ---

Table users {
  id integer [primary key, increment]
  email varchar [not null, unique, note: 'LGPD: personal data — login identifier']
  encrypted_password varchar [not null, default: '']
  reset_password_token varchar [unique]
  reset_password_sent_at timestamp
  remember_created_at timestamp
  sign_in_count integer [default: 0]
  current_sign_in_at timestamp
  last_sign_in_at timestamp
  current_sign_in_ip varchar
  last_sign_in_ip varchar
  confirmation_token varchar [unique]
  confirmed_at timestamp
  confirmation_sent_at timestamp
  unconfirmed_email varchar
  failed_attempts integer [default: 0]
  unlock_token varchar [unique]
  locked_at timestamp
  created_at timestamp [not null]
  updated_at timestamp [not null]
}

Table memberships {
  id integer [primary key, increment]
  user_id integer [not null]
  school_id integer [note: 'Nullable for platform backoffice']
  role varchar [not null, note: 'backoffice | school | teacher | guardian']
  status varchar [not null, default: 'active', note: 'active | invited | suspended']
  created_at timestamp
  updated_at timestamp

  indexes {
    (user_id, school_id) [unique, note: 'One role per user per school']
  }
}

Table refresh_tokens {
  id integer [primary key, increment]
  user_id integer [not null]
  token_digest varchar [not null, unique, note: 'Store hash only — never raw token']
  expires_at timestamp [not null]
  revoked_at timestamp
  created_at timestamp
}

// --- School domain ---

Table guardians {
  id integer [primary key, increment]
  school_id integer [not null]
  user_id integer [note: 'Set when guardian creates account or accepts invite']
  name varchar
  cpf varchar [note: 'LGPD: sensitive personal data']
  email varchar [note: 'LGPD: contact email; may match users.email after signup']
  phone varchar [note: 'LGPD: personal data']
  created_at timestamp
  updated_at timestamp
}

Table students {
  id integer [primary key, increment]
  school_id integer [not null]
  name varchar
  birth_date date [note: 'LGPD: child data — guardian consent required']
  status varchar
  created_at timestamp
  updated_at timestamp
}

Table teachers {
  id integer [primary key, increment]
  school_id integer [not null]
  user_id integer [note: 'Set when teacher account is provisioned']
  name varchar
  status varchar [default: 'active']
  created_at timestamp
  updated_at timestamp
}

Table student_guardians {
  id integer [primary key, increment]
  guardian_id integer [not null]
  student_id integer [not null]
  financial_percentage decimal
  primary_guardian boolean
  created_at timestamp
  updated_at timestamp
}

// --- Billing ---

Table billing_plans {
  id integer [primary key, increment]
  school_id integer [not null]
  name varchar
  plan_type varchar [note: 'tuition | enrollment | fee']
  base_amount decimal
  created_at timestamp
  updated_at timestamp
}

Table contracts {
  id integer [primary key, increment]
  student_id integer [not null]
  billing_plan_id integer [not null]
  negotiated_amount decimal
  due_day integer [note: '1–28']
  starts_on date
  ends_on date
  status varchar [note: 'active | suspended | ended']
  created_at timestamp
  updated_at timestamp
}

Table charges {
  id integer [primary key, increment]
  contract_id integer [not null]
  guardian_id integer [not null, note: 'Financially responsible guardian for this charge']
  billing_period varchar [note: 'E.g. 2026-08']
  original_amount decimal
  discount_amount decimal
  late_fee_amount decimal
  total_amount decimal
  due_date date
  status varchar [note: 'pending | paid | overdue | cancelled']
  created_at timestamp
  updated_at timestamp
}

Table applied_discounts {
  id integer [primary key, increment]
  charge_id integer [not null]
  discount_type varchar
  amount decimal
  created_at timestamp
}

Table payments {
  id integer [primary key, increment]
  charge_id integer [not null]
  paid_amount decimal
  payment_method varchar [note: 'boleto | pix | card']
  psp_transaction_id varchar
  paid_at timestamp
  status varchar
  created_at timestamp
  updated_at timestamp
}

Table webhook_events {
  id integer [primary key, increment]
  event_type varchar
  payload text
  processed_at timestamp
  created_at timestamp
}

// --- Documents (MVP: enrollment/KYC docs — not full digital archive) ---

Table documents {
  id integer [primary key, increment]
  school_id integer [not null, note: 'Per-school isolation — required even for polymorphic parent']
  documentable_type varchar [note: 'School | Guardian | Student — Teacher deferred to academic phase']
  documentable_id integer [not null]
  document_type varchar
  status varchar [note: 'pending | approved | rejected']
  rejection_reason varchar
  uploaded_by_id integer
  reviewed_at timestamp
  created_at timestamp
  updated_at timestamp
}

// --- Relationships ---

Ref: schools.school_group_id > school_groups.id

Ref: memberships.user_id > users.id
Ref: memberships.school_id > schools.id
Ref: refresh_tokens.user_id > users.id

Ref: guardians.school_id > schools.id
Ref: guardians.user_id > users.id
Ref: students.school_id > schools.id
Ref: teachers.school_id > schools.id
Ref: teachers.user_id > users.id
Ref: billing_plans.school_id > schools.id

Ref: student_guardians.guardian_id > guardians.id
Ref: student_guardians.student_id > students.id

Ref: contracts.student_id > students.id
Ref: contracts.billing_plan_id > billing_plans.id

Ref: charges.contract_id > contracts.id
Ref: charges.guardian_id > guardians.id

Ref: applied_discounts.charge_id > charges.id
Ref: payments.charge_id > charges.id

Ref: documents.school_id > schools.id
Ref: documents.uploaded_by_id > users.id

// --- Sample data ---

Records school_groups(id, name) {
  0, 'Example School'
}

Records schools(id, school_group_id, name) {
  0, 0, 'Example School — Downtown Unit'
  1, 0, 'Example School — South Unit'
}

Records users(id, email, encrypted_password) {
  0, 'admin@example-school.local', '$2a$...'
  1, 'maria.silva@example.com', '$2a$...'
}

Records memberships(id, user_id, school_id, role, status) {
  0, 0, 0, 'school', 'active'
  1, 1, 0, 'guardian', 'active'
}

Records guardians(id, school_id, user_id, name, cpf) {
  0, 0, 1, 'Maria Silva', '000.000.000-00'
}

Records students(id, school_id, name, status) {
  0, 0, 'Pedro Silva', 'active'
  1, 1, 'Ana Silva', 'active'
}
```