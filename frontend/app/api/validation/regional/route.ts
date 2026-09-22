import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/regional_validation.json';

export async function GET() {
  return NextResponse.json(data);
}
