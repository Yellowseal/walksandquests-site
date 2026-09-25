// Generates district SEO pages (7 languages), the /districts/ hub, a "districts" block on
// each home page, sitemap.xml and robots.txt — from the app's own quest data.
//
//   node --import ./_build/register.mjs _build/build-districts.mjs [path/to/BarcelonaQuest]
//
// Run from the site root. Default app path: ../BarcelonaQuest. Idempotent: re-run after
// quest content changes. Hand-written prose lives in _build/content/<lang>.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const SITE = 'https://walksandquests.com';
const PLAY = 'https://play.google.com/store/apps/details?id=com.walksandquests.barcelona';
const LANGS = ['en', 'es', 'fr', 'it', 'de', 'pl', 'ru'];
const LANG_LABEL = { en: 'English', es: 'Español', fr: 'Français', it: 'Italiano', de: 'Deutsch', pl: 'Polski', ru: 'Русский' };
const APP = path.resolve(process.argv[2] || '../BarcelonaQuest');
const ROOT = process.cwd();

// zone key (app) -> slug, locale key, sample stop ids (hand-picked: iconic + a hidden one; no perishable venues)
const DISTRICTS = [
  ['el Barri Gòtic', 'gothic-quarter', 'gothic', ['roman-1', 'call-1', 'stone-1']],
  ['Sant Pere, Santa Caterina i la Ribera', 'el-born', 'born', ['born-blood-1', 'born-guild-2', 'born-lens-1']],
  ['el Raval', 'el-raval', 'raval', ['raval-medieval-1', 'raval-medieval-2', 'raval-postcard-1']],
  ['la Barceloneta', 'barceloneta', 'barceloneta', ['bcn-beach-3', 'bcn-food-5', 'bcn-view6-2']],
  ['02', 'eixample', 'eixample', ['eix-gaudi-3', 'eix-hidden-1', 'eix-cult2-1']],
  ['06', 'gracia', 'gracia', ['gr-cult2-1', 'gr-cult1-4', 'gr-cult2-3']],
  ['03', 'sants-montjuic', 'santsMontjuic', ['smj-cult1-2', 'smj-views1-2', 'smj-hidden1-1']],
  ['10', 'sant-marti', 'santMarti', ['sm-cult-1', 'sm-views1-1', 'sm-cult-6']],
  ['05', 'sarria-sant-gervasi', 'sarriaSantGervasi', ['sg-gaudi1-3', 'sg-cult1-5', 'sg-views1-5']],
  ['04', 'les-corts', 'lesCorts', ['lc-gaudi1-1', 'lc-culture1-3', 'lc-hidden2-3']],
  ['07', 'horta-guinardo', 'hortaGuinardo', ['hg-cult2-3', 'hg-views2-2', 'hg-cult1-1']],
  ['09', 'sant-andreu', 'santAndreu', ['sandreu-hidden1-3', 'sandreu-hidden1-2', 'sandreu-culture2-1']],
  ['08', 'nou-barris', 'nouBarris', ['nb-views1-3', 'nb-culture1-3', 'nb-views1-1']],
];
const CAT_ORDER = ['culture', 'gaudi', 'views', 'hidden', 'foodie', 'nightlife', 'beach'];

// ---------- load data ----------
const { ALL_QUESTS } = await import(pathToFileURL(path.join(APP, 'src/data/quests.js')).href);
const { FREE_QUEST_IDS = [] } = await import(pathToFileURL(path.join(APP, 'src/data/access.js')).href).catch(() => ({}));
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const OVERLAY = {}, LOCALE = {}, CONTENT = {};
for (const L of LANGS) {
  if (L !== 'en') OVERLAY[L] = readJSON(path.join(APP, 'src/data/i18n', L + '.json'));
  LOCALE[L] = readJSON(path.join(APP, 'src/i18n/locales', L + '.json'));
  CONTENT[L] = (await import(pathToFileURL(path.join(ROOT, '_build/content', L + '.mjs')).href)).default;
}
const FREE = new Set(FREE_QUEST_IDS.length ? FREE_QUEST_IDS : ['gotic-culture-roman', 'gotic-foodie-classics', 'gotic-views-icons', 'eix-gaudi']);

const tq = (L, q, f) => (L !== 'en' && OVERLAY[L].quests[q.id]?.[f]) || q[f];
const ts = (L, s, f) => (L !== 'en' && OVERLAY[L].stops[s.id]?.[f]) || s[f];
const dName = (L, key) => LOCALE[L].districts?.[key]?.name || LOCALE.en.districts[key].name;
const dDesc = (L, key) => LOCALE[L].districts?.[key]?.desc || LOCALE.en.districts[key].desc;
const catTitle = (L, c) => LOCALE[L].categories?.[c]?.title || LOCALE.en.categories[c].title;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pre = (L) => (L === 'en' ? '' : '/' + L);
const hubUrl = (L) => `${pre(L)}/districts/`;
const dUrl = (L, slug) => `${pre(L)}/districts/${slug}/`;

const byZone = {};
for (const q of ALL_QUESTS) (byZone[q.zone] ||= []).push(q);
const stopIndex = {};
for (const q of ALL_QUESTS) for (const s of q.stops) stopIndex[s.id] = { s, q };
for (const [zone, slug, , picks] of DISTRICTS) {
  if (!byZone[zone]) throw new Error('No quests for zone ' + zone);
  for (const id of picks) if (!stopIndex[id]) throw new Error(`Stop ${id} (${slug}) not found`);
}

// ---------- shared template bits ----------
const baseCss = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
const extraCss = `
  .crumbs { font-size:.85rem; color:var(--muted); margin:0 0 1.2rem; }
  .crumbs a { color:var(--muted); }
  header.page { padding:4rem 0 2rem; text-align:left; }
  header.page h1 { margin-bottom:.6rem; }
  header.page .lede { margin:0 0 1.2rem; max-width:none; }
  .intro { font-size:1.08rem; max-width:44rem; }
  .facts { display:flex; flex-wrap:wrap; gap:.5rem 1.4rem; color:var(--muted); font-size:.92rem; margin:0; padding:0; list-style:none; }
  .facts b { color:var(--teal-text); }
  .stop h3 { margin-bottom:.2rem; }
  .stop .from { font-size:.8rem; color:var(--muted); margin:0 0 .6rem; }
  .stop .short { font-weight:600; }
  .qcat { margin:1.8rem 0 .6rem; font-size:.8rem; letter-spacing:.1em; text-transform:uppercase; color:var(--teal-text); }
  .qlist { list-style:none; margin:0; padding:0; display:grid; gap:.7rem; }
  .qlist li { border:1px solid var(--rule); border-radius:12px; padding:.85rem 1.1rem; }
  .qlist .qt { font-weight:600; }
  .qlist .qs { color:var(--muted); font-size:.93rem; }
  .qlist .qm { font-size:.82rem; color:var(--muted); }
  .tag { display:inline-block; font-size:.72rem; font-weight:600; color:var(--teal-text); border:1px solid var(--teal); border-radius:999px; padding:.05rem .5rem; margin-left:.4rem; vertical-align:middle; }
  .dgrid { list-style:none; margin:0; padding:0; display:grid; gap:.9rem; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); }
  .dgrid a { display:block; text-decoration:none; color:inherit; background:var(--card); border:1px solid var(--rule); border-radius:14px; padding:1rem 1.2rem; height:100%; }
  .dgrid a:hover { border-color:var(--teal); }
  .dgrid b { display:block; color:var(--fg); }
  .dgrid span { color:var(--muted); font-size:.9rem; }
  .dgrid .n { color:var(--teal-text); font-size:.8rem; margin-top:.3rem; display:block; }
  .dlong p { font-size:.95rem; color:var(--fg); margin:.4rem 0 0; }
  .cta-box { text-align:center; }
  .cta-box .cta { margin-top:1rem; }
  .plinks { display:flex; flex-wrap:wrap; gap:.4rem .9rem; font-size:.92rem; }
`;

function head(L, { title, desc, urlFor, jsonld }) {
  const alts = LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE}${urlFor(l)}">`).join('\n');
  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#45B5AA">
<link rel="canonical" href="${SITE}${urlFor(L)}">
${alts}
<link rel="alternate" hreflang="x-default" href="${SITE}${urlFor('en')}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE}${urlFor(L)}">
<meta property="og:image" content="${SITE}/assets/discover_${L}.png">
<link rel="icon" type="image/png" href="/assets/WQ_logo.png">
<link rel="apple-touch-icon" href="/assets/WQ_logo.png">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${baseCss}${extraCss}</style>
</head>
<body>`;
}
function langSwitch(L, urlFor) {
  return `<nav class="lang-switch" aria-label="Language">\n` + LANGS.map((l) =>
    l === L ? `<span class="lang-current" aria-current="page">${LANG_LABEL[l]}</span>` : `<a href="${urlFor(l)}" hreflang="${l}">${LANG_LABEL[l]}</a>`).join('\n') + `\n</nav>`;
}
function ctaSection(L) {
  const u = CONTENT[L].ui;
  const badge = LANGS.includes(L) ? '/assets/google-play-badge.png' : '';
  return `<section><div class="wrap cta-box">
<h2 style="display:inline-block">${esc(u.ctaTitle)}</h2>
<p>${esc(u.ctaText)}</p>
<div class="cta">
<a class="badge-play" href="${PLAY}&hl=${L}"><img src="${badge}" alt="Google Play"></a>
<a class="btn" href="#" aria-disabled="true">${esc(u.appStore)}</a>
</div>
</div></section>`;
}
function footer(L) {
  const p = pre(L);
  return `<footer>
<div class="wrap foot-row">
<div><p>Barcelona Walks &amp; Quests<br>Stanislav Kotyk · Manresa, Catalonia, Spain</p></div>
<div><p><a href="${p}/">${esc(CONTENT[L].ui.home)}</a> · <a href="${hubUrl(L)}">${esc(CONTENT[L].ui.allDistricts)}</a> · <a href="${p}/privacy/">Privacy</a> · <a href="${p}/terms/">Terms</a></p></div>
</div>
</footer>
</body>
</html>
`;
}
const appLd = { '@type': 'MobileApplication', name: 'Barcelona Walks & Quests', operatingSystem: 'Android', applicationCategory: 'TravelApplication', url: SITE + '/', installUrl: PLAY, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } };

function districtStats(zone) {
  const qs = byZone[zone];
  return { n: qs.length, s: qs.reduce((a, q) => a + q.stops.length, 0) };
}

// ---------- district pages ----------
const written = [];
function write(rel, html) {
  const f = path.join(ROOT, rel, 'index.html');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, html);
  written.push(rel);
}

for (const L of LANGS) {
  const u = CONTENT[L].ui;
  for (const [zone, slug, key, picks] of DISTRICTS) {
    const name = dName(L, key);
    const { n, s } = districtStats(zone);
    const urlFor = (l) => dUrl(l, slug);
    const stops = picks.map((id) => stopIndex[id]);
    const jsonld = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: u.home, item: SITE + pre(L) + '/' },
        { '@type': 'ListItem', position: 2, name: u.allDistricts, item: SITE + hubUrl(L) },
        { '@type': 'ListItem', position: 3, name, item: SITE + urlFor(L) } ] },
      { '@type': 'TouristDestination', name: `${name}, Barcelona`, description: CONTENT[L].intros[slug], url: SITE + urlFor(L),
        containedInPlace: { '@type': 'City', name: 'Barcelona' },
        includesAttraction: stops.map(({ s: st }) => ({ '@type': 'TouristAttraction', name: ts(L, st, 'name'), description: ts(L, st, 'short'),
          geo: { '@type': 'GeoCoordinates', latitude: st.lat, longitude: st.lng } })) },
      { '@type': 'ItemList', name: u.questsHeading(name), itemListElement: byZone[zone].map((q, i) => ({ '@type': 'ListItem', position: i + 1,
          item: { '@type': 'TouristTrip', name: tq(L, q, 'title'), description: tq(L, q, 'subtitle'), provider: { '@type': 'Organization', name: 'Barcelona Walks & Quests' } } })) },
      appLd ] };

    const cats = CAT_ORDER.filter((c) => byZone[zone].some((q) => q.category === c));
    const questsHtml = cats.map((c) => `<p class="qcat">${esc(catTitle(L, c))}</p>\n<ul class="qlist">\n` +
      byZone[zone].filter((q) => q.category === c).map((q) => `<li><span class="qt">${esc(tq(L, q, 'title'))}</span>${FREE.has(q.id) ? `<span class="tag">${esc(u.freeTag)}</span>` : ''}<br><span class="qs">${esc(tq(L, q, 'subtitle'))}</span><br><span class="qm">${esc([q.duration, q.distance, u.stopsN(q.stops.length)].filter(Boolean).join(' · '))}</span></li>`).join('\n') + `\n</ul>`).join('\n');

    const stopsHtml = stops.map(({ s: st, q }) => `<div class="card stop">
<h3>${esc(ts(L, st, 'name'))}</h3>
<p class="from">${esc(u.inQuest)}: ${esc(tq(L, q, 'title'))}</p>
<p class="short">${esc(ts(L, st, 'short'))}</p>
<p>${esc(ts(L, st, 'description'))}</p>
</div>`).join('\n');

    const others = DISTRICTS.filter((d) => d[1] !== slug).map((d) => `<a href="${dUrl(L, d[1])}">${esc(dName(L, d[2]))}</a>`).join('\n');

    const html = head(L, { title: u.pageTitle(name), desc: u.metaDesc(name, n, s), urlFor, jsonld }) + `
<header class="page">
${langSwitch(L, urlFor)}
<div class="wrap">
<p class="crumbs"><a href="${pre(L)}/">${esc(u.home)}</a> › <a href="${hubUrl(L)}">${esc(u.allDistricts)}</a> › ${esc(name)}</p>
<h1>${esc(name)}</h1>
<p class="lede">${esc(dDesc(L, key))}</p>
<ul class="facts"><li>${esc(u.questsCount(n))}</li><li>${esc(u.stopsN(s))}</li></ul>
</div>
</header>

<section><div class="wrap">
<p class="intro">${esc(CONTENT[L].intros[slug])}</p>
</div></section>

<section><div class="wrap">
<h2>${esc(u.stopsHeading)}</h2>
<div class="cols">
${stopsHtml}
</div>
<p class="cta-note" style="margin-top:1rem">${esc(u.stopsNote)}</p>
</div></section>

<section><div class="wrap">
<h2>${esc(u.questsHeading(name))}</h2>
${questsHtml}
</div></section>

${ctaSection(L)}

<section><div class="wrap">
<h2>${esc(u.otherDistricts)}</h2>
<div class="plinks">
${others}
</div>
</div></section>
` + footer(L);
    write(`${pre(L).slice(1) ? pre(L).slice(1) + '/' : ''}districts/${slug}`, html);
  }

  // ---------- hub ----------
  const urlFor = (l) => hubUrl(l);
  const cards = DISTRICTS.map(([zone, slug, key]) => {
    const { n } = districtStats(zone);
    return `<li><a href="${dUrl(L, slug)}"><b>${esc(dName(L, key))}</b><span>${esc(dDesc(L, key))}</span><span class="n">${esc(u.questsCount(n))}</span></a></li>`;
  }).join('\n');
  const long = DISTRICTS.map(([zone, slug, key]) => `<div class="dlong"><h3><a href="${dUrl(L, slug)}">${esc(dName(L, key))}</a></h3><p>${esc(CONTENT[L].intros[slug])}</p></div>`).join('\n');
  const hubLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: u.home, item: SITE + pre(L) + '/' },
      { '@type': 'ListItem', position: 2, name: u.allDistricts, item: SITE + hubUrl(L) } ] },
    { '@type': 'ItemList', name: u.hubTitle, itemListElement: DISTRICTS.map(([, slug, key], i) => ({ '@type': 'ListItem', position: i + 1, name: dName(L, key), url: SITE + dUrl(L, slug) })) },
    appLd ] };
  write(`${pre(L).slice(1) ? pre(L).slice(1) + '/' : ''}districts`, head(L, { title: u.hubMetaTitle, desc: u.hubMeta, urlFor, jsonld: hubLd }) + `
<header class="page">
${langSwitch(L, urlFor)}
<div class="wrap">
<p class="crumbs"><a href="${pre(L)}/">${esc(u.home)}</a> › ${esc(u.allDistricts)}</p>
<h1>${esc(u.hubTitle)}</h1>
<p class="lede">${esc(u.hubLede)}</p>
</div>
</header>
<section><div class="wrap"><ul class="dgrid">
${cards}
</ul></div></section>
<section><div class="wrap cols" style="grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))">
${long}
</div></section>
${ctaSection(L)}
` + footer(L));

  // ---------- home page block ----------
  const homeFile = path.join(ROOT, pre(L).slice(1), 'index.html');
  let home = fs.readFileSync(homeFile, 'utf8');
  const block = `<!-- districts:start (generated by _build/build-districts.mjs) -->
<section id="districts">
<div class="wrap">
<h2>${esc(u.homeSectionTitle)}</h2>
<p>${esc(u.homeSectionLede)}</p>
<style>.dgrid{list-style:none;margin:0;padding:0;display:grid;gap:.9rem;grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))}.dgrid a{display:block;text-decoration:none;color:inherit;background:var(--card);border:1px solid var(--rule);border-radius:14px;padding:.9rem 1.1rem;height:100%}.dgrid a:hover{border-color:var(--teal)}.dgrid b{display:block}.dgrid span{color:var(--muted);font-size:.88rem}</style>
<ul class="dgrid">
${DISTRICTS.map(([, slug, key]) => `<li><a href="${dUrl(L, slug)}"><b>${esc(dName(L, key))}</b><span>${esc(dDesc(L, key))}</span></a></li>`).join('\n')}
</ul>
<p style="margin-top:1rem"><a href="${hubUrl(L)}">${esc(u.allDistricts)} →</a></p>
</div>
</section>
<!-- districts:end -->`;
  if (home.includes('<!-- districts:start')) {
    home = home.replace(/<!-- districts:start[\s\S]*?<!-- districts:end -->/, block);
  } else {
    // insert right before the "What is inside" stats section's parent <section>
    const idx = home.indexOf('<ul class="stats">');
    const secStart = home.lastIndexOf('<section>', idx);
    if (idx < 0 || secStart < 0) throw new Error('anchor not found in ' + homeFile);
    home = home.slice(0, secStart) + block + '\n\n' + home.slice(secStart);
  }
  // MobileApplication JSON-LD on the home page (once)
  if (!home.includes('"MobileApplication"')) {
    home = home.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...appLd, inLanguage: LANGS })}</script>\n</head>`);
  }
  fs.writeFileSync(homeFile, home);
}

// ---------- sitemap + robots ----------
const today = new Date().toISOString().slice(0, 10);
const urls = [];
for (const L of LANGS) {
  urls.push(pre(L) + '/', pre(L) + '/about/', hubUrl(L));
  for (const d of DISTRICTS) urls.push(dUrl(L, d[1]));
}
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`);
console.log(`pages: ${written.length}, sitemap urls: ${urls.length}`);
