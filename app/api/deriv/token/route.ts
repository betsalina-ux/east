import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let code = '';
    let code_verifier = '';
    let redirect_uri = '';
    let client_id = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();

      code = body.code;
      code_verifier = body.code_verifier;
      redirect_uri = body.redirect_uri;
      client_id = body.client_id;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);

      code = params.get('code') || '';
      code_verifier = params.get('code_verifier') || '';
      redirect_uri = params.get('redirect_uri') || '';
      client_id = params.get('client_id') || '';
    }

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

    const responseText = await derivResponse.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return NextResponse.json(data, {
      status: derivResponse.status,
    });
  } catch (err) {
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
