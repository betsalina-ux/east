/**
 * Dynamic favicon generated at build time via Next.js ImageResponse.
 * When the app builder injects a PNG or JPEG logo, this file is deleted and
 * replaced with a static app/icon.<ext> that Next.js App Router auto-discovers
 * as the favicon. For WebP logos Next.js does not recognise app/icon.webp, so
 * this file is kept as the favicon fallback. When no logo is provided this
 * file is always kept, rendering the first letter of the app name on the brand
 * color background.
 *
 * SVGs are intentionally avoided: app builder deployments do not support them.
 */
import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const appName = process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? 'Deriv App';
  const letter = appName.trim().charAt(0).toUpperCase() || 'D';

  // Use the brand primary color from the env if available, otherwise fall back
  // to Deriv red. The app builder injects NEXT_PUBLIC_PRIMARY_COLOR at build time.
  const bgColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? '#FF444F';

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
}
