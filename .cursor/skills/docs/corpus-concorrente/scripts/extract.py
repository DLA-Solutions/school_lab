#!/usr/bin/env python3
"""
Semi-automated extraction from harvested .md articles → extracao.jsonl.

Reads judgment from title + body heuristics; human synthesis follows in docs/ref/.
"""

import argparse
import json
import os
import re
import sys

DOMAIN_PATTERNS = [
    ("comunicacao", r"mensag|comunic|canal|chat|conversa|aviso|notific|recado|mural|arquivo"),
    ("financeiro", r"pagament|cobran|boleto|financeir|pix|cart[aã]o|fatura|inadimpl|classpay|clippag|taxa|saque"),
    ("boletim", r"boletim|nota|avalia|conceito|recupera"),
    ("diario", r"di[aá]rio|rotina|ficha do beb|ocorr[eê]nc"),
    ("matricula", r"matr[ií]cula|rematr|contrato|capta|lead|inscri"),
    ("enrollment", r"importa|virada|ano letivo|cadastro de aluno|turma"),
    ("attendance", r"frequ[eê]n|falta|chamada|presen"),
    ("login", r"login|senha|2fa|acesso|convite|cadastro"),
]

ACTOR_PATTERNS = [
    ("administrator", r"administrador|secretaria|funcion[aá]rio|colaborador"),
    ("guardian", r"respons[aá]vel|fam[ií]lia|pai|m[aã]e"),
    ("teacher", r"professor|docente|equipe escolar"),
    ("student", r"aluno"),
]

PROBLEM_TITLE = re.compile(
    r"n[aã]o consigo|n[aã]o recebi|erro|problema|por que|n[aã]o aparece|falha|dificuldade|corrigir",
    re.I,
)
CALLOUT = re.compile(r"⚠|aten[cç][aã]o|importante|observa[cç][aã]o|cuidado|nota:", re.I)
SUPPORT = re.compile(r"entre em contato com o suporte|fale com o suporte|acionar o suporte", re.I)
VIDEO = re.compile(r"v[ií]deo|youtube|assistir", re.I)
STEP_LINE = re.compile(r"^\s*(\d+[\.\)]\s+|[-•]\s+)", re.M)


def parse_header(text):
    meta = {}
    for line in text.splitlines()[:6]:
        m = re.match(r"<!--\s*(\w+):\s*(.*?)\s*-->", line)
        if m:
            meta[m.group(1)] = m.group(2)
    return meta


def classify_domains(title, body):
    t = f"{title} {body[:2000]}".lower()
    found = []
    for dom, pat in DOMAIN_PATTERNS:
        if re.search(pat, t, re.I):
            found.append(dom)
    return found or ["other"]


def classify_actor(title, body):
    t = f"{title} {body}".lower()
    for actor, pat in ACTOR_PATTERNS:
        if re.search(pat, t, re.I):
            return actor
    return "administrator"


def count_steps(body):
    steps = len(STEP_LINE.findall(body))
    if steps:
        return min(steps, 25)
  # action verbs in procedural text
    actions = len(re.findall(r"\bclique\b|\bacesse\b|\bselecione\b|\binforme\b|\benvie\b", body, re.I))
    return min(max(actions // 2, 2), 20)


def extract_pitfalls(body):
    pitfalls = []
    for line in body.splitlines():
        if CALLOUT.search(line) or re.search(r"n[aã]o utilize|n[aã]o use|irrevers|n[aã]o [eé] poss[ií]vel", line, re.I):
            clean = re.sub(r"\s+", " ", line).strip()
            if 20 < len(clean) < 300:
                pitfalls.append(clean[:250])
    return pitfalls[:4]


def tipo_artigo(title, body):
    if PROBLEM_TITLE.search(title):
        return "resolucao_problema"
    if re.search(r"o que [eé]|conceito|entenda|vis[aã]o geral", title, re.I):
        return "conceitual"
    if re.search(r"configur", title, re.I):
        return "configuracao"
    return "como_fazer"


def task_from_title(title):
    t = title.lower()
    t = re.sub(r"^(como|o que [eé]|faq\s*[—-]\s*)", "", t).strip()
    return t[:120] or title[:120]


def extract_article(path, concorrente):
    with open(path, encoding="utf-8") as f:
        text = f.read()
    meta = parse_header(text)
    body = re.sub(r"^#.*\n", "", text.split("\n\n", 1)[-1] if "\n\n" in text else text)
    title_m = re.search(r"^# (.+)$", text, re.M)
    title = title_m.group(1) if title_m else os.path.basename(path)
    pitfalls = extract_pitfalls(body)
    prereq = []
    if re.search(r"antes de|pr[eé]-requisito|necess[aá]rio que|somente ap[oó]s", body, re.I):
        prereq.append("implicit prerequisite mentioned in article body")
    return {
        "fonte": meta.get("fonte", ""),
        "concorrente": concorrente,
        "titulo": title,
        "atualizado_em": meta.get("atualizado_em", ""),
        "dominio": classify_domains(title, body),
        "ator": classify_actor(title, body),
        "tarefa": task_from_title(title),
        "passos": count_steps(body),
        "pre_requisitos": prereq,
        "entidades": [],
        "campos": [],
        "estados": {},
        "transicoes": [],
        "vocabulario": {},
        "callouts": len(CALLOUT.findall(body)),
        "armadilhas": pitfalls,
        "recurso": "video" if VIDEO.search(body) else "manual",
        "tipo_artigo": tipo_artigo(title, body),
        "aciona_suporte": bool(SUPPORT.search(body)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("indice", help="path to indice.json")
    ap.add_argument("--out", required=True)
    ap.add_argument("--concorrente", required=True)
    ap.add_argument("--base", default=None, help="base dir for article paths")
    args = ap.parse_args()

    base = args.base or os.path.dirname(args.indice)
    with open(args.indice, encoding="utf-8") as f:
        indice = json.load(f)

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    n = 0
    with open(args.out, "w", encoding="utf-8") as out:
        for art in indice.get("artigos", []):
            rel = art.get("arquivo", "")
            path = os.path.join(base, rel) if not os.path.isabs(rel) else rel
            if not os.path.exists(path):
                continue
            rec = extract_article(path, args.concorrente)
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")
            n += 1
    print(f"{n} records → {args.out}")


if __name__ == "__main__":
    main()
