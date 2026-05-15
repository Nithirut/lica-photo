// pages/index.js - LICA Photo | Fullscreen cinematic landing
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState } from 'react';

var pageCSS = 'html,body{overflow:hidden!important;height:100%!important;max-width:100vw!important;margin:0!important;padding:0!important}#__next{height:100%;overflow:hidden}';

export default function Home() {
  var router = useRouter();
  var hov = useState(false);
  var hover = hov[0];
  var setHover = hov[1];

  return (
    <div>
      <Head>
        <title>LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <style>{pageCSS}</style>
      </Head>

      <div
        style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', background: '#000', cursor: 'pointer' }}
        onClick={function() { router.push('/uploader'); }}
      >
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url(/bg-splash.png)', backgroundSize: 'cover',
          backgroundPosition: 'center center', backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll', willChange: 'transform', transform: 'translateZ(0)',
        }} />

        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.32) 0%, transparent 28%, transparent 52%, rgba(0,0,0,0.72) 100%)',
          pointerEvents: 'none',
        }} />

        <div aria-hidden="true" style={{
          position: 'absolute', top: 'max(24px, env(safe-area-inset-top, 24px))',
          left: 'clamp(16px, 5vw, 48px)', pointerEvents: 'none',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.82)', fontSize: 'clamp(9px, 1.4vw, 11px)',
            letterSpacing: '0.28em', textTransform: 'uppercase', fontWeight: 500,
            whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
          }}>
            Life Insurance Counsellor Association
          </span>
        </div>

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
          paddingBottom: 'max(44px, env(safe-area-inset-bottom, 44px))',
          paddingLeft: 'clamp(16px, 5vw, 48px)', paddingRight: 'clamp(16px, 5vw, 48px)',
          pointerEvents: 'none',
        }}>
          <div
            role="button" tabIndex={0} aria-label="Upload Photos"
            onMouseEnter={function() { setHover(true); }}
            onMouseLeave={function() { setHover(false); }}
            onClick={function(e) { e.stopPropagation(); router.push('/uploader'); }}
            onKeyDown={function(e) { if (e.key === 'Enter') router.push('/uploader'); }}
            style={{
              pointerEvents: 'all',
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: 'clamp(12px, 2vw, 16px) clamp(28px, 5vw, 48px)',
              borderRadius: '100px',
              background: hover ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.28)',
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              outline: 'none',
              transition: 'background 0.2s ease, transform 0.15s ease',
              transform: hover ? 'scale(1.03)' : 'scale(1)',
            }}
          >
            <span style={{
              color: 'rgba(255,255,255,0.95)', fontSize: 'clamp(11px, 1.6vw, 14px)',
              letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 400,
              whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
            }}>
              Upload Photos
            </span>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(11px, 1.6vw, 14px)' }}>
              {'→'}
            </span>
          </div>

          <span aria-hidden="true" style={{
            color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(9px, 1.2vw, 11px)',
            letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 300,
            whiteSpace: 'nowrap', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
          }}>
            Tap anywhere to enter
          </span>
        </div>
      </div>
    </div>
  );
}