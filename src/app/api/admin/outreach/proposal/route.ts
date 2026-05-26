import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

// ── Guidance text ─────────────────────────────────────────────────────────────
// Edit this block to update what the AI knows about ontooff and its pitch.
// This text is injected into every proposal generation as factual context.
const ONTOOFF_GUIDANCE = `
ABOUT ONTOOFF:
ontooff is a booking platform that makes it easier for guests to reserve outdoor activities.
Businesses get automated reservations — guests access the booking flow via a link placed on the business's website or Instagram profile.
We are currently in a pilot phase and offering the first partners permanent free use of the platform and the partner panel.

WHAT THE EMAIL MUST COMMUNICATE:
1. Brief, friendly intro — who you are and that their profile caught your attention (mention their specific activity or venue type if known).
2. One-sentence explanation of what ontooff does: automated activity reservations through a link on their website or Instagram.
3. The pilot offer: permanent free access for early partners.
4. The platform link: https://www.ontooff.app
5. A low-pressure CTA: offer to send a demo account or organise a short presentation.

PLATFORM URL: https://www.ontooff.app

REFERENCE EMAIL (the style and structure to follow — use this as a template):
---
Hi! I'm Aleksandar, founder of BidTech. We're building a platform that makes it easier to book outdoor activities, and your profile caught our attention.

Our goal is to let guests make automated activity reservations through our app — they access the booking flow via a link placed directly on your website or Instagram profile.

We're currently in the pilot phase, and we're offering early partners permanent free access to the platform and the partner panel.

You can see how it looks here: https://www.ontooff.app

If it sounds interesting, we'd be happy to send you a demo account or set up a short presentation :)
---

TONE GUIDANCE:
- Match the warm, casual, yet professional tone of the reference email above
- Personalise the opening by referencing the business name and their activities if provided
- Keep it short and scannable — 4–5 short paragraphs, similar length to the reference
- No HTML, no markdown, plain email text only
- Write the entire email in the language specified
`.trim();

const SYSTEM_PROMPT = `You are a professional business development writer working for ontooff.
Use the guidance below as your source of truth about the platform and the pitch.
Generate a personalized outreach proposal email based on the contact details the user provides.

${ONTOOFF_GUIDANCE}`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 });
  }

  let body: Record<string, string | null | undefined>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { businessName, contactPerson, city, country, website, instagramUrl, activities, notes, language } = body;

  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required.' }, { status: 400 });
  }

  const lang = language?.trim() || 'English';

  const contextLines: string[] = [
    `Business: ${businessName.trim()}`,
    `Language: ${lang}`,
  ];
  if (contactPerson?.trim()) contextLines.push(`Contact person: ${contactPerson.trim()}`);
  if (city?.trim() || country?.trim()) contextLines.push(`Location: ${[city?.trim(), country?.trim()].filter(Boolean).join(', ')}`);
  if (activities?.trim()) contextLines.push(`Activities they offer: ${activities.trim()}`);
  if (website?.trim()) contextLines.push(`Website: ${website.trim()}`);
  if (instagramUrl?.trim()) contextLines.push(`Instagram: ${instagramUrl.trim()}`);
  if (notes?.trim()) contextLines.push(`Additional notes: ${notes.trim()}`);

  const userPrompt = `Write a proposal email for this business (write entirely in ${lang}):\n\n${contextLines.join('\n')}`;
  try {
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: 400,
      temperature: 0.75,
    });

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[outreach/proposal] Groq error:', err);
    return NextResponse.json({ error: 'Failed to generate proposal. Please try again.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { id?: string; proposalText?: string; proposalLanguage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { id, proposalText, proposalLanguage } = body;

  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  if (!proposalText?.trim()) return NextResponse.json({ error: 'proposalText is required.' }, { status: 400 });

  const existing = await prisma.outreachContact.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });

  const contact = await prisma.outreachContact.update({
    where: { id },
    data: {
      proposalText: proposalText.trim(),
      proposalLanguage: proposalLanguage?.trim() || 'English',
    },
  });

  return NextResponse.json({ success: true, data: contact });
}
