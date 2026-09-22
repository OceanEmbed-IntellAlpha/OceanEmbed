import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/argo_profile.json';

export async function GET(request: Request) {
  // Return an array with the single mock profile
  return NextResponse.json([data]);
}
