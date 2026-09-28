#!/usr/bin/env python3
"""
Monta prompt do Codelet Loop a partir de feature slice ou levantamento de requisitos.

Uso:
  python3 scripts/montar_prompt.py              # interativo
  python3 scripts/montar_prompt.py --help     # ajuda
  python3 scripts/montar_prompt.py --validate-only --ac-file docs/prds/fintech-first/resend-boleto.md
  python3 scripts/montar_prompt.py --feature "X" --domain fintech-first --ac-file slice.md --sem-interacao
"""

from __future__ import annotations

import argparse
import re
import sys
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = SKILL_ROOT / "templates" / "prompt-base.md"

# Filtro de adjetivo — espelha references/levantamento.md
TRIGGER_WORDS: dict[str, str] = {
    r"\br[aá]pido\b": "número + unidade (ex.: resposta em < 200ms no p95)",
    r"\bperform[aá]tico\b": "número + unidade (ex.: resposta em < 200ms no p95)",
    r"\bfast\b": "number + unit (e.g. response < 200ms p95)",
    r"\bbonito\b": "referência a padrão existente (arquivo, componente, screenshot)",
    r"\belegante\b": "referência a padrão existente (arquivo, componente, screenshot)",
    r"\bbeautiful\b": "reference to existing pattern (file, component, screenshot)",
    r"\bintuitivo\b": "tarefa concreta + tempo-alvo ou taxa de erro",
    r"\bf[aá]cil\b": "tarefa concreta + tempo-alvo ou taxa de erro",
    r"\bintuitive\b": "concrete task + time target or error rate",
    r"\beasy\b": "concrete task + time target or error rate",
    r"\brobusto\b": "lista explícita dos casos adversos cobertos",
    r"\bresiliente\b": "lista explícita dos casos adversos cobertos",
    r"\brobust\b": "explicit list of covered adversarial cases",
    r"\bresilient\b": "explicit list of covered adversarial cases",
    r"\bimpec[aá]vel\b": "nunca aceito sozinho — decompor em ACs mensuráveis específicos",
    r"\bperfeito\b": "nunca aceito sozinho — decompor em ACs mensuráveis específicos",
    r"\bperfect\b": "never accepted alone — decompose into specific measurable ACs",
    r"\bmoderno\b": "referência visual concreta ou checklist de atributos observáveis",
    r"\bclean\b": "referência visual concreta ou checklist de atributos observáveis",
    r"\bmodern\b": "concrete visual reference or observable attribute checklist",
    r"\bseguro\b": "threat model mínimo — qual ataque ou vazamento específico está mitigado",
    r"\bsecure\b": "minimum threat model — which specific attack or leak is mitigated",
}

PROXY_PATTERNS = [
    r"\d+\s*(ms|s|sec|seconds?|min|minutes?|%|px|clicks?|steps?|requests?)",
    r"p\d{2,3}",
    r"<\s*\d+",
    r">\s*\d+",
    r"docs/",
    r"\.md\b",
    r"\.tsx?\b",
    r"http",
    r"componente\s+[`'\"]",
    r"component\s+[`'\"]",
    r"refer[eê]ncia",
    r"reference",
    r"mesmo padr[aã]o",
    r"same pattern",
    r"caso(s)?\s+adverso",
    r"adversarial",
    r"timeout|offline|403|422|503",
]

LEVANTAMENTO_QUESTIONS = [
    (
        "Ator",
        "Quem faz isso, em que papel? (ex.: responsável financeiro logado no backoffice)",
    ),
    (
        "Gatilho e pré-condição",
        "O que precisa ser verdade antes de começar e o que dispara a ação?",
    ),
    (
        "Resultado observável",
        "O que muda de forma checável olhando, sem perguntar para quem construiu?",
    ),
    (
        "Casos adversos que importam",
        "Quais edge cases valem o custo de cobrir nesta entrega? (não todos)",
    ),
    (
        "Não-objetivo",
        "O que fica explicitamente DE FORA desta entrega?",
    ),
]

AC_SECTION_HEADINGS = (
    "## acceptance criteria",
    "## critérios de aceite",
    "## criterios de aceite",
)

BAR_SECTION_HEADINGS = ("## bar",)
NON_GOALS_SECTION_HEADINGS = (
    "## non-goals",
    "## não-objetivos",
    "## nao-objetivos",
)


def slugify(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "feature"


def has_measurable_proxy(ac: str) -> bool:
    lower = ac.lower()
    for pattern in PROXY_PATTERNS:
        if re.search(pattern, lower, re.IGNORECASE):
            return True
    return False


def has_gwt_grammar(ac: str) -> tuple[bool, list[str]]:
    """Check Given/When/Then (primary) or Dado/Quando/Então (legacy)."""
    lower = ac.lower()
    failures: list[str] = []

    has_given = bool(re.search(r"\b(given|dado)\b", lower))
    has_when = bool(re.search(r"\b(when|quando)\b", lower))
    has_then = bool(re.search(r"\b(then|ent[aã]o)\b", lower))

    if not has_given:
        failures.append("AC must start with or contain 'Given' (or legacy 'Dado')")
    if not has_when:
        failures.append("AC must contain 'when' (or legacy 'quando')")
    if not has_then:
        failures.append("AC must contain 'then' (or legacy 'então')")

    starts_with_given = bool(re.match(r"^(given|dado)\b", lower.strip()))
    if has_given and not starts_with_given:
        failures.append("AC should start with 'Given' (or legacy 'Dado')")

    return len(failures) == 0, failures


def validate_ac(ac: str) -> list[str]:
    """Return list of adjetivo/GWT filter failures. Empty list = passed."""
    failures: list[str] = []
    lower = ac.lower()

    for pattern, required_proxy in TRIGGER_WORDS.items():
        if re.search(pattern, lower, re.IGNORECASE):
            if "nunca aceito" in required_proxy or "never accepted" in required_proxy:
                failures.append(
                    f"Trigger word detected ({pattern}): {required_proxy}"
                )
            elif not has_measurable_proxy(ac):
                failures.append(
                    f"Trigger word detected ({pattern}): requires proxy — {required_proxy}"
                )

    _, gwt_failures = has_gwt_grammar(ac)
    failures.extend(gwt_failures)

    vague = re.search(
        r"\b(correctamente|corretamente|funciona bem|works? fine|as expected)\b",
        lower,
    )
    if vague:
        failures.append(
            f"Vague outcome ('{vague.group()}'): specify observable result"
        )

    return failures


def validate_all_acs(acs: list[str]) -> list[tuple[int, str, list[str]]]:
    results: list[tuple[int, str, list[str]]] = []
    for i, ac in enumerate(acs, start=1):
        failures = validate_ac(ac.strip())
        if failures:
            results.append((i, ac, failures))
    return results


def strip_anchor_line(line: str) -> str:
    """Remove corpus anchor suffix (→ docs/ref/... or [invented])."""
    return re.sub(r"\s*→\s*.*$", "", line).strip()


def find_section_bounds(text: str, headings: tuple[str, ...]) -> tuple[int, int] | None:
    lines = text.splitlines()
    start = None
    for i, line in enumerate(lines):
        if line.strip().lower() in headings:
            start = i + 1
            break
    if start is None:
        return None

    end = len(lines)
    for j in range(start, len(lines)):
        if lines[j].startswith("## ") and lines[j].strip().lower() not in headings:
            end = j
            break
    return start, end


def read_ac_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    bounds = find_section_bounds(text, AC_SECTION_HEADINGS)

    if bounds:
        section_lines = text.splitlines()[bounds[0] : bounds[1]]
    else:
        section_lines = text.splitlines()

    acs: list[str] = []
    buffer: list[str] = []

    for raw_line in section_lines:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            if buffer:
                acs.append(strip_anchor_line(" ".join(buffer)))
                buffer = []
            continue

        if re.match(r"^\d+[\.\)]\s*", line):
            if buffer:
                acs.append(strip_anchor_line(" ".join(buffer)))
            buffer = [re.sub(r"^\d+[\.\)]\s*", "", line)]
        elif line.startswith("- ") and not buffer:
            continue
        elif line.startswith("→"):
            continue
        else:
            buffer.append(line)

    if buffer:
        acs.append(strip_anchor_line(" ".join(buffer)))

    return [a for a in acs if a.strip()]


def extract_bar_from_slice(text: str) -> tuple[str, str, str] | None:
    bounds = find_section_bounds(text, BAR_SECTION_HEADINGS)
    if not bounds:
        return None

    section = "\n".join(text.splitlines()[bounds[0] : bounds[1]])
    ref_match = re.search(r"\*\*Refer[eê]ncia:\*\*\s*(.+)", section, re.IGNORECASE)
    just_match = re.search(r"\*\*Justificativa:\*\*\s*(.+)", section, re.IGNORECASE)
    ruim_match = re.search(
        r"\*\*Reconhecidamente ruim:\*\*\s*(.+)", section, re.IGNORECASE
    )

    if not ref_match:
        ref_match = re.search(r"\*\*Reference:\*\*\s*(.+)", section, re.IGNORECASE)
    if not just_match:
        just_match = re.search(r"\*\*Rationale:\*\*\s*(.+)", section, re.IGNORECASE)
    if not ruim_match:
        ruim_match = re.search(
            r"\*\*Recognizably bad:\*\*\s*(.+)", section, re.IGNORECASE
        )

    if not ref_match:
        return None

    bar = ref_match.group(1).strip()
    justificativa = just_match.group(1).strip() if just_match else "Extracted from slice file"
    ruim = ruim_match.group(1).strip() if ruim_match else "no"
    return bar, justificativa, ruim


def extract_nao_objetivos_from_slice(text: str) -> list[str]:
    bounds = find_section_bounds(text, NON_GOALS_SECTION_HEADINGS)
    if not bounds:
        return []

    items: list[str] = []
    for line in text.splitlines()[bounds[0] : bounds[1]]:
        stripped = line.strip()
        if stripped.startswith("- "):
            item = stripped[2:].strip()
            if item and item not in ("(nenhum declarado)", "(none declared)"):
                items.append(item)
    return items


def infer_domain_from_path(path: Path) -> str | None:
    parts = path.parts
    try:
        prds_idx = parts.index("prds")
        if prds_idx + 1 < len(parts):
            candidate = parts[prds_idx + 1]
            if candidate.endswith(".md"):
                return None
            return candidate
    except ValueError:
        return None
    return None


def parent_prd_link(domain: str) -> str:
    folder_index = Path(f"docs/prds/{domain}/index.md")
    monolithic = Path(f"docs/prds/{domain}.md")
    if folder_index.exists() or (Path.cwd() / folder_index).exists():
        return f"../index.md"
    if monolithic.exists() or (Path.cwd() / monolithic).exists():
        return f"../{domain}.md"
    return f"../{domain}.md"


def prompt_acs_interactive() -> tuple[list[str], list[str]]:
    print("\n=== Acceptance criteria ===")
    print("Format: Given ..., when ..., then ...")
    print("One AC per line. Empty line ends.\n")

    acs: list[str] = []
    while True:
        ac = input(f"AC #{len(acs) + 1} (empty to finish): ").strip()
        if not ac:
            break

        failures = validate_ac(ac)
        while failures:
            print("\n  AC failed filter:")
            for f in failures:
                print(f"    - {f}")
            ac = input("  Rewrite AC: ").strip()
            if not ac:
                break
            failures = validate_ac(ac)

        if ac:
            acs.append(ac)

    if not acs:
        print("Error: at least one AC is required.", file=sys.stderr)
        sys.exit(1)

    print("\n=== Non-goals ===")
    print("One per line. Empty line ends.\n")
    nao_objetivos: list[str] = []
    while True:
        item = input(f"Non-goal #{len(nao_objetivos) + 1} (empty to finish): ").strip()
        if not item:
            break
        nao_objetivos.append(item)

    return acs, nao_objetivos


def prompt_levantamento_interactive() -> dict[str, str]:
    print("\n=== Requirements elicitation (five questions) ===\n")
    answers: dict[str, str] = {}
    for key, question in LEVANTAMENTO_QUESTIONS:
        answer = input(f"{key}: {question}\n> ").strip()
        answers[key] = answer
    return answers


def prompt_bar_interactive(project_root: Path) -> tuple[str, str, str]:
    ref_dir = project_root / "docs" / "ref"
    if ref_dir.is_dir():
        print(f"\nCorpus detected at {ref_dir}")
        print("Enter flow/section path, or leave empty for fallback.\n")
        corpus = input("Bar from corpus (empty = fallback): ").strip()
        if corpus:
            justificativa = (
                input("Rationale (one sentence): ").strip()
                or "Documented flow in corpus"
            )
            ruim = input("Recognizably bad bar? (yes/no) [no]: ").strip().lower()
            return corpus, justificativa, "yes" if ruim in ("sim", "s", "yes", "y") else "no"

    print("\n=== Bar (concrete external reference) ===")
    print("Options: real product, repo example, or measurable metric.\n")
    bar = input("Name the bar: ").strip()
    while not bar:
        print("Concrete bar is required.", file=sys.stderr)
        bar = input("Name the bar: ").strip()

    justificativa = (
        input("Rationale (one sentence): ").strip() or "User-selected reference"
    )
    ruim = input("Recognizably bad bar? (yes/no) [no]: ").strip().lower()
    return bar, justificativa, "yes" if ruim in ("sim", "s", "yes", "y") else "no"


def prompt_domain_interactive(project_root: Path) -> str:
    prds_dir = project_root / "docs" / "prds"
    domains: list[str] = []
    if prds_dir.is_dir():
        for entry in sorted(prds_dir.iterdir()):
            if entry.is_dir() and (entry / "index.md").exists():
                domains.append(entry.name)
            elif entry.suffix == ".md" and entry.name != "template.md":
                domains.append(entry.stem)

    if domains:
        print("\nKnown domains:", ", ".join(domains))
    domain = input("\nDomain slug (e.g. fintech-first): ").strip()
    while not domain:
        domain = input("Domain slug is required: ").strip()
    return domain


def prompt_codelets_interactive(acs: list[str]) -> str:
    print("\n=== Codelet decomposition ===")
    print("List codelets (empty line ends). Suggested format:")
    print("  N. Name — scope (ACs: #1,#2)\n")

    lines: list[str] = []
    n = 1
    while True:
        line = input(f"Codelet #{n} (empty to finish): ").strip()
        if not line:
            break
        if not re.match(r"^\d+\.", line):
            line = f"{n}. {line}"
        lines.append(line)
        n += 1

    if not lines:
        default = []
        for i, _ac in enumerate(acs, start=1):
            default.append(f"{i}. Codelet {i} — scope from AC #{i} (ACs: #{i})")
        return "\n".join(default)

    return "\n".join(lines)


def write_ac_file(
    project_root: Path,
    domain: str,
    slug: str,
    feature: str,
    bar: str,
    bar_justificativa: str,
    bar_ruim: str,
    acs: list[str],
    nao_objetivos: list[str],
    levantamento: dict[str, str] | None = None,
) -> Path:
    slice_dir = project_root / "docs" / "prds" / domain
    slice_dir.mkdir(parents=True, exist_ok=True)
    ac_path = slice_dir / f"{slug}.md"

    parent_link = parent_prd_link(domain)
    lines = [
        f"# Feature slice — {feature}",
        "",
        f"> Domain: [{domain}]({parent_link})",
        "> Status: draft — codelet execution contract",
        "",
    ]

    if levantamento:
        lines.extend(["## Requirements", "", "| Field | Answer |", "|-------|--------|"])
        field_map = [
            ("Actor", "Ator"),
            ("Trigger and precondition", "Gatilho e pré-condição"),
            ("Observable outcome", "Resultado observável"),
            ("Adversarial cases", "Casos adversos que importam"),
            ("Non-goals", "Não-objetivo"),
        ]
        for en_label, pt_key in field_map:
            answer = levantamento.get(pt_key, "")
            lines.append(f"| {en_label} | {answer} |")
        lines.append("")

    lines.extend(
        [
            "## Bar",
            "",
            f"**Reference:** {bar}",
            f"**Rationale:** {bar_justificativa}",
            f"**Recognizably bad:** {bar_ruim}",
            "",
            "## Acceptance criteria",
            "",
        ]
    )
    for i, ac in enumerate(acs, start=1):
        lines.append(f"{i}. {ac}")
        lines.append("")

    lines.extend(["## Non-goals", ""])
    if nao_objetivos:
        for item in nao_objetivos:
            lines.append(f"- {item}")
    else:
        lines.append("- (none declared)")

    lines.append("")
    ac_path.write_text("\n".join(lines), encoding="utf-8")
    return ac_path


def fill_template(
    feature: str,
    slug: str,
    domain: str,
    acs: list[str],
    bar: str,
    bar_justificativa: str,
    bar_ruim: str,
    nao_objetivos: list[str],
    codelets: str,
    harness_nivel: str = "detect at execution start",
    harness_comandos: str = "detect in repo (bin/dev, tests, MCP browser)",
    mode: str = "interactive",
) -> str:
    template = TEMPLATE_PATH.read_text(encoding="utf-8")

    criterios = "\n".join(f"{i}. {ac}" for i, ac in enumerate(acs, start=1))
    nao_obj = (
        "\n".join(f"- {x}" for x in nao_objetivos)
        if nao_objetivos
        else "- (none declared)"
    )
    bar_block = f"{bar}\nRationale: {bar_justificativa}\nRecognizably bad: {bar_ruim}"
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    replacements = {
        "[FEATURE]": feature,
        "[slug]": slug,
        "[domain]": domain,
        "[CRITERIOS_ACEITE]": criterios,
        "[BAR_REFERENCIA]": bar,
        "[BAR_JUSTIFICATIVA]": bar_justificativa,
        "[BAR_RUIM_SIM_NAO]": bar_ruim,
        "[BAR]": bar_block,
        "[NAO_OBJETIVOS]": nao_obj,
        "[LISTA_CODELETS]": codelets,
        "[HARNESS_NIVEL]": harness_nivel,
        "[HARNESS_COMANDOS]": harness_comandos,
        "[timestamp]": timestamp,
        "[interativo|parametrizado]": mode,
    }

    result = template
    for key, value in replacements.items():
        result = result.replace(key, value)

    return result


def is_repo_root(path: Path) -> bool:
    """Detect repo root — avoid confusing with docs/ inside .claude/skills/."""
    if (path / ".git").is_dir():
        return True
    markers = [
        path / "web" / "Gemfile",
        path / "docs" / "product-map.md",
        path / "frontend" / "app",
    ]
    return any(m.is_file() or m.is_dir() for m in markers)


def find_project_root(start: Path) -> Path:
    """Walk up from script and cwd until repo root is found."""
    candidates = [Path.cwd(), start]
    seen: set[Path] = set()

    for origin in candidates:
        current = origin.resolve()
        for _ in range(15):
            if current in seen:
                break
            seen.add(current)
            if is_repo_root(current):
                return current
            if current.parent == current:
                break
            current = current.parent

    cursor = SKILL_ROOT
    while cursor.name != ".cursor" and cursor.parent != cursor:
        cursor = cursor.parent
    if cursor.name == ".cursor":
        return cursor.parent
    return Path.cwd().resolve()


def run_validate_only(ac_path: Path) -> None:
    if not ac_path.is_file():
        print(f"Error: AC file not found: {ac_path}", file=sys.stderr)
        sys.exit(2)

    acs = read_ac_file(ac_path)
    if not acs:
        print("Error: no acceptance criteria found in file.", file=sys.stderr)
        sys.exit(2)

    failures = validate_all_acs(acs)
    if failures:
        print("Error: AC(s) failed quality filter:\n", file=sys.stderr)
        for idx, ac, reasons in failures:
            print(f"  AC #{idx}: {ac}", file=sys.stderr)
            for r in reasons:
                print(f"    - {r}", file=sys.stderr)
        sys.exit(1)

    print(f"✓ {len(acs)} acceptance criteria passed validation")
    sys.exit(0)


def run_interactive(project_root: Path) -> None:
    feature = input("\nFeature name: ").strip()
    if not feature:
        print("Error: feature name is required.", file=sys.stderr)
        sys.exit(1)

    domain = prompt_domain_interactive(project_root)
    slug = slugify(feature)
    print(f"Slug: {slug}")
    print(f"Path: docs/prds/{domain}/{slug}.md")

    levantamento = prompt_levantamento_interactive()
    acs, nao_objetivos = prompt_acs_interactive()
    bar, bar_just, bar_ruim = prompt_bar_interactive(project_root)
    codelets = prompt_codelets_interactive(acs)

    ac_path = write_ac_file(
        project_root,
        domain,
        slug,
        feature,
        bar,
        bar_just,
        bar_ruim,
        acs,
        nao_objetivos,
        levantamento=levantamento,
    )
    prompt_text = fill_template(
        feature,
        slug,
        domain,
        acs,
        bar,
        bar_just,
        bar_ruim,
        nao_objetivos,
        codelets,
        mode="interactive",
    )

    with tempfile.NamedTemporaryFile(
        mode="w",
        suffix=f"-codelet-loop-{slug}.md",
        delete=False,
        encoding="utf-8",
    ) as tmp:
        tmp.write(prompt_text)
        tmp_path = Path(tmp.name)

    print(f"\n✓ Feature slice written to: {ac_path}")
    print(f"✓ Prompt saved to: {tmp_path}")
    print("\n" + "=" * 60)
    print("FINAL PROMPT (paste into new agent chat):")
    print("=" * 60 + "\n")
    print(prompt_text)


def run_parametrized(args: argparse.Namespace, project_root: Path) -> None:
    if not args.feature:
        print("Error: --feature is required in parametrized mode.", file=sys.stderr)
        sys.exit(2)

    if not args.ac_file:
        print("Error: --ac-file is required with --sem-interacao.", file=sys.stderr)
        sys.exit(2)

    ac_path_input = Path(args.ac_file)
    if not ac_path_input.is_file():
        print(f"Error: AC file not found: {ac_path_input}", file=sys.stderr)
        sys.exit(2)

    slice_text = ac_path_input.read_text(encoding="utf-8")
    acs = read_ac_file(ac_path_input)
    if not acs:
        print("Error: no acceptance criteria found in file.", file=sys.stderr)
        sys.exit(2)

    failures = validate_all_acs(acs)
    if failures:
        print("Error: AC(s) failed quality filter:\n", file=sys.stderr)
        for idx, ac, reasons in failures:
            print(f"  AC #{idx}: {ac}", file=sys.stderr)
            for r in reasons:
                print(f"    - {r}", file=sys.stderr)
        sys.exit(1)

    domain = args.domain or infer_domain_from_path(ac_path_input)
    if not domain:
        print(
            "Error: --domain is required (could not infer from ac-file path).",
            file=sys.stderr,
        )
        sys.exit(2)

    # Use filename slug when ac-file is already a domain slice path
    slice_dir = project_root / "docs" / "prds" / domain
    if ac_path_input.resolve().parent == slice_dir.resolve():
        slug = ac_path_input.stem
    else:
        slug = slugify(args.feature)

    bar = args.bar
    bar_just = args.bar_justificativa
    bar_ruim = args.bar_ruim

    extracted = extract_bar_from_slice(slice_text)
    if extracted:
        ext_bar, ext_just, ext_ruim = extracted
        bar = bar or ext_bar
        bar_just = bar_just or ext_just
        bar_ruim = bar_ruim or ext_ruim

    if not bar:
        print(
            "Error: --bar is required (not found in slice file).",
            file=sys.stderr,
        )
        sys.exit(2)

    nao_objetivos: list[str] = []
    if args.nao_objetivos:
        nao_path = Path(args.nao_objetivos)
        if nao_path.is_file():
            nao_objetivos = [
                ln.strip().lstrip("- ").strip()
                for ln in nao_path.read_text(encoding="utf-8").splitlines()
                if ln.strip() and not ln.startswith("#")
            ]
        else:
            nao_objetivos = [args.nao_objetivos]
    else:
        nao_objetivos = extract_nao_objetivos_from_slice(slice_text)

    codelets = args.codelets or "\n".join(
        f"{i}. Codelet {i} — AC #{i}" for i in range(1, len(acs) + 1)
    )

    bar_just = bar_just or "Reference via --bar"
    bar_ruim = bar_ruim or "no"

    # Only write when ac-file is not already the target slice path
    target_path = slice_dir / f"{slug}.md"
    if ac_path_input.resolve() != target_path.resolve():
        ac_path = write_ac_file(
            project_root,
            domain,
            slug,
            args.feature,
            bar,
            bar_just,
            bar_ruim,
            acs,
            nao_objetivos,
        )
    else:
        ac_path = ac_path_input

    prompt_text = fill_template(
        args.feature,
        slug,
        domain,
        acs,
        bar,
        bar_just,
        bar_ruim,
        nao_objetivos,
        codelets,
        harness_nivel=args.harness_nivel or "detect at execution start",
        harness_comandos=args.harness_comandos or "detect in repo",
        mode="parametrized",
    )

    out_path = Path(args.output) if args.output else None
    if out_path:
        out_path.write_text(prompt_text, encoding="utf-8")
        print(f"✓ Prompt written to: {out_path}")
    else:
        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=f"-codelet-loop-{slug}.md",
            delete=False,
            encoding="utf-8",
        ) as tmp:
            tmp.write(prompt_text)
            print(f"✓ Prompt saved to: {tmp.name}")

    print(f"✓ Feature slice: {ac_path}")
    print(prompt_text)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build Codelet Loop prompt from feature slice or elicitation."
    )
    parser.add_argument(
        "--interativo",
        action="store_true",
        help="Interactive mode (default if no automation flags)",
    )
    parser.add_argument("--feature", help="Feature name")
    parser.add_argument(
        "--domain",
        help="Domain slug (e.g. fintech-first); inferred from ac-file path when possible",
    )
    parser.add_argument(
        "--ac-file",
        help="Feature slice or AC file (numbered GWT scenarios)",
    )
    parser.add_argument("--bar", help="Concrete external reference (bar)")
    parser.add_argument("--bar-justificativa", help="Bar rationale in one sentence")
    parser.add_argument(
        "--bar-ruim",
        choices=["sim", "não", "nao", "yes", "no"],
        help="Recognizably bad bar",
    )
    parser.add_argument(
        "--nao-objetivos",
        help="Non-goals file or inline text",
    )
    parser.add_argument(
        "--codelets",
        help="Codelet decomposition text (multiline via file recommended)",
    )
    parser.add_argument(
        "--sem-interacao",
        action="store_true",
        help="Parametrized mode — requires --feature and --ac-file",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate ACs in --ac-file and exit (no writes)",
    )
    parser.add_argument("--output", "-o", help="Path to save prompt (parametrized mode)")
    parser.add_argument(
        "--harness-nivel",
        choices=["A", "B", "C"],
        help="Pre-set harness level in prompt",
    )
    parser.add_argument(
        "--harness-comandos",
        help="Pre-filled verification commands in prompt",
    )
    parser.add_argument(
        "--project-root",
        type=Path,
        help="Project root (default: auto-detected)",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    project_root = args.project_root or find_project_root(SKILL_ROOT)

    if args.validate_only:
        if not args.ac_file:
            print("Error: --ac-file is required with --validate-only.", file=sys.stderr)
            sys.exit(2)
        run_validate_only(Path(args.ac_file))
        return

    if args.sem_interacao:
        run_parametrized(args, project_root)
    else:
        run_interactive(project_root)


if __name__ == "__main__":
    main()
