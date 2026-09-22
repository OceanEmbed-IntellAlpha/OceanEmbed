import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/datasets.json';

export async function GET() {
  return NextResponse.json(data);
}
