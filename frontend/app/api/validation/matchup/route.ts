import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/matchup.json';

export async function GET(request: Request) {
  return NextResponse.json(data);
}
