# Subindo o cadastro de pessoas para produção

Como levar o registro de **responsáveis, colaboradores e cargos** de uma lista vCard para o banco
de produção. É o mesmo caminho pelo qual esses dados entraram no ambiente local: os importadores
`guardians:import_vcard` e `collaborators:import_vcard`.

Não é um `pg_dump`. Um dump levaria junto os IDs e a linha da escola, colidindo com o que já
existe em produção, e arrastaria o colégio de demonstração do seed — estudantes, contratos e
cobranças fictícios. Os importadores casam por CPF, escrevem só o que a lista carrega e são
idempotentes: rodar de novo corrige, não duplica.

## Antes de começar

1. **Produção precisa estar migrada.** As colunas de endereço em `teachers` e a tabela
   `teacher_bank_accounts` são de agosto/2026 e o import de colaboradores falha sem elas.
2. **Descubra o `SCHOOL_ID` de produção.** Não presuma que é o mesmo do local.
3. Rode de um host que enxergue o banco — a VPN, o bastion ou o próprio servidor da aplicação.
   O container de desenvolvimento não tem rota para a rede privada do banco.

## Passos

```bash
# 1. Migrations pendentes
RAILS_ENV=production bin/rails db:migrate

# 2. Qual é a escola
RAILS_ENV=production bin/rails runner 'School.kept.each { |s| puts [s.id, s.name].inspect }'

# 3. Ensaio — não escreve nada, e lista o que entraria e o que ficaria incompleto
RAILS_ENV=production SCHOOL_ID=<id> VCARD=tmp/guardians.vcf DRY_RUN=1 \
  bin/rails guardians:import_vcard
RAILS_ENV=production SCHOOL_ID=<id> VCARD=tmp/collaborators.vcf DRY_RUN=1 \
  bin/rails collaborators:import_vcard

# 4. Valendo, se o ensaio bater com o esperado
RAILS_ENV=production SCHOOL_ID=<id> VCARD=tmp/guardians.vcf bin/rails guardians:import_vcard
RAILS_ENV=production SCHOOL_ID=<id> VCARD=tmp/collaborators.vcf bin/rails collaborators:import_vcard
```

Os cargos não têm import próprio: o de colaboradores cria os que faltam a partir do `TITLE` do
cartão e imprime quais criou, reaproveitando os que a escola já tem ("PROFESSOR" cai em
"Professor(a)").

## Lendo a saída

- `created` / `updated` — casados por CPF. `updated` num banco recém-migrado significa que a
  pessoa já estava lá.
- `failed` — não entrou. Hoje só acontece por CPF ausente.
- `incomplete` — **entrou**, com buracos nomeados por linha. É a lista de quem a secretaria ainda
  precisa perseguir, não um erro.

## O que os importadores não fazem

- Não vinculam responsável a estudante (`student_guardians`); a lista vCard não diz quem é de quem.
- Não trazem cidade nem UF: esses exports não carregam nenhuma das duas, e um endereço inventado
  aqui seria acreditado depois.
- Descartam e-mail malformado em vez de consertar — uma correção adivinhada manda a
  correspondência de alguém para um estranho. O descarte sai no relatório.
- Ignoram `TITLE` nos responsáveis: o cadastro não tem campo de profissão, e o campo vem cheio de
  códigos do sistema antigo.

## Os arquivos

Os `.vcf` ficam em `web/tmp/`, que é gitignored de propósito — são CPFs e endereços de pessoas
reais e não devem ser versionados. Leve-os para o host de produção por um canal privado e apague-os
de lá quando terminar.
