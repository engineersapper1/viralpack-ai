import { getOpenAIClient, extractJson } from '@/lib/openaiClient';
import { analyzeWebsite } from '@/lib/brandAnalyzer';
import { BROOKE_CTA_URL } from '@/lib/mailroomConfig';
import { cleanString, cleanUrl } from '@/lib/validators';

function removeEmDashes(value = '') {
  return String(value || '').replace(/\u2014/g, ',');
}

function sanitizeCampaignText(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeCampaignText(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeCampaignText(item)]));
  }
  if (typeof value === 'string') return removeEmDashes(value);
  return value;
}

function systemInstructions() {
  return `Write in the voice of Made You Brooke LLC, a Florida-based photography brand that feels warm, artistic, personal, grounded, emotionally intelligent, and human.

Brand energy:
Creative photographer friend meets professional artist. Warm, approachable, feminine, adventurous, thoughtful, slightly playful, and quietly confident.

Tone:
Natural, conversational, emotionally aware, never corporate or overly polished. Slightly poetic when it fits, but still clear and human.

Core themes:
Authentic connection, real emotion, comfort in front of the camera, storytelling, movement, natural beauty, artistic expression, empowerment, freedom, individuality, and meaningful client experience.

Audience:
Women, couples, brides, creative entrepreneurs, personal branding clients, families, and people who value authentic, beautiful, experience-driven photography.

Default vibe:
Human connection first. Emotion over perfection. Art with warmth. Confidence without ego.

Hard writing rules:
- Sound like a real person, not a marketer.
- Never use em dashes. Never use Unicode character U+2014. Use commas, periods, colons, or shorter sentences instead.
- Keep the email concise, warm, and easy to read.
- Avoid generic photographer language.
- Avoid salesy urgency, stiff luxury language, boss-babe phrasing, fake hype, or anything that sounds AI-written.
- Do not over-explain.
- Do not invent dates, prices, discounts, locations, availability, packages, awards, or promises.
- Use only the campaign details provided by the user.
- Prioritize feeling, story, and experience over perfection.
- Make the message feel like Brooke wrote it herself.
- If there are images, make the email image-forward and visually calm.
- The call to action should feel natural, not pushy.
- Use this contact link as the CTA destination: ${BROOKE_CTA_URL}

Email structure:
- Short subject line, natural and specific.
- Preview text that feels personal, not clickbait.
- Warm headline.
- One to three short body paragraphs.
- Clear CTA button text.
- Simple signoff from Made You Brooke.

Return strict JSON only. No markdown.

JSON shape:
{
  "subject_options": ["...", "...", "..."],
  "selected_subject": "...",
  "preview_text": "...",
  "headline": "...",
  "body_paragraphs": ["...", "..."],
  "cta_label": "...",
  "cta_url": "${BROOKE_CTA_URL}",
  "plain_text": "...",
  "design": {
    "primary_color": "#111111",
    "accent_color": "#A8754F",
    "background_color": "#F8F6F0",
    "font_family": "Arial, Helvetica, sans-serif"
  },
  "layout": {
    "image_position": "top",
    "image_style": "soft editorial"
  },
  "voice_notes": "one short sentence explaining why this fits the Made You Brooke voice"
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
      reply_to_email: profile.reply_to_email,
      public_location: profile.brand_profile?.public_location || 'St. Petersburg, FL, US'
    },
    website_snapshot: website,
    campaign: {
      mode: cleanString(mode, 30),
      theme: cleanString(theme, 180),
      manual_message: cleanString(manualMessage, 5000),
      offer: cleanString(offer, 1000),
      cta_url: BROOKE_CTA_URL,
      uploaded_image_urls: assetUrls
    }
  };

  const client = getOpenAIClient();
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    instructions: systemInstructions(),
    input: JSON.stringify(input)
  });

  const json = sanitizeCampaignText(extractJson(response.output_text));
  return sanitizeCampaignText({
    ...json,
    selected_subject: json.selected_subject || json.subject || 'A note from Made You Brooke',
    cta_url: BROOKE_CTA_URL,
    mode,
    theme,
    asset_urls: assetUrls,
    website_snapshot: website
  });
}
