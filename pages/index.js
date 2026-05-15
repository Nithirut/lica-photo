import { useState, useEffect } from 'react';
import Head from 'next/head';

const PHOTOS_PER_PAGE = 10;
const MAX_SELECT = 10;
const LICA_FOLDER_ID = '1XWC1YGcl_oCzxX0GSMcX2BiiT2xaGTO3';

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [subfolders, setSubfolders] = useState([]);
  const [selectedSubfolder, setSelectedSubfolder] = useState(null);
  const [loadingSubfolders, setLoadingSubfolders] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [maxAlert, setMaxAlert] = useState(false);

  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const pageStart = (currentPage - 1) * PHOTOS_PER_PAGE;
  const pagePhotos = photos.slice(pageStart, pageStart + PHOTOS_PER_PAGE);

  // Auto-load LICA albums on mount
  useEffect(() => {
    setLoadingFolders(true);
    fetch(`/api/drive?type=folders&groupFolderId=${LICA_FOLDER_ID}`)
      .then(r => r.json())
      .then(data => { setFolders(data.folders || []); setLoadingFolders(false); })
      .catch(() => setLoadingFolders(false));
  }, []);

  const enterApp = () => {
    setSplashFading(true);
    setTimeout(() => setShowSplash(false), 500);
  };

  const openFolder = async (folder) => {
    setSelectedFolder(folder);
    setSubfolders([]);
    setSelectedSubfolder(null);
    setPhotos([]);
    setSelected(new Set());
    setSelectMode(false);
    setLoading(false);
    setCurrentPage(1);
    setMaxAlert(false);
    setLoadingSubfolders(true);

    const sfRes = await fetch(`/api/drive?type=folders&groupFolderId=${folder.id}`);
    const sfData = await sfRes.json();
    const sf = sfData.folders || [];
    setLoadingSubfolders(false);

    if (sf.length > 0) {
      setSubfolders(sf);
    } else {
      setLoading(true);
      const res = await fetch(`/api/drive?type=photos&folderId=${folder.id}`);
      const data = await res.json();
      setPhotos(data.photos || []);
      setLoading(false);
    }
  };

  const openSubfolder = async (subfolder) => {
    setSelectedSubfolder(subfolder);
    setPhotos([]);
    setSelected(new Set());
    setSelectMode(false);
    setLoading(true);
    setCurrentPage(1);
    setMaxAlert(false);
    const res = await fetch(`/api/drive?type=photos&folderId=${subfolder.id}`);
    const data = await res.json();
    setPhotos(data.photos || []);
    setLoading(false);
  };

  const backToSubfolders = () => {
    setSelectedSubfolder(null);
    setPhotos([]);
    setSelectMode(false);
    setSelected(new Set());
    setCurrentPage(1);
    setMaxAlert(false);
  };

  const backToAlbums = () => {
    setSelectedFolder(null);
    setSubfolders([]);
    setSelectedSubfolder(null);
    setLoadingSubfolders(false);
    setPhotos([]);
    setSelectMode(false);
    setSelected(new Set());
    setCurrentPage(1);
    setMaxAlert(false);
  };

  const toggleSelect = (photoId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
        setMaxAlert(false);
      } else {
        if (next.size >= MAX_SELECT) {
          setMaxAlert(true);
          setTimeout(() => setMaxAlert(false), 2500);
          return prev;
        }
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAllPage = () => {
    const pageIds = pagePhotos.map(p => p.id);
    const allSelected = pageIds.every(id => selected.has(id));
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      });
      setMaxAlert(false);
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        for (const id of pageIds) {
          if (next.size >= MAX_SELECT) {
            setMaxAlert(true);
            setTimeout(() => setMaxAlert(false), 2500);
            break;
          }
          next.add(id);
        }
        return next;
      });
    }
  };

  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
    setMaxAlert(false);
  };

  const handlePhotoTap = (photo, pageIndex) => {
    if (selectMode) {
      toggleSelect(photo.id);
    } else {
      setLightbox(pageStart + pageIndex);
    }
  };

  const downloadSelected = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    const selectedPhotos = photos.filter(p => selected.has(p.id));
    for (let i = 0; i < selectedPhotos.length; i++) {
      const photo = selectedPhotos[i];
      setDownloadProgress(Math.round(((i + 1) / selectedPhotos.length) * 100));
      const a = document.createElement('a');
      a.href = `/api/download?fileId=${photo.id}`;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 800));
    }
    setDownloading(false);
    setDownloadProgress(0);
    cancelSelect();
  };

  const changePage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getImageUrl = (photo) => `https://drive.google.com/thumbnail?id=${photo.id}&sz=w800`;
  const getDownloadUrl = (photo) => `/api/download?fileId=${photo.id}`;
  const getFullUrl = (photo) => `/api/image?fileId=${photo.id}`;

  const allPageSelected = pagePhotos.length > 0 && pagePhotos.every(p => selected.has(p.id));
  const atMax = selected.size >= MAX_SELECT;

  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <>
      <Head>
        <title>LICA Photo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Playfair+Display:wght@400;700&family=Sarabun:wght@300;400;600&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0a0a; color:#f0ece4; font-family:'Sarabun',sans-serif; min-height:100vh; }

        /* ===== SPLASH PAGE ===== */
        .splash {
          position:fixed; inset:0; z-index:999;
          background:radial-gradient(ellipse at 50% 20%, #4a0808 0%, #200000 45%, #050000 100%);
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          overflow:hidden; cursor:pointer;
          transition:opacity 0.5s ease, transform 0.5s ease;
        }
        .splash.fading { opacity:0; transform:scale(1.04); pointer-events:none; }

        /* Glow layers */
        .splash-glow-top {
          position:absolute; width:700px; height:500px; top:-150px; left:50%;
          transform:translateX(-50%);
          background:radial-gradient(ellipse, rgba(180,10,10,0.35) 0%, transparent 70%);
          pointer-events:none;
        }
        .splash-glow-mid {
          position:absolute; width:500px; height:400px; top:30%; left:50%;
          transform:translateX(-50%);
          background:radial-gradient(ellipse, rgba(120,0,0,0.2) 0%, transparent 70%);
          pointer-events:none;
        }

        /* Brand text */
        .splash-content {
          position:relative; z-index:1;
          display:flex; flex-direction:column; align-items:center;
          animation:splashIn 0.8s ease both;
        }
        @keyframes splashIn {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .splash-brand {
          font-family:'Pacifico',cursive;
          font-size:clamp(72px,18vw,140px);
          color:#fff;
          line-height:1;
          text-shadow:0 2px 40px rgba(255,255,255,0.08);
          letter-spacing:-2px;
        }
        .splash-since {
          font-family:'Sarabun',sans-serif;
          font-size:clamp(12px,2.5vw,16px);
          color:#c0392b;
          letter-spacing:8px;
          text-transform:uppercase;
          margin-top:2px;
          display:flex; align-items:center; gap:12px;
        }
        .splash-since::before, .splash-since::after {
          content:''; display:inline-block;
          width:40px; height:1px; background:#c0392b; opacity:0.7;
        }

        /* Logos overlapping container */
        .splash-logos {
          position:relative;
          width:clamp(220px,55vw,300px);
          height:clamp(140px,30vw,180px);
          margin-top:clamp(24px,5vw,40px);
          animation:splashIn 0.8s 0.1s ease both;
        }

        /* AIA badge — behind, left, slightly rotated */
        .badge-aia {
          position:absolute;
          width:clamp(110px,26vw,148px); height:clamp(110px,26vw,148px);
          left:0; top:50%; transform:translateY(-50%) rotate(-6deg);
          border-radius:50%; object-fit:cover;
          box-shadow:0 8px 32px rgba(0,0,0,0.6);
          z-index:1;
          transition:transform 0.3s ease;
          cursor:pointer;
        }
        .badge-aia:hover { transform:translateY(-50%) rotate(-6deg) scale(1.05); }

        /* Orange Lica logo — front, right, overlapping AIA, main CTA */
        .badge-lica {
          position:absolute;
          width:clamp(130px,30vw,168px); height:clamp(130px,30vw,168px);
          right:0; top:50%; transform:translateY(-50%) rotate(4deg);
          border-radius:50%; object-fit:cover;
          cursor:pointer; z-index:2;
          animation:glow 2.4s ease-in-out infinite;
          transition:transform 0.2s ease;
          box-shadow:0 0 0 3px rgba(232,69,10,0.3), 0 8px 40px rgba(232,69,10,0.45);
        }
        .badge-lica:hover { transform:translateY(-50%) rotate(4deg) scale(1.1); }
        @keyframes glow {
          0%,100% { box-shadow:0 0 0 3px rgba(232,69,10,0.3), 0 8px 32px rgba(232,69,10,0.4); }
          50%      { box-shadow:0 0 0 6px rgba(232,69,10,0.5), 0 8px 50px rgba(232,69,10,0.7); }
        }

        .splash-org {
          font-family:'Playfair Display',serif;
          font-size:clamp(16px,4vw,22px);
          font-weight:700; letter-spacing:8px;
          color:#fff; margin-top:clamp(20px,5vw,32px);
          animation:splashIn 0.8s 0.25s ease both;
        }
        .splash-org-sub {
          font-family:'Sarabun',sans-serif;
          font-size:clamp(10px,2.2vw,13px);
          color:rgba(255,255,255,0.4);
          letter-spacing:2px; margin-top:5px;
          animation:splashIn 0.8s 0.3s ease both;
        }

        .splash-cta {
          position:absolute; bottom:clamp(24px,5vh,44px);
          font-family:'Sarabun',sans-serif;
          font-size:12px; color:rgba(255,255,255,0.28);
          letter-spacing:3px; text-transform:uppercase;
          animation:blink 2.2s ease-in-out infinite;
        }
        @keyframes blink {
          0%,100% { opacity:0.28; } 50% { opacity:0.65; }
        }

        /* Decorative red lines */
        .splash-line {
          position:absolute; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(180,20,20,0.5),transparent);
        }
        .splash-line.top    { top:18%; }
        .splash-line.bottom { bottom:18%; }

        /* ===== APP STYLES ===== */
        .header {
          background:linear-gradient(180deg,#111 0%,transparent 100%);
          padding:28px 20px 20px; text-align:center; position:sticky; top:0; z-index:10;
          backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.06);
          position:relative;
        }
        .logo { font-family:'Playfair Display',serif; font-size:26px; font-weight:700; letter-spacing:3px; }
        .logo span { color:#c9a84c; }
        .tagline { font-size:11px; color:#888; letter-spacing:4px; text-transform:uppercase; margin-top:3px; }
        .back-btn {
          position:absolute; left:16px; top:50%; transform:translateY(-50%);
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12);
          color:#f0ece4; padding:7px 14px; border-radius:20px; cursor:pointer;
          font-size:12px; font-family:'Sarabun',sans-serif;
        }
        .container { padding:20px 14px; max-width:1200px; margin:0 auto; }
        .section-title { font-family:'Playfair Display',serif; font-size:13px; color:#c9a84c; letter-spacing:4px; text-transform:uppercase; margin-bottom:16px; }

        /* Folder grid */
        .folder-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
        .folder-card {
          background:linear-gradient(135deg,#1a1a1a,#141414);
          border:1px solid rgba(255,255,255,0.08); border-radius:14px;
          padding:22px 14px; text-align:center; cursor:pointer; transition:all 0.25s ease;
        }
        .folder-card:hover { border-color:#c9a84c; transform:translateY(-3px); box-shadow:0 8px 32px rgba(201,168,76,0.15); }
        .folder-icon { font-size:32px; margin-bottom:8px; }
        .folder-name { font-size:13px; font-weight:600; color:#f0ece4; line-height:1.4; }

        /* Toolbar */
        .toolbar { display:flex; align-items:center; gap:10px; margin-bottom:14px; flex-wrap:wrap; }
        .folder-header { display:flex; align-items:center; gap:10px; flex:1; min-width:0; }
        .folder-title { font-family:'Playfair Display',serif; font-size:18px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .photo-count { background:rgba(201,168,76,0.2); color:#c9a84c; border-radius:20px; padding:3px 10px; font-size:11px; font-weight:600; white-space:nowrap; }
        .select-toggle-btn {
          background:rgba(201,168,76,0.15); border:1px solid rgba(201,168,76,0.4);
          color:#c9a84c; padding:7px 14px; border-radius:20px; cursor:pointer;
          font-family:'Sarabun',sans-serif; font-size:12px; font-weight:600; white-space:nowrap;
        }

        /* Photo Grid */
        .photo-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:8px; }
        .photo-item {
          position:relative; aspect-ratio:1; border-radius:10px; overflow:hidden;
          cursor:pointer; background:#1a1a1a; border:2px solid transparent; transition:border-color 0.2s;
          user-select:none; -webkit-user-select:none;
        }
        .photo-item.selected { border-color:#c9a84c; }
        .photo-item.max-reached { opacity:0.5; }
        .photo-item img { width:100%; height:100%; object-fit:cover; transition:transform 0.3s ease; }
        .photo-item:hover img { transform:scale(1.04); }
        .photo-circle {
          position:absolute; top:8px; right:8px; width:24px; height:24px;
          border-radius:50%; border:2px solid rgba(255,255,255,0.7); display:none;
          background:rgba(0,0,0,0.3);
        }
        .select-mode .photo-circle { display:block; }
        .photo-check {
          position:absolute; top:8px; right:8px; width:24px; height:24px; border-radius:50%;
          background:#c9a84c; display:none; align-items:center; justify-content:center;
          font-size:13px; font-weight:700; color:#000; border:2px solid #000;
        }
        .photo-item.selected .photo-check { display:flex; }
        .photo-item.selected .photo-circle { display:none; }
        .photo-num {
          position:absolute; bottom:6px; left:8px;
          font-size:10px; color:rgba(255,255,255,0.5); font-family:'Sarabun',sans-serif;
        }

        /* Pagination */
        .pagination {
          display:flex; align-items:center; justify-content:center;
          gap:6px; padding:20px 0 100px; flex-wrap:wrap;
        }
        .page-btn {
          width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,0.15);
          background:rgba(255,255,255,0.05); color:#f0ece4; cursor:pointer;
          font-family:'Sarabun',sans-serif; font-size:13px; display:flex; align-items:center; justify-content:center;
          transition:all 0.2s;
        }
        .page-btn:hover:not(:disabled) { border-color:#c9a84c; color:#c9a84c; }
        .page-btn.active { background:#c9a84c; border-color:#c9a84c; color:#000; font-weight:700; }
        .page-btn:disabled { opacity:0.3; cursor:not-allowed; }
        .page-btn.arrow { font-size:18px; }

        /* Max Alert */
        .max-alert {
          position:fixed; top:80px; left:50%; transform:translateX(-50%);
          background:#c9a84c; color:#000; padding:10px 20px; border-radius:24px;
          font-size:13px; font-weight:700; z-index:200;
          animation:fadeInOut 2.5s ease forwards; white-space:nowrap;
        }
        @keyframes fadeInOut {
          0% { opacity:0; transform:translateX(-50%) translateY(-10px); }
          15% { opacity:1; transform:translateX(-50%) translateY(0); }
          75% { opacity:1; }
          100% { opacity:0; }
        }

        /* Select Bar */
        .select-bar {
          position:fixed; bottom:0; left:0; right:0; z-index:50;
          background:#151515; border-top:1px solid rgba(255,255,255,0.1);
          padding:12px 16px; display:flex; align-items:center; gap:10px;
          backdrop-filter:blur(12px);
        }
        .select-info { flex:1; min-width:0; }
        .select-count { font-size:14px; font-weight:600; color:#c9a84c; }
        .select-limit { font-size:11px; color:#666; margin-top:1px; }
        .sel-btn {
          background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15);
          color:#f0ece4; padding:9px 14px; border-radius:20px; cursor:pointer;
          font-family:'Sarabun',sans-serif; font-size:12px; white-space:nowrap;
        }
        .sel-btn.primary { background:#c9a84c; border-color:#c9a84c; color:#000; font-weight:700; }
        .sel-btn:disabled { opacity:0.35; cursor:not-allowed; }

        /* Progress */
        .progress-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:200;
          display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;
        }
        .progress-bar-bg { width:260px; height:6px; background:#333; border-radius:3px; overflow:hidden; }
        .progress-bar-fill { height:100%; background:#c9a84c; border-radius:3px; transition:width 0.3s; }

        /* Lightbox */
        .lightbox {
          position:fixed; inset:0; background:rgba(0,0,0,0.96); z-index:100;
          display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;
        }
        .lightbox-img { max-width:100%; max-height:75vh; border-radius:8px; object-fit:contain; }
        .lightbox-counter { font-size:12px; color:#666; margin-top:8px; }
        .lightbox-actions { display:flex; gap:10px; margin-top:14px; }
        .lb-btn {
          background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
          color:#f0ece4; padding:10px 22px; border-radius:24px; cursor:pointer;
          font-family:'Sarabun',sans-serif; font-size:13px; text-decoration:none; display:inline-block;
        }
        .lb-btn.primary { background:#c9a84c; border-color:#c9a84c; color:#000; font-weight:600; }
        .lightbox-close {
          position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.1);
          border:none; color:#fff; width:38px; height:38px; border-radius:50%; cursor:pointer; font-size:16px;
        }
        .lightbox-nav {
          position:absolute; top:50%; transform:translateY(-50%);
          background:rgba(255,255,255,0.1); border:none; color:#fff;
          width:44px; height:44px; border-radius:50%; cursor:pointer; font-size:22px;
        }
        .lightbox-nav.prev { left:10px; }
        .lightbox-nav.next { right:10px; }

        /* States */
        .loading { text-align:center; padding:60px 20px; color:#666; }
        .spinner { width:34px; height:34px; border:2px solid #333; border-top-color:#c9a84c; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 14px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .empty { text-align:center; padding:60px 20px; color:#555; font-size:14px; }

        /* Loading albums state */
        .landing {
          min-height:80vh; display:flex; flex-direction:column; align-items:center; justify-content:center;
          text-align:center; padding:40px 20px;
        }
        .landing-logo { font-size:72px; margin-bottom:20px; }
        .landing-title { font-family:'Playfair Display',serif; font-size:32px; font-weight:700; color:#f0ece4; margin-bottom:8px; }
        .landing-title span { color:#c9a84c; }
        .landing-sub { font-size:14px; color:#666; letter-spacing:3px; text-transform:uppercase; margin-bottom:32px; }
        .loading-bar { width:200px; height:3px; background:#1a1a1a; border-radius:3px; overflow:hidden; margin:0 auto; }
        .loading-bar-fill { height:100%; background:linear-gradient(90deg,#c9a84c,#e8c96a); border-radius:3px; animation:loadBar 1.5s ease-in-out infinite; }
        @keyframes loadBar { 0%{width:0%;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0%;margin-left:100%} }
      `}</style>

      {/* ===== SPLASH PAGE ===== */}
      {showSplash && (
        <div className={`splash${splashFading ? ' fading' : ''}`} onClick={enterApp}>
          <div className="splash-glow-top" />
          <div className="splash-glow-mid" />
          <div className="splash-line top" />
          <div className="splash-line bottom" />

          <div className="splash-content">
            <div className="splash-brand">Lica</div>
            <div className="splash-since">since 1964</div>

            <div className="splash-logos">
              {/* AIA LICA circular badge — real image, behind */}
              <img
                className="badge-aia"
                src="/logo-aia.jpg"
                alt="LICA AIA"
                onClick={enterApp}
              />
              {/* Orange Lica logo — real image, front, main CTA */}
              <img
                className="badge-lica"
                src="/logo-lica.jpg"
                alt="Lica since 1964"
                onClick={e => { e.stopPropagation(); enterApp(); }}
              />
            </div>

            <div className="splash-org">LICA</div>
            <div className="splash-org-sub">Life Insurance Counsellor Association</div>
          </div>

          <div className="splash-cta">แตะโลโก้เพื่อเข้าชมภาพถ่าย</div>
        </div>
      )}

      {/* ===== APP ===== */}
      {maxAlert && <div className="max-alert">⚠️ เลือกได้สูงสุด {MAX_SELECT} รูป</div>}

      {downloading && (
        <div className="progress-overlay">
          <div style={{fontSize:36}}>⬇️</div>
          <div style={{fontSize:16,fontWeight:600}}>กำลังดาวน์โหลด {selected.size} รูป...</div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{width:`${downloadProgress}%`}}/>
          </div>
        </div>
      )}

      <div className="header">
        {(selectedFolder || selectedSubfolder) && (
          <button className="back-btn" onClick={selectedSubfolder ? backToSubfolders : backToAlbums}>
            ← กลับ
          </button>
        )}
        <div className="logo">LICA <span>Photo</span></div>
        <div className="tagline">ภาพถ่ายสมาชิก LICA</div>
      </div>

      {lightbox !== null && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          {lightbox > 0 && <button className="lightbox-nav prev" onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1); }}>‹</button>}
          {lightbox < photos.length - 1 && <button className="lightbox-nav next" onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1); }}>›</button>}
          <img src={getFullUrl(photos[lightbox])} className="lightbox-img" onClick={e => e.stopPropagation()} />
          <div className="lightbox-counter">{lightbox + 1} / {photos.length}</div>
          <div className="lightbox-actions" onClick={e => e.stopPropagation()}>
            <a href={getDownloadUrl(photos[lightbox])} download={photos[lightbox]?.name} className="lb-btn primary">⬇ ดาวน์โหลด</a>
            <button className="lb-btn" onClick={() => setLightbox(null)}>ปิด</button>
          </div>
        </div>
      )}

      <div className="container">
        {loadingFolders && !selectedFolder && (
          <div className="landing">
            <div className="landing-logo">🏆</div>
            <div className="landing-title">LICA <span>Photo</span></div>
            <div className="landing-sub">กำลังโหลด...</div>
            <div className="loading-bar"><div className="loading-bar-fill"/></div>
          </div>
        )}

        {!loadingFolders && !selectedFolder && (
          <>
            <div className="section-title">📁 เลือกงาน / อัลบั้ม</div>
            {folders.length === 0 ? (
              <div className="empty">ไม่พบอัลบั้ม</div>
            ) : (
              <div className="folder-grid">
                {folders.map(folder => (
                  <div key={folder.id} className="folder-card" onClick={() => openFolder(folder)}>
                    <div className="folder-icon">📸</div>
                    <div className="folder-name">{folder.name}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedFolder && !selectedSubfolder && (loadingSubfolders || subfolders.length > 0) && (
          <>
            {loadingSubfolders ? (
              <div className="loading"><div className="spinner"/><div>กำลังโหลด...</div></div>
            ) : (
              <>
                <div className="section-title">📂 เลือกหมวดหมู่</div>
                <div className="folder-grid">
                  {subfolders.map(sf => (
                    <div key={sf.id} className="folder-card" onClick={() => openSubfolder(sf)}>
                      <div className="folder-icon">📁</div>
                      <div className="folder-name">{sf.name}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {(selectedSubfolder || (selectedFolder && !selectedSubfolder && !loadingSubfolders && subfolders.length === 0)) && (
          <>
            {loading ? (
              <div className="loading"><div className="spinner"/><div>กำลังโหลดรูปภาพ...</div></div>
            ) : photos.length === 0 ? (
              <div className="empty">ไม่พบรูปภาพ</div>
            ) : (
              <>
                <div className="toolbar">
                  <div className="folder-header">
                    <div className="folder-title">{selectedSubfolder ? selectedSubfolder.name : selectedFolder?.name}</div>
                    <div className="photo-count">{photos.length} รูป</div>
                  </div>
                  {!selectMode ? (
                    <button className="select-toggle-btn" onClick={() => setSelectMode(true)}>☑ เลือกรูป</button>
                  ) : (
                    <button className="select-toggle-btn" onClick={cancelSelect}>✕ ยกเลิก</button>
                  )}
                </div>
                {totalPages > 1 && <div style={{fontSize:12,color:'#666',marginBottom:10,textAlign:'right'}}>หน้า {currentPage} / {totalPages} — รูปที่ {pageStart+1}–{Math.min(pageStart+PHOTOS_PER_PAGE, photos.length)}</div>}
                <div className={`photo-grid ${selectMode ? 'select-mode' : ''}`}>
                  {pagePhotos.map((photo, i) => {
                    const isSelected = selected.has(photo.id);
                    const isDisabled = atMax && !isSelected;
                    return (
                      <div
                        key={photo.id}
                        className={`photo-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'max-reached' : ''}`}
                        onClick={() => handlePhotoTap(photo, i)}
                      >
                        <img src={getImageUrl(photo)} alt={photo.name} loading="lazy" />
                        <div className="photo-circle"/>
                        <div className="photo-check">✓</div>
                        <div className="photo-num">{pageStart + i + 1}</div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="page-btn arrow" onClick={() => changePage(1)} disabled={currentPage === 1}>«</button>
                    <button className="page-btn arrow" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>‹</button>
                    {getPageNumbers().map(n => (
                      <button key={n} className={`page-btn ${n === currentPage ? 'active' : ''}`} onClick={() => changePage(n)}>{n}</button>
                    ))}
                    <button className="page-btn arrow" onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>›</button>
                    <button className="page-btn arrow" onClick={() => changePage(totalPages)} disabled={currentPage === totalPages}>»</button>
                  </div>
                )}
                {totalPages <= 1 && <div style={{paddingBottom: selectMode ? 90 : 20}} />}
              </>
            )}
          </>
        )}
      </div>

      {selectMode && (
        <div className="select-bar">
          <div className="select-info">
            <div className="select-count">{selected.size > 0 ? `เลือกแล้ว ${selected.size} รูป` : 'เลือกรูปที่ต้องการดาวน์โหลด'}</div>
            <div className="select-limit">{selected.size}/{MAX_SELECT} รูป</div>
          </div>
          <button className="sel-btn" onClick={selectAllPage}>
            {allPageSelected ? 'ยกเลิกเลือกทั้งหน้า' : 'เลือกทั้งหน้า'}
          </button>
          <button className="sel-btn primary" onClick={downloadSelected} disabled={selected.size === 0}>
            ⬇ ดาวน์โหลด{selected.size > 0 ? ` ${selected.size}` : ''} รูป
          </button>
        </div>
      )}
    </>
  );
}
