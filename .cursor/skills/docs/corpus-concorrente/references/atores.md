# Normalização de atores

Mapeia o vocabulário de cargo/persona do concorrente para os atores canônicos do
School Lab (`docs/actors-and-surfaces.md`). O termo original do concorrente permanece
no glossário; o catálogo comparativo usa sempre o ator normalizado.

## Atores canônicos (School Lab)

| ID | Descrição | Role templates (staff) |
|----|-----------|------------------------|
| `backoffice` | Operação da plataforma DLA | — |
| `staff` | Administração escolar (genérico) | director, secretary, coordinator, financial |
| `teacher` | Professor / docente | — |
| `guardian` | Responsável / família | — |
| `student` | Aluno (self-service no portal/app) | — |

## Mapeamento concorrente → canônico

Padrões case-insensitive. Primeira correspondência vence; `staff` é fallback.

| Padrão no corpus | Ator canônico | Template staff (quando aplicável) |
|------------------|---------------|-----------------------------------|
| secretaria, secretário, secretária | `staff` | `secretary` |
| coordenação, coordenador, coordenadora | `staff` | `coordinator` |
| direção, diretor, diretora | `staff` | `director` |
| financeiro, tesouraria, caixa | `staff` | `financial` |
| administrador, admin, colaborador, funcionário | `staff` | — |
| professor, docente, equipe escolar | `teacher` | — |
| responsável, família, pai, mãe, tutor | `guardian` | — |
| aluno, estudante | `student` | — |
| suporte plataforma, backoffice | `backoffice` | — |

## Múltiplos atores

Quando um artigo menciona mais de um ator (ex.: "coordenação reabre etapa para
professor lançar nota"):

1. Liste todos os atores envolvidos em `actors[]` na capability.
2. Marque `primary_actor` como quem executa a ação principal.
3. Atores secundários entram como pré-requisito ou transição, não como donos da capability.

## Surfaces (opcional)

Quando o artigo revela o canal:

| Termo no artigo | Surface |
|-----------------|---------|
| portal, web, sistema | `web` |
| app, aplicativo, Proesc Agenda, agenda | `app` |
| WhatsApp | `whatsapp` |
| email | `email` |

Surfaces são informativas no catálogo; o School Lab mapeia para `web` / `app` em
`actors-and-surfaces.md`.
