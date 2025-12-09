import { NextResponse } from 'next/server';

export async function GET() {
  const started = Date.now();
  const out: any = { 
    ok: false, 
    mock: process.env.OPENAI_MOCK === '1',
    timestamp: new Date().toISOString()
  };
  
  try {
    // Información de proxy/DNS
    out.dnsOk = true; // placeholder
    out.proxyInfo = process.env.HTTP_PROXY || 
                   process.env.HTTPS_PROXY || 
                   process.env.http_proxy || 
                   process.env.https_proxy || 
                   null;

    // Si está en modo mock, devolver inmediatamente
    if (process.env.OPENAI_MOCK === '1') {
      out.ok = true; 
      out.model = 'mock'; 
      out.timeMs = Date.now() - started;
      out.message = 'OpenAI mock mode enabled';
      return NextResponse.json(out, { status: 200 });
    }

    // Verificar API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      out.errorType = 'NO_KEY'; 
      out.errorMessage = 'OPENAI_API_KEY missing';
      out.hint = 'Set OPENAI_API_KEY in your environment variables';
      return NextResponse.json(out, { status: 500 });
    }

    // Verificar que la key no sea la demo
    if (apiKey.includes('demo') || apiKey.includes('test')) {
      out.errorType = 'DEMO_KEY'; 
      out.errorMessage = 'Using demo/test API key';
      out.hint = 'Replace with a real OpenAI API key';
      return NextResponse.json(out, { status: 500 });
    }

    // Intentar llamada real a OpenAI
    try {
      const { callChat } = await import('@/lib/ai/provider');
      const model = process.env.USE_CHEAPER_MODEL === 'true' ? 'gpt-4o-mini' : 'gpt-4o-2024-08-06';
      
      const res = await callChat({ 
        model, 
        system: 'You are a helpful assistant. Respond with "pong" to test connectivity.', 
        user: 'ping' 
      });
      
      out.ok = true; 
      out.model = model;
      out.timeMs = res?.timeMs || 0;
      out.responseLength = res?.content?.length || 0;
      out.message = 'OpenAI connection successful';
      
      return NextResponse.json(out, { status: 200 });
    } catch (_importError) {
      out.errorType = 'IMPORT_FAIL';
      out.errorMessage = 'Failed to import AI provider';
      out.hint = 'Check if the provider file exists';
      return NextResponse.json(out, { status: 500 });
    }
    
  } catch (e: any) {
    out.errorType = 'CONNECT_FAIL';
    out.errorMessage = e?.message || String(e);
    out.timeMs = Date.now() - started;
    out.hint = 'Check your internet connection and OpenAI API key';
    
    // Información adicional del error
    if (e?.message?.includes('401')) {
      out.errorType = 'AUTH_FAIL';
      out.hint = 'Invalid OpenAI API key';
    } else if (e?.message?.includes('429')) {
      out.errorType = 'RATE_LIMIT';
      out.hint = 'OpenAI rate limit exceeded';
    } else if (e?.message?.includes('timeout')) {
      out.errorType = 'TIMEOUT';
      out.hint = 'Request timeout - check your connection';
    }
    
    return NextResponse.json(out, { status: 502 });
  }
}
