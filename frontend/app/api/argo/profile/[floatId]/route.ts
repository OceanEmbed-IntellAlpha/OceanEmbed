import { NextResponse } from 'next/server';
import data from '@/lib/fixtures/argo_profile.json';

export async function GET(request: Request, { params }: { params: { floatId: string } }) {
  // Return the mock argo profile
  return NextResponse.json(data);
}
