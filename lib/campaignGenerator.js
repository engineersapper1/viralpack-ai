import { getOpenAIClient, extractJson } from '@/lib/openaiClient';
import { analyzeWebsite } from '@/lib/brandAnalyzer';
import { cleanString, cleanUrl } from '@/lib/validators';

function systemInstructions() {
  return `You write concise small-business email campaigns that sound natively written by the advertising client.

Hard rules:
- Never sound like a generic AI marketing bot.
- No hype soup. Avoid phrases like "unlock", "elevate", "game-changer", "we're thrilled", "don't miss out" unless the website clearly uses that voice.
- Keep it as short as the job allows.
- Use the client website voice, cadence, vocabulary, and level of warmth.
- Do not invent discounts, dates, booking availability, awards, or claims.
- Use plain, human sentences.
- Do not mention AI, automation, generated content, algorithms, or brand analysis.
- Avoid emojis unless the client website or provided message clearly uses them.
- The email should feel like it came from the business owner, not from a platform.
- Return strict JSON only. No markdown.

JSON shape:
{
  "subject_options": ["...", "...", "..."],
  "selected_subject": "...",
  "preview_text": "...",
  "headline": "...",
  "body_paragraphs": ["...", "..."],
  "cta_label": "...",
  "cta_url": "...",
  "plain_text": "...",
  "design": {"primary_color":"#111111", "accent_color":"#D7A84F", "background_color":"#F8F6F0"},
  "voice_notes": "one short sentence explaining why this fits the client voice"
}`;
}

export async function generateCampaign({ profile, mode, theme, manualMessage, ctaUrl, offer, assetUrls = [] }) {
  const websiteUrl = cleanUrl(profile.website_url);
  let website = null;
  if (websiteUrl) {
    try {
      website = await analyzeWebsite(websiteUrl);
    } catch (error) {
      website = { url: websiteUrl, error: error.message };
    }
  }

  const input = {
    client_profile: {
      business_name: profile.business_name,
      website_url: profile.website_url,
      sender_name: profile.sender_name,
      sender_email: profile.sender_email,
      reply_to_email: profile.reply_to_email
    },
    website_snapshot: website,
    campaign: {
      mode: cleanString(mode, 30),
      theme: cleanString(theme, 180),
      manual_message: cleanString(manualMessage, 5000),
      offer: cleanString(offer, 1000),
      cta_url: cleanUrl(ctaUrl),
      uploaded_image_urls: assetUrls
    }
  };

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-5.2',
    instructions: systemInstructions(),
    input: JSON.stringify(input)
  });

  const json = extractJson(response.output_text);
  return {
    ...json,
    mode,
    theme,
    asset_urls: assetUrls,
    website_snapshot: website
  };
}
