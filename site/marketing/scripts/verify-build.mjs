import { access, readdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const indexPath = join(distDirectory, 'index.html');
const failures = [];

await access(indexPath).catch(() => {
  failures.push('dist/index.html is missing; run the production build first.');
});

if (failures.length === 0) {
  const html = await readFile(indexPath, 'utf8');
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const textFiles = await collectTextFiles(distDirectory);
  const outputText = (
    await Promise.all(textFiles.map((path) => readFile(path, 'utf8')))
  ).join('\n');
  const descriptionValues = [
    ...html.matchAll(
      /(?:name|property)="(?:description|og:description|twitter:description)"\s+content="([^"]+)"/gi,
    ),
  ].map((match) => match[1]);

  check(/<html\s+lang="pt-BR"/i.test(html), 'document language is pt-BR');
  check((html.match(/<h1\b/gi) ?? []).length === 1, 'document contains exactly one h1');
  check(
    visibleText.includes(
      'Toda escola constrói um legado. A gestão precisa estar à altura dele.',
    ),
    'exact approved headline is crawlable',
  );
  check(
    visibleText.includes(
      'Uma plataforma para reunir a operação acadêmica, financeira, documental e a relação com as famílias — pensada para escolas particulares brasileiras.',
    ),
    'supporting copy is crawlable',
  );
  check(visibleText.includes('Scholar Premium'), 'public brand is present');
  check(
    descriptionValues.length === 3 &&
      descriptionValues.every((description) =>
        /^Uma plataforma (?:para|em evolução)/i.test(description),
      ),
    'public metadata uses qualified platform-direction language',
  );
  check(
    !/Scholar Premium reúne|plataforma (?:que )?reúne|Gestão escolar para escolas/i.test(
      outputText,
    ),
    'completion wording is absent from public output',
  );
  check(
    !/\bSchool Lab\b|\bSchoolLab\b|\bschool_lab\b/.test(outputText),
    'internal names are absent from built customer output',
  );
  check(
    html.includes('href="#main-content"') &&
      html.indexOf('href="#main-content"') < html.indexOf('<header'),
    'skip link precedes site navigation',
  );
  check(
    (html.match(/href="#/g) ?? []).length === 1 &&
      html.includes('href="#main-content"'),
    'header contains no fragment links to indistinct content',
  );
  check(
    /<canvas\b[^>]*aria-hidden="true"[^>]*tabindex="-1"/i.test(html),
    'decorative canvas is hidden and non-focusable',
  );
  check(
    html.includes(
      'mailto:contato@diegonovais.com.br?subject=Agendar%20demonstra%C3%A7%C3%A3o%20%E2%80%94%20Scholar%20Premium',
    ) && visibleText.includes('Agendar demonstração'),
    'demo CTA keeps the provisional email destination and subject',
  );
  check(
    html.includes(
      'href="https://scholarpremium.com.br/app/authentication/signin"',
    ),
    'platform CTA targets the deployed product instead of preview fallback',
  );
  check(
    !/class="legacy-thread"/i.test(html),
    'decorative gold legacy thread is absent from built output',
  );
  check(
    /:is\(a,button,\[tabindex\]\):focus[,{]/.test(outputText) &&
      /:focus-visible/.test(outputText) &&
      /\.button:focus/.test(outputText) &&
      /box-shadow/.test(outputText),
    'focus styling has explicit outline and ring mechanisms',
  );
  check(
    /<link\s+rel="canonical"\s+href="https:\/\/scholarpremium\.com\.br\/"/i.test(html),
    'canonical metadata is present',
  );
  check(
    /property="og:title"/i.test(html) &&
      /property="og:description"/i.test(html) &&
      /property="og:image"/i.test(html),
    'Open Graph metadata is present',
  );
  check(
    !/\/api\/v1\b/.test(outputText),
    'built output contains no API dependency',
  );
  check(
    !/googletagmanager|google-analytics|gtag\s*\(|mixpanel|segment\.com|amplitude\/analytics/i.test(
      outputText,
    ),
    'built output contains no analytics SDK marker',
  );
  check(
    /(?:src|href)="\.\/assets\/[^"]+-[A-Za-z0-9_-]{8,}\.(?:js|css)"/i.test(html),
    'compiled JavaScript or CSS uses a hashed relative asset path',
  );
  check(
    !/(?:src|href)="\/assets\//i.test(html),
    'marketing assets use relative-safe paths',
  );

  for (const sectionId of [
    'legado',
    'confianca',
    'pilares',
    'privacidade',
    'fechamento',
  ]) {
    check(html.includes(`id="${sectionId}"`), `frame section #${sectionId} is present`);
  }

  check(
    visibleText.includes('O problema não é falta de software.') &&
      visibleText.includes('Uma escola conectada') &&
      visibleText.includes('Privacidade por desenho'),
    'scroll narrative copy is crawlable without JavaScript',
  );

  const viteManifest = JSON.parse(
    await readFile(join(distDirectory, '.vite', 'manifest.json'), 'utf8'),
  );
  const sceneEntry =
    viteManifest['src/three/cap-scene.ts'] ??
    Object.values(viteManifest).find(
      (candidate) =>
        candidate.src === 'src/three/cap-scene.ts' ||
        String(candidate.file).includes('cap-scene'),
    );
  const mainEntry = viteManifest['index.html'];
  const sceneChunkBytes = sceneEntry?.file
    ? await stat(join(distDirectory, sceneEntry.file)).then((metadata) => metadata.size)
    : 0;
  const mainChunkBytes = mainEntry?.file
    ? await stat(join(distDirectory, mainEntry.file)).then((metadata) => metadata.size)
    : 0;
  check(
    sceneEntry?.isDynamicEntry === true &&
      !mainEntry?.imports?.includes('src/three/cap-scene.ts'),
    'Three.js cap scene is a lazy dynamic entry',
  );
  check(
    sceneChunkBytes > 0 && sceneChunkBytes < 700_000 && mainChunkBytes < 12_000,
    'lazy cap scene remains tree-shaken and outside the small initial module',
  );

  const manifest = JSON.parse(
    await readFile(join(distDirectory, 'site.webmanifest'), 'utf8'),
  );
  check(
    manifest.name === 'Scholar Premium' &&
      manifest.lang === 'pt-BR' &&
      /^Uma plataforma (?:para|em evolução)/i.test(manifest.description),
    'manifest preserves public brand, locale, and qualified direction',
  );

  const modelPath = join(distDirectory, 'assets', 'scholar-premium-graduation-cap.glb');
  const modelBytes = await stat(modelPath)
    .then((metadata) => metadata.size)
    .catch(() => 0);
  check(modelBytes > 2_000_000, 'repository-owned GLB is included in the build');

  await access(join(distDirectory, 'assets', 'scholar-premium-lockup.png'))
    .then(() => check(true, 'official lockup is included in the build'))
    .catch(() => check(false, 'official lockup is included in the build'));

  for (const poster of [
    'scholar-premium-cap-poster.webp',
    'scholar-premium-cap-poster.png',
    'scholar-premium-cap-poster-mobile.webp',
    'scholar-premium-og.webp',
  ]) {
    await access(join(distDirectory, 'assets', poster))
      .then(() => check(true, `${poster} is included in the build`))
      .catch(() => check(false, `${poster} is included in the build`));
  }
}

if (failures.length > 0) {
  console.error('\nMarketing site verification failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('\nMarketing site verification passed.');
}

function check(condition, description) {
  if (condition) {
    console.log(`✓ ${description}`);
  } else {
    console.error(`✗ ${description}`);
    failures.push(description);
  }
}

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectTextFiles(path);
      }

      return ['.css', '.html', '.js', '.json', '.svg', '.txt', '.webmanifest'].includes(
        extname(entry.name),
      )
        ? [path]
        : [];
    }),
  );

  return nested.flat();
}
