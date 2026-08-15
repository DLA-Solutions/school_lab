# Higiene da coleta

Análise de concorrente a partir de documentação pública é prática normal e legítima de produto. O que separa isso de problema real são limites concretos.

## O que está dentro

- Páginas públicas, acessíveis sem login, sem trial, sem burlar nada.
- Extrair **fatos e estrutura**: entidades, campos, estados, transições, contagem de passos, vocabulário, casos de borda mencionados.
- Reescrever tudo com suas palavras.
- Usar como referência para tomar decisões de produto próprias.

## O que fica fora

- **Conteúdo autenticado.** Base restrita a clientes, área logada, documento interno vazado. Se pede login, acabou.
- **Contornar controle de acesso**, inclusive CAPTCHA, rate limit agressivo ou paywall.
- **Reproduzir texto verbatim** em `docs/ref/` ou em qualquer artefato do produto.
- **Copiar tela.** Screenshot ajuda a entender fluxo; recriar a interface é outra coisa, e além do problema jurídico significa herdar defeito mapeado.
- **Reproduzir marca, ícone ou ilustração** do concorrente em qualquer material.
- **Dado pessoal.** Bases de ajuda às vezes têm print com nome de aluno, e-mail, CPF de exemplo real. Não guarde. Se aparecer, descarte o artigo ou anote o campo sem o valor.

## Termos de uso

Muitos help centers têm termo que restringe coleta automatizada. Antes de rodar o `harvest.py` contra um alvo novo, cheque `robots.txt` e, se houver, os termos do site. Se o termo proíbe scraping, avise o usuário e ofereça a alternativa: leitura manual, mesmo schema de extração, mais lenta e sem problema.

Essa decisão é do usuário, não sua — mas ele precisa saber que existe antes de decidir.

## Ritmo

Um artigo a cada 1–2 segundos, com `User-Agent` identificável. Você está lendo documentação como qualquer pessoa faria, só de forma organizada. Carga que derruba ou degrada o serviço de alguém é indefensável, independentemente do resto.

## Retenção

O bruto (`.corpus-raw/`) fica fora do controle de versão e é insumo temporário. Depois da extração, ele pode ser descartado — o que importa é o corpus derivado em `docs/ref/`, que é trabalho seu.

Se o repositório for aberto ou for parar na mão de cliente, revise `docs/ref/` antes: proveniência por URL é correta e transparente, mas o tom do `lacunas.md` costuma sair afiado demais para leitura externa. Documento interno é documento interno.

## Quando recusar

Se o pedido for para raspar área logada, copiar telas para reproduzir, ou extrair dado pessoal, recuse essa parte especificamente, explique o motivo em uma frase e siga com o que é possível. O trabalho legítimo aqui é grande — não há razão para embarcar na parte que não é.
