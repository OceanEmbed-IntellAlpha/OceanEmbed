import { NextResponse } from 'next/server';
// Bypass Next.js Webpack bundler entirely to avoid CJS/ESM interop issues with @turf/bbox
const isSea = eval("require('is-sea')");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat or lon' }, { status: 400 });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: 'Invalid lat or lon' }, { status: 400 });
  }

  try {
    const result = isSea(latitude, longitude);
    return NextResponse.json({ isSea: result });
  } catch (error) {
    console.error('Error checking isSea:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
