import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secretKey = url.searchParams.get('key');
  const authHeader = request.headers.get('authorization');
  const configuredSecret = process.env.CRON_SECRET;

  // Si CRON_SECRET est configuré, on valide la clé pour éviter les abus externes
  if (
    configuredSecret &&
    authHeader !== `Bearer ${configuredSecret}` &&
    secretKey !== configuredSecret
  ) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const backendUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://madutech7-jaaymaa.hf.space';

  const targetUrl = `${backendUrl.replace(/\/$/, '')}/health`;
  const startTime = Date.now();

  try {
    const res = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Jaaymaa-Keepalive-Route/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    const durationMs = Date.now() - startTime;
    let backendData: unknown = null;
    try {
      backendData = await res.json();
    } catch {
      // Le backend n'a pas renvoyé de JSON valide
    }

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      target: targetUrl,
      durationMs,
      backend: backendData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      {
        ok: false,
        error: message,
        target: targetUrl,
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
