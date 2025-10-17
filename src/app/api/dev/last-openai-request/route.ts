import { NextResponse } from 'next/server';
import { getLastOpenAIRequest } from '@/lib/ai/provider';

export async function GET() {
  try {
    const last = getLastOpenAIRequest();
    
    if (!last) {
      return NextResponse.json({ 
        ok: false, 
        message: 'No OpenAI requests made yet' 
      });
    }
    
    return NextResponse.json({ 
      ok: true, 
      ...last,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to get last request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

