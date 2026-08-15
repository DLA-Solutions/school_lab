#!/usr/bin/env python3
"""
Colhe artigos de uma base de ajuda pública para um diretório local.

Detecta a plataforma e escolhe o método:
  - Zendesk Help Center  -> API pública (/api/v2/help_center/{locale}/articles.json)
  - sitemap.xml          -> lista de URLs filtrada por padrão de artigo
  - fallback             -> varredura de links a partir do índice, 1 nível

Saída:
  <out>/indice.json          metadados de todos os artigos
  <out>/artigos/<slug>.md    um arquivo por artigo, com cabeçalho de proveniência

Só stdlib. Nenhuma dependência.

Uso:
  python harvest.py --detect https://suporte.exemplo.com
  python harvest.py --url https://suporte.exemplo.com --out .corpus-raw/exemplo/ --rate 1.5
"""

import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

UA = "corpus-concorrente/1.0 (pesquisa de produto; contato via responsavel do projeto)"
TIMEOUT = 30


# ---------------------------------------------------------------- utilidades


def get(url, accept="text/html"):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": accept})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        charset = r.headers.get_content_charset() or "utf-8"
        return r.read().decode(charset, errors="replace")


def get_json(url):
    return json.loads(get(url, accept="application/json"))


def slugify(s, maxlen=80):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s-]", "", s).strip().lower()
    s = re.sub(r"[\s_-]+", "-", s)
    return (s[:maxlen] or "sem-titulo").strip("-")


def robots_allows(base):
    """Checagem leve: procura Disallow: / global. Não substitui ler os termos."""
    try:
        txt = get(urllib.parse.urljoin(base, "/robots.txt"), accept="text/plain")
    except Exception:
        return True, "robots.txt não encontrado"
    agent_all = False
    for line in txt.splitlines():
        line = line.split("#")[0].strip()
        if not line:
            continue
        k, _, v = line.partition(":")
        k, v = k.strip().lower(), v.strip()
        if k == "user-agent":
            agent_all = v == "*"
        elif k == "disallow" and agent_all and v == "/":
            return False, "robots.txt bloqueia tudo para User-agent: *"
    return True, "robots.txt sem bloqueio global"


class TextExtractor(HTMLParser):
    """Extrai texto legível, preservando quebras de bloco e marcando cabeçalhos."""

    SKIP = {"script", "style", "nav", "header", "footer", "noscript", "svg", "head", "title"}
    BLOCK = {"p", "div", "li", "tr", "br", "section", "article"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skip = 0
        self._h = None

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        elif re.fullmatch(r"h[1-6]", tag):
            self._h = int(tag[1])
            self.parts.append("\n\n" + "#" * min(self._h + 1, 6) + " ")
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        elif re.fullmatch(r"h[1-6]", tag):
            self._h = None
            self.parts.append("\n")

    def handle_data(self, data):
        if self._skip:
            return
        t = re.sub(r"[ \t\r\f\v]+", " ", data)
        if t.strip():
            self.parts.append(t)

    def text(self):
        out = "".join(self.parts)
        out = re.sub(r"\n{3,}", "\n\n", out)
        return out.strip()


def html_to_text(html):
    p = TextExtractor()
    try:
        p.feed(html)
    except Exception:
        pass
    return p.text()


class LinkGrabber(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for k, v in attrs:
                if k == "href" and v:
                    self.hrefs.append(v)


# ---------------------------------------------------------------- detecção


def zendesk_origin(base):
    """Zendesk API lives at scheme://host, not under /hc/<locale>."""
    p = urllib.parse.urlparse(base)
    return f"{p.scheme}://{p.netloc}"


def detect(base):
    """Devolve (plataforma, detalhe)."""
    host = urllib.parse.urlparse(base).netloc
    origin = zendesk_origin(base)

    for locale in ("pt-br", "pt", "en-us"):
        url = f"{origin.rstrip('/')}/api/v2/help_center/{locale}/articles.json?per_page=1"
        try:
            d = get_json(url)
            if isinstance(d, dict) and "articles" in d:
                return "zendesk", locale
        except Exception:
            continue

    try:
        sm = get(urllib.parse.urljoin(base, "/sitemap.xml"), accept="application/xml")
        if "<urlset" in sm or "<sitemapindex" in sm:
            return "sitemap", "/sitemap.xml"
    except Exception:
        pass

    try:
        html = get(base)
        if "intercom" in html.lower():
            return "intercom", host
        if "document360" in html.lower():
            return "document360", host
    except Exception:
        pass

    return "generico", host


# ---------------------------------------------------------------- coletores


def harvest_zendesk(base, locale, rate, limit):
    origin = zendesk_origin(base)
    arts, page = [], 1
    while True:
        url = (
            f"{origin.rstrip('/')}/api/v2/help_center/{locale}/articles.json"
            f"?per_page=100&page={page}"
        )
        d = get_json(url)
        batch = d.get("articles", [])
        if not batch:
            break
        for a in batch:
            arts.append(
                {
                    "id": a.get("id"),
                    "titulo": a.get("title", ""),
                    "url": a.get("html_url", ""),
                    "atualizado_em": (a.get("updated_at") or "")[:10],
                    "criado_em": (a.get("created_at") or "")[:10],
                    "secao_id": a.get("section_id"),
                    "corpo_html": a.get("body") or "",
                }
            )
            if limit and len(arts) >= limit:
                return arts
        if not d.get("next_page"):
            break
        page += 1
        time.sleep(rate)
    return arts


def sitemap_urls(base, path):
    out, queue, seen = [], [urllib.parse.urljoin(base, path)], set()
    while queue:
        u = queue.pop(0)
        if u in seen:
            continue
        seen.add(u)
        try:
            xml = get(u, accept="application/xml")
        except Exception:
            continue
        locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", xml)
        if "<sitemapindex" in xml:
            queue.extend(locs)
        else:
            out.extend(locs)
    return out


def harvest_urls(urls, rate, limit, pattern=None):
    arts = []
    for u in urls:
        if pattern and not re.search(pattern, u):
            continue
        try:
            html = get(u)
        except Exception as e:
            print(f"  ! {u} — {e}", file=sys.stderr)
            continue
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
        titulo = re.sub(r"\s+", " ", m.group(1)).strip() if m else u
        arts.append({"titulo": titulo, "url": u, "corpo_html": html, "atualizado_em": ""})
        print(f"  · {titulo[:70]}")
        if limit and len(arts) >= limit:
            break
        time.sleep(rate)
    return arts


def crawl_index(base, rate, limit):
    html = get(base)
    g = LinkGrabber()
    g.feed(html)
    host = urllib.parse.urlparse(base).netloc
    urls, seen = [], set()
    for h in g.hrefs:
        u = urllib.parse.urljoin(base, h).split("#")[0]
        if urllib.parse.urlparse(u).netloc == host and u not in seen:
            seen.add(u)
            urls.append(u)
    return harvest_urls(urls, rate, limit)


# ---------------------------------------------------------------- escrita


def write(arts, outdir, concorrente):
    adir = os.path.join(outdir, "artigos")
    os.makedirs(adir, exist_ok=True)
    indice = []
    for i, a in enumerate(arts, 1):
        slug = f"{i:04d}-{slugify(a['titulo'])}"
        texto = html_to_text(a.get("corpo_html", ""))
        path = os.path.join(adir, slug + ".md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(
                f"<!-- fonte: {a.get('url','')} -->\n"
                f"<!-- concorrente: {concorrente} -->\n"
                f"<!-- atualizado_em: {a.get('atualizado_em','')} -->\n"
                f"<!-- colhido_em: {time.strftime('%Y-%m-%d')} -->\n\n"
                f"# {a.get('titulo','')}\n\n{texto}\n"
            )
        indice.append(
            {
                "arquivo": os.path.relpath(path, outdir),
                "titulo": a.get("titulo", ""),
                "url": a.get("url", ""),
                "atualizado_em": a.get("atualizado_em", ""),
                "secao_id": a.get("secao_id"),
                "caracteres": len(texto),
            }
        )
    with open(os.path.join(outdir, "indice.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "concorrente": concorrente,
                "colhido_em": time.strftime("%Y-%m-%d"),
                "total": len(indice),
                "artigos": indice,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    return len(indice)


# ---------------------------------------------------------------- cli


def main():
    ap = argparse.ArgumentParser(description="Colhe base de ajuda pública.")
    ap.add_argument("--url", help="URL base da central de ajuda")
    ap.add_argument("--detect", metavar="URL", help="só detecta a plataforma e sai")
    ap.add_argument("--out", default=None, help="diretório de saída")
    ap.add_argument("--rate", type=float, default=1.5, help="segundos entre requisições")
    ap.add_argument("--limit", type=int, default=0, help="teto de artigos (0 = sem teto)")
    ap.add_argument("--pattern", default=None, help="regex para filtrar URLs de artigo")
    ap.add_argument("--force", action="store_true", help="ignora bloqueio do robots.txt")
    args = ap.parse_args()

    base = args.detect or args.url
    if not base:
        ap.error("informe --url ou --detect")

    plat, det = detect(base)
    print(f"plataforma: {plat} ({det})")
    if args.detect:
        ok, msg = robots_allows(base)
        print(f"robots: {msg}")
        return

    ok, msg = robots_allows(base)
    print(f"robots: {msg}")
    if not ok and not args.force:
        print("Bloqueado pelo robots.txt. Confira os termos de uso antes de seguir.")
        print("Se o uso for legítimo e permitido, repita com --force.")
        sys.exit(2)

    concorrente = urllib.parse.urlparse(base).netloc.split(".")[-2]
    outdir = args.out or f".corpus-raw/{concorrente}/"
    os.makedirs(outdir, exist_ok=True)

    if plat == "zendesk":
        arts = harvest_zendesk(base, det, args.rate, args.limit)
    elif plat == "sitemap":
        urls = sitemap_urls(base, det)
        print(f"sitemap: {len(urls)} urls")
        arts = harvest_urls(urls, args.rate, args.limit, args.pattern)
    else:
        print("sem API nem sitemap — varrendo links do índice")
        arts = crawl_index(base, args.rate, args.limit)

    n = write(arts, outdir, concorrente)
    print(f"\n{n} artigos em {outdir}")
    print("Próximo: classificar por domínio (fase 2) e extrair (fase 3).")


if __name__ == "__main__":
    main()
