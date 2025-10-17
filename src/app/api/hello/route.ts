import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Hello from Avocat LegalTech API!',
    timestamp: new Date().toISOString(),
    version: '3.0.0'
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      message: 'Data received successfully',
      data: body,
      timestamp: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON data' },
      { status: 400 }
    );
  }
}
