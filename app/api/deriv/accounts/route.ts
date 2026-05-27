import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const clientId = req.headers.get('x-client-id') || '';

    if (!authHeader || !clientId) {
      return NextResponse.json({ error: 'missing_auth' }, { status: 401 });
    }

    const derivResponse = await fetch(
      'https://api.derivws.com/trading/v1/options/accounts',
      {
        headers: {
          'Authorization': authHeader,
          'Deriv-App-ID': clientId,
          'Accept': 'application/json',
        },
      }
    );

    const data = await derivResponse.json();
    return NextResponse.json(data, { status: derivResponse.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'server_error', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
