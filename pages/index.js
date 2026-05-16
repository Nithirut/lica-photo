// pages/index.js - LICA Photo | Photography Platform
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState } from 'react';

var CSS = 'html,body{overflow:hidden!important;height:100%!important;max-width:100vw!important;margin:0!important;padding:0!important}#__next{height:100%;overflow:hidden}';

var BTN_BASE = {
  appearance: 'none', WebkitAppearance: 'none',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: '100px', cursor: 'pointer', userSelect: 'none',
  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
  outline: 'none', border: 'none', background: 'none', padding: 0,
  fontFamily: 'inherit', transition: 'background 0.2s ease, transform 0.15s ease',
};

export default function Home() {
  var router = useRouter();
  var g = useState(false); var hovG = g[0]; var setHovG = g[1];
  var t = useState(false); var hovT = t[0]; var setHovT = t[1];
  var p = useState(false); var hovP = p[0]; var setHovP = p[1];

  return (
    <div>
      <Head>
        <title>LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <style>{CSS}</style>
      
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        body { overflow-x: hidden; }
        @media (hover: hover) { .lica-hover:hover { opacity: 0.85; } }
      `}</style>
      </Head>

      {/* ── Fixed shell: viewport-locked, overflow impossible ── */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden', background: '#000' }}>

        {/* ── GPU-composited background ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'url(/bg-splash.png)', backgroundSize: 'cover',
          backgroundPosition: 'center center', backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll', willChange: 'transform', transform: 'translateZ(0)',
        }} />

        {/* ── Cinematic vignette ── */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 22%, transparent 52%, rgba(0,0,0,0.80) 100%)',
          pointerEvents: 'none',
        }} />

        {/* ── Brand label — top left ── */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: 'max(28px, env(safe-area-inset-top, 28px))',
          left: 'clamp(20px, 5vw, 48px)',
          pointerEvents: 'none',
        }}>
          <span style={{
            color: 'rgba(255,255,255,0.80)', fontSize: 'clamp(9px, 1.4vw, 11px)',
            letterSpacing: '0.30em', textTransform: 'uppercase', fontWeight: 500, whiteSpace: 'nowrap',
          }}>
            Life Insurance Counsellor Association
          </span>
        </div>

        {/* ── Center-bottom: PUBLIC gallery CTA ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'clamp(10px, 1.8vw, 18px)',
          paddingBottom: 'max(72px, calc(env(safe-area-inset-bottom, 0px) + 72px))',
          paddingLeft: 'clamp(20px, 5vw, 48px)', paddingRight: 'clamp(20px, 5vw, 48px)',
          pointerEvents: 'none',
        }}>
          <button
            type="button"
            className="lica-hover"
            onClick={function() { router.push('/gallery'); }}
            style={Object.assign({}, BTN_BASE, {
              pointerEvents: 'all',
              gap: 'clamp(8px, 1.2vw, 12px)',
              padding: 'clamp(13px, 2.2vw, 18px) clamp(28px, 6vw, 56px)',
              maxWidth: 'calc(100vw - 40px)',
              background: hovG ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.95)',
              fontSize: 'clamp(11px, 1.6vw, 14px)',
              letterSpacing: '0.20em', textTransform: 'uppercase', fontWeight: 400, whiteSpace: 'nowrap',
              transform: hovG ? 'scale(1.04) translateY(-2px)' : 'scale(1) translateY(0px)',
            })}
          >
            เข้าชมแกลเลอรี
            <span style={{ color: 'rgba(255,255,255,0.60)', fontSize: 'clamp(13px, 1.8vw, 16px)', lineHeight: 1, flexShrink: 0 }}>{'→'}</span>
          </button>

          <span aria-hidden="true" style={{
            color: 'rgba(255,255,255,0.32)', fontSize: 'clamp(9px, 1.0vw, 10px)',
            letterSpacing: '0.26em', textTransform: 'uppercase', fontWeight: 300, whiteSpace: 'nowrap',
          }}>
            Photography by LICA
          </span>
        </div>

        {/* ── Bottom-right: INTERNAL user buttons ── */}
        <div style={{
          position: 'absolute',
          bottom: 'max(22px, env(safe-area-inset-bottom, 22px))',
          right: 'clamp(16px, 4vw, 32px)',
          display: 'flex', flexDirection: 'row', gap: '8px', alignItems: 'center',
        }}>

          {/* ผู้ร่วมงาน */}
          <button
            type="button"
            className="lica-hover"
            onClick={function() { router.push('/team-downloads'); }}
            style={Object.assign({}, BTN_BASE, {
              padding: '8px 18px',
              background: hovT ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(14px) saturate(150%)',
              WebkitBackdropFilter: 'blur(14px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'rgba(255,255,255,0.62)',
              fontSize: 'clamp(10px, 1.2vw, 12px)',
              letterSpacing: '0.10em', fontWeight: 400, whiteSpace: 'nowrap',
            })}
          >
            ผู้ร่วมงาน
          </button>

          {/* ช่างภาพ */}
          <button
            type="button"
            className="lica-hover"
            onClick={function() { router.push('/uploader'); }}
            style={Object.assign({}, BTN_BASE, {
              padding: '8px 18px',
              background: hovP ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(14px) saturate(150%)',
              WebkitBackdropFilter: 'blur(14px) saturate(150%)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'rgba(255,255,255,0.62)',
              fontSize: 'clamp(10px, 1.2vw, 12px)',
              letterSpacing: '0.10em', fontWeight: 400, whiteSpace: 'nowrap',
            })}
          >
            ช่างภาพ
          </button>
        </div>

      </div>
    </div>
  );
}
