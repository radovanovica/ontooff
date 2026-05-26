import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import Groq from 'groq-sdk';
import { prisma } from '@/lib/prisma';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

const SYSTEM_PROMPT = `You are a professional business development writer. Generate a concise, persuasive email proposal for ontooff — an online booking platform for outdoor nature activities (camping, fishing, kayaking, hiking, etc.).

The proposal should:
- Be addressed to the business contact if a name is provided
- Explain what ontooff is and how it helps outdoor businesses get more bookings
- Highlight the key value: free listing setup, instant online bookings, no technical expertise needed, built-in payment handling
- Be warm and personalized based on their location, activity type (inferred from business name/notes), and any notes provided
- End with a clear call to action (schedule a quick call or reply to learn more)
- Be 150–250 words, in a professional yet friendly tone
- Written in plain text suitable for an email (no HTML, no markdown headers)
- Write the entire proposal in the language specified in the user message`;

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

  const { businessName, contactPerson, city, country, website, instagramUrl, notes, language } = body;

  if (!businessName?.trim()) {
    return NextResponse.json({ error: 'businessName is required.' }, { status: 400 });
  }

  const lang = language?.trim() || 'English';

  const contextLines: string[] = [
    `Business: ${businessName.trim()}`,
    `Language: ${lang}`,
  ];
  if (contactPerson?.trim()) contextLines.push(`Contact: ${contactPerson.trim()}`);
  if (city?.trim() || country?.trim()) contextLines.push(`Location: ${[city?.trim(), country?.trim()].filter(Boolean).join(', ')}`);
  if (website?.trim()) contextLines.push(`Website: ${website.trim()}`);
  if (instagramUrl?.trim()) contextLines.push(`Instagram: ${instagramUrl.trim()}`);
  if (notes?.trim()) contextLines.push(`Notes: ${notes.trim()}`);

  const userPrompt = `Write a proposal email for this business (write entirely in ${lang}):\n${contextLines.join('\n')}`;

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
