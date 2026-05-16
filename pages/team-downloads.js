// pages/team-downloads.js - LICA Photo | Collaborator Gallery
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useState, useEffect } from 'react';

var FF = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Helvetica,Arial,sans-serif';

// ── Sub-components ──────────────────────────────────────────

function FolderCard({ folder, onClick }) {
  var s = useState(false); var hov = s[0]; var setHov = s[1];
  return (
    <div
      onClick={onClick}
      className="td-hover"
      style={{
        background: hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
        border: '1px solid ' + (hov ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'),
        borderRadius: '12px', padding: '20px 16px', cursor: 'pointer',
        transition: 'all 0.18s ease', transform: hov ? 'translateY(-2px)' : 'none',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px',
      }}
    >
      <span style={{ fontSize: '26px' }}>{'📁'}</span>
      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 400, lineHeight: 1.4, wordBreak: 'break-word', fontFamily: FF }}>
        {folder.name}
      </span>
    </div>
  );
}

function PhotoCard({ file }) {
  var s = useState(false); var hov = s[0]; var setHov = s[1];
  var e = useState(false); var imgErr = e[0]; var setImgErr = e[1];
  var thumb = file.thumbnailLink ? file.thumbnailLink.replace(/=s[0-9]+/, '') + '=s400' : null;
  return (
    <div
      className="td-hover"
      style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', aspectRatio: '1 / 1' }}
    >
      {thumb && !imgErr ? (
        <img src={thumb} alt={file.name} onError={function(){setImgErr(true);}} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{'🖼'}</div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        background: hov ? 'rgba(0,0,0,0.58)' : 'rgba(0,0,0,0)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        padding: '12px', gap: '8px',
        transition: 'background 0.2s ease',
        opacity: hov ? 1 : 0,
        pointerEvents: hov ? 'all' : 'none',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '10px', textAlign: 'center', lineHeight: 1.4, wordBreak: 'break-all', maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontFamily: FF }}>
          {file.name}
        </p>
        <a
          href={'/api/drive/download?id=' + file.id}
          download={file.name}
          onClick={function(ev){ev.stopPropagation();}}
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.28)', borderRadius: '100px',
            padding: '7px 18px', color: 'rgba(255,255,255,0.95)',
            fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase',
            textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: FF,
          }}
        >
          ดาวน์โหลด ↓
        </a>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────

export default function TeamDownloads() {
  var router = useRouter();
  var [loading, setLoading] = useState(true);
  var [configured, setConfigured] = useState(true);
  var [crumbs, setCrumbs] = useState([]);
  var [current, setCurrent] = useState(null);
  var [folders, setFolders] = useState([]);
  var [files, setFiles] = useState([]);

  function loadFolder(folderId) {
    setLoading(true);
    var url = '/api/drive/browse' + (folderId ? '?folderId=' + folderId : '');
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(d){
        setConfigured(d.configured !== false);
        setFolders(d.folders || []);
        setFiles(d.files || []);
        setLoading(false);
      })
      .catch(function(){
        setConfigured(false);
        setLoading(false);
      });
  }

  useEffect(function(){ loadFolder(null); }, []);

  function openFolder(f) {
    setCrumbs(function(prev){ return prev.concat([{ id: current ? current.id : null, name: current ? current.name : 'อัลบั้ม' }]); });
    setCurrent(f);
    loadFolder(f.id);
  }

  function goBack() {
    if (crumbs.length === 0) { router.push('/'); return; }
    var prev = crumbs[crumbs.length - 1];
    setCrumbs(function(c){ return c.slice(0, -1); });
    setCurrent(prev.id ? prev : null);
    loadFolder(prev.id || null);
  }

  var totalItems = folders.length + files.length;

  return (
    <div style={{ minHeight: '100svh', background: '#080808', fontFamily: FF, color: 'rgba(255,255,255,0.85)', boxSizing: 'border-box' }}>
      <Head>
        <title>ผู้ร่วมงาน — LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="robots" content="noindex,nofollow" />
        <style>{'*{box-sizing:border-box;margin:0;padding:0} body{background:#080808;overflow-x:hidden}'}
  * { -webkit-tap-highlight-color: transparent; }
  body { overflow-x: hidden; }
  @media (hover: hover) { .td-hover:hover { opacity: 0.85; } }
</style>
      </Head>

      {/* ── Sticky header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(8,8,8,0.88)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: 'max(16px, env(safe-area-inset-top, 16px)) clamp(16px,4vw,40px) 16px',
        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <button type="button" onClick={goBack} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', color: 'rgba(255,255,255,0.50)', fontSize: '12px', letterSpacing: '0.08em', flexShrink: 0, transition: 'color 0.2s', fontFamily: FF }}>
          {'←'} {crumbs.length === 0 ? 'หน้าหลัก' : 'ย้อนกลับ'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', letterSpacing: '0.22em', textTransform: 'uppercase', flexShrink: 0 }}>LICA</span>
          {crumbs.map(function(c, i){
            return (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '11px' }}>/</span>
                <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              </span>
            );
          })}
          {current && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: '11px' }}>/</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{current.name}</span>
            </span>
          )}
        </div>

        <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.22)', fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase', flexShrink: 0 }}>ผู้ร่วมงาน</span>
      </header>

      {/* ── Main content ── */}
      <main style={{ padding: 'clamp(28px,4vw,52px) clamp(16px,4vw,40px)', maxWidth: '1400px', margin: '0 auto' }}>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '240px' }}>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '13px', letterSpacing: '0.16em' }}>กำลังโหลด...</span>
          </div>
        )}

        {!loading && !configured && (
          <div style={{ maxWidth: '440px', margin: '80px auto', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '20px' }}>{'⚙️'}</p>
            <h2 style={{ color: 'rgba(255,255,255,0.85)', fontSize: '20px', fontWeight: 300, marginBottom: '12px' }}>ยังไม่ได้ตั้งค่าระบบ</h2>
            <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '14px', lineHeight: 1.8 }}>ช่างภาพยังไม่ได้เชื่อมต่อ Google Drive<br />กรุณาติดต่อช่างภาพเพื่อเปิดใช้งาน</p>
          </div>
        )}

        {!loading && configured && folders.length === 0 && files.length === 0 && (
          <div style={{ maxWidth: '400px', margin: '80px auto', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '20px' }}>{'📭'}</p>
            <h2 style={{ color: 'rgba(255,255,255,0.85)', fontSize: '20px', fontWeight: 300, marginBottom: '12px' }}>ยังไม่มีรูปภาพ</h2>
            <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '14px', lineHeight: 1.8 }}>ช่างภาพยังไม่ได้อัปโหลดรูปภาพในขณะนี้</p>
          </div>
        )}

        {!loading && configured && folders.length > 0 && (
          <section style={{ marginBottom: files.length > 0 ? '48px' : '0' }}>
            <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase', marginBottom: '18px' }}>
              {current ? 'โฟลเดอร์ · ' + folders.length + ' รายการ' : 'งานทั้งหมด · ' + folders.length + ' งาน'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
              {folders.map(function(f){ return <FolderCard key={f.id} folder={f} onClick={function(){openFolder(f);}} />; })}
            </div>
          </section>
        )}

        {!loading && configured && files.length > 0 && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase' }}>
                ภาพถ่าย · {files.length} รูป
              </p>
              <a
                href={'/api/drive/browse?folderId=' + (current ? current.id : '')}
                style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', letterSpacing: '0.12em', textDecoration: 'none' }}
              >
                โหวตทั้งหมดจาก Drive ↗
              </a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
              {files.map(function(file){ return <PhotoCard key={file.id} file={file} />; })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
