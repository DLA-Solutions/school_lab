#!/usr/bin/env python3
"""
Calcula o mapa de atrito a partir de um ou mais extracao.jsonl.

Agrega por tarefa (ou por domínio com --por dominio), pontua com os pesos
descritos em references/atrito.md e emite um markdown ordenado.

O score é ORDINAL: serve para ordenar fluxos dentro do mesmo corpus.
Não é porcentagem e não compara entre categorias de produto.

Uso:
  python atrito.py .corpus-raw/proesc/extracao.jsonl --out docs/ref/lacunas.md
  python atrito.py .corpus-raw/*/extracao.jsonl --por dominio
"""

import argparse
import json
import statistics
import sys
import time
from collections import defaultdict

PESOS = {
    "resolucao_problema": 3.0,
    "aciona_suporte": 2.5,
    "pre_requisitos": 2.0,
    "armadilhas": 2.0,
    "callouts": 1.5,
    "passos_acima_mediana": 1.5,
    "artigos": 1.0,
    "video": 1.0,
    "reescrito": 1.0,
}


def carregar(paths):
    regs = []
    for p in paths:
        with open(p, encoding="utf-8") as f:
            for n, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                try:
                    regs.append(json.loads(line))
                except json.JSONDecodeError as e:
                    print(f"! {p}:{n} json inválido — {e}", file=sys.stderr)
    return regs


def chave(r, por):
    if por == "dominio":
        d = r.get("dominio") or ["(sem domínio)"]
        return d[0] if isinstance(d, list) else d
    return r.get("tarefa") or r.get("titulo") or "(sem tarefa)"


def pontuar(regs, por):
    passos = [r.get("passos", 0) for r in regs if isinstance(r.get("passos"), int)]
    mediana = statistics.median(passos) if passos else 0

    grupos = defaultdict(list)
    for r in regs:
        grupos[chave(r, por)].append(r)

    linhas = []
    for k, g in grupos.items():
        n = len(g)
        c = {
            "artigos": n,
            "resolucao_problema": sum(1 for r in g if r.get("tipo_artigo") == "resolucao_problema"),
            "aciona_suporte": sum(1 for r in g if r.get("aciona_suporte")),
            "pre_requisitos": sum(len(r.get("pre_requisitos") or []) for r in g),
            "armadilhas": sum(len(r.get("armadilhas") or []) for r in g),
            "callouts": sum(r.get("callouts", 0) for r in g),
            "video": sum(1 for r in g if r.get("recurso") in ("video", "ambos")),
            "passos_acima_mediana": sum(
                1 for r in g if isinstance(r.get("passos"), int) and r["passos"] > mediana
            ),
            "reescrito": 0,  # requer histórico de versões; preencher se disponível
        }
        score = sum(PESOS[k2] * v for k2, v in c.items() if k2 in PESOS)
        passos_g = [r.get("passos", 0) for r in g if isinstance(r.get("passos"), int)]
        linhas.append(
            {
                "chave": k,
                "score": round(score, 1),
                "contagens": c,
                "passos_max": max(passos_g) if passos_g else 0,
                "concorrentes": sorted({r.get("concorrente", "?") for r in g}),
                "fontes": [r.get("fonte", "") for r in g if r.get("fonte")][:5],
                "armadilhas": [a for r in g for a in (r.get("armadilhas") or [])][:6],
            }
        )
    linhas.sort(key=lambda x: -x["score"])
    return linhas, mediana


def render(linhas, mediana, por, fontes_arquivos):
    L = []
    L.append("# Mapa de atrito\n")
    L.append(
        f"Gerado em {time.strftime('%Y-%m-%d')} a partir de: "
        f"{', '.join(fontes_arquivos)}. Agregado por **{por}**. "
        f"Mediana de passos no corpus: **{mediana:g}**.\n"
    )
    L.append(
        "> Score **ordinal**: ordena fluxos dentro deste corpus. Não é porcentagem, "
        "não compara entre produtos de categorias diferentes, e diferenças pequenas "
        "não significam nada. Hipótese ordenada, não veredito.\n"
    )
    L.append("| # | Fluxo | Score | Artigos | Conserto | Aciona suporte | Pré-req | Armadilhas | Avisos | Passos máx |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for i, l in enumerate(linhas, 1):
        c = l["contagens"]
        L.append(
            f"| {i} | {l['chave']} | **{l['score']}** | {c['artigos']} | "
            f"{c['resolucao_problema']} | {c['aciona_suporte']} | {c['pre_requisitos']} | "
            f"{c['armadilhas']} | {c['callouts']} | {l['passos_max']} |"
        )

    L.append("\n---\n")
    L.append("## Os cinco primeiros\n")
    L.append(
        "_Preencha à mão. O script ordena; ele não explica. Sem estas quatro respostas "
        "o mapa é estatística inútil._\n"
    )
    for i, l in enumerate(linhas[:5], 1):
        L.append(f"### {i}. {l['chave']}  \n`score {l['score']}` · {', '.join(l['concorrentes'])}\n")
        if l["armadilhas"]:
            L.append("Armadilhas já mapeadas:\n")
            for a in l["armadilhas"]:
                L.append(f"- {a}")
            L.append("")
        L.append("**Qual é a dor** (uma frase, do ponto de vista do usuário): \n")
        L.append("**Causa provável no modelo deles** (passo demais costuma ser entidade mal modelada): \n")
        L.append("**O que decidimos diferente** (concreto): \n")
        L.append("**O que isso custa** (quem perde flexibilidade — se não souber dizer, não entendeu o fluxo): \n")
        if l["fontes"]:
            L.append("Fontes:")
            for u in l["fontes"]:
                L.append(f"- {u}")
        L.append("")
    return "\n".join(L)


def main():
    ap = argparse.ArgumentParser(description="Mapa de atrito do corpus de concorrente.")
    ap.add_argument("entradas", nargs="+", help="um ou mais extracao.jsonl")
    ap.add_argument("--por", choices=["tarefa", "dominio"], default="tarefa")
    ap.add_argument("--out", default=None, help="arquivo de saída (padrão: stdout)")
    args = ap.parse_args()

    regs = carregar(args.entradas)
    if not regs:
        print("nenhum registro carregado", file=sys.stderr)
        sys.exit(1)

    linhas, mediana = pontuar(regs, args.por)
    md = render(linhas, mediana, args.por, args.entradas)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(md)
        print(f"{len(regs)} registros → {len(linhas)} fluxos → {args.out}")
        print("Agora faça a passada de julgamento nos cinco primeiros.")
    else:
        print(md)


if __name__ == "__main__":
    main()
