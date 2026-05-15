// pages/team-downloads.js - LICA Photo | Collaborator Area
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState } from 'react';

export default function TeamDownloads() {
  var router = useRouter();
  var b = useState(false); var hovBack = b[0]; var setHovBack = b[1];

  return (
    <div style={{
      minHeight: '100svh', background: '#090909',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(32px, 6vw, 80px) clamp(20px, 5vw, 48px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif',
      boxSizing: 'border-box',
    }}>
      <Head>
        <title>ผู้ร่วมงาน — LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>

        {/* Brand */}
        <p style={{
          color: 'rgba(255,255,255,0.28)', fontSize: '10px',
          letterSpacing: '0.32em', textTransform: 'uppercase',
          margin: '0 0 48px',
        }}>
          Life Insurance Counsellor Association
        </p>

        {/* Icon */}
        <div style={{
          width: '56px', height: '56px', margin: '0 auto 28px',
          borderRadius: '16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px',
        }}>
          {'📁'}
        </div>

        {/* Heading */}
        <h1 style={{
          color: 'rgba(255,255,255,0.90)',
          fontSize: 'clamp(22px, 4vw, 30px)',
          fontWeight: 300, letterSpacing: '-0.02em',
          margin: '0 0 12px',
        }}>
          พื้นที่ผู้ร่วมงาน
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.42)', fontSize: 'clamp(13px, 1.8vw, 15px)',
          lineHeight: 1.7, margin: '0 0 48px',
        }}>
          สำหรับผู้ร่วมงานและทีมงานเท่านั้น<br />
          กรุณาติดต่อช่างภาพเพื่อรับลิงก์ดาวน์โหลด
        </p>

        {/* Albums placeholder */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: 'clamp(28px, 4vw, 40px)',
          marginBottom: '40px',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.25)', fontSize: '13px',
            letterSpacing: '0.06em', margin: 0, lineHeight: 1.6,
          }}>
            ยังไม่มีอัลบั้มที่แชร์ในขณะนี้<br />
            <span style={{ fontSize: '11px', opacity: 0.7 }}>No shared albums available</span>
          </p>
        </div>

        {/* Back */}
        <button
          type="button"
          onMouseEnter={function() { setHovBack(true); }}
          onMouseLeave={function() { setHovBack(false); }}
          onClick={function() { router.push('/'); }}
          style={{
            appearance: 'none', WebkitAppearance: 'none',
            background: 'transparent', border: 'none', padding: '8px 16px',
            cursor: 'pointer', outline: 'none',
            color: hovBack ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)',
            fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
            fontFamily: 'inherit', transition: 'color 0.2s ease',
          }}
        >
          {'←'} กลับหน้าหลัก
        </button>

      </div>
    </div>
  );
}
