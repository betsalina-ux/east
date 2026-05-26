import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log('MarketEye token route body:', {
      hasCode: !!body.code,
      hasVerifier: !!body.code_verifier,
      redirect_uri: body.redirect_uri,
      client_id: body.client_id,
    });

    const { code, code_verifier, redirect_uri, client_id } = body;

    if (!code || !code_verifier || !redirect_uri || !client_id) {
      return NextResponse.json(
        {
          error: 'missing_required_fields',
          hasCode: !!code,
          hasVerifier: !!code_verifier,
          hasRedirectUri: !!redirect_uri,
          hasClientId: !!client_id,
        },
        { status: 400 }
      );
    }

    const derivResponse = await fetch(
      'https://auth.deriv.com/oauth2/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id,
          redirect_uri,
          code_verifier,
        }).toString(),
      }
    );

    const text = await derivResponse.text();

    let data: unknown;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    console.log('Deriv token route response:', {
      status: derivResponse.status,
      data,
    });

    return NextResponse.json(data, {
      status: derivResponse.status,
    });
  } catch (err) {
    console.error('MarketEye token route crashed:', err);

    return NextResponse.json(
      {
        error: 'server_error',
        message:
          err instanceof Error
            ? err.message
            : String(err),
      },
      { status: 500 }
    );
  }
}
