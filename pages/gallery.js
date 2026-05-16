// pages/gallery.js — LICA Photo public gallery
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

function hiRes(url, size) {
  if (!url) return null;
  return url.replace(/=s\d+(-c)?$/, '=s' + size);
}

// ─── Photo cell ────────────────────────────────────────────────────────────────
function PhotoCell({ photo, onClick }) {
  var [loaded, setLoaded] = useState(false);
  var thumb = hiRes(photo.thumbnailLink, 800);
  return (
    <div className="lica-cell" onClick={onClick}>
      {thumb
        ? <img src={thumb} alt={photo.name} loading="lazy" className={loaded ? 'lica-img loaded' : 'lica-img'} onLoad={function () { setLoaded(true); }} />
        : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)' }} />
      }
      <div className="lica-cell-overlay" />
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return <div className="lica-skeleton" />;
}

// ─── Folder chip ───────────────────────────────────────────────────────────────
function Chip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 100, fontSize: 12, cursor: 'pointer',
      background: selected ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
      border: '1px solid ' + (selected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.14)'),
      color: selected ? '#fff' : 'rgba(255,255,255,0.55)',
      fontFamily: FONT, whiteSpace: 'nowrap',
      transition: 'background 0.15s, border-color 0.15s',
    }}>{label}</button>
  );
}

// ─── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ photos, idx, onClose, onPrev, onNext }) {
  var [loaded, setLoaded] = useState(false);
  var touchX = useRef(null);
  var photo = photos[idx];

  // Reset loaded state when idx changes
  useEffect(function () { setLoaded(false); }, [idx]);

  // Keyboard
  useEffect(function () {
    function onKey(e) {
      if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return function () { window.removeEventListener('keydown', onKey); };
  }, [onClose, onPrev, onNext]);

  // Lock body scroll
  useEffect(function () {
    var prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return function () { document.body.style.overflow = prev; };
  }, []);

  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX.current === null) return;
    var dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 48) { if (dx < 0) onNext(); else onPrev(); }
  }

  var src = hiRes(photo.thumbnailLink, 1600);

  return (
    <div
      className="lica-lb-backdrop"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button className="lica-lb-close" onClick={onClose}>×</button>

      {/* Counter */}
      <div className="lica-lb-counter">{idx + 1} / {photos.length}</div>

      {/* Prev */}
      {idx > 0 && (
        <button className="lica-lb-arrow lica-lb-prev" onClick={function (e) { e.stopPropagation(); onPrev(); }}>‹</button>
      )}
      {/* Next */}
      {idx < photos.length - 1 && (
        <button className="lica-lb-arrow lica-lb-next" onClick={function (e) { e.stopPropagation(); onNext(); }}>›</button>
      )}

      {/* Image */}
      <div className="lica-lb-img-wrap" onClick={function (e) { e.stopPropagation(); }}>
        {!loaded && (
          <div className="lica-lb-spinner">
            <div className="lica-lb-spin-ring" />
          </div>
        )}
        {src && (
          <img
            key={src}
            src={src}
            alt={photo.name}
            className={'lica-lb-img' + (loaded ? ' lb-loaded' : '')}
            onLoad={function () { setLoaded(true); }}
          />
        )}
        {loaded && (
          <div className="lica-lb-caption">{photo.name}</div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Gallery() {
  var [allFiles, setAllFiles] = useState([]);
  var [folders, setFolders] = useState([]);
  var [activeFolder, setActiveFolder] = useState(null); // null = all
  var [loading, setLoading] = useState(true);
  var [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(function () {
    setLoading(true);
    fetch('/api/drive/browse')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var files = (data.files || []).filter(function (f) {
          return f.mimeType && (
            f.mimeType.startsWith('image/') ||
            f.mimeType === 'application/octet-stream'
          ) && f.thumbnailLink;
        });
        setAllFiles(files);
        setFolders(data.folders || []);
        setLoading(false);
      })
      .catch(function () { setLoading(false); });
  }, []);

  // Client-side folder filter (if API doesn't support folderId param)
  var photos = activeFolder
    ? allFiles.filter(function (f) { return f.parents && f.parents.indexOf(activeFolder) !== -1; })
    : allFiles;

  // Lightbox nav
  function openLightbox(idx) { setLightboxIdx(idx); }
  function closeLightbox() { setLightboxIdx(null); }
  function prevPhoto() { setLightboxIdx(function (i) { return Math.max(i - 1, 0); }); }
  function nextPhoto() { setLightboxIdx(function (i) { return Math.min(i + 1, photos.length - 1); }); }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100svh', fontFamily: FONT, overflowX: 'hidden' }}>
      <Head>
        <title>Gallery — LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
      </Head>

      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(14px,4vw,40px)', height: 52,
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 100,
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
            fontSize: 11, letterSpacing: '0.06em',
          }}>← กลับหน้าหลัก</a>
          <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            Gallery
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
          {!loading && photos.length > 0 && photos.length + ' ภาพ'}
        </div>
      </header>

      {/* ── Folder chips ── */}
      {folders.length > 0 && (
        <div style={{
          display: 'flex', gap: 8, flexWrap: 'nowrap',
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          padding: 'clamp(12px,3vw,20px) clamp(14px,4vw,40px)',
          scrollbarWidth: 'none',
        }}>
          <Chip label="ทั้งหมด" selected={!activeFolder} onClick={function () { setActiveFolder(null); }} />
          {folders.map(function (f) {
            return (
              <Chip
                key={f.id}
                label={f.name}
                selected={activeFolder === f.id}
                onClick={function () { setActiveFolder(activeFolder === f.id ? null : f.id); }}
              />
            );
          })}
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{ padding: folders.length > 0 ? '0 0 clamp(24px,4vw,48px)' : 'clamp(12px,3vw,20px) 0 clamp(24px,4vw,48px)' }}>
        {loading ? (
          <div className="lica-grid">
            {Array.from({ length: 18 }).map(function (_, i) { return <Skeleton key={i} />; })}
          </div>
        ) : photos.length === 0 ? (
          <div style={{
            textAlign: 'center', paddingTop: 100,
            color: 'rgba(255,255,255,0.25)', fontSize: 14, lineHeight: 2,
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>📷</div>
            ยังไม่มีรูปภาพ
          </div>
        ) : (
          <div className="lica-grid">
            {photos.map(function (photo, idx) {
              return (
                <PhotoCell
                  key={photo.id}
                  photo={photo}
                  onClick={function () { openLightbox(idx); }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          idx={lightboxIdx}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; overflow-x: hidden; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }

        /* ── Grid ── */
        .lica-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
        }
        @media (min-width: 540px) {
          .lica-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 900px) {
          .lica-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1280px) {
          .lica-grid { grid-template-columns: repeat(5, 1fr); }
        }
        @media (min-width: 1800px) {
          .lica-grid { grid-template-columns: repeat(6, 1fr); }
        }

        /* ── Cell ── */
        .lica-cell {
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          cursor: pointer;
          background: rgba(255,255,255,0.04);
        }
        .lica-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.4s ease, transform 0.4s ease;
          will-change: transform;
        }
        .lica-img.loaded { opacity: 1; }
        @media (hover: hover) {
          .lica-cell:hover .lica-img.loaded { transform: scale(1.04); }
          .lica-cell:hover .lica-cell-overlay { background: rgba(0,0,0,0.12); }
        }
        .lica-cell-overlay {
          position: absolute;
          inset: 0;
          background: transparent;
          transition: background 0.2s;
        }

        /* ── Skeleton ── */
        .lica-skeleton {
          aspect-ratio: 1 / 1;
          background: rgba(255,255,255,0.05);
          animation: lica-pulse 1.8s ease-in-out infinite;
        }
        @keyframes lica-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        /* ── Lightbox ── */
        .lica-lb-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(0,0,0,0.96);
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: pan-y pinch-zoom;
        }
        .lica-lb-close {
          position: absolute;
          top: max(16px, env(safe-area-inset-top, 16px));
          right: max(16px, env(safe-area-inset-right, 16px));
          z-index: 10;
          width: 44px; height: 44px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff; font-size: 22px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .lica-lb-close:hover { background: rgba(255,255,255,0.18); }
        .lica-lb-counter {
          position: absolute;
          top: max(20px, env(safe-area-inset-top, 20px));
          left: 50%; transform: translateX(-50%);
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.12em;
          pointer-events: none;
        }
        .lica-lb-arrow {
          position: absolute;
          top: 50%; transform: translateY(-50%);
          z-index: 10;
          width: 48px; height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.15);
          color: #fff; font-size: 26px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .lica-lb-arrow:hover { background: rgba(255,255,255,0.18); }
        .lica-lb-prev { left: clamp(8px, 3vw, 28px); }
        .lica-lb-next { right: clamp(8px, 3vw, 28px); }
        @media (max-width: 480px) {
          .lica-lb-prev, .lica-lb-next { display: none; }
        }
        .lica-lb-img-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: min(92vw, 1200px);
          max-height: 88svh;
        }
        .lica-lb-img {
          display: block;
          max-width: min(92vw, 1200px);
          max-height: 85svh;
          object-fit: contain;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .lica-lb-img.lb-loaded { opacity: 1; }
        .lica-lb-caption {
          position: absolute;
          bottom: -26px;
          left: 0; right: 0;
          text-align: center;
          font-size: 11px;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.05em;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lica-lb-spinner {
          display: flex; align-items: center; justify-content: center;
          width: min(80vw, 500px); height: min(55svh, 380px);
        }
        .lica-lb-spin-ring {
          width: 32px; height: 32px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: rgba(255,255,255,0.5);
          border-radius: 50%;
          animation: lica-spin 0.8s linear infinite;
        }
        @keyframes lica-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
