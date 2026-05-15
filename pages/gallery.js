// pages/gallery.js - LICA Photo | Public Gallery (coming soon)
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState } from 'react';

export default function Gallery() {
  var router = useRouter();
  var b = useState(false); var hov = b[0]; var setHov = b[1];
  return (
    <div style={{ minHeight: '100svh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'clamp(32px,6vw,80px) clamp(20px,5vw,48px)', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', boxSizing: 'border-box' }}>
      <Head>
        <title>แกลเลอรี — LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', letterSpacing: '0.32em', textTransform: 'uppercase', margin: '0 0 52px' }}>Life Insurance Counsellor Association</p>
        <div style={{ width: '52px', height: '52px', margin: '0 auto 28px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{'🖼'}</div>
        <h1 style={{ color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 14px' }}>แกลเลอรีสาธารณะ</h1>
        <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 'clamp(13px,1.8vw,15px)', lineHeight: 1.7, margin: '0 0 52px' }}>กำลังพัฒนาระบบ<br /><span style={{ fontSize: '12px', opacity: 0.7 }}>Coming soon</span></p>
        <button type="button" onMouseEnter={function(){setHov(true);}} onMouseLeave={function(){setHov(false);}} onClick={function(){router.push('/');}} style={{ appearance: 'none', WebkitAppearance: 'none', background: 'transparent', border: 'none', padding: '8px 16px', cursor: 'pointer', outline: 'none', color: hov ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)', fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'inherit', transition: 'color 0.2s ease' }}>{'←'} กลับหน้าหลัก</button>
      </div>
    </div>
  );
}
