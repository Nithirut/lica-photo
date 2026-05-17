// pages/team-downloads/[event-id].js
// Individual event page: tabs for All Photos / AI Face Search
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';
var ORANGE = '#c9a84c';
var BG = '#080808';

function formatDate(iso) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch (e) { return iso; }
}

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) { resolve(e.target.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Lightbox({ photos, startIndex, onClose }) {
  var [index, setIndex] = useState(startIndex);
  useEffect(function () {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex(function (i) { return Math.min(i + 1, photos.length - 1); });
      if (e.key === 'ArrowLeft') setIndex(function (i) { return Math.max(i - 1, 0); });
    }
    window.addEventListener('keydown', onKey);
    return function () { window.removeEventListener('keydown', onKey); };
  }, [onClose, photos.length]);
  useEffect(function () { document.body.style.overflow = 'hidden'; return function () { document.body.style.overflow = ''; }; }, []);
  var photo = photos[index];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease both' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: '44px', height: '44px', color: '#fff', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', zIndex: 10 }}>✕</button>
      <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{index + 1} / {photos.length}</span>
        <a href={photo.downloadUrl} download onClick={function (e) { e.stopPropagation(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '8px', color: ORANGE, fontSize: '12px', padding: '6px 14px', textDecoration: 'none', fontFamily: FONT, WebkitTapHighlightColor: 'transparent' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v7M3.5 5.5l3 3 3-3M1.5 11h10" stroke={ORANGE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ดาวน์โหลด
        </a>
      </div>
      {index > 0 && <button onClick={function (e) { e.stopPropagation(); setIndex(function (i) { return i - 1; }); }} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: '48px', height: '48px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', zIndex: 10 }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11 4L6 9l5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>}
      <div onClick={function (e) { e.stopPropagation(); }} style={{ maxWidth: '90vw', maxHeight: '88vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img key={photo.id} src={photo.thumbnailUrl} alt={photo.name} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 24px 80px rgba(0,0,0,0.8)', animation: 'fadeIn 0.25s ease both' }} />
      </div>
      {index < photos.length - 1 && <button onClick={function (e) { e.stopPropagation(); setIndex(function (i) { return i + 1; }); }} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: '48px', height: '48px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', zIndex: 10 }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 4l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>}
    </div>
  );
}

function AllPhotosGallery({ eventId }) {
  var [photos, setPhotos] = useState([]);
  var [loading, setLoading] = useState(true);
  var [loadingMore, setLoadingMore] = useState(false);
  var [nextPageToken, setNextPageToken] = useState(null);
  var [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(function () {
    if (!eventId) return;
    setLoading(true); setPhotos([]);
    fetch('/api/drive/photos?eventId=' + eventId)
      .then(function (r) { return r.json(); })
      .then(function (data) { setPhotos(data.photos || []); setNextPageToken(data.nextPageToken || null); setLoading(false); })
      .catch(function () { setLoading(false); });
  }, [eventId]);

  function loadMore() {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    fetch('/api/drive/photos?eventId=' + eventId + '&pageToken=' + nextPageToken)
      .then(function (r) { return r.json(); })
      .then(function (data) { setPhotos(function (prev) { return prev.concat(data.photos || []); }); setNextPageToken(data.nextPageToken || null); setLoadingMore(false); })
      .catch(function () { setLoadingMore(false); });
  }

  if (loading) return (
    <div style={{ columns: '2', columnGap: '10px' }} className="gallery-grid">
      {[0,1,2,3,4,5,6,7].map(function (i) { return <div key={i} style={{ breakInside: 'avoid', marginBottom: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', aspectRatio: i % 3 === 0 ? '3/4' : '4/3', animation: 'shimmer 1.6s ease-in-out infinite' }} />; })}
    </div>
  );

  if (photos.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: '40px', opacity: 0.3, marginBottom: '12px' }}>📷</div>
      <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.4)' }}>ยังไม่มีรูปภาพในงานนี้</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>{photos.length} รูป{nextPageToken ? '+' : ''}</div>
      <div style={{ columns: '2', columnGap: '10px' }} className="gallery-grid">
        {photos.map(function (photo, idx) {
          return (
            <div key={photo.id} onClick={function () { setLightboxIndex(idx); }} style={{ breakInside: 'avoid', marginBottom: '10px', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', position: 'relative', WebkitTapHighlightColor: 'transparent', animation: 'fadeInUp 0.3s ease both', animationDelay: Math.min(idx * 30, 300) + 'ms' }}>
              <img src={photo.thumbnailUrl} alt={photo.name} loading="lazy" style={{ width: '100%', display: 'block', borderRadius: '8px', transition: 'transform 0.3s ease, filter 0.3s ease' }}
                onMouseEnter={function (e) { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={function (e) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'brightness(1)'; }}
              />
              <a href={photo.downloadUrl} download onClick={function (e) { e.stopPropagation(); }} style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', borderRadius: '6px', padding: '5px 8px', display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3.5 6l3.5 3.5L10.5 6M1.5 12h11" stroke={ORANGE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </a>
            </div>
          );
        })}
      </div>
      {nextPageToken && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button onClick={loadMore} disabled={loadingMore} style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '10px', color: loadingMore ? 'rgba(201,168,76,0.4)' : ORANGE, fontSize: '14px', padding: '11px 32px', cursor: loadingMore ? 'default' : 'pointer', fontFamily: FONT, letterSpacing: '0.03em', WebkitTapHighlightColor: 'transparent' }}>
            {loadingMore ? 'กำลังโหลด...' : 'โหลดเพิ่มเติม'}
          </button>
        </div>
      )}
      {lightboxIndex !== null && <Lightbox photos={photos} startIndex={lightboxIndex} onClose={function () { setLightboxIndex(null); }} />}
    </div>
  );
  }

function FaceSearchCard({ eventId, onResults }) {
  var [state, setState] = useState('idle');
  var [errorMsg, setErrorMsg] = useState('');
  var [progress, setProgress] = useState(0);
  var [dragging, setDragging] = useState(false);
  var [previewUrl, setPreviewUrl] = useState(null);
  var fileInputRef = useRef(null);
  var cameraInputRef = useRef(null);
  var progressRef = useRef(null);

  useEffect(function () {
    if (state === 'searching') {
      setProgress(0);
      var start = Date.now(); var duration = 18000;
      progressRef.current = setInterval(function () { setProgress(Math.min(92, ((Date.now() - start) / duration) * 100)); }, 200);
      return function () { clearInterval(progressRef.current); };
    } else { clearInterval(progressRef.current); if (state === 'done') setProgress(100); }
  }, [state]);

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    var base64 = await fileToBase64(file);
    setPreviewUrl(base64); setState('searching'); setErrorMsg('');
    try {
      var res = await fetch('/api/drive/face-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: eventId, selfie: base64 }) });
      var data = await res.json();
      if (!res.ok) { setState('error'); setErrorMsg(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่'); return; }
      setState('done'); onResults(data);
    } catch (e) { setState('error'); setErrorMsg('เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตและลองใหม่'); }
  }

  function reset() { setState('idle'); setPreviewUrl(null); setErrorMsg(''); setProgress(0); onResults(null); }

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: dragging ? '1.5px dashed ' + ORANGE : '1px solid rgba(255,255,255,0.09)', borderRadius: '16px', padding: '28px 24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke={ORANGE} strokeWidth="1.4" /><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke={ORANGE} strokeWidth="1.4" strokeLinecap="round" /></svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>ค้นหารูปด้วย AI</span>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, paddingLeft: '42px' }}>อัปโหลดรูปใบหน้าของคุณ AI จะค้นหารูปทุกใบในงานนี้ให้</p>
      </div>
      {state === 'idle' && (
        <>
          <div onDrop={function(e){e.preventDefault();setDragging(false);handleFile(e.dataTransfer.files?.[0]);}} onDragOver={function(e){e.preventDefault();setDragging(true);}} onDragLeave={function(){setDragging(false);}} onClick={function(){fileInputRef.current?.click();}}
            style={{ border: dragging ? '1.5px dashed '+ORANGE : '1.5px dashed rgba(255,255,255,0.15)', borderRadius: '12px', padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)', transition: 'all 0.25s ease', WebkitTapHighlightColor: 'transparent' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 15V5M6 9l5-5 5 5" stroke={ORANGE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 17h16" stroke={ORANGE} strokeWidth="1.6" strokeLinecap="round" /></svg>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>อัปโหลดรูปใบหน้าของคุณ</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>ลาก &amp; วาง หรือคลิกเพื่อเลือกรูป</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '8px' }}>JPG, PNG — สูงสุด 8MB</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} /><span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>หรือ</span><div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <button onClick={function(){cameraInputRef.current?.click();}} style={{ width: '100%', padding: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.75)', fontSize: '14px', fontFamily: FONT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', WebkitTapHighlightColor: 'transparent' }}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><rect x="1.5" y="4.5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" /><circle cx="8.5" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.4" /><path d="M6 4.5l1-2h3l1 2" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            ถ่ายรูปจากกล้อง
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={function(e){handleFile(e.target.files?.[0]);e.target.value='';}} style={{ display: 'none' }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={function(e){handleFile(e.target.files?.[0]);e.target.value='';}} style={{ display: 'none' }} />
        </>
      )}
      {state === 'searching' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {previewUrl && <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '2px solid rgba(201,168,76,0.4)', position: 'relative' }}><img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="selfie" /><div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: '2px solid '+ORANGE, borderTopColor: 'transparent', animation: 'spinSlow 1.2s linear infinite' }} /></div>}
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>AI กำลังค้นหารูปของคุณในงาน...</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>อาจใช้เวลาสักครู่ กรุณาอย่าปิดหน้านี้</div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: progress+'%', background: 'linear-gradient(90deg, #8a6a1f, #c9a84c, #e8d080)', borderRadius: '2px', transition: 'width 0.4s ease' }} /></div>
          <div style={{ fontSize: '12px', color: 'rgba(201,168,76,0.6)', marginTop: '8px' }}>{Math.round(progress)}%</div>
        </div>
      )}
      {state === 'done' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {previewUrl && <img src={previewUrl} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(201,168,76,0.4)' }} alt="selfie" />}
            <div><div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>ค้นหาเสร็จสิ้น</div><div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>เลื่อนลงเพื่อดูผลลัพธ์</div></div>
          </div>
          <button onClick={reset} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', padding: '7px 14px', cursor: 'pointer', fontFamily: FONT, WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}>ค้นหาใหม่</button>
        </div>
      )}
      {state === 'error' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v6M10 14h.01" stroke="#ff5050" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="10" r="9" stroke="#ff5050" strokeWidth="1.4" /></svg></div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', marginBottom: '16px', lineHeight: 1.5 }}>{errorMsg || 'เกิดข้อผิดพลาด'}</div>
          <button onClick={reset} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px', color: ORANGE, fontSize: '13px', padding: '9px 22px', cursor: 'pointer', fontFamily: FONT, WebkitTapHighlightColor: 'transparent' }}>ลองใหม่</button>
        </div>
      )}
    </div>
  );
        }

function FaceSearchResults({ results }) {
  var [lightboxIndex, setLightboxIndex] = useState(null);
  if (!results) return null;
  var matches = results.matches || [];
  return (
    <div style={{ marginTop: '28px' }}>
      {matches.length > 0 ? (
        <>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginBottom: '3px' }}>พบ {matches.length} รูปที่มีคุณ</h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>ค้นหาจากรูปทั้งหมด {results.searched} รูป</p>
          </div>
          <div style={{ columns: '2', columnGap: '10px' }} className="gallery-grid">
            {matches.map(function (photo, idx) {
              return (
                <div key={photo.id} onClick={function(){setLightboxIndex(idx);}} style={{ breakInside: 'avoid', marginBottom: '10px', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden', position: 'relative', WebkitTapHighlightColor: 'transparent', animation: 'fadeInUp 0.35s ease both', animationDelay: Math.min(idx*50,400)+'ms' }}>
                  <img src={photo.thumbnailUrl} alt={photo.name} loading="lazy" style={{ width: '100%', display: 'block', borderRadius: '8px', transition: 'transform 0.3s ease' }}
                    onMouseEnter={function(e){e.currentTarget.style.transform='scale(1.03)';}}
                    onMouseLeave={function(e){e.currentTarget.style.transform='scale(1)';}}
                  />
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', borderRadius: '6px', padding: '3px 7px', fontSize: '10px', color: ORANGE, fontWeight: 600 }}>{Math.round(photo.score*100)}%</div>
                  <a href={photo.downloadUrl} download onClick={function(e){e.stopPropagation();}} style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', padding: '5px 8px', display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M3.5 6l3.5 3.5L10.5 6M1.5 12h11" stroke={ORANGE} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                </div>
              );
            })}
          </div>
          {lightboxIndex !== null && <Lightbox photos={matches} startIndex={lightboxIndex} onClose={function(){setLightboxIndex(null);}} />}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" /><path d="M21 21l-4-4" stroke="rgba(255,255,255,0.3)" strokeWidth="1.6" strokeLinecap="round" /></svg></div>
          <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>ไม่พบรูปที่ตรงกัน</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>ลองใช้รูปที่เห็นใบหน้าชัดเจน ไม่มีแว่นกันแดดหรือหน้ากาก</div>
        </div>
      )}
    </div>
  );
}

export default function EventPage() {
  var router = useRouter();
  var eventId = router.query['event-id'];
  var [event, setEvent] = useState(null);
  var [loading, setLoading] = useState(true);
  var [imgLoaded, setImgLoaded] = useState(false);
  var [activeTab, setActiveTab] = useState('all');
  var [searchResults, setSearchResults] = useState(null);

  useEffect(function () {
    if (!eventId) return;
    fetch('/api/drive/events').then(function(r){return r.json();}).then(function(data){
      var found = (data.events||[]).find(function(e){return e.id===eventId;});
      setEvent(found||null); setLoading(false);
    }).catch(function(){setLoading(false);});
  }, [eventId]);

  function handleResults(data) {
    setSearchResults(data);
    if (data&&data.matches&&data.matches.length>0) {
      setTimeout(function(){var el=document.getElementById('search-results');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},200);
    }
  }

  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{background:${BG};color:#fff;font-family:${FONT};min-height:100vh;}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes spinSlow{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes shimmer{0%{opacity:0.4;}50%{opacity:0.8;}100%{opacity:0.4;}}
        @media(min-width:700px){.gallery-grid{columns:3!important;}}
        @media(min-width:1024px){.gallery-grid{columns:4!important;}}
        .back-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(0,0,0,0.4);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:rgba(255,255,255,0.8);font-family:${FONT};font-size:13px;cursor:pointer;padding:8px 14px;letter-spacing:0.02em;transition:background 0.2s,color 0.2s;-webkit-tap-highlight-color:transparent;}
        .back-btn:hover{background:rgba(0,0,0,0.6);color:#fff;}
        .tab-btn{flex:1;padding:12px 8px;background:none;border:none;font-family:${FONT};font-size:14px;font-weight:500;cursor:pointer;transition:color 0.2s;-webkit-tap-highlight-color:transparent;position:relative;letter-spacing:0.01em;}
        .tab-btn::after{content:'';position:absolute;bottom:0;left:10%;right:10%;height:2px;border-radius:1px;background:${ORANGE};transform:scaleX(0);transition:transform 0.25s cubic-bezier(0.4,0,0.2,1);}
        .tab-btn.active{color:#fff;}.tab-btn.active::after{transform:scaleX(1);}
        .tab-btn:not(.active){color:rgba(255,255,255,0.4);}.tab-btn:not(.active):hover{color:rgba(255,255,255,0.7);}
      `}</style>
      <div style={{minHeight:'100vh',background:BG}}>
        <div style={{position:'relative',width:'100%',minHeight:'52vh',maxHeight:'70vh',overflow:'hidden',display:'flex',alignItems:'flex-end'}}>
          {event?.posterId&&<img src={`/api/drive/poster?fileId=${event.posterId}`} alt="" aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'blur(32px) brightness(0.3)',transform:'scale(1.1)'}}/>}
          {!event?.posterId&&<div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#0f0c00 0%,#080808 50%,#0a0800 100%)'}}/>}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(8,8,8,1) 0%,rgba(8,8,8,0.55) 40%,rgba(0,0,0,0.15) 100%)'}}/>
          {event?.posterId&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',paddingTop:'60px'}}><img src={`/api/drive/poster?fileId=${event.posterId}`} alt={event?.name} onLoad={function(){setImgLoaded(true);}} style={{maxHeight:'48vh',maxWidth:'48vw',objectFit:'contain',borderRadius:'6px',boxShadow:'0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.06)',opacity:imgLoaded?1:0,transition:'opacity 0.5s ease'}}/></div>}
          <div style={{position:'absolute',top:'20px',left:'20px',zIndex:10}}>
            <button className="back-btn" onClick={function(){router.push('/team-downloads');}}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M9.5 12L4.5 7.5 9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              เลือกงาน
            </button>
          </div>
          <div style={{position:'relative',zIndex:5,width:'100%',padding:'0 24px 28px'}}>
            {loading?(<div style={{height:'40px',background:'rgba(255,255,255,0.06)',borderRadius:'8px',width:'55%',animation:'fadeIn 0.5s ease'}}/>):event?(
              <div style={{animation:'fadeInUp 0.5s ease both'}}>
                <div style={{fontSize:'11px',letterSpacing:'0.2em',color:ORANGE,textTransform:'uppercase',fontWeight:500,marginBottom:'6px'}}>{formatDate(event.date)}</div>
                <h1 style={{fontSize:'clamp(22px,5vw,40px)',fontWeight:700,letterSpacing:'-0.02em',color:'#fff',lineHeight:1.15,textShadow:'0 2px 20px rgba(0,0,0,0.5)'}}>{event.name}</h1>
              </div>
            ):!loading&&<div style={{color:'rgba(255,255,255,0.5)',fontSize:'14px'}}>ไม่พบงานนี้</div>}
          </div>
        </div>

        <div style={{position:'sticky',top:0,zIndex:100,background:'rgba(8,8,8,0.92)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <div style={{maxWidth:'860px',margin:'0 auto',padding:'0 20px',display:'flex'}}>
            <button className={'tab-btn'+(activeTab==='all'?' active':'')} onClick={function(){setActiveTab('all');}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
                ภาพทั้งหมด
              </span>
            </button>
            <button className={'tab-btn'+(activeTab==='search'?' active':'')} onClick={function(){setActiveTab('search');}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                ค้นหาด้วย AI
              </span>
            </button>
          </div>
        </div>

        <div style={{maxWidth:'860px',margin:'0 auto',padding:'28px 20px 80px'}}>
          {activeTab==='all'&&eventId&&<AllPhotosGallery eventId={eventId}/>}
          {activeTab==='search'&&(
            <div>
              {eventId&&<FaceSearchCard eventId={eventId} onResults={handleResults}/>}
              <div id="search-results"><FaceSearchResults results={searchResults}/></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
