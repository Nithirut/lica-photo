// pages/team-downloads/index.js
// Cinematic event selection page -- dark luxury, LICA Photo aesthetic
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return iso;
  }
}

function SkeletonCard() {
  return (
    <div style={{
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden',
      aspectRatio: '2/3',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      animation: 'shimmer 1.6s ease-in-out infinite',
    }} />
  );
}

function EventCard({ event, onClick }) {
  var [hovered, setHovered] = useState(false);
  var [imgError, setImgError] = useState(false);
  var hasPoster = event.posterId && !imgError;
  return (
    <div
      onClick={onClick}
      onMouseEnter={function () { setHovered(true); }}
      onMouseLeave={function () { setHovered(false); }}
      style={{
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        aspectRatio: '2/3',
        cursor: 'pointer',
        background: hasPoster ? '#111' : 'linear-gradient(135deg, #1a1408 0%, #0d0d0d 60%, #1a1000 100%)',
        border: hovered ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
        boxShadow: hovered ? '0 0 40px rgba(201,168,76,0.25), 0 8px 32px rgba(0,0,0,0.6)' : '0 4px 24px rgba(0,0,0,0.5)',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s ease, border-color 0.3s ease',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }}
    >
      {hasPoster && (
        <img
          src={`/api/drive/poster?fileId=${event.posterId}`}
          alt={event.name}
          onError={function () { setImgError(true); }}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
            transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
            transform: hovered ? 'scale(1.05)' : 'scale(1)',
          }}
        />
      )}
      {!hasPoster && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="30" stroke="rgba(201,168,76,0.25)" strokeWidth="1.5" />
            <path d="M32 18 L32 46 M18 32 L46 32" stroke="rgba(201,168,76,0.3)" strokeWidth="1" />
            <circle cx="32" cy="32" r="6" stroke="rgba(201,168,76,0.4)" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0.1) 70%, transparent 100%)',
        transition: 'opacity 0.3s ease', opacity: hovered ? 0.9 : 1,
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
        opacity: hovered ? 1 : 0, transition: 'opacity 0.3s ease',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '20px 16px 18px',
        background: 'rgba(0,0,0,0.2)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 500 }}>
          {formatDate(event.date)}
        </div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', lineHeight: 1.3, letterSpacing: '0.01em' }}>
          {event.name}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px',
          opacity: hovered ? 1 : 0,
          transform: hovered ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}>
          <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.9)', letterSpacing: '0.08em' }}>ดูรูปภาพ</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginTop: '1px' }}>
            <path d="M2 6h8M7 3l3 3-3 3" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function TeamDownloadsIndex() {
  var router = useRouter();
  var [events, setEvents] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  useEffect(function () {
    fetch('/api/drive/events')
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(function (err) {
        console.error(err);
        setError('โหลดรายการงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      });
  }, []);

  function handleCardClick(eventId) {
    router.push('/team-downloads/' + eventId);
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #080808; color: #fff; font-family: ${FONT}; min-height: 100vh; }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 0.9; } 100% { opacity: 0.5; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .event-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 600px) { .event-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        @media (min-width: 960px) { .event-grid { grid-template-columns: repeat(3, 1fr); gap: 24px; } }
        @media (min-width: 1280px) { .event-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; } }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none; color: rgba(255,255,255,0.5);
          font-family: ${FONT}; font-size: 13px; cursor: pointer;
          padding: 8px 0; letter-spacing: 0.02em; transition: color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .back-btn:hover { color: rgba(255,255,255,0.9); }
        .card-anim { animation: fadeInUp 0.45s cubic-bezier(0.4,0,0.2,1) both; }
      `}</style>
      <div style={{ minHeight: '100vh', background: '#080808', paddingBottom: '80px' }}>
        <div style={{ position: 'fixed', top: '-30vw', left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '80vw', background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ paddingTop: '32px', paddingBottom: '40px' }}>
            <button className="back-btn" onClick={function () { router.push('/'); }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 13L5 8l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              กลับหน้าหลัก
            </button>
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.25em', color: '#c9a84c', textTransform: 'uppercase', fontWeight: 500, marginBottom: '8px' }}>LICA Photo</div>
              <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.1 }}>เลือกงาน</h1>
              {!loading && !error && (
                <div style={{ marginTop: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>{events.length} งาน</div>
              )}
            </div>
            <div style={{ marginTop: '24px', height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.4) 0%, rgba(201,168,76,0.1) 40%, transparent 100%)' }} />
          </div>
          {loading && (
            <div className="event-grid">
              {[0,1,2,3,4,5].map(function (i) { return <SkeletonCard key={i} />; })}
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px', animation: 'fadeInUp 0.4s ease both' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 8v5M12 16h.01" stroke="#ff5050" strokeWidth="1.8" strokeLinecap="round" />
                  <circle cx="12" cy="12" r="10" stroke="#ff5050" strokeWidth="1.5" />
                </svg>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', textAlign: 'center', maxWidth: '320px' }}>{error}</p>
              <button onClick={function () { window.location.reload(); }} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: '#c9a84c', padding: '10px 24px', fontSize: '14px', cursor: 'pointer', fontFamily: FONT, letterSpacing: '0.03em', WebkitTapHighlightColor: 'transparent' }}>ลองใหม่</button>
            </div>
          )}
          {!loading && !error && events.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px', animation: 'fadeInUp 0.4s ease both' }}>
              <div style={{ fontSize: '40px', opacity: 0.3 }}>📁</div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px' }}>ยังไม่มีงานในขณะนี้</p>
            </div>
          )}
          {!loading && !error && events.length > 0 && (
            <div className="event-grid">
              {events.map(function (event, idx) {
                return (
                  <div key={event.id} className="card-anim" style={{ animationDelay: Math.min(idx * 60, 480) + 'ms' }}>
                    <EventCard event={event} onClick={function () { handleCardClick(event.id); }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
