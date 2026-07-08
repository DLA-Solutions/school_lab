# PRD-001 - Cadastro de Usuários

## Objetivo

Permitir o cadastro de usuários da plataforma.

---

## Contexto

O sistema já possui autenticação JWT.

Todo usuário pertence exatamente a uma empresa.

A empresa sempre existe antes do usuário.

---

## Regras de Negócio

RN-001

O email deve ser único.

RN-002

O nome deve possuir entre 3 e 120 caracteres.

RN-003

A senha deve possuir no mínimo 8 caracteres.

RN-004

A senha nunca deve ser retornada pela API.

RN-005

O usuário inicia ativo.

---

## Casos de Uso

### Criar usuário

Entrada

- nome
- email
- senha

Fluxo

1. Validar dados.
2. Verificar email duplicado.
3. Criptografar senha.
4. Salvar usuário.
5. Retornar usuário criado.

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

## Erros

400

Dados inválidos.

409

Email já cadastrado.

500

Erro interno.

---

## Banco

Tabela

users

Campos

id UUID

company_id UUID

name varchar(120)

email varchar(255)

password_hash text

created_at

updated_at

---

## Eventos

Após criar usuário:

UserCreated

Payload

{
id,
companyId
}

---

## Permissões

Somente ADMIN pode criar usuários.

---

## Critérios de Aceitação

- Email duplicado retorna 409.
- Senha nunca retorna.
- Senha armazenada usando bcrypt.
- Usuário inicia ativo.

---

## Fora do Escopo

Reset de senha.

Login.

Confirmação por email.
