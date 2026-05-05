import * as cheerio from 'cheerio';
import { cleanUrl, cleanString } from '@/lib/validators';

function topColors(html) {
  const matches = html.match(/#[0-9a-fA-F]{6}\b/g) || [];
  const counts = new Map();
  matches.forEach((color) => counts.set(color.toUpperCase(), (counts.get(color.toUpperCase()) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([color]) => color);
}

export async function analyzeWebsite(url) {
  const cleaned = cleanUrl(url);
  if (!cleaned) throw new Error('Enter a valid website URL.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let html = '';

  try {
    const response = await fetch(cleaned, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 ViralPackClientMailroom/0.1',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) throw new Error(`Website returned ${response.status}.`);
    html = await response.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const title = cleanString($('title').first().text(), 180);
  const description = cleanString($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'), 500);
  const logo = $('img[src*="logo" i]').first().attr('src') || $('meta[property="og:image"]').attr('content') || '';
  const headings = $('h1,h2,h3').map((_, el) => cleanString($(el).text(), 160)).get().filter(Boolean).slice(0, 20);

  $('script,style,noscript,svg,iframe').remove();
  const text = cleanString($('body').text().replace(/\s+/g, ' '), 6500);

  return {
    url: cleaned,
    title,
    description,
    logo,
    headings,
    colors: topColors(html),
    text
  };
}
