# Domain model — communication (ClassApp)

Harvest: 2026-08-14. Sources: ClassApp help center (see `docs/ref/classapp/README.md`).

## Core entities

### Profile (`perfil`)

Represents a person or role container (student, guardian, staff). Profiles link to
**accounts** (email/phone logins) and can belong to **channels** and **groups**.
([Contas](https://ajuda.classapp.com.br/hc/pt-br/articles/52854108543131))

States: active user, pending invite (invited but not registered).

### Channel (`canal`)

Two types observed: **simple** and **with attendance status** (ticket-like).
Channels scope who can message whom; admins configure type and visibility.
([tipos de canal](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### Conversation / message (`conversa` / `mensagem`)

Direct and channel messaging with read receipts, importance flag, labels/tags,
formatting, and search. Admins can view all school conversations.
([mensagens](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### Announcement (`comunicado`)

Broadcast messages distinct from threaded conversations; supports editing.
([editar comunicados](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### Moment (`momento`)

Photo/story-style sharing feature (social feed pattern).
([momentos](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### File share (`arquivos`)

School file repository with admin menu and external access controls.
([arquivos](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### Event (`evento` / `compromisso`)

Calendar events with create/edit/delete lifecycle.
([eventos](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

### Arrival module (`Cheguei`)

Staff-facing student pickup/arrival workflow (separate product area in help).
([Cheguei](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

## Access control

- **Accounts tab**: invite by email/phone, remove access, change contact, avoid duplicates.
- **Administrative permissions** granted per staff user.
- **2FA** for login (guardians and staff have separate FAQ tracks).
- **Mandatory cadastral update** campaign (CPF collection).
([FAQ cadastral](https://ajuda.classapp.com.br/hc/pt-br/articles/19673522008475))

## Integrations (communication-adjacent)

ERP sync updates student roster from Sponte, Gennera, ActiveSoft, internal view —
each integration path has its own article (high documentation surface = coupling pain).
