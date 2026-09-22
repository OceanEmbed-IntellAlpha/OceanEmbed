import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/field_sst.json';

export async function GET(request: Request) {
  // In a real app, this would use the ?variable= and ?date= params
  // const { searchParams } = new URL(request.url);
  return NextResponse.json(data);
}
