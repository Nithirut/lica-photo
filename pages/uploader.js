// pages/uploader.js — photographer upload portal
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Helvetica, Arial, sans-serif';

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

function uploadToGoogle(file, uploadUrl, onProgress) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = function () { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('HTTP ' + xhr.status)); };
    xhr.onerror = function () { reject(new Error('Network error')); };
    xhr.send(file);
  });
}

function LoginScreen({ error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', gap: 24, fontFamily: FONT, color: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>Life Insurance Counsellor Association</div>
        <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: '0.08em' }}>LICA Photo</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>ระบบสำหรับช่างภาพ</div>
      </div>
      {error && (
        <div style={{ background: 'rgba(255,80,80,0.15)', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 8, padding: '10px 20px', fontSize: 13, color: '#ff6b6b', maxWidth: 320, textAlign: 'center' }}>
          {error === 'no_code' ? 'ยกเลิกการเข้าสู่ระบบ' : error === 'not_authorized' ? 'บัญชีนี้ไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ' : 'เกิดข้อผิดพลาด: ' + error}
        </div>
      )}
      <a href="/api/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 32px', borderRadius: 100, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(16px)', color: '#fff', textDecoration: 'none', fontSize: 14, letterSpacing: '0.06em', fontFamily: FONT, cursor: 'pointer' }}

        className="lica-login-btn">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        เข้าสู่ระบบด้วย Google
      </a>
      <a href="/" style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', marginTop: 8 }}>← กลับหน้าหลัก</a>
    </div>
  );
}

function UploaderPanel({ user }) {
  var [folders, setFolders] = useState([]);
  var [loadingFolders, setLoadingFolders] = useState(true);
  var [targetFolder, setTargetFolder] = useState(null);
  var [newFolderName, setNewFolderName] = useState('');
  var [showNewFolder, setShowNewFolder] = useState(false);
  var [creatingFolder, setCreatingFolder] = useState(false);
  var [fileQueue, setFileQueue] = useState([]);
  var [isDragging, setIsDragging] = useState(false);
  var [isUploading, setIsUploading] = useState(false);
  var [allDone, setAllDone] = useState(false);
  var fileInputRef = useRef(null);

  useEffect(function () {
    fetch('/api/drive/browse').then(function (r) { return r.json(); }).then(function (data) {
      setFolders((data.folders || []).map(function (fo) { return { id: fo.id, name: fo.name }; }));
      setLoadingFolders(false);
    }).catch(function () { setLoadingFolders(false); });
  }, []);

  function addFiles(newFiles) {
    setFileQueue(function (prev) { return prev.concat(Array.from(newFiles).map(function (f) { return { file: f, progress: 0, status: 'pending', error: null }; })); });
    setAllDone(false);
  }

  function removeFile(idx) {
    setFileQueue(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); });
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      var r = await fetch('/api/drive/mkdir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFolderName.trim() }) });
      var data = await r.json();
      if (data.id) {
        setFolders(function (prev) { return [{ id: data.id, name: data.name }].concat(prev); });
        setTargetFolder({ id: data.id, name: data.name });
        setNewFolderName(''); setShowNewFolder(false);
      }
    } catch (e) { console.error(e); }
    setCreatingFolder(false);
  }

  async function startUpload() {
    if (!fileQueue.length) return;
    setIsUploading(true); setAllDone(false);
    for (var i = 0; i < fileQueue.length; i++) {
      if (fileQueue[i].status === 'done') continue;
      (function (idx) { setFileQueue(function (prev) { return prev.map(function (f, j) { return j === idx ? Object.assign({}, f, { status: 'uploading', progress: 0 }) : f; }); }); })(i);
      try {
        var startRes = await fetch('/api/drive/start-upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fileQueue[i].file.name, mimeType: fileQueue[i].file.type || 'application/octet-stream', folderId: targetFolder ? targetFolder.id : null }) });
        var startData = await startRes.json();
        if (!startData.uploadUrl) throw new Error(startData.error || 'No upload URL');
        var capturedIdx = i;
        await uploadToGoogle(fileQueue[i].file, startData.uploadUrl, function (pct) { setFileQueue(function (prev) { return prev.map(function (f, j) { return j === capturedIdx ? Object.assign({}, f, { progress: pct }) : f; }); }); });
        (function (idx2) { setFileQueue(function (prev) { return prev.map(function (f, j) { return j === idx2 ? Object.assign({}, f, { status: 'done', progress: 100 }) : f; }); }); })(i);
      } catch (e) {
        (function (idx3, err) { setFileQueue(function (prev) { return prev.map(function (f, j) { return j === idx3 ? Object.assign({}, f, { status: 'error', error: err.message }) : f; }); }); })(i, e);
      }
    }
    setIsUploading(false); setAllDone(true);
  }

  var pendingCount = fileQueue.filter(function (f) { return f.status === 'pending'; }).length;
  var doneCount = fileQueue.filter(function (f) { return f.status === 'done'; }).length;

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(32px,4vw,48px) 20px max(32px, calc(32px + env(safe-area-inset-bottom, 0px)))', fontFamily: FONT, color: '#fff' }}>
      <Section title="โฟลเดอร์ปลายทาง">
        {loadingFolders ? <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>กำลังโหลด...</div> : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <FolderChip label="อัลบั้ม (Root)" selected={!targetFolder} onClick={function () { setTargetFolder(null); }} />
            {folders.map(function (f) { return <FolderChip key={f.id} label={f.name} selected={targetFolder && targetFolder.id === f.id} onClick={function () { setTargetFolder(f); }} />; })}
            <button onClick={function () { setShowNewFolder(function (v) { return !v; }); }} style={chipStyle(false)}>+ โฟลเดอร์ใหม่</button>
          </div>
        )}
        {showNewFolder && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <input value={newFolderName} onChange={function (e) { setNewFolderName(e.target.value); }} onKeyDown={function (e) { if (e.key === 'Enter') createFolder(); }} placeholder="ชื่อโฟลเดอร์ใหม่..." style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: FONT }} autoFocus />
            <button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, cursor: creatingFolder ? 'default' : 'pointer', fontFamily: FONT }}>{creatingFolder ? '...' : 'สร้าง'}</button>
          </div>
        )}
        {targetFolder && <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>อัปโหลดไปที่: <span style={{ color: 'rgba(255,255,255,0.7)' }}>{targetFolder.name}</span></div>}
      </Section>
      <Section title="เลือกภาพ">
        <div onDragOver={function (e) { e.preventDefault(); setIsDragging(true); }} onDragLeave={function () { setIsDragging(false); }} onDrop={function (e) { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }} onClick={function () { fileInputRef.current && fileInputRef.current.click(); }} style={{ border: '2px dashed ' + (isDragging ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)'), borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: isDragging ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>ลากภาพวางที่นี่</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>หรือคลิกเพื่อเลือกไฟล์ · JPG, PNG, RAW, MP4</div>
        </div>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.raw,.cr2,.cr3,.nef,.arw,.dng" style={{ display: 'none' }} onChange={function (e) { addFiles(e.target.files); e.target.value = ''; }} />
      </Section>
      {fileQueue.length > 0 && (
        <Section title={'ไฟล์ที่เลือก (' + fileQueue.length + ' ไฟล์)'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fileQueue.map(function (item, idx) { return <FileRow key={idx} item={item} onRemove={item.status === 'pending' ? function () { removeFile(idx); } : null} />; })}
          </div>
          {allDone && doneCount === fileQueue.length && <div style={{ marginTop: 16, padding: '12px 20px', borderRadius: 10, background: 'rgba(72,199,142,0.15)', border: '1px solid rgba(72,199,142,0.3)', color: '#48c78e', fontSize: 13, textAlign: 'center' }}>✓ อัปโหลดสำเร็จทั้งหมด {doneCount} ไฟล์</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={startUpload} disabled={isUploading || pendingCount === 0} style={{ flex: 1, padding: '12px 24px', borderRadius: 100, background: pendingCount > 0 && !isUploading ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.2)', color: pendingCount > 0 && !isUploading ? '#fff' : 'rgba(255,255,255,0.3)', fontSize: 14, cursor: pendingCount > 0 && !isUploading ? 'pointer' : 'default', fontFamily: FONT, letterSpacing: '0.06em' }}>{isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด ' + pendingCount + ' ไฟล์ →'}</button>
            {!isUploading && <button onClick={function () { setFileQueue([]); setAllDone(false); }} style={{ padding: '12px 20px', borderRadius: 100, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>ล้าง</button>}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return <div style={{ marginBottom: 28 }}><div style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>{title}</div>{children}</div>;
}

function chipStyle(selected) {
  return { padding: '6px 14px', borderRadius: 100, fontSize: 12, background: selected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)', border: '1px solid ' + (selected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'), color: selected ? '#fff' : 'rgba(255,255,255,0.6)', cursor: 'pointer', fontFamily: FONT, transition: 'background 0.15s, border-color 0.15s' };
}

function FolderChip({ label, selected, onClick }) {
  return <button onClick={onClick} style={chipStyle(selected)}>{selected ? '📁 ' : ''}{label}</button>;
}

function FileRow({ item, onRemove }) {
  var statusColor = { pending: 'rgba(255,255,255,0.5)', uploading: '#60a5fa', done: '#48c78e', error: '#f87171' }[item.status];
  var statusLabel = { pending: 'รอ', uploading: item.progress + '%', done: '✓', error: '✗' }[item.status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{formatBytes(item.file.size)}</div>
        {item.status === 'uploading' && <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, marginTop: 6 }}><div style={{ height: '100%', width: item.progress + '%', background: '#60a5fa', borderRadius: 1, transition: 'width 0.3s ease' }} /></div>}
        {item.status === 'error' && <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{item.error}</div>}
      </div>
      <div style={{ fontSize: 12, color: statusColor, minWidth: 28, textAlign: 'right' }}>{statusLabel}</div>
      {onRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>}
    </div>
  );
}

export default function Uploader() {
  var [user, setUser] = useState(null);
  var [pageError, setPageError] = useState(null);

  useEffect(function () {
    var params = new URLSearchParams(window.location.search);
    var err = params.get('error');
    if (err) setPageError(err);
    fetch('/api/auth/me').then(function (r) { return r.ok ? r.json() : null; }).then(function (data) { setUser(data || false); }).catch(function () { setUser(false); });
  }, []);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100svh', overflowX: 'hidden' }}>
      <Head>
        <title>อัปโหลดภาพ — LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', minHeight: 52, paddingTop: 'env(safe-area-inset-top, 0px)', background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: 11, letterSpacing: '0.06em' }}>← หน้าหลัก</a>
          <span style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>LICA</span>
        </div>
        {user && user.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {user.picture && <img src={user.picture} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
            <a href="/api/auth/logout" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', letterSpacing: '0.06em' }}>ออก</a>
          </div>
        )}
      </div>
      {user === null && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)' }}><div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
      {user === false && <LoginScreen error={pageError} />}
      {user && user.email && <UploaderPanel user={user} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0a0a0a; } button:focus { outline: none; } input:focus { outline: none; }
        * { -webkit-tap-highlight-color: transparent; }
        body { overflow-x: hidden; }
        .lica-login-btn { transition: background 0.2s; }
        @media (hover: hover) { .lica-login-btn:hover { background: rgba(255,255,255,0.18) !important; } }`}</style>
    </div>
  );
                                       }
