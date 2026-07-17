# PRD-001 - User Registration

## Objective

Allow the registration of platform users.

---

## Context

The system already has JWT authentication.

Every user belongs to exactly one company.

The company always exists before the user.

---

## Business Rules

RN-001

The email must be unique.

RN-002

The name must be between 3 and 120 characters.

RN-003

The password must be at least 8 characters.

RN-004

The password must never be returned by the API.

RN-005

The user starts active.

---

## Use Cases

### Create user

Input

- name
- email
- password

Flow

1. Validate data.
2. Check for a duplicate email.
3. Encrypt the password.
4. Save the user.
5. Return the created user.

---

## API

### POST /users

Request

{
"name": "João",
"email": "joao@email.com",
"password": "12345678"
}

Response 201

{
"id": "...",
"name": "...",
"email": "...",
"createdAt": "..."
}

---

## Errors

400

Invalid data.

409

Email already registered.

500

Internal error.

---

## Database

Table

users

Fields

id UUID

company_id UUID

name varchar(120)

email varchar(255)

password_hash text

created_at

updated_at

---

## Events

After creating a user:

UserCreated

Payload

{
id,
companyId
}

---

## Permissions

Only ADMIN can create users.

---

## Acceptance Criteria

- A duplicate email returns 409.
- The password is never returned.
- The password is stored using bcrypt.
- The user starts active.

---

## Out of Scope

Password reset.

Login.

Email confirmation.
