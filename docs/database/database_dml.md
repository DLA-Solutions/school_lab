```SQL
// Financial model - Fintech for Education (simplified)

Table school_groups {
  id integer [primary key, increment]
  name varchar [note: 'Network/holding - optional, only when there is more than one school']
  headquarters_cnpj varchar
  created_at timestamp
}

Table schools {
  id integer [primary key, increment]
  school_group_id integer [note: 'Nullable - only set when part of a network']
  name varchar [note: 'E.g. Example School - Downtown Unit']
  cnpj varchar
  address varchar
  saas_plan varchar
  created_at timestamp
}

Table guardians {
  id integer [primary key, increment]
  school_id integer [not null, note: 'Belongs to the school where the record originated']
  name varchar
  cpf varchar
  email varchar
  phone varchar
  created_at timestamp
}

Table students {
  id integer [primary key, increment]
  school_id integer [not null]
  name varchar
  birth_date date
  status varchar
  created_at timestamp
}

Table student_guardians {
  id integer [primary key, increment]
  guardian_id integer [not null]
  student_id integer [not null]
  financial_percentage decimal
  primary_guardian boolean
  created_at timestamp
}

Table billing_plans {
  id integer [primary key, increment]
  school_id integer [not null]
  name varchar
  plan_type varchar
  base_amount decimal
  created_at timestamp
}

Table contracts {
  id integer [primary key, increment]
  student_id integer [not null]
  billing_plan_id integer [not null]
  negotiated_amount decimal
  due_day integer
  starts_on date
  ends_on date
  status varchar
  created_at timestamp
}

Table charges {
  id integer [primary key, increment]
  contract_id integer [not null]
  guardian_id integer [not null]
  billing_period varchar [note: 'E.g. 2026-08']
  original_amount decimal
  discount_amount decimal
  late_fee_amount decimal
  total_amount decimal
  due_date date
  status varchar
  created_at timestamp
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
  payment_method varchar
  psp_transaction_id varchar
  paid_at timestamp
  status varchar
  created_at timestamp
}

Table webhook_events {
  id integer [primary key, increment]
  event_type varchar
  payload text
  processed_at timestamp
  created_at timestamp
}

Ref: schools.school_group_id > school_groups.id
Ref: guardians.school_id > schools.id
Ref: students.school_id > schools.id
Ref: billing_plans.school_id > schools.id

Ref: student_guardians.guardian_id > guardians.id
Ref: student_guardians.student_id > students.id

Ref: contracts.student_id > students.id
Ref: contracts.billing_plan_id > billing_plans.id

Ref: charges.contract_id > contracts.id
Ref: charges.guardian_id > guardians.id

Ref: applied_discounts.charge_id > charges.id
Ref: payments.charge_id > charges.id

Records school_groups(id, name) {
  0, 'Example School'
}

Records schools(id, school_group_id, name) {
  0, 0, 'Example School - Downtown Unit'
  1, 0, 'Example School - South Unit'
}

Records guardians(id, school_id, name, cpf) {
  0, 0, 'Maria Silva', '000.000.000-00'
}

Records students(id, school_id, name, status) {
  0, 0, 'Pedro Silva', 'active'
  1, 1, 'Ana Silva', 'active'
}
```