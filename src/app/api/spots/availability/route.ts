import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAvailableSpots } from '@/lib/utils';

const querySchema = z.object({
  activityLocationId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function GET(req: NextRequest) {
  const params = {
    activityLocationId: req.nextUrl.searchParams.get('activityLocationId') ?? '',
    startDate: req.nextUrl.searchParams.get('startDate') ?? '',
    endDate: req.nextUrl.searchParams.get('endDate') ?? '',
  };

  const result = querySchema.safeParse(params);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid query params', details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { activityLocationId, startDate, endDate } = result.data;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ success: false, error: 'Invalid date values' }, { status: 422 });
  }
  if (end <= start) {
    return NextResponse.json({ success: false, error: 'End date must be after start date' }, { status: 422 });
  }

  const spots = await getAvailableSpots(activityLocationId, start, end);
  return NextResponse.json({ success: true, data: spots });
}
