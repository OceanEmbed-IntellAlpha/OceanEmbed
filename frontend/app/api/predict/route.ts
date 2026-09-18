import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/profile.json';

export async function POST(request: Request) {
  // In a real app, we'd parse the body for lat/lon/date
  // const body = await request.json();
  return NextResponse.json(data);
}
