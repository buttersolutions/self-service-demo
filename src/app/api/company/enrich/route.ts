import { NextResponse } from 'next/server';
import { findEmployees } from '@/lib/waterfall';

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'domain is required' }, { status: 400 });
    }

    const result = await findEmployees(domain);

    return NextResponse.json({
      company: result.company,
      persons: result.persons,
      searchGroups: result.searchGroups,
    });
  } catch {
    return NextResponse.json({ company: null, persons: [], searchGroups: [] });
  }
}
