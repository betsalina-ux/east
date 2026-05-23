import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  try {
    const appName = process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'MarketEye';
    const letter = (appName.trim().charAt(0).toUpperCase()) || 'M';
    const bgColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? '#00C390';

    return new ImageResponse(
      (
        <div
          style={{
            width: 32,
            height: 32,
            background: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: 'sans-serif',
            }}
          >
            {letter}
          </span>
        </div>
      ),
      { ...size }
    );
  } catch {
    return new ImageResponse(
      <div style={{ width: 32, height: 32, background: '#00C390', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6 }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'sans-serif' }}>M</span>
      </div>,
      { ...size }
    );
  }
}
