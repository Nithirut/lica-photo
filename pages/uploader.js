// pages/uploader.js
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// ─── Utilities ────────────────────────────────────────────────────────────────

function extractFolderId(input) {
  if (!input) return null;
  const s = input.trim();
  const urlMatch = s.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(s)) return s;
  return null;
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function compressToWebP(file, quality, maxDim) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > maxDim || h > maxDim) {
        if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('WebP conversion failed'));
      }, 'image/webp', quality / 100);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Recent Folders (localStorage) ────────────────────────────────────────────

const RECENT_KEY = 'lica_recent_folders';
function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(folders) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(folders.slice(0, 5))); } catch {}
}
function addRecent(folder) {
  const prev = loadRecent().filter(f => f.id !== folder.id);
  saveRecent([folder, ...prev]);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Spinner({ size = 16, color = '#aaa' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" fill="none" strokeDasharray="31 63" />
    </svg>
  );
}

function ProgressBar({ pct, color = '#4ade80' }) {
  return (
    <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.2s ease' }} />
    </div>
  );
}

const STATUS_COLOR = { pending: '#555', compressing: '#f0a500', uploading: '#60a5fa', done: '#4ade80', error: '#f87171' };
const STATUS_LABEL = { pending: 'รอ', compressing: 'บีบอัด…', uploading: 'อัปโหลด…', done: 'เสร็จ', error: 'ผิดพลาด' };

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Uploader() {
  const router = useRouter();

  // Auth
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Folder
  const [folderInput, setFolderInput] = useState('');
  const [folder, setFolder] = useState(null); // { id, name }
  const [folderStatus, setFolderStatus] = useState('idle'); // idle | validating | valid | error
  const [folderError, setFolderError] = useState('');
  const [recentFolders, setRecentFolders] = useState([]);

  // Files
  const [files, setFiles] = useState([]); // array of file-state objects
  const [isDragging, setIsDragging] = useState(false);
  const [quality, setQuality] = useState(82);
  const [maxDim, setMaxDim] = useState(2400);
  const [isRunning, setIsRunning] = useState(false);

  const dropRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Auth check ──────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { setUser(d.user); setAuthLoading(false); })
      .catch(() => setAuthLoading(false));

    setRecentFolders(loadRecent());

    // Handle auth redirect result
    const { auth } = router.query;
    if (auth === 'success') router.replace('/uploader', undefined, { shallow: true });
  }, []);

  // ── Drag-and-drop ───────────────────────────────────────────────────────────

  const handleDragOver = useCallback(e => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(e => { if (!dropRef.current?.contains(e.relatedTarget)) setIsDragging(false); }, []);
  const handleDrop = useCallback(e => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const addFiles = (rawFiles) => {
    const imageFiles = rawFiles.filter(f => f.type.startsWith('image/'));
    if (!imageFiles.length) return;
    const newEntries = imageFiles.map(f => ({
      id: uid(),
      file: f,
      name: f.name,
      origSize: f.size,
      compressed: null,
      compSize: null,
      status: 'pending',
      progress: 0,
      url: null,
      error: null,
    }));
    setFiles(prev => [...prev, ...newEntries]);
  };

  // ── File update helper ──────────────────────────────────────────────────────

  const updateFile = (id, patch) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  // ── Folder validation ───────────────────────────────────────────────────────

  const validateFolder = async (idOrInput) => {
    const raw = idOrInput ?? folderInput;
    const fid = extractFolderId(raw);
    if (!fid) {
      setFolderStatus('error');
      setFolderError('ลิงก์หรือ ID ไม่ถูกต้อง');
      return;
    }
    setFolderStatus('validating');
    setFolderError('');
    try {
      const res = await fetch('/api/drive/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: fid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFolderStatus('error');
        setFolderError(data.error || 'ไม่สามารถเข้าถึงโฟลเดอร์นี้ได้');
      } else {
        const f = { id: data.id, name: data.name };
        setFolder(f);
        setFolderStatus('valid');
        setFolderInput(`https://drive.google.com/drive/folders/${data.id}`);
        addRecent(f);
        setRecentFolders(loadRecent());
      }
    } catch {
      setFolderStatus('error');
      setFolderError('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    }
  };

  // ── Upload pipeline ─────────────────────────────────────────────────────────

  const runUploadAll = async () => {
    if (!folder || isRunning) return;
    const pending = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (!pending.length) return;

    setIsRunning(true);

    // Process up to 3 files concurrently
    const CONCURRENCY = 3;
    let idx = 0;

    const next = async () => {
      while (idx < pending.length) {
        const item = pending[idx++];
        await processFile(item);
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, () => next());
    await Promise.all(workers);
    setIsRunning(false);
  };

  const processFile = async (item) => {
    // Step 1: Compress
    updateFile(item.id, { status: 'compressing', progress: 10 });
    let blob;
    try {
      blob = await compressToWebP(item.file, quality, maxDim);
      updateFile(item.id, { compressed: blob, compSize: blob.size, progress: 40 });
    } catch (err) {
      updateFile(item.id, { status: 'error', error: 'บีบอัดภาพไม่สำเร็จ' });
      return;
    }

    // Step 2: Convert to base64
    let base64;
    try {
      base64 = await blobToBase64(blob);
      updateFile(item.id, { progress: 55 });
    } catch {
      updateFile(item.id, { status: 'error', error: 'อ่านข้อมูลภาพไม่ได้' });
      return;
    }

    // Step 3: Upload
    updateFile(item.id, { status: 'uploading', progress: 60 });
    const outName = item.name.replace(/\.[^.]+$/, '') + '.webp';
    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          base64,
          fileName: outName,
          mimeType: 'image/webp',
        }),
      });
      updateFile(item.id, { progress: 95 });
      const data = await res.json();
      if (!res.ok) {
        updateFile(item.id, { status: 'error', error: data.error || 'อัปโหลดไม่สำเร็จ' });
      } else {
        updateFile(item.id, { status: 'done', progress: 100, url: data.url, name: data.name });
      }
    } catch {
      updateFile(item.id, { status: 'error', error: 'เครือข่ายขัดข้อง' });
    }
  };

  // ── Derived counts ──────────────────────────────────────────────────────────

  const counts = files.reduce((acc, f) => { acc[f.status] = (acc[f.status] || 0) + 1; return acc; }, {});
  const allDone = files.length > 0 && files.every(f => f.status === 'done');
  const hasPending = files.some(f => f.status === 'pending' || f.status === 'error');
  const savedBytes = files.filter(f => f.compSize).reduce((s, f) => s + (f.origSize - f.compSize), 0);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>LICA Uploader</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0e0e0e; color: #d8d8d8; font-family: 'Inter', 'Sarabun', sans-serif; min-height: 100vh; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
          @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
          ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #0e0e0e; }
          ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
          input, button { font-family: inherit; }
          a { color: #60a5fa; }
        `}</style>
      </Head>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 16px 60px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 18px', borderBottom: '1px solid #1e1e1e' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#555' }}>LICA PHOTO</div>
            <div style={{ fontSize: 18, fontWeight: 500, marginTop: 2, color: '#fff' }}>Asset Uploader</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {authLoading ? (
              <Spinner size={18} />
            ) : user ? (
              <>
                {user.picture && <img src={user.picture} alt="" style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #333' }} referrerPolicy="no-referrer" />}
                <span style={{ fontSize: 13, color: '#aaa' }}>{user.name}</span>
                <a href="/api/auth/google-logout" style={{ fontSize: 12, color: '#555', textDecoration: 'none' }}>ออก</a>
              </>
            ) : (
              <a href="/api/auth/google-login" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', color: '#111', borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none', letterSpacing: 0.2 }}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                Sign in with Google
              </a>
            )}
          </div>
        </div>

        {/* ── No auth warning ── */}
        {!authLoading && !user && (
          <div style={{ marginTop: 32, padding: '20px 24px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 10, textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔐</div>
            <div style={{ color: '#ccc', marginBottom: 6 }}>กรุณา Sign in ด้วย Google เพื่อใช้งาน Uploader</div>
            <div style={{ fontSize: 12, color: '#555 ' }}>ระบบจะขอสิทธิ์อัปโหลดไฟล์เข้า Google Drive ของคุณ</div>
          </div>
        )}

        {/* ── Main content (authenticated) ── */}
        {!authLoading && user && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>

            {/* ── Section: Destination Folder ── */}
            <Section title="📁 โฟลเดอร์ปลายทาง" style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={folderInput}
                  onChange={e => { setFolderInput(e.target.value); setFolderStatus('idle'); }}
                  onKeyDown={e => e.key === 'Enter' && validateFolder()}
                  placeholder="วาง Google Drive folder link หรือ folder ID…"
                  style={inputStyle}
                />
                <button
                  onClick={() => validateFolder()}
                  disabled={folderStatus === 'validating' || !folderInput.trim()}
                  style={btnStyle(folderStatus === 'validating' || !folderInput.trim())}
                >
                  {folderStatus === 'validating' ? <Spinner size={14} color="#111" /> : 'ตรวจสอบ'}
                </button>
              </div>

              {/* Folder status */}
              <div style={{ marginTop: 8, fontSize: 13, minHeight: 18 }}>
                {folderStatus === 'valid' && folder && (
                  <span style={{ color: '#4ade80' }}>✓ <b>{folder.name}</b> — พร้อมอัปโหลด</span>
                )}
                {folderStatus === 'error' && (
                  <span style={{ color: '#f87171' }}>✕ {folderError}</span>
                )}
              </div>

              {/* Recent folders */}
              {recentFolders.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#444', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>ล่าสุด</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {recentFolders.map(rf => (
                      <button
                        key={rf.id}
                        onClick={() => { setFolderInput(`https://drive.google.com/drive/folders/${rf.id}`); validateFolder(`https://drive.google.com/drive/folders/${rf.id}`); }}
                        style={{ background: folder?.id === rf.id ? '#1a3a1a' : '#181818', border: `1px solid ${folder?.id === rf.id ? '#4ade80' : '#2a2a2a'}`, color: folder?.id === rf.id ? '#4ade80' : '#888', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        {rf.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* ── Section: Images ── */}
            <Section title="🖼 ภาพที่จะอัปโหลด" style={{ marginTop: 20 }}>

              {/* Drop zone */}
              <div
                ref={dropRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? '#4ade80' : '#2a2a2a'}`,
                  borderRadius: 10,
                  padding: '32px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? '#0d1f0d' : '#111',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>📷</div>
                <div style={{ color: isDragging ? '#4ade80' : '#666', fontSize: 14 }}>
                  {isDragging ? 'วางภาพที่นี่' : 'ลากวางภาพ หรือคลิกเพื่อเลือกไฟล์'}
                </div>
                <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>รองรับ JPG, PNG, WEBP, HEIC</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => { addFiles(Array.from(e.target.files)); e.target.value = ''; }}
              />

              {/* Compression settings */}
              <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#888' }}>
                  <span>คุณภาพ WebP</span>
                  <input
                    type="range" min={50} max={95} value={quality}
                    onChange={e => setQuality(+e.target.value)}
                    style={{ accentColor: '#4ade80', width: 90 }}
                  />
                  <span style={{ color: '#ccc', minWidth: 30 }}>{quality}%</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#888' }}>
                  <span>ขนาดสูงสุด</span>
                  <select
                    value={maxDim}
                    onChange={e => setMaxDim(+e.target.value)}
                    style={{ background: '#1a1a1a', color: '#ccc', border: '1px solid #2a2a2a', borderRadius: 5, padding: '3px 8px', fontSize: 13 }}
                  >
                    <option value={1200}>1200px</option>
                    <option value={1600}>1600px</option>
                    <option value={2400}>2400px</option>
                    <option value={3600}>3600px (ต้นฉบับ)</option>
                  </select>
                </label>
              </div>
            </Section>

            {/* ── Section: Queue ── */}
            {files.length > 0 && (
              <Section
                title={`📋 คิว — ${files.length} ไฟล์${savedBytes > 0 ? ` · ประหยัดพื้นที่ ${fmtSize(savedBytes)}` : ''}`}
                style={{ marginTop: 20 }}
                action={
                  <div style={{ display: 'flex', gap: 8 }}>
                    {hasPending && !isRunning && (
                      <button
                        onClick={runUploadAll}
                        disabled={!folder}
                        style={{ ...btnStyle(!folder), background: !folder ? '#1a1a1a' : '#4ade80', fontSize: 13, padding: '7px 18px' }}
                      >
                        {!folder ? '⚠ กำหนดโฟลเดอร์ก่อน' : `⬆ อัปโหลดทั้งหมด (${files.filter(f => f.status === 'pending' || f.status === 'error').length})`}
                      </button>
                    )}
                    {isRunning && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 13 }}>
                        <Spinner size={14} color="#60a5fa" /> กำลังทำงาน…
                      </div>
                    )}
                    <button
                      onClick={() => setFiles([])}
                      style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#555', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
                    >
                      ล้าง
                    </button>
                  </div>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map(f => (
                    <FileRow key={f.id} f={f} onRemove={() => setFiles(prev => prev.filter(x => x.id !== f.id))} />
                  ))}
                </div>

                {allDone && (
                  <div style={{ marginTop: 14, padding: '12px 16px', background: '#0d1f0d', border: '1px solid #2a4a2a', borderRadius: 8, fontSize: 13, color: '#4ade80' }}>
                    ✓ อัปโหลดครบทุกไฟล์เรียบร้อยแล้ว —{' '}
                    <a href={`https://drive.google.com/drive/folders/${folder?.id}`} target="_blank" rel="noreferrer" style={{ color: '#86efac' }}>
                      เปิดโฟลเดอร์ใน Drive →
                    </a>
                  </div>
                )}
              </Section>
            )}

          </div>
        )}
      </div>
    </>
  );
}

// ─── FileRow ───────────────────────────────────────────────────────────────────

function FileRow({ f, onRemove }) {
  const isDone = f.status === 'done';
  const isErr = f.status === 'error';
  const isActive = f.status === 'compressing' || f.status === 'uploading';

  return (
    <div style={{
      padding: '10px 14px',
      background: '#141414',
      border: `1px solid ${isErr ? '#3a1a1a' : isDone ? '#1a2a1a' : '#1e1e1e'}`,
      borderRadius: 8,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: isDone ? '#86efac' : isErr ? '#fca5a5' : '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f.name}
            {isDone && f.url && (
              <a href={f.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontSize: 11, color: '#60a5fa' }}>ดูใน Drive ↗</a>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {fmtSize(f.origSize)}
            {f.compSize && f.compSize < f.origSize && (
              <span style={{ color: '#4ade80', marginLeft: 6 }}>→ {fmtSize(f.compSize)} ({Math.round((1 - f.compSize / f.origSize) * 100)}% ↓)</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: STATUS_COLOR[f.status], minWidth: 60, textAlign: 'right' }}>
            {isActive ? <Spinner size={12} color={STATUS_COLOR[f.status]} /> : null}
            {' '}{STATUS_LABEL[f.status]}
          </span>
          {!isActive && (
            <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }} title="ลบ">×</button>
          )}
        </div>
      </div>
      {isActive && <ProgressBar pct={f.progress} color={STATUS_COLOR[f.status]} />}
      {isErr && f.error && (
        <div style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>✕ {f.error}</div>
      )}
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children, style, action }) {
  return (
    <div style={{ background: '#121212', border: '1px solid #1e1e1e', borderRadius: 10, padding: '18px 20px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#555', fontWeight: 500 }}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = {
  flex: 1,
  background: '#0e0e0e',
  border: '1px solid #2a2a2a',
  borderRadius: 7,
  color: '#ccc',
  fontSize: 13,
  padding: '9px 12px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const btnStyle = (disabled) => ({
  background: disabled ? '#1a1a1a' : '#4ade80',
  color: disabled ? '#444' : '#111',
  border: 'none',
  borderRadius: 7,
  padding: '9px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
});
