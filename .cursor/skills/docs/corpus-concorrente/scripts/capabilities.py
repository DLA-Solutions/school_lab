#!/usr/bin/env python3
"""
Derive capability inventory from extracao.jsonl and synthesize markdown artifacts.

Pipeline step after extract.py:
  1. capabilities.jsonl     — one or more capabilities per article
  2. coverage report          — completeness metrics
  3. funcionalidades-por-ator.md per domain (optional --synthesize)
  4. catalogo-funcionalidades.md merge (optional --catalog)

Usage:
  python capabilities.py .corpus-raw/proesc/extracao.jsonl --out .corpus-raw/proesc/capabilities.jsonl
  python capabilities.py .corpus-raw/proesc/extracao.jsonl --synthesize --ref-dir docs/ref/proesc
  python capabilities.py .corpus-raw/*/capabilities.jsonl --catalog --out docs/ref/catalogo-funcionalidades.md

Taxonomy (Phase 1 — reads docs/ref/catalogo-funcionalidades.md):
  python capabilities.py --export-raw jsonl --out docs/ref/raw-capabilities-export.jsonl
  python capabilities.py --cluster-suggestions --out docs/ref/cluster-suggestions.json
  python capabilities.py --sync-billing-aliases --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --sync-aliases --domain communication --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --sync-aliases --domain academic --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --sync-aliases --domain students --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --sync-aliases --domain identity --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --sync-aliases --domain platform --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --sync-aliases --domain documents --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --taxonomy-report
  python capabilities.py --generate-taxonomy-md --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --generate-parity-matrix --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --generate-capability-map --taxonomy docs/product/capability-taxonomy.yaml
  python capabilities.py --generate-mvp-scope --taxonomy docs/product/capability-taxonomy.yaml
"""

import argparse
import csv
import difflib
import json
import os
import re
import statistics
import sys
from collections import defaultdict

try:
    import yaml
except ImportError:
    yaml = None

# Extract-domain tags → canonical School Lab domain
DOMAIN_MAP = {
    "login": "identity-and-onboarding",
    "matricula": "students-and-enrollments",
    "enrollment": "students-and-enrollments",
    "boletim": "academic",
    "diario": "academic",
    "attendance": "academic",
    "financeiro": "billing",
    "comunicacao": "communication",
    "other": "platform-and-admin",
}

DOMAIN_PATTERNS = [
    ("documents-and-archive", r"certificad|declara|documento|histórico escolar|arquivo digital|transcript"),
    ("integrations", r"integra|importa|sincroniz|API|ERP|webhook"),
    ("platform-and-admin", r"relatório|analytics|configura|ano letivo|unidade|RH|transporte"),
    ("identity-and-onboarding", r"login|senha|convite|perfil|LGPD|acesso|2fa"),
    ("students-and-enrollments", r"matr[ií]cula|rematr|contrato|capta|inscri|trilha"),
    ("academic", r"nota|boletim|di[aá]rio|frequ[eê]n|avalia|rotina|ocorr[eê]nc|aula"),
    ("billing", r"cobran|boleto|d[eé]bito|financeir|pix|inadimpl|caixa|NF"),
    ("communication", r"mensag|comunic|canal|chat|recado|mural|agenda|push"),
]

ACTOR_PATTERNS = [
    ("staff", "coordinator", r"coordena"),
    ("staff", "secretary", r"secret[aá]ri"),
    ("staff", "director", r"diretor|direç"),
    ("staff", "financial", r"financeir|tesourar|caixa"),
    ("teacher", None, r"professor|docente"),
    ("guardian", None, r"respons[aá]vel|fam[ií]lia|pai|m[aã]e"),
    ("student", None, r"\baluno\b|estudante"),
    ("backoffice", None, r"backoffice|plataforma"),
]

TASK_VERBS = [
    ("configure", r"configur"),
    ("create", r"cadastr|criar|incluir|adicionar|registrar"),
    ("update", r"alterar|editar|atualizar|modificar"),
    ("delete", r"excluir|remover|cancelar|deletar"),
    ("send", r"enviar|disparar|notificar"),
    ("import", r"importar|integrar|sincroniz"),
    ("export", r"exportar|gerar relatório|imprimir"),
    ("view", r"visualizar|consultar|acompanhar|monitorar|listar"),
    ("pay", r"pagar|quitar|baixar"),
    ("launch", r"lançar|inserir|registrar nota"),
    ("enroll", r"matricular|rematricular|inscrever"),
    ("sign", r"assinar|assinatura"),
    ("resolve", r"corrigir|resolver|erro|problema|não consigo"),
]

MATURITY_MAP = {
    "como_fazer": "documented",
    "conceitual": "conceptual",
    "configuracao": "configuration",
    "resolucao_problema": "troubleshooting",
}

DOMAIN_LABELS = {
    "identity-and-onboarding": "Identity & onboarding",
    "students-and-enrollments": "Students & enrollments",
    "academic": "Academic",
    "billing": "Billing",
    "communication": "Communication",
    "documents-and-archive": "Documents & archive",
    "integrations": "Integrations",
    "platform-and-admin": "Platform & admin",
}

ACTOR_LABELS = {
    "staff": "Staff",
    "teacher": "Teacher",
    "guardian": "Guardian",
    "student": "Student",
    "backoffice": "Backoffice",
}


def slugify(text, max_len=40):
    t = text.lower()
    t = unicodedata_normalize(t)
    t = re.sub(r"[^a-z0-9]+", "_", t)
    t = re.sub(r"_+", "_", t).strip("_")
    return t[:max_len] or "unknown"


def unicodedata_normalize(text):
    import unicodedata
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c))


def canonical_domain(record):
    tags = record.get("dominio", ["other"])
    domains = set()
    text = f"{record.get('titulo', '')} {record.get('tarefa', '')}".lower()
    for tag in tags:
        domains.add(DOMAIN_MAP.get(tag, "platform-and-admin"))
    for dom, pat in DOMAIN_PATTERNS:
        if re.search(pat, text, re.I):
            domains.add(dom)
    if len(domains) == 1:
        return domains.pop()
    # prefer most specific non-platform domain
    priority = [
        "billing", "communication", "academic", "students-and-enrollments",
        "documents-and-archive", "integrations", "identity-and-onboarding",
        "platform-and-admin",
    ]
    for d in priority:
        if d in domains:
            return d
    return "platform-and-admin"


def normalize_actor(record):
    text = f"{record.get('titulo', '')} {record.get('tarefa', '')} {record.get('ator', '')}".lower()
    actor = "staff"
    template = None
    for a, tmpl, pat in ACTOR_PATTERNS:
        if re.search(pat, text, re.I):
            actor = a
            template = tmpl
            break
    return actor, template


def verb_from_task(task):
    t = task.lower()
    for verb, pat in TASK_VERBS:
        if re.search(pat, t, re.I):
            return verb
    return "manage"


def capability_id_for(domain, task, tipo):
    verb = verb_from_task(task)
    if tipo == "resolucao_problema":
        verb = "resolve"
    noun = slugify(re.sub(r"^(como|o que é)\s+", "", task, flags=re.I), 30)
    return f"{domain}.{verb}_{noun}"


def label_from_task(task):
    t = task.strip()
    t = re.sub(r"^(como|o que é|faq\s*[-—]\s*)", "", t, flags=re.I).strip()
    return t[:80].title() if t else "Unnamed capability"


def friction_score(record):
    score = 0.0
    if record.get("tipo_artigo") == "resolucao_problema":
        score += 3.0
    if record.get("aciona_suporte"):
        score += 2.5
    score += min(len(record.get("pre_requisitos", [])) * 2.0, 4.0)
    score += min(len(record.get("armadilhas", [])) * 2.0, 6.0)
    score += min(record.get("callouts", 0) * 1.5, 4.5)
    score += min(max(record.get("passos", 0) - 5, 0) * 0.3, 3.0)
    return round(score, 1)


def derive_capability(record):
    domain = canonical_domain(record)
    actor, template = normalize_actor(record)
    task = record.get("tarefa", record.get("titulo", ""))
    tipo = record.get("tipo_artigo", "como_fazer")
    cap_id = capability_id_for(domain, task, tipo)
    templates = [template] if template else []
    pitfalls = record.get("armadilhas", [])
    desc = f"{label_from_task(task)}."
    if pitfalls:
        desc += f" Note: {pitfalls[0][:120]}."
    return {
        "capability_id": cap_id,
        "label": label_from_task(task),
        "competitor": record.get("concorrente", ""),
        "domain": domain,
        "actors": [actor],
        "staff_templates": templates,
        "primary_actor": actor,
        "surfaces": ["web"],
        "maturity": MATURITY_MAP.get(tipo, "documented"),
        "tipo": tipo,
        "description": desc,
        "preconditions": record.get("pre_requisitos", []),
        "source_urls": [record.get("fonte", "")] if record.get("fonte") else [],
        "source_titles": [record.get("titulo", "")],
        "friction_score": friction_score(record),
        "competitor_term": task[:60],
    }


def merge_capabilities(caps):
    """Merge capabilities with same competitor + capability_id."""
    merged = {}
    for cap in caps:
        key = (cap["competitor"], cap["capability_id"])
        if key not in merged:
            merged[key] = cap.copy()
            continue
        m = merged[key]
        m["source_urls"] = list(dict.fromkeys(m["source_urls"] + cap["source_urls"]))
        m["source_titles"] = list(dict.fromkeys(m["source_titles"] + cap["source_titles"]))
        m["friction_score"] = round(
            statistics.mean([m["friction_score"], cap["friction_score"]]), 1
        )
        for t in cap.get("staff_templates", []):
            if t and t not in m["staff_templates"]:
                m["staff_templates"].append(t)
    return list(merged.values())


def load_jsonl(path):
    records = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def write_jsonl(path, records):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")


def coverage_report(extracao_path, caps):
    extracao = load_jsonl(extracao_path)
    mapped_urls = set()
    for cap in caps:
        mapped_urls.update(cap.get("source_urls", []))
    total = len(extracao)
    mapped = sum(1 for e in extracao if e.get("fonte") in mapped_urls)
    by_domain = defaultdict(int)
    for cap in caps:
        by_domain[cap["domain"]] += 1
    return {
        "articles_total": total,
        "articles_mapped": mapped,
        "coverage_pct": round(100 * mapped / total, 1) if total else 0,
        "capabilities_unique": len(caps),
        "by_domain": dict(sorted(by_domain.items())),
    }


def actor_heading(actor, templates):
    label = ACTOR_LABELS.get(actor, actor)
    if actor == "staff" and templates:
        tmpl = ", ".join(templates)
        return f"## {label} ({tmpl})"
    return f"## {label}"


def synthesize_per_actor(caps, ref_dir, competitor):
    domain_dirs = {
        "academic": "gestao-academica",
        "billing": "gestao-financeira",
        "communication": "comunicacao",
        "students-and-enrollments": "gestao-academica",
        "identity-and-onboarding": "gestao-academica",
        "documents-and-archive": "gestao-academica",
        "integrations": "gestao-academica",
        "platform-and-admin": "gestao-academica",
    }

    # folder → domain → caps
    by_folder = defaultdict(lambda: defaultdict(list))
    for cap in caps:
        folder = domain_dirs.get(cap["domain"], "gestao-academica")
        by_folder[folder][cap["domain"]].append(cap)

    written = []
    for folder, domains in sorted(by_folder.items()):
        out_dir = os.path.join(ref_dir, folder)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, "funcionalidades-por-ator.md")
        total = sum(len(v) for v in domains.values())

        lines = [
            f"# Capabilities by actor — {folder.replace('-', ' ').title()} ({competitor.title()})",
            "",
            f"Harvest-derived inventory. **{total}** capabilities across "
            f"{len(domains)} School Lab domain(s).",
            "Maturity: documented help-center articles. "
            f"See [`../../README.md`](../../README.md).",
            "",
        ]

        for domain in sorted(domains.keys(), key=lambda d: list(DOMAIN_LABELS.keys()).index(d) if d in DOMAIN_LABELS else 99):
            domain_caps = domains[domain]
            lines.append(f"## Domain: {DOMAIN_LABELS.get(domain, domain)}")
            lines.append("")
            lines.append(f"_{len(domain_caps)} capabilities._")
            lines.append("")

            by_actor = defaultdict(list)
            for cap in sorted(domain_caps, key=lambda c: (c["primary_actor"], c["label"])):
                key = (cap["primary_actor"], tuple(cap.get("staff_templates", [])))
                by_actor[key].append(cap)

            for (actor, templates), actor_caps in sorted(by_actor.items()):
                lines.append(actor_heading(actor, list(templates)))
                lines.append("")
                for cap in actor_caps:
                    urls = cap.get("source_urls", [])
                    src = f" — [{cap['source_titles'][0][:50]}]({urls[0]})" if urls else ""
                    tmpl = ""
                    if cap.get("staff_templates"):
                        tmpl = f" `[{', '.join(cap['staff_templates'])}]`"
                    mat = cap.get("maturity", "documented")
                    friction = cap.get("friction_score", 0)
                    lines.append(
                        f"- **{cap['label']}** (`{cap['capability_id']}`){tmpl} "
                        f"— _{mat}_, friction {friction}{src}"
                    )
                    if cap.get("description"):
                        lines.append(f"  - {cap['description']}")
                    if cap.get("preconditions"):
                        lines.append(f"  - Preconditions: {'; '.join(cap['preconditions'][:3])}")
                lines.append("")

        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        written.append(out_path)
    return written


def synthesize_catalog(all_caps, out_path):
    by_id = defaultdict(list)
    for cap in all_caps:
        by_id[cap["capability_id"]].append(cap)

    by_domain = defaultdict(list)
    for cap_id, group in sorted(by_id.items()):
        domain = group[0]["domain"]
        by_domain[domain].append((cap_id, group))

    lines = [
        "# Functional capability catalog (cross-competitor)",
        "",
        "Deduplicated inventory of observed competitor capabilities, grouped by School Lab",
        "domain and actor. One entry per `capability_id`; competitor columns show presence.",
        "",
        "Generated from public help-center harvests. Anchor PRD acceptance criteria here",
        "when grounded in observed behavior.",
        "",
        "## Coverage",
        "",
    ]

    competitors = sorted({c["competitor"] for c in all_caps})
    lines.append(f"Competitors in catalog: **{', '.join(competitors)}**.")
    lines.append(f"Unique capabilities: **{len(by_id)}**.")
    lines.append("")

    for domain in sorted(by_domain.keys(), key=lambda d: list(DOMAIN_LABELS.keys()).index(d) if d in DOMAIN_LABELS else 99):
        entries = by_domain[domain]
        lines.append(f"## {DOMAIN_LABELS.get(domain, domain)}")
        lines.append("")

        by_actor_section = defaultdict(list)
        for cap_id, group in entries:
            actor = group[0].get("primary_actor", "staff")
            by_actor_section[actor].append((cap_id, group))

        for actor in ["staff", "teacher", "guardian", "student", "backoffice"]:
            if actor not in by_actor_section:
                continue
            lines.append(f"### {ACTOR_LABELS.get(actor, actor)}")
            lines.append("")
            for cap_id, group in sorted(by_actor_section[actor], key=lambda x: x[1][0]["label"]):
                label = group[0]["label"]
                desc = group[0].get("description", "")
                presence = []
                for comp in competitors:
                    has = any(c["competitor"] == comp for c in group)
                    maturities = [c["maturity"] for c in group if c["competitor"] == comp]
                    if has:
                        best = maturities[0] if maturities else "documented"
                        presence.append(f"{comp} ✓ ({best})")
                    else:
                        presence.append(f"{comp} —")
                avg_friction = round(
                    statistics.mean(c["friction_score"] for c in group), 1
                )
                lines.append(f"#### `{cap_id}` — {label}")
                lines.append("")
                if desc:
                    lines.append(desc)
                    lines.append("")
                lines.append(f"- **Competitors:** {' | '.join(presence)}")
                lines.append(f"- **Avg friction:** {avg_friction}")
                sources = []
                for c in group:
                    for url in c.get("source_urls", [])[:1]:
                        sources.append(f"[{c['competitor']}]({url})")
                if sources:
                    lines.append(f"- **Sources:** {', '.join(sources[:5])}")
                lines.append(f"- **School Lab decision:** _TBD — anchor in PRD_")
                lines.append("")

        lines.append("---")
        lines.append("")

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


CATALOG_SECTION_TO_DOMAIN = {
    "Identity & onboarding": "identity",
    "Students & enrollments": "students",
    "Academic": "academic",
    "Billing": "billing",
    "Communication": "communication",
    "Documents & archive": "documents",
    "Platform & admin": "platform",
    "Integrations": "integrations",
}

DOMAIN_SHORT_TO_CATALOG = {v: k for k, v in CATALOG_SECTION_TO_DOMAIN.items()}

PRIMARY_COMPETITORS = [
    ("proesc", "Proesc"),
    ("sponte", "Sponte"),
    ("agenda-edu", "Agenda Edu"),
    ("classapp", "ClassApp"),
]

MATURITY_TO_PRESENCE = {
    "documented": "documented",
    "configuration": "documented",
    "conceptual": "claimed",
    "troubleshooting": "noise",
}

PRESENCE_RANK = {"documented": 3, "claimed": 2, "noise": 1, "—": 0}

TAXONOMY_DOMAIN_LABELS = {
    "billing": "Billing",
    "communication": "Communication",
    "academic": "Academic",
    "students": "Students & enrollments",
    "identity": "Identity & onboarding",
    "documents": "Documents & archive",
    "platform": "Platform & admin",
    "integrations": "Integrations",
}

QUALITY_SIGNAL_PATTERNS = [
    r"^billing\.resolve_",
    r"^billing\.manage.*(?:problema|erro|n[aã]o_consigo|corrigir)",
    r"^communication\.resolve_",
    r"^communication\.manage.*(?:problema|erro|n[aã]o_consigo|corrigir)",
    r"^academic\.resolve_",
    r"^academic\.manage.*(?:cst_|hardlock|contrvend|gsen|pims|faq|checklist biblioteca|checklist_gestao|modulo_de_crm|eventos totvs|comunidade)",
    r"^students\.resolve_",
    r"^students\.manage.*(?:cst_|contrvend|gsen|modulo_de_transport|modulo_alimentacao|modulo_de_forum|almoxarifado|treinamento online|pegar_o_id|sigla_da_sua)",
    r"^identity\.resolve_",
    r"^platform-and-admin\.(?:manage|create|view).*cst_",
    r"^platform-and-admin\.manage.*(?:eventos totvs|cross segmentos|traducao automatica|traducao_automatica)",
    r"^identity\.manage.*(?:cache|cst_|gsen|central do cliente|biblioteca|recursos humanos|folha de ponto|instalar o aplicativo|limpar)",
    r"(?:o que [eé]|como funciona|faq|d[uú]vida frequente)",
    r"(?:time de integra|quais sistemas j[aá] temos integrado)",
    r"(?:passos para reduzir|conhe[cç]a nossas taxas)",
    r"(?:acessando m[uú]ltiplos perfis|confirmar minha conta)",
    r"(?:shop|loja virtual|agenda edu [eé] paga)",
    r"(?:atualiza[cç][aã]o \d|edi[cç][aã]o n[oº]?\s*\d)",
    r"cst\s*-",
    r"(?:esqueceu sua senha|quanto tempo leva para a integra)",
    r"(?:como entrar em contato com o suporte|novidades -)",
    r"(?:hardlock|protheus|license server|certid[aã]o de protesto)",
]

BILLING_MAP_RULES = [
    (r"protest", "billing.manage_protest", "boleto protest workflow"),
    (r"mensalidade garantida|garantida", "billing.manage_guaranteed_revenue", None),
    (r"assinatura|sign|clicksign|proesc sign|clipcoins", "billing.meter_digital_signatures", None),
    (r"nfs|nota fiscal|nf-e|nfse|nfse", "billing.issue_service_invoice", None),
    (r"desconto|antecip|promo[cç]", "billing.configure_early_payment_discount", None),
    (r"inadimpl|atraso|d[uú]vida|renegoci|busca ativa", "billing.view_delinquency_dashboard", None),
    (r"r[eé]gua|lembrete|notifica.*cobran|whatsapp.*boleto|whatsapp.*pag", "billing.build_dunning_workflow", None),
    (r"pix", "billing.accept_pix_payment", None),
    (r"cart[aã]o|recorr|d[eé]bito autom", "billing.manage_recurring_card", None),
    (r"remessa|integra.*boleto|boleto.*integr", "billing.integrate_boleto_bank", None),
    (r"reenvi|segunda via|reemit", "billing.resend_boleto", None),
    (r"boleto", "billing.issue_boleto", None),
    (r"link de pag|payment link", "billing.manage_payment_links", None),
    (r"pagar|quitar|checkout|portal.*pag", "billing.pay_online", None),
    (r"extrato|parcel|d[eé]bito|mensalidade|receb[ií]vel|cobran", "billing.issue_charge", None),
    (r"caixa|tesour|meu caixa|plano de contas|centro de custo|rateio|fgts|despesa", "billing.manage_cash_register", None),
    (r"concilia|extrato banc", "billing.reconcile_bank_statement", None),
    (r"estorno|cancel|estorn", "billing.cancel_charge", None),
    (r"negocia", "billing.negotiate_receivable", None),
    (r"relat|export|imprimir", "billing.export_financial_report", None),
    (r"import|erp|integra|sincron", "billing.import_erp_charges", None),
    (r"classpay|clippag|sponte pay|pagamentos digitais|superapp", "billing.view_classpay_dashboard", None),
    (r"onboard|kyc|ativar.*gateway|conta banc[aá]ria", "billing.onboard_payment_gateway", None),
    (r"trilha|matr[ií]cula online|plano.*contrato|capta", "billing.select_plan_on_enrollment", None),
    (r"bolsa|isenc|ajust", "billing.adjust_charge", None),
    (r"batch|lote|massa", "billing.process_batch_payment", None),
    (r"manual.*baixa|baixa manual|lan[cç]ar receb", "billing.record_manual_payment", None),
    (r"notifica|envio.*mensag|push.*finance", "billing.configure_billing_notifications", None),
    (r"unidade|multi.*unidade", "billing.manage_multi_unit_billing", None),
    (r"pj|respons[aá]vel financeiro|empresa", "billing.manage_corporate_payer", None),
    (r"tarifa|taxa", "billing.configure_payment_gateway", None),
    (r"configur|cadastr|criar|incluir|adicionar", "billing.manage_payment_plan", None),
    (r"visualiz|consultar|acompanh|listar|acessar", "billing.view_student_receivables", None),
]

COMMUNICATION_CROSS_DOMAIN_RULES = [
    (r"login|senha|2fa|biometria|esqueceu sua senha|acessar meu login|alterar minha senha|alterar sua senha", "identity.reset_password", "cross-domain: identity login"),
    (r"convite.*cadastro|n[aã]o recebi o convite|convidar", "identity.invite_user", "cross-domain: invite"),
    (r"di[aá]rio|agendar o envio do di[aá]rio|funcionalidade di[aá]rio", "academic.log_daily_routine", "cross-domain: daily routine"),
    (r"boletim|nota|avalia[cç][aã]o(?!.*csat)|disciplina|matriz|progress[aã]o de alunos|hist[oó]rico escolar", "academic.configure_evaluation_template", "cross-domain: academic"),
    (r"frequ[eê]n|ocorr[eê]nc|chamada|cheguei", "academic.record_attendance", "cross-domain: attendance"),
    (r"aula ao vivo|google meet|material.*aula(?!.*comunic)", "academic.schedule_lesson", "cross-domain: lessons"),
    (r"matr[ií]cula|contrato de matr|capta[cç][aã]o|campanha de matr|fase de matr|trilha", "students.enroll_student", "cross-domain: enrollment"),
    (r"assinatura eletr[oô]nica|assinar.*contrato|clipcoins", "documents.store_student_document", "cross-domain: signatures"),
    (r"boleto|integra[cç][aã]o de boleto|financeir|nota fiscal|adm fin", "billing.manage_financial_operations", "cross-domain: billing miscatalog"),
    (r"integra[cç][aã]o|erp|api para|sincron|import web|importa[cç][aã]o de planilha|cadastro de alunos\?", "integrations.sync_communication_overlay", "cross-domain: ERP sync"),
    (r"quais menus|perfil gestor|perfil auxiliar|almoxarifado|equipe escolar chegou", "platform.manage_staff_users", "cross-domain: platform menus"),
    (r"central de ajuda|acessar a agenda edu\?|^a agenda edu$|o que [eé] a agenda edu", "platform.self_serve_onboarding", "cross-domain: product onboarding FAQ"),
    (r"cadastrar alunos|cadastrar turmas|cadastrar respons[aá]veis|cadastrar unidades", "students.enroll_student", "cross-domain: student records"),
    (r"cadastrar.*biblioteca|m[ií]dias no m[oó]dulo de biblioteca|editoras no m[oó]dulo|autor no m[oó]dulo|obra no m[oó]dulo", "students.update_student_record", "cross-domain: library miscatalog"),
    (r"crm|leads|oportunidade|formul[aá]rios online no crm", "students.capture_prospect", "cross-domain: CRM capture"),
    (r"menu arquivos|arquivo ou editar uma pasta|adicionar um arquivo.*documentos", "documents.store_student_document", "cross-domain: document archive"),
    (r"assinaturas digitalizadas|modelo de contrato para assinatura", "documents.store_student_document", "cross-domain: document signatures"),
    (r"autentica[cç][aã]o de dois fatores|2fa no login", "identity.configure_multi_factor", "cross-domain: MFA"),
    (r"atualiza[cç][aã]o cadastral", "communication.update_guardian_profile", "cross-domain: cadastral update campaign"),
    (r"a caminho|cheguei", "academic.record_attendance", "cross-domain: arrival check-in"),
    (r"comentar nas atividades", "communication.manage_social_reactions", "cross-domain: activity comments"),
    (r"permiss[oõ]es administrativas|conceder permiss", "identity.manage_roles", "cross-domain: admin permissions"),
    (r"perfil de usu[aá]rio|personalizar um novo perfil", "communication.manage_user_profiles", "cross-domain: user profile"),
    (r"grupos espec[ií]ficos.*funcion[aá]rios|criar grupos.*funcion", "communication.manage_communication_groups", "cross-domain: staff groups"),
    (r"baixar imagens|baixar.*classapp.*celular", "communication.manage_photo_album", "cross-domain: download media"),
    (r"link em uma atividad|adicionar link em uma atividad", "communication.publish_calendar_event", "cross-domain: activity links"),
    (r"cadastrar equipe|recursos humanos|servidores no ambiente|estoque|card[aá]pio|medicamento|simulado|checklist de fim", "communication.quality_signal_support", "cross-domain: ERP admin miscatalog"),
    (r"atualizar o app|atualizar o aplicativo|baixar o aplicativo|baixar aplicativo|baixar os aplicativos", "communication.quality_signal_support", "cross-domain: app install/update FAQ"),
    (r"administrar a entrega de material escolar|agendar uma atividade no ambiente de crm", "communication.quality_signal_support", "cross-domain: non-comms ERP article"),
    (r"privacidade e prote[cç][aã]o de dados", "identity.manage_consent", "cross-domain: LGPD privacy"),
    (r"personalizar o perfil da escola|logo e a capa|instala[cç][aã]o de logo", "communication.configure_communication_module", "cross-domain: school branding"),
    (r"transferir alunos|progress[aã]o manual|reabrir uma turma", "students.transfer_enrollment", "cross-domain: class transfers"),
    (r"transformar.*administrador|usu[aá]rio master", "identity.manage_roles", "cross-domain: admin roles"),
    (r"salvar e imprimir documentos|relat[oó]rios", "documents.search_archive", "cross-domain: document export"),
    (r"aula de recupera[cç][aã]o|aulas online|ensino h[ií]brido", "academic.schedule_lesson", "cross-domain: hybrid lessons"),
    (r"personalizar a rotina escolar", "academic.log_daily_routine", "cross-domain: routine customization"),
    (r"uma api e como posso|documenta[cç][aã]o para entender", "integrations.manage_webhooks", "cross-domain: API docs"),
    (r"m[oó]dulo sa[uú]de|status das ofertas|espa[cç]o o classapp ocupa|suporte - sophia|captura.*print", "communication.quality_signal_support", "cross-domain: misc FAQ"),
]

COMMUNICATION_MAP_RULES = [
    (r"\blia\b|duda|assistente virtual|chatbot|ia generativa", "communication.defer_ai_assistant", None),
    (r"modelo de mensag|modelo.*whatsapp", "communication.manage_message_templates", None),
    (r"whatsapp", "communication.send_whatsapp_notification", None),
    (r"csat|satisfa[cç][aã]o.*canal|avalia[cç][aã]o.*atendimento", "communication.collect_channel_csat", None),
    (r"canal de atendimento|canal interno|filtros.*canal|remover.*canal|canal de mensag|criar um canal", "communication.manage_service_channel", None),
    (r"ticket de atendimento|abrir um ticket|criar.*ticket|criar e acompanhar um ticket", "communication.open_support_ticket", None),
    (r"acompanhar conversas|tempo real.*mensag|caixa de entrada", "communication.track_service_inbox", None),
    (r"central de notifica|pol[ií]tica.*notifica|configur.*push|ativar a central de notifica", "communication.configure_push_policy", None),
    (r"apagar.*notifica|limpar.*notifica|notifica[cç][oõ]es\?", "communication.manage_notification_inbox", None),
    (r"envio.*email|email.*notifica", "communication.send_email_notification", None),
    (r"agendar o envio de mensag|mensag.*agendad", "communication.schedule_message_delivery", None),
    (r"anexo.*mensag|m[uú]ltiplos arquivos.*mensag|enviar anexo", "communication.attach_files_to_message", None),
    (r"hist[oó]rico de edi[cç][aã]o|editar mensag", "communication.edit_message_content", None),
    (r"arquivar mensag|marcar.*lida|n[aã]o lida|apagar mensag", "communication.manage_message_inbox", None),
    (r"grupo.*mensag|mensag.*grupo|conversas:", "communication.send_group_message", None),
    (r"recado|mensagem direta|\bchat\b|conversa", "communication.send_direct_message", None),
    (r"comunicado individual|comunicados individuais", "communication.send_individual_announcement", None),
    (r"enquete|vota[cç][aã]o.*comunicado", "communication.send_poll_survey", None),
    (r"categor.*comunicado", "communication.manage_announcement_categories", None),
    (r"modelo.*comunicado|duplicar.*comunicado|criar modelos de comunicado", "communication.manage_announcement_templates", None),
    (r"aprovar.*comunicado|aprovar atividades|aprovar um evento", "communication.approve_pending_communication", None),
    (r"comunicado|comunicados|an[uú]ncio", "communication.send_mass_announcement", None),
    (r"campanha(?! de matr)", "communication.send_mass_announcement", None),
    (r"mural de foto|[aá]lbum|baixar.*foto|recuperar.*[aá]lbum|excluir.*[aá]lbum", "communication.manage_photo_album", None),
    (r"foto|momentos|mural", "communication.share_photo_update", None),
    (r"videochamada|meet|aula ao vivo|v[ií]deo chamada|links de videochamada", "communication.embed_video_call", None),
    (r"v[ií]deo", "communication.share_video_content", None),
    (r"material.*apoio|materiais de apoio|materiais de apoio", "communication.distribute_learning_materials", None),
    (r"meu cpf|adicionar.*cpf", "communication.collect_guardian_cpf", None),
    (r"emerg[eê]ncia|contato de emerg|alerta escolar", "communication.manage_emergency_contacts", None),
    (r"alternar.*aluno|dois alunos|agenda de dois alunos", "communication.switch_active_child", None),
    (r"atualizar.*cadastro|editar.*perfil|dados do respons|inserir foto no meu cadastro|cadastro via|cadastros manuais|duplicidade de cadastro", "communication.update_guardian_profile", None),
    (r"alternar entre.*perfis|perfis.*turmas e grupos|habilitar um perfil|multiplos perfis", "communication.manage_user_profiles", None),
    (r"engajamento.*evento|engajamento de um evento", "communication.track_event_engagement", None),
    (r"evento|compromisso|calend[aá]rio|atividade no calend|criar uma atividade", "communication.publish_calendar_event", None),
    (r"grupo, pessoas e canal|diferen[cç]a entre grupo", "communication.manage_communication_groups", None),
    (r"adicionar.*turma.*canal|usu[aá]rio.*canal de mensag|adicionar perfis", "communication.assign_recipients_to_channel", None),
    (r"turma.*grupo|grupos no classapp", "communication.manage_communication_groups", None),
    (r"remover.*funcion[aá]rio.*canal|permiss.*canal|acesso.*canal", "communication.manage_channel_permissions", None),
    (r"curtida|coment[aá]rio|reagir", "communication.manage_social_reactions", None),
    (r"engajamento|relat[oó]rio.*classapp|dicas de como engajar", "communication.view_communication_engagement", None),
    (r"entrega de ativid|acompanhar.*entrega", "communication.track_delivery_status", None),
    (r"escal|suporte humano|falar com.*consultor|reuni[aã]o com um consultor", "communication.escalate_to_human_support", None),
    (r"logo da institui|configur.*comunic|acesso r[aá]pido", "communication.configure_communication_module", None),
    (r"verificar o acesso.*colaborador|onboard|primeiros passos|chegou!", "communication.onboard_communication_users", None),
    (r"comunica[cç][aã]o em rede|rede.*comunic", "communication.manage_network_broadcast", None),
    (r"utilizar o ambiente de canais|ambiente de canais de comunica|canais do classapp|tempos de resposta nos canais", "communication.manage_service_channel", None),
    (r"silenciar um grupo|rascunho no classapp|utilizar a fun[cç][aã]o de rascunho", "communication.manage_message_inbox", None),
    (r"denunciar.*conte[uú]do|conte[uú]do impr[oó]prio", "communication.escalate_to_human_support", None),
    (r"formata[cç][aã]o no classapp|op[cç][oõ]es de formata", "communication.edit_message_content", None),
    (r"receber as atividades|acompanhamentos", "communication.track_delivery_status", None),
    (r"quem ainda n[aã]o se cadastrou|remover perfis antigos", "communication.onboard_communication_users", None),
    (r"acessos externos|compartilhar arquivos", "communication.attach_files_to_message", None),
    (r"novo recurso de arquivos|menu arquivos", "communication.attach_files_to_message", None),
    (r"mensag|notifica|enviar", "communication.send_direct_message", None),
    (r"atendimento|canal", "communication.manage_service_channel", None),
]

ACADEMIC_CROSS_DOMAIN_RULES = [
    (r"2fa|login|esqueceu|n[aã]o consigo entrar|logar no sistema", "identity.reset_password", "cross-domain: identity login"),
    (r"nota fiscal|adm fin|cnae|nfs|prefeitura de jundia", "billing.issue_service_invoice", "cross-domain: billing miscatalog"),
    (r"cst_|hardlock|licen[cç]a|contrvend|gsen|pims|unique constraint|diploma digital", "academic.quality_signal_support", "cross-domain: ERP vendor CST/misc"),
    (r"checklist biblioteca|patrim[oô]nio|remunera[cç][aã]o no rh|m[oó]dulo de crm|formul[aá]rios no classapp|identificar as legendar.*crm", "academic.quality_signal_support", "cross-domain: non-academic ERP module"),
    (r"contrato.*massa|enviar contratos|assinatura eletr[oô]nica para tra|personalizar assinaturas em rel", "documents.store_student_document", "cross-domain: contract signatures"),
    (r"atualizar.*dados cadastrais|por que.*importante adicionar.*cpf", "students.update_student_record", "cross-domain: student records"),
    (r"remanejar.*turma|transferir aluno de turma", "students.transfer_enrollment", "cross-domain: class transfer"),
    (r"transferir aluno entre unidade", "academic.configure_multi_school", "cross-domain: multi-unit transfer"),
    (r"totvs responde|eventos totvs|comunidade.*sugest[aã]o", "academic.quality_signal_support", "cross-domain: vendor marketing FAQ"),
    (r"portal do cliente|chamados|minhas solicita[cç][oõ]es", "communication.open_support_ticket", "cross-domain: support portal"),
    (r"enquete|modelos de enquetes", "communication.send_poll_survey", "cross-domain: polls"),
    (r"comentar nas atividades", "communication.manage_social_reactions", "cross-domain: activity comments"),
    (r"quais menus.*consulta pedag[oó]gico|perfil consulta pedag", "platform.manage_staff_users", "cross-domain: staff menus"),
    (r"proesc\.com pelo navegador|acessar o sistema proesc", "platform.self_serve_onboarding", "cross-domain: product access FAQ"),
    (r"sincroniza[cç][aã]o.*dados proesc|monitor de integra[cç][aã]o|layers", "integrations.import_academic_data", "cross-domain: DIV-academic-006 ERP sync"),
    (r"matr[ií]culas simplificadas|visualizar meu link.*matr[ií]cula online", "students.run_online_enrollment_trail", "cross-domain: online enrollment"),
    (r"cadastrar a disponibilidade de vagas", "students.run_online_enrollment_trail", "cross-domain: enrollment slots"),
    (r"emitir relat[oó]rio de alunos n[aã]o rematriculados", "academic.process_reenrollment", "cross-domain: re-enrollment report"),
]

ACADEMIC_MAP_RULES = [
    (r"cheguei|chegada|controle de acesso.*frequ|sincroni.*frequ|frequ[eê]ncia atrav[eé]s de sincron", "academic.record_attendance", None),
    (r"frequ[eê]ncia mensal|ambiente de frequ[eê]ncia|pol[ií]tica.*frequ|contagem.*falt", "academic.manage_attendance_policy", None),
    (r"justificar.*aus[eê]n|justificar.*falt|falta do", "academic.justify_absence", None),
    (r"imprimir frequ[eê]n|frequ[eê]ncia em branco", "academic.export_attendance", None),
    (r"lan[cç]ar frequ[eê]n|frequ[eê]ncia por aluno|notas e faltas pelo perfil|adicionar frequ[eê]ncia diretamente", "academic.record_attendance", None),
    (r"crit[eé]rio avaliat|crit[eé]rio personalizado|gerar avalia[cç][oõ]es obrigat|f[oó]rmula|consultar qual o crit[eé]rio", "academic.manage_grade_scale", None),
    (r"matriz|habilidades na matriz|subdisciplin|tipo de disciplina|adicionar disciplinas na matriz|criar um curso|novo ensino m[eé]dio", "academic.manage_curriculum_matrix", None),
    (r"recupera[cç][aã]o paralela|reavalia|depend[eê]ncia|registrar alunos em depend", "academic.manage_recovery_grades", None),
    (r"lan[cç]ar nota|notas em uma atividade|notas de reavalia|notas de recupera|lan[cç]ar notas|conselho de classe", "academic.enter_grades", None),
    (r"avaliar.*habilidade|avaliar.*atividade|ficha de habilidade|relat[oó]rio descritivo|relat[oó]rio avalia[cç][aã]o de habilidade|cadastrar o relat[oó]rio descritivo", "academic.enter_grades", None),
    (r"habilidades pendentes", "academic.view_academic_dashboard", None),
    (r"boletim personalizado|ocultar.*boletim|ocultar.*disciplina.*boletim|ocultar.*nota final|boletim online|disparo de boletim|o que preciso saber sobre o boletim", "academic.configure_report_card", None),
    (r"visualizar.*boletim|boletim por aluno|ver minhas notas|notas no portal|notas no aplicativo|acompanhar notas|acessar notas no portal", "academic.view_report_card", None),
    (r"emitir.*boletim|publicar.*boletim|gerar.*boletim", "academic.publish_report_card", None),
    (r"rotina escolar|personalizar a rotina|di[aá]rio de crian|ficha beb|agendar o envio do di[aá]rio", "academic.log_daily_routine", None),
    (r"enviar um di[aá]rio no aplicativo", "academic.deliver_diary_to_families", None),
    (r"devolver.*di[aá]rio|solicitar.*devolu[cç][aã]o|consultar di[aá]rios entregues|situa[cç][aã]o dos di[aá]rios|entregues e n[aã]o entreg", "academic.manage_teacher_diary", None),
    (r"utilizar o proesc di[aá]rio|relat[oó]rios dos di[aá]rios|imprimir os di[aá]rios|duplicar aulas nos di[aá]rios|adicionar avalia[cç][oõ]es nos di[aá]rios", "academic.manage_teacher_diary", None),
    (r"conte[uú]do cadastrado por disciplina|inserir conte[uú]do nas minhas aul|copiar.*conte[uú]dos de aulas|importar conte[uú]dos", "academic.log_lesson_content", None),
    (r"criar aulas individuais|criar aulas em lote|aulas no di[aá]rio|editar uma atividade|mover atividades|desvincular.*atividade.*avalia", "academic.manage_class_diary", None),
    (r"aula ao vivo|google meet|meet.*grava|e-class|aulas online|ensino h[ií]brido|acessar aulas ao vivo", "academic.manage_live_lesson", None),
    (r"reposi[cç][aã]o de aulas|realizar a reposi[cç][aã]o|criar aula ao vivo", "academic.manage_lesson_lifecycle", None),
    (r"acessar.*aulas.*proesc aluno|conte[uú]do e anexos da aula", "academic.view_report_card", None),
    (r"ocorr[eê]ncia|criar ocorr|tipos de ocorr", "academic.record_incidents", None),
    (r"emitir.*hist[oó]rico|hist[oó]rico escolar|comandos avan[cç]ados do hist[oó]rico", "academic.issue_transcript", None),
    (r"cadastrar disciplina no hist[oó]rico|editar.*hist[oó]rico|carga hor[aá]ria do hist[oó]rico|editar a frequ[eê]ncia no hist[oó]rico", "academic.manage_transcript_record", None),
    (r"vincular professor|desvincular professor|professor.*disciplina|professores as disciplinas|professor em disciplinas", "academic.assign_teacher_to_subject", None),
    (r"fechamento de per[ií]odo|finaliza[cç][aã]o do per[ií]odo|plant[aã]o pedag[oó]gico|atua[cç][aã]o docente.*finaliza", "academic.manage_period_closure", None),
    (r"coordenador tem acesso|relat[oó]rio de atividades|acompanhar.*atividades criadas|consulta pedag[oó]gico|di[aá]rios por professor|visualizar.*di[aá]rios", "academic.view_academic_dashboard", None),
    (r"relat[oó]rio de transfer|relat[oó]rio de anivers|rela[cç][aã]o geral de alunos|rela[cç][aã]o de alunos por turma|personalizar a rela[cç][aã]o", "academic.view_academic_dashboard", None),
    (r"check-list.*coordenador|usabilidade.*coordenador", "academic.view_academic_dashboard", None),
    (r"acompanhar e responder atividades|satisfa[cç][aã]o do professor na atividade|selecionar destinat[aá]rios.*atividade", "academic.view_academic_dashboard", None),
    (r"rematr|n[aã]o rematriculados|pr[eé] matricula|pr[eé]-matricula|faq pr[eé] matricula|faq.*volta [àa]s aulas", "academic.process_reenrollment", None),
    (r"empresa no contrato|pj respons|conveniada|inclus[aã]o de cnpj", "academic.view_corporate_guardian_students", None),
    (r"faq|perguntas frequentes|central de ajuda|help center", "academic.search_help_center", None),
    (r"avalia[cç][aã]o(?!.*csat)|modelo.*avalia", "academic.configure_evaluation_template", None),
    (r"m[oó]dulo aee|atendimento educacional especializado", "academic.manage_special_education", None),
    (r"eventos no calend[aá]rio da entidade|criar.*eventos no calend", "academic.schedule_lesson", None),
    (r"integra|sincroniz|import web|erp", "academic.sync_academic_with_erp", None),
    (r"visualiz|consultar|acompanhar|listar|acessar", "academic.view_academic_dashboard", None),
    (r"cadastr|criar|incluir|adicionar|registrar|lan[cç]ar", "academic.manage_academic_operations", None),
    (r"configur|personalizar|gerenciar|emitir|export|imprimir", "academic.manage_academic_operations", None),
]

STUDENTS_CROSS_DOMAIN_RULES = [
    (r"cst_|contrvend|gsen|central do cliente totvs|hardlock", "students.quality_signal_support", "cross-domain: ERP vendor CST"),
    (r"transporte|rotas\?|fornecedores no m[oó]dulo de transporte|contrato de transporte", "students.quality_signal_support", "cross-domain: transport module miscatalog"),
    (r"alimenta[cç][aã]o escolar|card[aá]pio|alimentos\?|lista de compras|pratos no m[oó]dulo", "students.quality_signal_support", "cross-domain: school meals module"),
    (r"almoxarifado|patrim[oô]nio|estoque|fornecedores\b|localiza[cç][aã]o do produto", "students.quality_signal_support", "cross-domain: inventory miscatalog"),
    (r"recursos humanos|funcion[aá]rios no m[oó]dulo|f[oó]rum\b|treinamento online|pegar o id da minha escola|sigla da sua institui", "students.quality_signal_support", "cross-domain: platform/HR FAQ miscatalog"),
    (r"favoritando relat[oó]rios|relat[oó]rios relativos ao ano exerc[ií]cio|criei um relat[oó]rio para todas as turmas", "students.quality_signal_support", "cross-domain: reporting FAQ"),
    (r"hist[oó]rico escolar|declara[cç][aã]o escolar|carga hor[aá]ria de hist[oó]rico|estabelecimentos no hist[oó]rico", "academic.issue_transcript", "cross-domain: transcript"),
    (r"declara[cç][aã]o de quita[cç][aã]o|imposto de renda|bolsa fam[ií]lia", "billing.export_financial_report", "cross-domain: tax/benefit documents"),
    (r"simulado|habilidades|área de conhecimento|sincronizar habilidades|editar o per[ií]odo das habilidades", "academic.manage_curriculum_matrix", "cross-domain: curriculum"),
    (r"dispensa de disciplinas", "academic.manage_curriculum_matrix", "cross-domain: subject waiver"),
    (r"desvincular.*professor|professor de uma disciplina", "academic.assign_teacher_to_subject", "cross-domain: teacher assignment"),
    (r"salas virtuais|aula ao vivo|google meet", "academic.manage_live_lesson", "cross-domain: live lessons"),
    (r"enquete", "communication.send_poll_survey", "cross-domain: polls"),
    (r"convite para a equipe|login com nome de usu[aá]rio", "identity.invite_user", "cross-domain: staff/student invite"),
    (r"altera[cç][aã]o do contato cadastrado|alterar e-mail da unidade", "communication.update_guardian_profile", "cross-domain: contact update"),
    (r"empresa no contrato|pj respons|conveniada|modalidade corporativa|cnpj no contrato", "academic.view_corporate_guardian_students", "cross-domain: corporate partner"),
    (r"empr[eé]stimos|devolu[cç][aã]o e relat[oó]rio", "students.quality_signal_support", "cross-domain: library loans miscatalog"),
    (r"requerimentos", "documents.store_student_document", "cross-domain: formal requests"),
    (r"nota fiscal|financeir", "billing.manage_financial_operations", "cross-domain: billing miscatalog"),
    (r"integra|sincroniz|erp|api", "integrations.import_academic_data", "cross-domain: ERP sync"),
]

STUDENTS_MAP_RULES = [
    (r"importador|em massa atrav[eé]s|adicionar alunos em massa", "students.import_students_bulk", None),
    (r"criar turmas multisseriadas|multisseriadas", "students.manage_class_structure", None),
    (r"criar turmas|editar turmas|capacidade m[aá]xima|turno de uma turma|turnos e hor[aá]rios|disciplinas em uma turma", "students.manage_class_structure", None),
    (r"arquivar.*vaga|desarquivar.*vaga|disponibilidade de vagas", "students.manage_enrollment_slots", None),
    (r"cancelar.*inscri|cancelar.*pr[eé].matr", "students.cancel_enrollment", None),
    (r"assinar.*contrato|assinatura eletr[oô]nica.*matr|assinaturas em relat", "students.sign_enrollment_contract", None),
    (r"contrato de matr|contratos assinados|tipos de documentos para.*matr|modelo de contrato", "students.manage_enrollment_contract", None),
    (r"campanhas de matr[ií]cula|filtrar e ordenar campanhas", "students.manage_enrollment_campaign", None),
    (r"crm|oportunidade|capta[cç][aã]o|gr[aá]ficos do m[oó]dulo crm|relat[oó]rios de oportunidade", "students.capture_prospect", None),
    (r"matr[ií]culas simplificadas|matr[ií]cula online|trilha|pr[eé].matr[ií]cula on.line|link.*matr[ií]cula", "students.run_online_enrollment_trail", None),
    (r"unifica[cç][aã]o de pessoas|hom[oô]nimos", "students.unify_person_records", None),
    (r"convite para alunos|convite.*aluno", "students.invite_student_access", None),
    (r"carteirinha.*aluno|acessar e visualizar a carteirinha", "students.view_student_portal", None),
    (r"registro do aluno|\bra\b", "students.update_student_record", None),
    (r"editar grupos de um cadastro|grupos de um cadastro", "students.manage_guardian_link", None),
    (r"transferir alunos|remanejar|progress[aã]o manual|reabrir uma turma", "students.transfer_enrollment", None),
    (r"matricular|matr[ií]cula|inscri[cç][aã]o|registro de matr[ií]cula|anexar documentos de matr|observa[cç][aã]o na matr|excluir uma matr|indeferir.*inscri|alterar em lote.*matr|situa[cç][aã]o das matr", "students.enroll_student", None),
    (r"cadastrar alunos|cadastrar respons[aá]veis|cadastrar turmas|cadastrar unidades", "students.enroll_student", None),
    (r"cart[eõ]es de simulado|carteirinha estudantil|imprimir carteirinha", "students.export_enrollment_reports", None),
    (r"relat[oó]rio.*alunos|rela[cç][aã]o.*alunos", "students.export_enrollment_reports", None),
    (r"atualizar.*cadastro|dados cadastrais|editar.*aluno", "students.update_student_record", None),
    (r"atribuir|vincular.*turma|turma do aluno", "students.assign_class", None),
    (r"respons[aá]vel|guardian|fam[ií]lia", "students.manage_guardian_link", None),
    (r"faq|perguntas frequentes|como funciona o m[oó]dulo|utilizar o m[oó]dulo", "students.quality_signal_support", None),
    (r"visualiz|consultar|acompanhar|listar|acessar", "students.export_enrollment_reports", None),
    (r"cadastr|criar|incluir|adicionar|registrar", "students.enroll_student", None),
    (r"configur|personalizar|gerenciar|emitir|export|imprimir", "students.manage_enrollment_operations", None),
]

IDENTITY_CROSS_DOMAIN_RULES = [
    (r"cst_|gsen|central do cliente totvs|hardlock|contrvend", "identity.quality_signal_support", "cross-domain: ERP vendor CST"),
    (r"biblioteca|empr[eé]stimo|tombo|exemplares|obras bibliotec", "identity.quality_signal_support", "cross-domain: library module miscatalog"),
    (r"recursos humanos|lota[cç][aã]o|cargos no ambiente|tipos de licen|forma[cç][oõ]es acad|folha de ponto", "identity.quality_signal_support", "cross-domain: HR module miscatalog"),
    (r"cadastrar feriados", "platform.configure_school_year", "cross-domain: school calendar"),
    (r"oportunidade no crm|editar uma oportunidade", "students.capture_prospect", "cross-domain: CRM capture"),
    (r"hom[oô]nimos|cadastro de pessoas.*hom", "students.unify_person_records", "cross-domain: duplicate persons"),
    (r"n[aã]o consigo adicionar.*cpf|adicionar meu cpf", "communication.collect_guardian_cpf", "cross-domain: DIV-communication-004 progressive profiling"),
    (r"portal do cliente|gerenciar solicita", "communication.open_support_ticket", "cross-domain: vendor support portal"),
    (r"cheguei|pais e respons", "academic.record_attendance", "cross-domain: arrival check-in"),
    (r"portal do aluno|acessar o portal do aluno", "students.view_student_portal", "cross-domain: student portal access"),
    (r"contratar m[oó]dulos extra", "platform.self_serve_onboarding", "cross-domain: module upsell FAQ"),
    (r"limpar.*cache|instalar o aplicativo", "identity.quality_signal_support", "cross-domain: client troubleshooting FAQ"),
    (r"quais menus.*nutricionista|menus o nutricionista", "platform.manage_staff_users", "cross-domain: role menu reference"),
]

DOCUMENTS_MAP_RULES = [
    (r"secret[aá]ri|gestor|diretor.*documento|dados de secret|exibir automaticamente", "documents.configure_document_signatories", None),
    (r"declara[cç][aã]o|certificad", "documents.issue_official_declaration", None),
    (r"contrato.*assin|assinatura.*contrato|assinar.*contrato", "documents.collect_contract_signatures", None),
    (r"transcript|hist[oó]rico escolar", "documents.issue_transcript", None),
    (r"livro ata|ata oficial|minuta|conselho de classe.*ata", "documents.generate_official_minutes", None),
    (r"assinatura.*ata|assinar.*ata|coletar.*assinatura", "documents.collect_minutes_signatures", None),
    (r"reten[cç][aã]o|lgpd|pol[ií]tica.*documento", "documents.manage_retention_policy", None),
    (r"busca sem[aâ]ntica|semantic", "documents.search_archive_semantic", None),
    (r"export.*audit|pacote.*audit|auditoria", "documents.export_audit_package", None),
    (r"visualizar.*documento|acessar.*arquivo|portal.*documento", "documents.view_student_documents", None),
    (r"arquivo digital|armazenar|cadastrar.*documento|menu arquivos", "documents.store_student_document", None),
    (r"buscar|pesquisar|consultar.*arquivo", "documents.search_archive", None),
    (r"visualiz|consultar|acompanhar|listar|acessar", "documents.view_student_documents", None),
    (r"cadastr|criar|incluir|adicionar|registrar|configur", "documents.store_student_document", None),
]

PLATFORM_CROSS_DOMAIN_RULES = [
    (r"cst_|gsen|license server|hardlock|protheus|totvs id|totvsid|central do cliente", "platform.quality_signal_support", "cross-domain: ERP vendor CST/GSen"),
    (r"eventos totvs responde|cross segmentos.*crm|rps\b", "platform.quality_signal_support", "cross-domain: vendor marketing FAQ"),
    (r"biblioteca|v[ií]deo na biblioteca", "identity.quality_signal_support", "cross-domain: library module miscatalog"),
    (r"base de disciplina|motivo da dispensa", "academic.manage_curriculum_matrix", "cross-domain: curriculum config"),
    (r"grupos alimentares|alimenta[cç][aã]o escolar|card[aá]pio", "platform.quality_signal_support", "cross-domain: school meals module miscatalog"),
    (r"tipos de requerimentos|requerimentos", "documents.store_student_document", "cross-domain: formal requests"),
    (r"portal do aluno|minhas atividades no portal", "students.view_student_portal", "cross-domain: student portal"),
    (r"transporte|rotas\?", "platform.manage_transport_module", "cross-domain: transport module miscatalog"),
    (r"recursos humanos|folha de ponto", "platform.quality_signal_support", "cross-domain: HR module miscatalog"),
]

PLATFORM_MAP_RULES = [
    (r"consumo de assinatur|acompanhar o consumo", "platform.meter_digital_signatures", None),
    (r"duplicar.*evento|eventos pessoais|calend[aá]rio", "platform.manage_school_calendar", None),
    (r"app escola|acessar e utilizar o app|primeiros passos", "platform.self_serve_onboarding", None),
    (r"relat[oó]rio|analytics|dashboard|favoritando relat", "platform.export_operational_reports", None),
    (r"unidade|multi.*unidade|cadastrar unidades", "platform.manage_multi_unit", None),
    (r"ano letivo|feriado|per[ií]odo letivo", "platform.configure_school_year", None),
    (r"help center|central de ajuda|taxonom", "platform.configure_help_taxonomy", None),
    (r"backoffice|m[oó]dulos extra|contratar m[oó]dulo", "platform.manage_backoffice_ops", None),
    (r"quais menus|perfil.*nutricionista|perfil gestor|perfil auxiliar", "platform.manage_staff_users", None),
    (r"traduc[aã]o autom[aá]tica|navegador", "platform.quality_signal_support", None),
    (r"transporte|rotas", "platform.manage_transport_module", None),
    (r"visualiz|consultar|acompanhar|listar|acessar", "platform.view_analytics_dashboard", None),
    (r"cadastr|criar|incluir|adicionar|registrar|configur", "platform.manage_platform_operations", None),
]

IDENTITY_MAP_RULES = [
    (r"2fa|biometria|autentica[cç][aã]o de dois|autentica[cç][aã]o com biom", "identity.configure_multi_factor", None),
    (r"redefinir.*senha|alterar.*senha|esqueci.*senha|senha de acesso|central do cliente totvs", "identity.reset_password", None),
    (r"me cadastro|confirmar.*conta|criar uma senha personal", "identity.complete_registration", None),
    (r"cadastrar um novo usu[aá]rio|aba de contas", "identity.invite_user", None),
    (r"c[oó]digo para login|login no classapp|fazer login|realizar login", "identity.authenticate_user", None),
    (r"alterar o e-mail|e-mail de um usu[aá]rio", "identity.manage_user_profile", None),
    (r"ativar e desativar usu|excluir um usu[aá]rio|editar.*usu[aá]rios existentes", "identity.manage_user_accounts", None),
    (r"administrador da entidade|funcionalidades do administrador|permiss", "identity.manage_roles", None),
    (r"faq lgpd|privacidade|prote[cç][aã]o de dados", "identity.manage_consent", None),
    (r"primeira vez|primeiro acesso|primeiros passos", "identity.onboard_team", None),
    (r"provision|implanta[cç][aã]o|handoff|onboarding_status", "identity.provision_school", None),
    (r"perfil da escola|configur.*escola", "identity.configure_school_profile", None),
]

DOMAIN_SYNC_CONFIG = {
    "billing": {
        "map_rules": BILLING_MAP_RULES,
        "cross_rules": [],
        "quality_canonical": "billing.quality_signal_support",
        "fallback": "billing.manage_financial_operations",
    },
    "communication": {
        "map_rules": COMMUNICATION_MAP_RULES,
        "cross_rules": COMMUNICATION_CROSS_DOMAIN_RULES,
        "quality_canonical": "communication.quality_signal_support",
        "fallback": "communication.manage_communication_operations",
    },
    "academic": {
        "map_rules": ACADEMIC_MAP_RULES,
        "cross_rules": ACADEMIC_CROSS_DOMAIN_RULES,
        "quality_canonical": "academic.quality_signal_support",
        "fallback": "academic.manage_academic_operations",
    },
    "students": {
        "map_rules": STUDENTS_MAP_RULES,
        "cross_rules": STUDENTS_CROSS_DOMAIN_RULES,
        "quality_canonical": "students.quality_signal_support",
        "fallback": "students.manage_enrollment_operations",
    },
    "identity": {
        "map_rules": IDENTITY_MAP_RULES,
        "cross_rules": IDENTITY_CROSS_DOMAIN_RULES,
        "quality_canonical": "identity.quality_signal_support",
        "fallback": "identity.manage_identity_operations",
    },
    "platform": {
        "map_rules": PLATFORM_MAP_RULES,
        "cross_rules": PLATFORM_CROSS_DOMAIN_RULES,
        "quality_canonical": "platform.quality_signal_support",
        "fallback": "platform.manage_platform_operations",
    },
    "documents": {
        "map_rules": DOCUMENTS_MAP_RULES,
        "cross_rules": [],
        "quality_canonical": "documents.store_student_document",
        "fallback": "documents.store_student_document",
    },
}


def is_quality_signal(raw_id, label, maturity=None):
    text = f"{raw_id} {label}".lower()
    if maturity == "troubleshooting":
        return True
    if raw_id.startswith(("billing.resolve_", "communication.resolve_", "academic.resolve_", "identity.resolve_")):
        return True
    return any(re.search(pat, text, re.I) for pat in QUALITY_SIGNAL_PATTERNS)


def parse_catalog_md(path):
    """Parse catalogo-funcionalidades.md into raw capability records."""
    text = open(path, encoding="utf-8").read()
    records = []
    sections = re.split(r"^## ", text, flags=re.M)[1:]
    for section in sections:
        lines = section.split("\n", 1)
        section_title = lines[0].strip()
        if section_title == "Coverage" or section_title not in CATALOG_SECTION_TO_DOMAIN:
            continue
        domain = CATALOG_SECTION_TO_DOMAIN[section_title]
        body = lines[1] if len(lines) > 1 else ""
        current_actor = "staff"
        pos = 0
        for line in body.split("\n"):
            actor_match = re.match(r"^### (.+)$", line)
            if actor_match:
                actor_label = actor_match.group(1).strip()
                current_actor = {
                    "Staff": "staff",
                    "Teacher": "teacher",
                    "Guardian": "guardian",
                    "Student": "student",
                    "Backoffice": "backoffice",
                }.get(actor_label, "staff")

        for match in re.finditer(
            r"^#### `([^`]+)` — (.+?)\n\n(.*?)(?=^#### |^### |\Z)",
            body,
            re.M | re.S,
        ):
            cap_id, label, rest = match.groups()
            actor = current_actor
            before = body[: match.start()]
            actor_sections = re.findall(r"^### (.+)$", before, re.M)
            if actor_sections:
                actor_label = actor_sections[-1].strip()
                actor = {
                    "Staff": "staff",
                    "Teacher": "teacher",
                    "Guardian": "guardian",
                    "Student": "student",
                    "Backoffice": "backoffice",
                }.get(actor_label, "staff")

            comp_line = re.search(r"\*\*Competitors:\*\* (.+)", rest)
            competitors = []
            competitor_maturity = {}
            maturities = []
            if comp_line:
                for part in comp_line.group(1).split("|"):
                    part = part.strip()
                    m = re.match(r"(\S+)\s+(✓|—)", part)
                    if m and m.group(2) == "✓":
                        comp_slug = m.group(1)
                        competitors.append(comp_slug)
                        mat = re.search(r"✓ \((\w+)\)", part)
                        comp_mat = mat.group(1) if mat else "documented"
                        competitor_maturity[comp_slug] = comp_mat
                        maturities.append(comp_mat)

            friction_match = re.search(r"\*\*Avg friction:\*\* ([\d.]+)", rest)
            friction = float(friction_match.group(1)) if friction_match else 0.0
            best_maturity = maturities[0] if maturities else None
            if best_maturity == "troubleshooting":
                maturity = "troubleshooting"
            else:
                maturity = best_maturity or "documented"

            records.append({
                "raw_id": cap_id,
                "domain": domain,
                "label": label.strip(),
                "competitors": competitors or ["unknown"],
                "competitor_maturity": competitor_maturity,
                "primary_actor": actor,
                "friction_score": friction,
                "maturity": maturity,
                "quality_signal": is_quality_signal(cap_id, label, maturity),
            })
    return records


def load_taxonomy_yaml(path):
    """Load capability-taxonomy.yaml without external deps."""
    if yaml is not None:
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("capabilities", [])

    capabilities = []
    current = None
    list_key = None

    with open(path, encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if line.startswith("version:") or line.startswith("capabilities:"):
                continue
            if line.startswith("  - id:"):
                if current:
                    capabilities.append(current)
                current = {"id": line.split(":", 1)[1].strip(), "aliases": []}
                list_key = None
                continue
            if current is None:
                continue
            stripped = line.strip()
            if stripped.startswith("- ") and list_key:
                current.setdefault(list_key, []).append(stripped[2:].strip())
                continue
            if ":" not in stripped:
                continue
            key, val = stripped.split(":", 1)
            key = key.strip()
            val = val.strip()
            if val.startswith("[") and val.endswith("]"):
                inner = val[1:-1].strip()
                current[key] = [x.strip() for x in inner.split(",") if x.strip()] if inner else []
                list_key = key if not val[1:-1].strip() else None
            elif val.startswith('"') and val.endswith('"'):
                current[key] = val[1:-1]
            elif val.lower() in ("true", "false"):
                current[key] = val.lower() == "true"
            elif val == "[]":
                current[key] = []
                list_key = key
            else:
                current[key] = val
    if current:
        capabilities.append(current)
    return capabilities


def load_aliases_jsonl(path):
    if not os.path.isfile(path):
        return []
    return load_jsonl(path)


def raw_alias(competitor, raw_id):
    return f"raw:{competitor}:{raw_id}"


def map_billing_raw(raw):
    return map_domain_raw(raw, "billing")


def map_domain_raw(raw, domain):
    cfg = DOMAIN_SYNC_CONFIG[domain]
    text = f"{raw['raw_id']} {raw['label']}".lower()
    if raw.get("quality_signal"):
        return cfg["quality_canonical"], "quality_signal: troubleshooting or FAQ"
    # Cross-domain miscatalog fixes before domain map rules (identity HR/library articles).
    for pat, canonical, note in cfg.get("cross_rules", []):
        if re.search(pat, text, re.I):
            return canonical, note
    for pat, canonical, note in cfg["map_rules"]:
        if re.search(pat, text, re.I):
            return canonical, note
    return cfg["fallback"], f"fallback: generic {domain} module operation"


def suggest_domain_aliases(raw_records, taxonomy_caps, domain):
    if domain not in DOMAIN_SYNC_CONFIG:
        raise ValueError(f"unsupported sync domain: {domain}")
    valid_ids = {c["id"] for c in taxonomy_caps}
    cfg = DOMAIN_SYNC_CONFIG[domain]
    aliases = []
    for raw in raw_records:
        if raw["domain"] != domain:
            continue
        canonical, notes = map_domain_raw(raw, domain)
        if canonical not in valid_ids:
            canonical = cfg["fallback"]
        quality_signal = raw.get("quality_signal", False) or canonical.endswith(
            ".quality_signal_support"
        )
        for comp in raw["competitors"]:
            entry = {
                "raw_id": raw["raw_id"],
                "canonical_id": canonical,
                "competitor": comp,
                "notes": notes or "",
                "quality_signal": quality_signal,
            }
            aliases.append(entry)
    return aliases


def suggest_billing_aliases(raw_records, taxonomy_caps):
    return suggest_domain_aliases(raw_records, taxonomy_caps, "billing")


def merge_domain_aliases(existing_aliases, new_aliases, domain_raw_ids):
    preserved = [a for a in existing_aliases if a["raw_id"] not in domain_raw_ids]
    return preserved + new_aliases


def export_raw_catalog(records, out_path, fmt="jsonl"):
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    if fmt == "csv":
        fields = [
            "raw_id", "domain", "label", "competitor", "primary_actor",
            "friction_score", "maturity", "quality_signal",
        ]
        with open(out_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for rec in records:
                for comp in rec["competitors"]:
                    writer.writerow({
                        "raw_id": rec["raw_id"],
                        "domain": rec["domain"],
                        "label": rec["label"],
                        "competitor": comp,
                        "primary_actor": rec["primary_actor"],
                        "friction_score": rec["friction_score"],
                        "maturity": rec["maturity"],
                        "quality_signal": rec["quality_signal"],
                    })
    else:
        rows = []
        for rec in records:
            for comp in rec["competitors"]:
                rows.append({
                    "raw_id": rec["raw_id"],
                    "domain": rec["domain"],
                    "label": rec["label"],
                    "competitor": comp,
                    "primary_actor": rec["primary_actor"],
                    "friction_score": rec["friction_score"],
                    "maturity": rec["maturity"],
                    "quality_signal": rec["quality_signal"],
                })
        write_jsonl(out_path, rows)


def normalize_pt_label(label):
    t = unicodedata_normalize(label.lower())
    t = re.sub(r"^(como|o que [eé]|faq\s*[-—]\s*)", "", t, flags=re.I)
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def cluster_suggestions(records, out_path, threshold=0.72):
    by_domain = defaultdict(list)
    for rec in records:
        by_domain[rec["domain"]].append(rec)

    suggestions = []
    for domain, domain_recs in sorted(by_domain.items()):
        used = set()
        for i, a in enumerate(domain_recs):
            if a["raw_id"] in used:
                continue
            cluster = [a]
            na = normalize_pt_label(a["label"])
            for b in domain_recs[i + 1 :]:
                if b["raw_id"] in used:
                    continue
                nb = normalize_pt_label(b["label"])
                if not na or not nb:
                    continue
                ratio = difflib.SequenceMatcher(None, na, nb).ratio()
                if ratio >= threshold:
                    cluster.append(b)
            if len(cluster) >= 2:
                for c in cluster:
                    used.add(c["raw_id"])
                suggestions.append({
                    "domain": domain,
                    "similarity_basis": "normalized_pt_label",
                    "suggested_canonical_label": cluster[0]["label"][:80],
                    "member_count": len(cluster),
                    "members": [
                        {
                            "raw_id": c["raw_id"],
                            "label": c["label"],
                            "competitors": c["competitors"],
                        }
                        for c in cluster[:15]
                    ],
                })

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(suggestions, f, indent=2, ensure_ascii=False)
    return suggestions


def taxonomy_report(records, aliases, taxonomy_caps, out_path=None):
    alias_by_raw = {a["raw_id"]: a for a in aliases}
    by_domain_raw = defaultdict(int)
    by_domain_mapped = defaultdict(int)
    quality_count = 0
    for rec in records:
        by_domain_raw[rec["domain"]] += 1
        if rec["raw_id"] in alias_by_raw:
            by_domain_mapped[rec["domain"]] += 1
        if rec.get("quality_signal"):
            quality_count += 1

    canonical_by_domain = defaultdict(int)
    for cap in taxonomy_caps:
        canonical_by_domain[cap.get("domain", "unknown")] += 1

    billing_raw = by_domain_raw.get("billing", 0)
    billing_mapped = by_domain_mapped.get("billing", 0)
    communication_raw = by_domain_raw.get("communication", 0)
    communication_mapped = by_domain_mapped.get("communication", 0)
    academic_raw = by_domain_raw.get("academic", 0)
    academic_mapped = by_domain_mapped.get("academic", 0)
    students_raw = by_domain_raw.get("students", 0)
    students_mapped = by_domain_mapped.get("students", 0)
    identity_raw = by_domain_raw.get("identity", 0)
    identity_mapped = by_domain_mapped.get("identity", 0)
    platform_raw = by_domain_raw.get("platform", 0)
    platform_mapped = by_domain_mapped.get("platform", 0)
    documents_raw = by_domain_raw.get("documents", 0)
    documents_mapped = by_domain_mapped.get("documents", 0)
    report = {
        "raw_total": len(records),
        "raw_by_domain": dict(sorted(by_domain_raw.items())),
        "mapped_total": len(alias_by_raw),
        "mapped_by_domain": dict(sorted(by_domain_mapped.items())),
        "coverage_pct": round(100 * len(alias_by_raw) / len(records), 1) if records else 0,
        "billing_raw": billing_raw,
        "billing_mapped": billing_mapped,
        "billing_coverage_pct": round(100 * billing_mapped / billing_raw, 1) if billing_raw else 0,
        "communication_raw": communication_raw,
        "communication_mapped": communication_mapped,
        "communication_coverage_pct": round(
            100 * communication_mapped / communication_raw, 1
        ) if communication_raw else 0,
        "academic_raw": academic_raw,
        "academic_mapped": academic_mapped,
        "academic_coverage_pct": round(
            100 * academic_mapped / academic_raw, 1
        ) if academic_raw else 0,
        "students_raw": students_raw,
        "students_mapped": students_mapped,
        "students_coverage_pct": round(
            100 * students_mapped / students_raw, 1
        ) if students_raw else 0,
        "identity_raw": identity_raw,
        "identity_mapped": identity_mapped,
        "identity_coverage_pct": round(
            100 * identity_mapped / identity_raw, 1
        ) if identity_raw else 0,
        "platform_raw": platform_raw,
        "platform_mapped": platform_mapped,
        "platform_coverage_pct": round(
            100 * platform_mapped / platform_raw, 1
        ) if platform_raw else 0,
        "documents_raw": documents_raw,
        "documents_mapped": documents_mapped,
        "documents_coverage_pct": round(
            100 * documents_mapped / documents_raw, 1
        ) if documents_raw else 0,
        "canonical_total": len(taxonomy_caps),
        "canonical_by_domain": dict(sorted(canonical_by_domain.items())),
        "quality_signal_raw_count": quality_count,
    }
    if out_path:
        os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
    return report


def build_catalog_maturity_index(records):
    """raw_id → competitor slug → catalog maturity."""
    index = {}
    for rec in records:
        index[rec["raw_id"]] = dict(rec.get("competitor_maturity") or {})
    return index


def alias_presence_for_competitor(alias_rows, catalog_maturity, competitor):
    """Map alias rows for one canonical+competitor to a parity cell value."""
    if not alias_rows:
        return "—"
    non_quality = [a for a in alias_rows if not a.get("quality_signal")]
    if not non_quality:
        return "noise"
    best = "—"
    for alias in non_quality:
        raw_id = alias["raw_id"]
        maturity = catalog_maturity.get(raw_id, {}).get(competitor)
        if not maturity:
            maturity = catalog_maturity.get(raw_id, {}).get("unknown")
        if not maturity:
            maturity = "documented"
        presence = MATURITY_TO_PRESENCE.get(maturity, "documented")
        if PRESENCE_RANK[presence] > PRESENCE_RANK[best]:
            best = presence
    return best


def parity_notes_for_capability(cap, alias_rows_by_competitor):
    notes = []
    if cap.get("quality_signal"):
        notes.append("Canonical quality signal — not an MVP parity target.")
    if cap.get("divergence_ref"):
        notes.append(f"`{cap['divergence_ref']}`")
    if cap.get("school_lab_decision"):
        decision = cap["school_lab_decision"].strip()
        if len(decision) > 120:
            decision = decision[:117] + "..."
        notes.append(decision)
    alias_counts = [
        f"{label}: {len(alias_rows_by_competitor.get(slug, []))}"
        for slug, label in PRIMARY_COMPETITORS
        if alias_rows_by_competitor.get(slug)
    ]
    if alias_counts:
        notes.append(f"Aliases ({', '.join(alias_counts)})")
    return " ".join(notes) if notes else ""


def compute_parity_rows(taxonomy_caps, aliases, catalog_records):
    catalog_maturity = build_catalog_maturity_index(catalog_records)
    aliases_by_canonical = defaultdict(lambda: defaultdict(list))
    for alias in aliases:
        aliases_by_canonical[alias["canonical_id"]][alias["competitor"]].append(alias)

    rows = []
    for cap in taxonomy_caps:
        cap_id = cap["id"]
        by_comp = aliases_by_canonical.get(cap_id, {})
        competitor_cells = {}
        for slug, _label in PRIMARY_COMPETITORS:
            competitor_cells[slug] = alias_presence_for_competitor(
                by_comp.get(slug, []),
                catalog_maturity,
                slug,
            )
        rows.append({
            "canonical_id": cap_id,
            "label": cap.get("label", cap_id),
            "domain": cap.get("domain", "unknown"),
            "phase": cap.get("phase", "—"),
            "prd_target": cap.get("prd_target", ""),
            "quality_signal": bool(cap.get("quality_signal")),
            "competitors": competitor_cells,
            "notes": parity_notes_for_capability(cap, by_comp),
        })
    return rows


def parity_matrix_stats(rows):
    stats = {}
    total = len(rows)
    for slug, label in PRIMARY_COMPETITORS:
        counts = defaultdict(int)
        for row in rows:
            counts[row["competitors"][slug]] += 1
        documented = counts["documented"]
        stats[slug] = {
            "label": label,
            "total": total,
            "documented": documented,
            "claimed": counts["claimed"],
            "noise": counts["noise"],
            "absent": counts["—"],
            "documented_pct": round(100 * documented / total, 1) if total else 0,
            "any_presence_pct": round(
                100 * (total - counts["—"]) / total, 1
            ) if total else 0,
        }
    return stats


def generate_parity_matrix_md(rows, stats, out_path):
    by_domain = defaultdict(list)
    for row in rows:
        by_domain[row["domain"]].append(row)

    lines = [
        "# Parity matrix (canonical capabilities)",
        "",
        "_Generated view — regen from taxonomy + aliases + catalog; do not edit by hand._",
        "",
        "Regenerate:",
        "",
        "```bash",
        "python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \\",
        "  --generate-parity-matrix \\",
        "  --taxonomy docs/product/capability-taxonomy.yaml \\",
        "  --aliases docs/ref/capability-aliases.jsonl \\",
        "  --catalog-path docs/ref/catalogo-funcionalidades.md \\",
        "  --out docs/product/parity-matrix.md",
        "```",
        "",
        "Optional CSV:",
        "",
        "```bash",
        "python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \\",
        "  --generate-parity-matrix --csv docs/ref/parity-matrix.csv",
        "```",
        "",
        f"**{len(rows)}** canonical capabilities vs primary competitors "
        "(Proesc, Sponte, Agenda Edu, ClassApp). Evidence from "
        "[`capability-aliases.jsonl`](../ref/capability-aliases.jsonl) "
        "and help-center maturity in [`catalogo-funcionalidades.md`](../ref/catalogo-funcionalidades.md).",
        "",
        "## Presence legend",
        "",
        "| Value | Meaning |",
        "|-------|---------|",
        "| `documented` | Help-center how-to or configuration article observed |",
        "| `claimed` | Conceptual/marketing-only article (no step-by-step) |",
        "| `noise` | Quality-signal alias only (FAQ, troubleshooting, miscatalog) |",
        "| `—` | No mapped alias for this competitor |",
        "",
        "## Coverage summary (primary competitors)",
        "",
        "| Competitor | Documented | Claimed | Noise | Absent | % documented | % any presence |",
        "|------------|------------|---------|-------|--------|--------------|----------------|",
    ]

    for slug in [s[0] for s in PRIMARY_COMPETITORS]:
        s = stats[slug]
        lines.append(
            f"| {s['label']} | {s['documented']} | {s['claimed']} | {s['noise']} | "
            f"{s['absent']} | {s['documented_pct']}% | {s['any_presence_pct']}% |"
        )

    lines.extend([
        "",
        "School Lab **phase** and **PRD** columns come from "
        "[`capability-taxonomy.yaml`](capability-taxonomy.yaml). "
        "Cross-competitor decisions: [`divergencias.md`](../ref/divergencias.md).",
        "",
    ])

    domain_order = [
        "billing", "communication", "academic", "students", "identity",
        "documents", "platform", "integrations",
    ]
    header = (
        "| Canonical capability | Proesc | Sponte | Agenda Edu | ClassApp | "
        "School Lab phase | PRD | Notes |"
    )
    separator = "|---|:---:|:---:|:---:|:---:|---|---|---|"

    for domain in domain_order + [d for d in sorted(by_domain) if d not in domain_order]:
        domain_rows = sorted(by_domain.get(domain, []), key=lambda r: r["canonical_id"])
        if not domain_rows:
            continue
        title = TAXONOMY_DOMAIN_LABELS.get(domain, domain.replace("-", " ").title())
        lines.append(f"## {title}")
        lines.append("")
        lines.append(header)
        lines.append(separator)
        for row in domain_rows:
            cap_cell = f"`{row['canonical_id']}` — {row['label']}"
            prd = f"`{row['prd_target']}`" if row["prd_target"] else "—"
            comp_cells = [row["competitors"][slug] for slug, _ in PRIMARY_COMPETITORS]
            notes = row["notes"].replace("|", "\\|")
            lines.append(
                f"| {cap_cell} | {' | '.join(comp_cells)} | {row['phase']} | {prd} | {notes} |"
            )
        lines.append("")

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


DIFFERENTIATOR_ID_PATTERNS = [
    r"^documents\.(?!quality_signal)",
    r"^billing\.(issue_boleto|track_boleto|resend_boleto|issue_charge|integrate_boleto)",
    r"^communication\.(attach_files|send_direct|send_group|send_individual|manage_communication_groups)",
    r"^academic\.(record_attendance|manage_attendance|enter_grades|publish_report_card)",
    r"^identity\.manage_consent",
]

DIFFERENTIATOR_DECISION_PATTERNS = [
    r"family isolation|per-family|per family",
    r"lgpd|legal impact|reliable|reliability|never lose",
    r"digital archive|audit-ready|semantic search|images in messages|message with image",
]

# (capability_id regex, open-questions.md anchor slug)
BLOCKED_BY_RULES = [
    (r"^documents\.(?!quality_signal)", "digital-archive--auditing"),
    (
        r"^documents\.(generate_official_minutes|collect_minutes_signatures|"
        r"collect_contract_signatures|search_archive_semantic)",
        "contracts-signature-and-livro-ata-phase-2--high-priority",
    ),
    (r"^students\.sign_enrollment_contract", "enrollment-contract-signature-authentic--proposed-phase-2"),
    (r"^identity\.manage_consent", "lgpd--privacy"),
    (r"^billing\.onboard_payment_gateway", "billing"),
    (
        r"^academic\.(configure_evaluation_template|configure_report_card|manage_grade_scale)",
        "academic",
    ),
    (r"^academic\.log_daily_routine", "early-childhood-education--daily-routine-phase-2"),
    (r"^communication\.(send_mass_announcement|manage_emergency)", "communication"),
]

OPEN_QUESTIONS_PATH = "../open-questions.md"


def is_differentiator(cap):
    if cap.get("quality_signal"):
        return False
    cap_id = cap.get("id", "")
    decision = (cap.get("school_lab_decision") or "").lower()
    if any(re.search(pat, cap_id) for pat in DIFFERENTIATOR_ID_PATTERNS):
        return True
    return any(re.search(pat, decision, re.I) for pat in DIFFERENTIATOR_DECISION_PATTERNS)


def blocked_by_link(cap):
    cap_id = cap.get("id", "")
    for pat, anchor in BLOCKED_BY_RULES:
        if re.search(pat, cap_id):
            return f"[open-questions]({OPEN_QUESTIONS_PATH}#{anchor})"
    return "—"


def prd_target_exists(prd_target, docs_root="docs"):
    if not prd_target:
        return False
    return os.path.isfile(os.path.join(docs_root, prd_target))


def alias_summary(by_competitor):
    parts = []
    for slug, label in PRIMARY_COMPETITORS:
        rows = [a for a in by_competitor.get(slug, []) if not a.get("quality_signal")]
        if rows:
            parts.append(f"{label}: {len(rows)}")
    return ", ".join(parts) if parts else "—"


def parity_gap_note(cap, parity_row):
    if cap.get("quality_signal") or cap.get("phase") != "MVP":
        return ""
    competitors = parity_row.get("competitors", {})
    documented = any(competitors.get(slug) == "documented" for slug, _ in PRIMARY_COMPETITORS)
    if not documented:
        return ""
    prd_target = cap.get("prd_target", "")
    if prd_target and prd_target_exists(prd_target):
        return ""
    if not prd_target:
        return "**Parity gap:** MVP + competitor documented; PRD path missing in taxonomy."
    return f"**Parity gap:** MVP + competitor documented; PRD `{prd_target}` not written yet."


def compute_capability_map_rows(taxonomy_caps, aliases, catalog_records):
    parity_rows = compute_parity_rows(taxonomy_caps, aliases, catalog_records)
    parity_by_id = {row["canonical_id"]: row for row in parity_rows}
    aliases_by_canonical = defaultdict(lambda: defaultdict(list))
    for alias in aliases:
        aliases_by_canonical[alias["canonical_id"]][alias["competitor"]].append(alias)

    rows = []
    for cap in taxonomy_caps:
        cap_id = cap["id"]
        parity_row = parity_by_id.get(cap_id, {})
        by_comp = aliases_by_canonical.get(cap_id, {})
        gap = parity_gap_note(cap, parity_row)
        rows.append({
            "capability_id": cap_id,
            "label": cap.get("label", cap_id),
            "domain": cap.get("domain", "unknown"),
            "actors": cap.get("actors") or [],
            "staff_templates": cap.get("staff_templates") or [],
            "surfaces": cap.get("surfaces") or [],
            "phase": cap.get("phase", "—"),
            "differentiator": is_differentiator(cap),
            "blocked_by": blocked_by_link(cap),
            "divergence_ref": cap.get("divergence_ref", ""),
            "school_lab_decision": cap.get("school_lab_decision", ""),
            "prd_target": cap.get("prd_target", ""),
            "quality_signal": bool(cap.get("quality_signal")),
            "alias_summary": alias_summary(by_comp),
            "parity_link": f"[parity](parity-matrix.md#{cap.get('domain', 'unknown')})",
            "gap_note": gap,
            "competitors": parity_row.get("competitors", {}),
        })
    return rows


def capability_map_stats(rows):
    from collections import Counter

    phases = Counter(r["phase"] for r in rows)
    differentiators = sum(1 for r in rows if r["differentiator"])
    gaps = sum(1 for r in rows if r["gap_note"])
    blocked = sum(1 for r in rows if r["blocked_by"] != "—")
    return {
        "total": len(rows),
        "mvp": phases.get("MVP", 0),
        "p2": phases.get("P2", 0),
        "na": phases.get("N/A", 0),
        "differentiators": differentiators,
        "parity_gaps": gaps,
        "blocked": blocked,
    }


def format_actors(row):
    templates = row.get("staff_templates") or []
    parts = []
    for actor in row.get("actors") or []:
        if actor == "staff" and templates:
            parts.append(f"staff ({', '.join(templates)})")
        else:
            parts.append(actor)
    return ", ".join(parts) if parts else "—"


def generate_capability_map_md(rows, stats, out_path):
    by_domain = defaultdict(list)
    for row in rows:
        by_domain[row["domain"]].append(row)

    lines = [
        "# Capability map (School Lab product decisions)",
        "",
        "_Generated view — regen from taxonomy + aliases + catalog; do not edit by hand._",
        "",
        "Per canonical capability: actors, surfaces, delivery phase, differentiator flag,",
        "open-question blockers, divergence decisions, PRD target, alias counts, and MVP",
        "parity gaps vs primary competitors. Competitor presence detail:",
        "[`parity-matrix.md`](parity-matrix.md). Source taxonomy:",
        "[`capability-taxonomy.yaml`](capability-taxonomy.yaml).",
        "",
        "Regenerate:",
        "",
        "```bash",
        "python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \\",
        "  --generate-capability-map \\",
        "  --taxonomy docs/product/capability-taxonomy.yaml \\",
        "  --aliases docs/ref/capability-aliases.jsonl \\",
        "  --catalog-path docs/ref/catalogo-funcionalidades.md \\",
        "  --out docs/product/capability-map.md",
        "```",
        "",
        "## Summary",
        "",
        f"| Metric | Count |",
        f"|--------|------:|",
        f"| Canonical capabilities | {stats['total']} |",
        f"| MVP | {stats['mvp']} |",
        f"| P2 | {stats['p2']} |",
        f"| N/A | {stats['na']} |",
        f"| Differentiator (`yes`) | {stats['differentiators']} |",
        f"| Blocked (open question link) | {stats['blocked']} |",
        f"| MVP parity gaps (competitor documented, PRD missing) | {stats['parity_gaps']} |",
        "",
        "**Differentiator** marks vision-aligned positioning (reliability, LGPD family",
        "isolation, digital archive, billing automation, image messaging) — not full",
        "competitive parity. **Blocked** links to unresolved items in",
        "[`open-questions.md`](../open-questions.md).",
        "",
        "## Column legend",
        "",
        "| Column | Meaning |",
        "|--------|---------|",
        "| Diff | `yes` when capability aligns with a School Lab differentiator |",
        "| Blocked | Link to open-questions anchor when scope/legal/vendor decision pending |",
        "| DIV | [`divergencias.md`](../ref/divergencias.md) id when competitors disagree |",
        "| PRD | Target PRD path under `docs/` (— if none) |",
        "| Aliases | Non–quality-signal alias counts per primary competitor |",
        "| Parity | Link to competitor presence row in parity matrix |",
        "| Notes | School Lab decision + parity gap callout |",
        "",
    ]

    domain_order = [
        "billing", "communication", "academic", "students", "identity",
        "documents", "platform", "integrations",
    ]
    header = (
        "| Capability | Actors | Surfaces | Phase | Diff | Blocked | DIV | PRD | "
        "Aliases | Parity | Notes |"
    )
    separator = "|:---|:---|:---|:---|:---:|:---|:---|:---|:---|:---|:---|"

    for domain in domain_order + [d for d in sorted(by_domain) if d not in domain_order]:
        domain_rows = sorted(by_domain.get(domain, []), key=lambda r: r["capability_id"])
        if not domain_rows:
            continue
        title = TAXONOMY_DOMAIN_LABELS.get(domain, domain.replace("-", " ").title())
        lines.append(f"## {title}")
        lines.append("")
        lines.append(header)
        lines.append(separator)
        for row in domain_rows:
            cap_cell = f"`{row['capability_id']}` — {row['label']}"
            diff = "yes" if row["differentiator"] else "no"
            div = f"`{row['divergence_ref']}`" if row["divergence_ref"] else "—"
            prd = f"`{row['prd_target']}`" if row["prd_target"] else "—"
            decision = (row["school_lab_decision"] or "").replace("|", "\\|")
            if row["gap_note"]:
                decision = f"{decision} {row['gap_note']}" if decision else row["gap_note"]
            if row["quality_signal"]:
                suffix = " _(quality signal — not parity target)_"
                decision = (decision + suffix) if decision else suffix.strip()
            notes = decision or "—"
            lines.append(
                f"| {cap_cell} | {format_actors(row)} | "
                f"{', '.join(row['surfaces']) or '—'} | {row['phase']} | {diff} | "
                f"{row['blocked_by']} | {div} | {prd} | {row['alias_summary']} | "
                f"{row['parity_link']} | {notes} |"
            )
        lines.append("")

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


FINTECH_FIRST_PRD = "prds/fintech-first.md"
FINTECH_FIRST_IMPL_NOTE = (
    "Partially implemented in `web/` via "
    "[`fintech-first.md`](../prds/fintech-first.md) (partner slice)."
)


def mvp_scope_notes(row):
    """Compact notes for mvp-scope table cells."""
    parts = []
    if row["domain"] == "billing" and row["phase"] == "MVP":
        if row["capability_id"] == "billing.send_payment_reminder":
            parts.append(
                "Stub only in partner slice — platform régua deferred per fintech-first UC-03; "
                "overdue detection and dashboard ship."
            )
        elif row["capability_id"] in {
            "billing.issue_charge", "billing.issue_boleto", "billing.integrate_boleto_bank",
            "billing.resend_boleto", "billing.pay_online", "billing.configure_payment_gateway",
            "billing.track_boleto_status", "billing.view_delinquency_dashboard",
            "billing.view_guardian_charges", "billing.manage_payment_plan",
            "billing.configure_early_payment_discount",
        }:
            parts.append(FINTECH_FIRST_IMPL_NOTE)
    decision = (row.get("school_lab_decision") or "").strip()
    if decision:
        if len(decision) > 100:
            decision = decision[:97] + "..."
        parts.append(decision.replace("|", "\\|"))
    if row.get("blocked_by") and row["blocked_by"] != "—":
        parts.append("Blocked — see capability-map.")
    if row.get("differentiator"):
        parts.append("Differentiator.")
    return " ".join(parts) if parts else "—"


def generate_mvp_scope_md(rows, stats, out_path):
    by_domain = defaultdict(list)
    for row in rows:
        by_domain[row["domain"]].append(row)

    mvp_by_domain = {
        domain: sum(1 for r in domain_rows if r["phase"] == "MVP")
        for domain, domain_rows in by_domain.items()
    }

    lines = [
        "# MVP scope (School Lab)",
        "",
        "_Generated view — regen from taxonomy + aliases + catalog; do not edit by hand._",
        "",
        "Single source for **MVP vs P2 vs out of scope**. Derived from",
        "[`capability-taxonomy.yaml`](capability-taxonomy.yaml) (`phase: MVP`),",
        "[`vision.md`](../vision.md) §6 MVP boundaries,",
        "[`open-questions.md`](../open-questions.md) Jul/Aug 2026 decisions, and",
        "[`fintech-first.md`](../prds/fintech-first.md) billing implementation status.",
        "",
        "Per-capability detail (actors, surfaces, differentiators, blockers):",
        "[`capability-map.md`](capability-map.md). Competitor presence:",
        "[`parity-matrix.md`](parity-matrix.md).",
        "",
        "Regenerate:",
        "",
        "```bash",
        "python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \\",
        "  --generate-mvp-scope \\",
        "  --taxonomy docs/product/capability-taxonomy.yaml \\",
        "  --aliases docs/ref/capability-aliases.jsonl \\",
        "  --catalog-path docs/ref/catalogo-funcionalidades.md \\",
        "  --out docs/product/mvp-scope.md",
        "```",
        "",
        "## Executive summary",
        "",
        f"| Metric | Count |",
        f"|--------|------:|",
        f"| Canonical capabilities (total) | {stats['total']} |",
        f"| **MVP (in scope)** | **{stats['mvp']}** |",
        f"| P2 (deferred) | {stats['p2']} |",
        f"| N/A (out of product core) | {stats['na']} |",
        f"| MVP parity gaps (competitor documented, PRD missing) | {stats['parity_gaps']} |",
        f"| MVP differentiators | {sum(1 for r in rows if r['phase'] == 'MVP' and r['differentiator'])} |",
        "",
        "**Vision-aligned pillars** (Jul 2026 stakeholder validation — [`vision.md`](../vision.md) §6):",
        "",
        "1. **Communication** — two-way parent↔teacher and parent↔school messaging with images;",
        "   push notifications (FCM); not real-time.",
        "2. **Academic** — reliable grades, report cards, and attendance with automatic absence",
        "   notification (legal impact if wrong).",
        "3. **Billing** — boleto generation and tracking; guardian payment view; partner slice",
        "   partially **implemented** in `web/` per [`fintech-first.md`](../prds/fintech-first.md).",
        "4. **Digital archive** — document repository per student/school.",
        "5. **Identity & students** — multi-school tenancy, roles, base records (students, guardians,",
        "   classes, subjects).",
        "6. **Surfaces** — web SPA and mobile app for all MVP roles.",
        "",
        "**Build order:** validated MVP priority is communication → academic → billing;",
        "the billing-first partner slice (historical) inverted that order for the validating school only.",
        "Normative billing scope: [`prds/billing/`](../prds/billing/). See",
        "[`fintech-first.md`](../prds/fintech-first.md) positioning note.",
        "",
        "**Known scope tensions** (recorded in open questions, not taxonomy edits):",
        "",
        "- **Collection régua** — taxonomy marks `billing.build_dunning_workflow` and",
        "  `billing.send_payment_reminder` as MVP; Aug 2026 fintech-first decision defers",
        "  platform régua (stub notifier only). Overdue detection and dashboard ship first.",
        "- **Early childhood routine** — `academic.log_daily_routine` is P2; communication covers",
        "  infantil needs in MVP per Jul 2026 decision.",
        "- **NFS-e** — `billing.issue_service_invoice` is MVP in taxonomy; open item in",
        "  fintech-first may defer issuance.",
        "",
        "## MVP capabilities by domain",
        "",
        "Columns: **Parity gap** = competitor documented help-center evidence exists but target",
        "domain PRD is missing or not written (see capability-map for detail).",
        "",
    ]

    domain_order = [
        "billing", "communication", "academic", "students", "identity",
        "documents", "platform", "integrations",
    ]
    header = "| Capability | Label | PRD target | Parity gap | Notes |"
    separator = "|:---|:---|:---|:---:|:---|"

    for domain in domain_order:
        domain_rows = sorted(by_domain.get(domain, []), key=lambda r: r["capability_id"])
        mvp_rows = [r for r in domain_rows if r["phase"] == "MVP"]
        if not mvp_rows:
            continue
        title = TAXONOMY_DOMAIN_LABELS.get(domain, domain.replace("-", " ").title())
        lines.append(f"### {title} ({len(mvp_rows)} MVP)")
        lines.append("")
        lines.append(header)
        lines.append(separator)
        for row in mvp_rows:
            prd = f"`{row['prd_target']}`" if row["prd_target"] else "—"
            gap = "yes" if row["gap_note"] else "no"
            notes = mvp_scope_notes(row)
            lines.append(
                f"| `{row['capability_id']}` | {row['label']} | {prd} | {gap} | {notes} |"
            )
        lines.append("")

    lines.extend([
        "## Deferred to phase 2 (P2)",
        "",
        f"**{stats['p2']}** capabilities marked `phase: P2` in taxonomy. Full detail:",
        "[`capability-map.md`](capability-map.md) (filter Phase = P2).",
        "",
        "| Domain | P2 count | Representative deferrals |",
        "|--------|--------:|--------------------------|",
    ])

    p2_highlights = {
        "billing": "NFS-e settings, ERP import, boleto protest, corporate payer, online enrollment pay",
        "communication": "Mass announcements, emergency broadcast, AI assistant, read receipts",
        "academic": "Daily routine (infantil), online re-enrollment trilha, advanced scheduling",
        "students": "Online enrollment trilha, contract signature gate",
        "identity": "Enrollment contract signature blocking",
        "documents": "Livro Ata, minutes signatures, semantic archive search",
        "platform": "Real-time (Solid Cable), advanced BI, landing/sales",
        "integrations": "ERP sync, WhatsApp adapter depth, third-party LMS",
    }
    for domain in domain_order:
        p2_count = sum(1 for r in by_domain.get(domain, []) if r["phase"] == "P2")
        if p2_count:
            highlight = p2_highlights.get(domain, "See capability-map")
            title = TAXONOMY_DOMAIN_LABELS.get(domain, domain.replace("-", " ").title())
            lines.append(f"| {title} | {p2_count} | {highlight} |")

    lines.extend([
        "",
        "### P2 capability inventory",
        "",
        "| Capability | Label | PRD target | Notes |",
        "|:---|:---|:---|:---|",
    ])
    for domain in domain_order:
        for row in sorted(by_domain.get(domain, []), key=lambda r: r["capability_id"]):
            if row["phase"] != "P2":
                continue
            prd = f"`{row['prd_target']}`" if row["prd_target"] else "—"
            note = (row.get("school_lab_decision") or "—").replace("|", "\\|")
            if len(note) > 80:
                note = note[:77] + "..."
            lines.append(
                f"| `{row['capability_id']}` | {row['label']} | {prd} | {note} |"
            )

    lines.extend([
        "",
        "## Explicitly out of scope",
        "",
        "### N/A capabilities (not product core)",
        "",
        f"**{stats['na']}** capabilities marked `phase: N/A` — quality signals, vendor-only",
        "products, or patterns documented for reference only.",
        "",
        "| Capability | Label | Notes |",
        "|:---|:---|:---|",
    ])
    for domain in domain_order:
        for row in sorted(by_domain.get(domain, []), key=lambda r: r["capability_id"]):
            if row["phase"] != "N/A":
                continue
            note = (row.get("school_lab_decision") or "—").replace("|", "\\|")
            lines.append(f"| `{row['capability_id']}` | {row['label']} | {note} |")

    lines.extend([
        "",
        "### Vision §6 exclusions (anchor prose)",
        "",
        "These items are **out of the MVP** per [`vision.md`](../vision.md) §6 even when",
        "related taxonomy rows exist as P2/N/A:",
        "",
        "- **Livro Ata & formal minutes** — high priority phase 2; digital signatures, semantic",
        "  search, optional print for physical archive.",
        "- **Contracts + digital signature** — shares signature infrastructure with Livro Ata;",
        "  enrollment contract gate does not block login (BR-O11).",
        "- **Advanced communication** — mass announcements, read receipts (P2 in taxonomy).",
        "- **Landing / sales page** — institutional site only; product sales flow deferred.",
        "- **Advanced reporting and BI** — basic exports in MVP; dashboards deferred.",
        "- **Structured early childhood daily routine** — meals, sleep, hygiene module (P2).",
        "- **Audio messages** — explicitly out per Jul 2026 communication decision.",
        "- **Real-time messaging** — timely delivery via push/queue, not live sync (phase 2).",
        "- **Receivables anticipation / guaranteed revenue** — fintech partner pattern only (`N/A`).",
        "- **AI support agents** — defer; human escalation first ([`DIV-communication-006`]"
        "(../ref/divergencias.md)).",
        "",
        "### Billing partner slice gaps (historical baseline vs MVP inventory)",
        "",
        "The partner billing slice in [`fintech-first.md`](../prds/fintech-first.md) implements",
        "core charge/boleto/webhook flows in `web/` but explicitly **excludes** (until domain",
        "**implementations** ship in `web/`):",
        "",
        "- Academic, communication, and full digital archive modules (PRDs validated; code pending).",
        "- Platform collection régua (email/WhatsApp automation) — stub only.",
        "- Card/Pix checkout breadth beyond Cora boleto path (per billing PRD waves).",
        "- Treasury (`manage_cash_register`), NFS-e issuance, visual dunning builder.",
        "",
        "Domain PRDs under `docs/prds/billing/` remain the **normative** target for full MVP billing",
        "scope; per-capability delivery status and blockers are in [`capability-map.md`](capability-map.md).",
        "",
        "## Cross-references",
        "",
        "- Non-functional requirements: [`non-functional-requirements.md`](non-functional-requirements.md)",
        "- Divergence decisions: [`divergencias.md`](../ref/divergencias.md)",
        "- Domain delivery status: [`domain-roadmap.md`](domain-roadmap.md)",
        "- Open decisions: [`open-questions.md`](../open-questions.md)",
        "",
    ])

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def write_parity_matrix_csv(rows, out_path):
    fields = [
        "canonical_id", "label", "domain", "proesc", "sponte", "agenda_edu",
        "classapp", "school_lab_phase", "prd_target", "notes",
    ]
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "canonical_id": row["canonical_id"],
                "label": row["label"],
                "domain": row["domain"],
                "proesc": row["competitors"]["proesc"],
                "sponte": row["competitors"]["sponte"],
                "agenda_edu": row["competitors"]["agenda-edu"],
                "classapp": row["competitors"]["classapp"],
                "school_lab_phase": row["phase"],
                "prd_target": row["prd_target"],
                "notes": row["notes"],
            })


def generate_taxonomy_md(taxonomy_caps, out_path):
    by_domain = defaultdict(list)
    for cap in taxonomy_caps:
        by_domain[cap.get("domain", "unknown")].append(cap)

    lines = [
        "# Capability taxonomy (canonical)",
        "",
        "_Generated view — edit [`capability-taxonomy.yaml`](capability-taxonomy.yaml), not this file._",
        "",
        "Regenerate:",
        "",
        "```bash",
        "python3 .cursor/skills/docs/corpus-concorrente/scripts/capabilities.py \\",
        "  --generate-taxonomy-md \\",
        "  --taxonomy docs/product/capability-taxonomy.yaml \\",
        "  --out docs/product/capability-taxonomy.md",
        "```",
        "",
        f"**{len(taxonomy_caps)}** canonical capabilities across **{len(by_domain)}** domains.",
        "",
    ]

    domain_order = [
        "billing", "communication", "academic", "students", "identity",
        "documents", "platform", "integrations",
    ]
    for domain in domain_order + [d for d in sorted(by_domain) if d not in domain_order]:
        caps = sorted(by_domain.get(domain, []), key=lambda c: c["id"])
        if not caps:
            continue
        title = domain.replace("-", " ").title()
        lines.append(f"## {title}")
        lines.append("")
        for cap in caps:
            aliases = cap.get("aliases") or []
            phase = cap.get("phase", "—")
            lines.append(f"### `{cap['id']}`")
            lines.append("")
            lines.append(f"- **Label:** {cap.get('label', '')}")
            lines.append(f"- **Actors:** {', '.join(cap.get('actors', []))}")
            if cap.get("staff_templates"):
                lines.append(f"- **Staff templates:** {', '.join(cap['staff_templates'])}")
            lines.append(f"- **Surfaces:** {', '.join(cap.get('surfaces', []))}")
            lines.append(f"- **Phase:** {phase}")
            if cap.get("divergence_ref"):
                lines.append(f"- **Divergence:** {cap['divergence_ref']}")
            if cap.get("prd_target"):
                lines.append(f"- **PRD target:** `{cap['prd_target']}`")
            if cap.get("quality_signal"):
                lines.append("- **Quality signal:** yes (support/troubleshooting — not feature parity)")
            if cap.get("school_lab_decision"):
                lines.append(f"- **Decision:** {cap['school_lab_decision']}")
            lines.append(f"- **Alias count:** {len(aliases)}")
            if aliases[:3]:
                lines.append(f"- **Sample aliases:** {', '.join(f'`{a}`' for a in aliases[:3])}")
            lines.append("")

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def merge_aliases_into_taxonomy(taxonomy_caps, aliases):
    by_id = defaultdict(list)
    for alias in aliases:
        by_id[alias["canonical_id"]].append(
            raw_alias(alias["competitor"], alias["raw_id"])
        )
    for cap in taxonomy_caps:
        cap_id = cap["id"]
        existing = set(cap.get("aliases") or [])
        for a in by_id.get(cap_id, []):
            existing.add(a)
        cap["aliases"] = sorted(existing)
    return taxonomy_caps


def write_aliases_jsonl(path, aliases):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for row in aliases:
            out = {
                "raw_id": row["raw_id"],
                "canonical_id": row["canonical_id"],
                "competitor": row["competitor"],
                "notes": row.get("notes", ""),
            }
            if row.get("quality_signal"):
                out["quality_signal"] = True
            f.write(json.dumps(out, ensure_ascii=False) + "\n")


def run_taxonomy_pipeline(args):
    catalog_path = args.catalog_path or "docs/ref/catalogo-funcionalidades.md"
    taxonomy_path = args.taxonomy or "docs/product/capability-taxonomy.yaml"
    aliases_path = args.aliases or "docs/ref/capability-aliases.jsonl"

    records = parse_catalog_md(catalog_path)

    if args.export_raw:
        fmt = "csv" if args.export_raw == "csv" else "jsonl"
        ext = "csv" if fmt == "csv" else "jsonl"
        out = args.out or f"docs/ref/raw-capabilities-export.{ext}"
        export_raw_catalog(records, out, fmt=fmt)
        print(f"Exported {len(records)} raw capabilities → {out} ({fmt})")
        return

    if args.cluster_suggestions:
        out = args.out or "docs/ref/cluster-suggestions.json"
        suggestions = cluster_suggestions(records, out, threshold=args.threshold)
        print(f"Cluster suggestions: {len(suggestions)} groups → {out}")
        return

    taxonomy_caps = load_taxonomy_yaml(taxonomy_path) if os.path.isfile(taxonomy_path) else []

    sync_domain = args.domain
    if args.sync_billing_aliases:
        sync_domain = "billing"
    if args.sync_aliases and sync_domain:
        domain_raw = [r for r in records if r["domain"] == sync_domain]
        domain_raw_ids = {r["raw_id"] for r in domain_raw}
        new_aliases = suggest_domain_aliases(domain_raw, taxonomy_caps, sync_domain)
        existing_aliases = load_aliases_jsonl(aliases_path)
        aliases = merge_domain_aliases(existing_aliases, new_aliases, domain_raw_ids)
        write_aliases_jsonl(aliases_path, aliases)
        print(f"{sync_domain.title()} aliases: {len(new_aliases)} rows → {aliases_path}")
        print(f"Total alias rows: {len(aliases)}")
        mapped_ids = {a["raw_id"] for a in new_aliases}
        pct = round(100 * len(mapped_ids) / len(domain_raw_ids), 1) if domain_raw_ids else 0
        print(f"{sync_domain.title()} coverage: {len(mapped_ids)}/{len(domain_raw_ids)} ({pct}%)")

    aliases = load_aliases_jsonl(aliases_path)

    if args.taxonomy_report:
        out = args.out or "docs/ref/taxonomy-report.json"
        report = taxonomy_report(records, aliases, taxonomy_caps, out_path=out)
        print(json.dumps(report, indent=2))
        return

    if args.generate_taxonomy_md:
        if aliases:
            taxonomy_caps = merge_aliases_into_taxonomy(taxonomy_caps, aliases)
        out = args.out or "docs/product/capability-taxonomy.md"
        generate_taxonomy_md(taxonomy_caps, out)
        print(f"Generated taxonomy MD: {len(taxonomy_caps)} capabilities → {out}")
        return

    if args.generate_parity_matrix:
        rows = compute_parity_rows(taxonomy_caps, aliases, records)
        stats = parity_matrix_stats(rows)
        out = args.out or "docs/product/parity-matrix.md"
        generate_parity_matrix_md(rows, stats, out)
        csv_path = args.csv
        if csv_path:
            write_parity_matrix_csv(rows, csv_path)
        print(f"Generated parity matrix: {len(rows)} capabilities → {out}")
        if csv_path:
            print(f"CSV → {csv_path}")
        for slug, s in stats.items():
            print(
                f"  {s['label']}: documented {s['documented']}/{s['total']} "
                f"({s['documented_pct']}%), any presence {s['any_presence_pct']}%"
            )
        return

    if args.generate_capability_map:
        rows = compute_capability_map_rows(taxonomy_caps, aliases, records)
        stats = capability_map_stats(rows)
        out = args.out or "docs/product/capability-map.md"
        generate_capability_map_md(rows, stats, out)
        print(f"Generated capability map: {len(rows)} capabilities → {out}")
        print(
            f"  Phase: MVP {stats['mvp']}, P2 {stats['p2']}, N/A {stats['na']}; "
            f"differentiators {stats['differentiators']}; "
            f"parity gaps {stats['parity_gaps']}; blocked {stats['blocked']}"
        )
        return

    if args.generate_mvp_scope:
        rows = compute_capability_map_rows(taxonomy_caps, aliases, records)
        stats = capability_map_stats(rows)
        out = args.out or "docs/product/mvp-scope.md"
        generate_mvp_scope_md(rows, stats, out)
        print(f"Generated MVP scope: {stats['mvp']} MVP capabilities → {out}")
        print(
            f"  Total {stats['total']}; P2 {stats['p2']}, N/A {stats['na']}; "
            f"parity gaps {stats['parity_gaps']}"
        )
        return


def main():
    ap = argparse.ArgumentParser(
        description="Derive capabilities from corpus or run taxonomy tooling on catalog.",
    )
    ap.add_argument(
        "inputs",
        nargs="*",
        help="extracao.jsonl or capabilities.jsonl paths (derive/catalog modes)",
    )
    ap.add_argument("--out", help="output path")
    ap.add_argument("--synthesize", action="store_true", help="write funcionalidades-por-ator.md")
    ap.add_argument("--ref-dir", help="docs/ref/<competitor> for synthesis")
    ap.add_argument("--catalog", action="store_true", help="merge into catalogo-funcionalidades.md")
    ap.add_argument("--competitor", help="competitor slug (derive mode)")
    ap.add_argument(
        "--catalog-path",
        default="docs/ref/catalogo-funcionalidades.md",
        help="path to cross-competitor catalog markdown",
    )
    ap.add_argument(
        "--taxonomy",
        default="docs/product/capability-taxonomy.yaml",
        help="canonical taxonomy YAML",
    )
    ap.add_argument(
        "--aliases",
        default="docs/ref/capability-aliases.jsonl",
        help="raw→canonical alias JSONL",
    )
    ap.add_argument(
        "--export-raw",
        nargs="?",
        const="jsonl",
        choices=["jsonl", "csv"],
        help="export raw catalog rows to JSONL or CSV",
    )
    ap.add_argument(
        "--cluster-suggestions",
        action="store_true",
        help="suggest merge clusters by domain + PT label similarity",
    )
    ap.add_argument(
        "--taxonomy-report",
        action="store_true",
        help="stats: raw/mapped counts and coverage",
    )
    ap.add_argument(
        "--generate-taxonomy-md",
        action="store_true",
        help="render capability-taxonomy.md from YAML + aliases",
    )
    ap.add_argument(
        "--generate-parity-matrix",
        action="store_true",
        help="render parity-matrix.md from taxonomy + aliases + catalog",
    )
    ap.add_argument(
        "--generate-capability-map",
        action="store_true",
        help="render capability-map.md from taxonomy + aliases + catalog",
    )
    ap.add_argument(
        "--generate-mvp-scope",
        action="store_true",
        help="render mvp-scope.md from taxonomy + aliases + catalog",
    )
    ap.add_argument(
        "--csv",
        help="optional CSV output path (with --generate-parity-matrix)",
    )
    ap.add_argument(
        "--sync-billing-aliases",
        action="store_true",
        help="auto-map billing raw IDs to canonical taxonomy (alias for --sync-aliases --domain billing)",
    )
    ap.add_argument(
        "--sync-aliases",
        action="store_true",
        help="auto-map raw IDs for --domain to canonical taxonomy (preserves other domains)",
    )
    ap.add_argument(
        "--domain",
        choices=sorted(DOMAIN_SYNC_CONFIG.keys()),
        help="catalog domain slug for --sync-aliases (billing, communication, academic, students, identity, platform, documents)",
    )
    ap.add_argument(
        "--threshold",
        type=float,
        default=0.72,
        help="similarity threshold for --cluster-suggestions",
    )
    args = ap.parse_args()

    taxonomy_modes = [
        args.export_raw,
        args.cluster_suggestions,
        args.taxonomy_report,
        args.generate_taxonomy_md,
        args.generate_parity_matrix,
        args.generate_capability_map,
        args.generate_mvp_scope,
        args.sync_billing_aliases,
        args.sync_aliases,
    ]
    if any(taxonomy_modes):
        run_taxonomy_pipeline(args)
        return

    if not args.inputs:
        ap.error("inputs required unless using taxonomy flags (--export-raw, etc.)")

    if args.catalog:
        all_caps = []
        for p in args.inputs:
            all_caps.extend(load_jsonl(p))
        out = args.out or "docs/ref/catalogo-funcionalidades.md"
        synthesize_catalog(all_caps, out)
        print(f"Catalog: {len(all_caps)} capability records → {out}")
        return

    # Derive mode — input is extracao.jsonl
    extracao_path = args.inputs[0]
    records = load_jsonl(extracao_path)
    caps = [derive_capability(r) for r in records]
    caps = merge_capabilities(caps)

    out = args.out or extracao_path.replace("extracao.jsonl", "capabilities.jsonl")
    write_jsonl(out, caps)

    report = coverage_report(extracao_path, caps)
    report_path = out.replace("capabilities.jsonl", "coverage.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"{len(caps)} capabilities → {out}")
    print(f"Coverage: {report['articles_mapped']}/{report['articles_total']} ({report['coverage_pct']}%)")
    print(f"Report → {report_path}")

    if args.synthesize:
        competitor = args.competitor or (caps[0]["competitor"] if caps else "unknown")
        ref_dir = args.ref_dir or f"docs/ref/{competitor}"
        paths = synthesize_per_actor(caps, ref_dir, competitor)
        for p in paths:
            print(f"Synthesized → {p}")


if __name__ == "__main__":
    main()
