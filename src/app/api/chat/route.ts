import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';
import { withCache } from '@/lib/redis';

const CONTEXT_CACHE_KEY = 'chat:context:v1';
const CONTEXT_TTL = 60 * 30; // 30 minutes — context rarely changes

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

// Rate-limit: simple in-memory store (resets on dyno restart — fine for free tier)
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // requests per minute per IP (conservative to protect free quota)
const RATE_WINDOW_MS = 60_000;

// Response cache: avoid calling the API twice for the same opening question
// Keys: normalized message text; values: { text, expiresAt }
const responseCache = new Map<string, { text: string; expiresAt: number }>();
const RESPONSE_CACHE_MS = 30 * 60 * 1000; // 30 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

async function buildContext(): Promise<string> {
  return withCache(CONTEXT_CACHE_KEY, CONTEXT_TTL, async () => {
    // Fetch active places with their activity types and locations
    const places = await prisma.place.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        description: true,
        city: true,
        country: true,
        status: true,
        activityTypes: {
          where: { isActive: true },
          select: {
            name: true,
            tags: { include: { tag: { select: { name: true } } } },
          },
        },
        activityLocations: {
          where: { isActive: true },
          select: { name: true, maxCapacity: true },
        },
      },
      take: 25,
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    });

    // Fetch published blog posts for outdoor activity tips
    const posts = await prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { title: true, slug: true, excerpt: true, category: { select: { name: true } } },
      take: 8,
      orderBy: { publishedAt: 'desc' },
    });

    // Fetch community free locations
    const freeLocations = await prisma.freeLocation.findMany({
      where: { isActive: true },
      select: { name: true, slug: true, city: true, country: true, tags: { include: { tag: { select: { name: true } } } } },
      take: 10,
    });

    const placesText = places.map((p) => {
      const activities = p.activityTypes.map((a) => {
        const tags = a.tags.map((t) => t.tag.name).join(', ');
        return `${a.name}${tags ? ` [${tags}]` : ''}`;
      }).join(', ');
      const zones = p.activityLocations.map((l) =>
        `${l.name}${l.maxCapacity ? ` (cap:${l.maxCapacity})` : ''}`
      ).join(', ');
      return [
        `• ${p.name} [${p.status}] — /places/${p.slug}`,
        `  ${[p.city, p.country].filter(Boolean).join(', ')}`,
        activities ? `  Activities: ${activities}` : null,
        zones ? `  Zones: ${zones}` : null,
        p.description ? `  ${p.description.slice(0, 120)}` : null,
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const freeText = freeLocations.map((l) => {
      const tags = l.tags.map((t) => t.tag.name).join(', ');
      return `• ${l.name} — /locations/${l.slug} | ${[l.city, l.country].filter(Boolean).join(', ')}${tags ? ` | ${tags}` : ''}`;
    }).join('\n');

    const postsText = posts.map((p) =>
      `• "${p.title}"${p.category ? ` [${p.category.name}]` : ''} — /blog/${p.slug}`
    ).join('\n');

    return `PLACES:\n${placesText}\n\nFREE LOCATIONS:\n${freeText}\n\nBLOG:\n${postsText}`;
  });
}

const SYSTEM_PROMPT = `You are an outdoor activity assistant for ontooff (www.ontooff.app) — a platform for booking camping, fishing, kayaking, and other nature-based outdoor activities.

Your role:
- Help users find the right place or activity based on their interests, location, or dates
- Suggest specific places from the platform and link to them using their URL path
- Share relevant blog posts for tips and inspiration
- Explain how to make a reservation (search → select place → pick dates → fill in guests → confirm)
- Answer general questions about outdoor activities (camping, fishing, kayaking, hiking, etc.)

Tone: Friendly, concise, enthusiastic about nature and outdoor activities. Use short paragraphs.

Limitations:
- You cannot make bookings directly — always direct users to the place page to reserve
- Do not make up places or prices not listed in the context below
- If asked about something not in the platform, still provide general helpful outdoor advice

Reservation flow: Users can search at /search, or go directly to a place page and click the booking/reservation button.

CURRENT PLATFORM DATA:
{CONTEXT}`;

interface MessagePart {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/** Convert our internal history format to OpenAI-compatible messages for Groq. */
function toGroqHistory(history: MessagePart[]) {
  return history.map((m) => ({
    role: m.role === 'model' ? ('assistant' as const) : ('user' as const),
    content: m.parts.map((p) => p.text).join(''),
  }));
}

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'Chat is not configured.' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  let body: { message: string; history?: MessagePart[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const userMessage = (body.message ?? '').trim().slice(0, 1000);
  if (!userMessage) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  // Validate history shape
  const history: MessagePart[] = (body.history ?? [])
    .filter((m) => m && (m.role === 'user' || m.role === 'model') && Array.isArray(m.parts))
    .slice(-10); // keep last 10 turns

  // Response cache: only for first-message questions (empty history)
  const cacheKey = userMessage.toLowerCase().replace(/\s+/g, ' ').trim();
  if (history.length === 0) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      const encoder = new TextEncoder();
      return new Response(encoder.encode(cached.text), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
      });
    }
  }

  try {
    const context = await buildContext();
    const systemPrompt = SYSTEM_PROMPT.replace('{CONTEXT}', context);

    const groq = new Groq({ apiKey: GROQ_API_KEY });

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...toGroqHistory(history),
      { role: 'user', content: userMessage },
    ];

    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages,
      stream: true,
      max_tokens: 600,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let fullText = '';

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          // Cache the first-message response for future identical questions
          if (history.length === 0 && fullText) {
            responseCache.set(cacheKey, { text: fullText, expiresAt: Date.now() + RESPONSE_CACHE_MS });
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
    console.error('[chat] Groq error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
