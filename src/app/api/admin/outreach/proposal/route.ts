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
ontooff is an online booking platform built specifically for outdoor nature-based businesses — camping sites, fishing spots, kayaking centres, hiking parks, adventure parks, and similar venues.

WHAT WE OFFER BUSINESSES (key selling points to mention):
- Free, fast listing setup — a business can be live and accepting bookings within a day
- Online booking engine: guests can browse, book, and pay 24/7 without the business needing to manage phone calls or emails
- Smart pricing rules: support for per-person, per-day, per-activity, and age-group pricing
- Spot / zone management: define specific tent pitches, kayak launch spots, fishing pegs, etc., with capacity and availability tracking
- Built-in payment handling: card and cash options, with automatic confirmation emails to guests
- Real-time availability calendar and map-based spot selection for guests
- Multi-language support: guests can book in their own language
- Events module: businesses can publish special events and sell tickets directly through the platform
- Zero technical expertise required — the platform does the heavy lifting
- Dedicated support to help with the onboarding and listing setup

PRICING MODEL:
- Listing is free; ontooff takes a small commission only when a booking is made — no upfront costs or monthly fees for the basic plan

PLATFORM URL: https://www.ontooff.app

TONE GUIDANCE:
- Be warm and personal — this is an outreach email, not a cold form letter
- Acknowledge what the business does (use their activities if provided)
- Keep it concise: 150–250 words in the body
- End with a clear, low-pressure call to action (e.g. "Would you be open to a quick 15-minute call this week?")
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
