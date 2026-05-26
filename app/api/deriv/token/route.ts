import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, code_verifier, redirect_uri, client_id } =
      await req.json();

    const response = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id,
        redirect_uri,
        code_verifier,
      }),
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}
