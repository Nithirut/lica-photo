// pages/index.js - LICA Photo | Fullscreen cinematic landing
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState } from 'react';

var CSS = 'html,body{overflow:hidden!important;height:100%!important;max-width:100vw!important;margin:0!important;padding:0!important}#__next{height:100%;overflow:hidden}';

export default function Home() {
  var router = useRouter();
  var h = useState(false); var hover = h[0]; var setHover = h[1];

  return (
    <div>
      <Head>
        <title>LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <style>{CSS}</style>
      </Head>

      {/* ── Fixed shell: structurally impossible to overflow ───────────── */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          overflow: 'hidden', background: '#000', cursor: 'pointer',
        }}
        onClick={function() { router.push('/uploader'); }}
      >

        {/* ── GPU-composited background layer ──────────────────────────── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url(/bg-splash.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }} />

        {/* ── Cinematic vignette: top + bottom gradient ─────────────────── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.75) 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── Brand label: top-left, safe-area-aware ───────────────────── */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: 'max(28px, env(safe-area-inset-top, 28px))',
          left: 'clamp(20px, 5vw, 52px)',
          right: 'clamp(20px, 5vw, 52px)',
          pointerEvents: 'none',
        }}>
          <span style={{
            display: 'block',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 'clamp(9px, 1.4vw, 11px)',
            letterSpacing: '0.30em',
            textTransform: 'uppercase',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            Life Insurance Counsellor Association
          </span>
        </div>

        {/* ── Bottom action area ────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(12px, 2vw, 20px)',
          paddingBottom: 'max(48px, env(safe-area-inset-bottom, 48px))',
          paddingLeft: 'clamp(20px, 5vw, 52px)',
          paddingRight: 'clamp(20px, 5vw, 52px)',
          pointerEvents: 'none',
        }}>

          {/* ── Glassmorphism upload card ─────────────────────────────── */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload Photos"
            onMouseEnter={function() { setHover(true); }}
            onMouseLeave={function() { setHover(false); }}
            onFocus={function() { setHover(true); }}
            onBlur={function() { setHover(false); }}
            onClick={function(e) { e.stopPropagation(); router.push('/uploader'); }}
            onKeyDown={function(e) { if (e.key === 'Enter') router.push('/uploader'); }}
            style={{
              pointerEvents: 'all',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(8px, 1.2vw, 12px)',
              padding: 'clamp(13px, 2.2vw, 18px) clamp(28px, 6vw, 56px)',
              borderRadius: '100px',
              maxWidth: 'calc(100vw - 40px)',
              background: hover ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.15)',
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              outline: 'none',
              transition: 'background 0.22s ease, transform 0.16s ease, box-shadow 0.22s ease',
              transform: hover ? 'scale(1.04) translateY(-2px)' : 'scale(1) translateY(0px)',
            }}
          >
            <span style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: 'clamp(11px, 1.6vw, 14px)',
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              fontWeight: 400,
              whiteSpace: 'nowrap',
            }}>
              Upload Photos
            </span>
            <span style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: 'clamp(13px, 1.8vw, 16px)',
              lineHeight: 1,
              flexShrink: 0,
            }}>
              {'→'}
            </span>
          </div>

          {/* ── Tap hint ─────────────────────────────────────────────────── */}
          <span aria-hidden="true" style={{
            color: 'rgba(255,255,255,0.38)',
            fontSize: 'clamp(9px, 1.1vw, 11px)',
            letterSpacing: '0.26em',
            textTransform: 'uppercase',
            fontWeight: 300,
            whiteSpace: 'nowrap',
          }}>
            Tap anywhere to enter
          </span>

        </div>
      </div>
    </div>
  );
}
