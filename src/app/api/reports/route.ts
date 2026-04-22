import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { report, business, locations } = await req.json();

    if (!report) {
      return NextResponse.json({ error: 'Missing report data' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({ report, business: business ?? null, locations: locations ?? null })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error('Save report error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
