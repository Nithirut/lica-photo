// pages/index.js — LICA Photo splash page (responsive, overflow-safe)
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: 100vw !important;
            overflow: hidden !important;
            background: #000;
            -webkit-font-smoothing: antialiased;
          }
          #__next { width: 100%; height: 100%; overflow: hidden; }
        `}</style>
      </Head>

      <div
        role="button"
        tabIndex={0}
        aria-label="Enter LICA Photo"
        onClick={() => router.push('/uploader')}
        onKeyDown={(e) => e.key === 'Enter' && router.push('/uploader')}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          outline: 'none',
          background: '#000',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/bg-splash.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '35%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: 'max(36px, env(safe-area-inset-bottom, 36px))',
            pointerEvents: 'none',
          }}
        >
          <span style={{
            color: 'rgba(255,255,255,0.70)',
            fontSize: 'clamp(10px, 1.8vw, 13px)',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            fontWeight: 300,
            whiteSpace: 'nowrap',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
          }}>
            Tap anywhere to enter
          </span>
        </div>
      </div>
    </>
  );
}