# LICA Photo — Changelog

---

## 2026-05-17

### Infrastructure
- Added centralized structured logger (`lib/logger.js`) — namespaces, levels, dev/prod modes
- Extracted Google Drive helpers into `lib/google-drive.js` (collectFolderIds, downloadFileBase64, buildPhotoQuery)
- Extracted image normalization into `lib/image-processing.js` (sharp: HEIC/WEBP→JPEG, EXIF rotate, resize 1200px)
- Extracted face geometry into `lib/face-search-helpers.js` (normalizeLandmarks, faceSimilarity, bestMatchScore)
- Added React ErrorBoundary component (`components/ErrorBoundary.jsx`)
- Created `docs/architecture.md` and `docs/changelog.md`
- Refactored face-search.js and photos.js to use lib modules
- Created `develop` branch for safe feature development

### Bug Fixes
- Fixed: Cloud Vision API not enabled on project nt-photo (953816117597) — enabled via GCP Console
- Fixed: AI face search timing out — added maxDuration:60 to Vercel function config
- Fixed: Full-res image downloads causing timeout — switched to thumbnailLink at 800px first
- Fixed: Vision API called one image at a time — batched to 16 images per images.annotate request
- Fixed: Face search only scanning root folder — added recursive subfolder traversal
- Fixed: Selfie HEIC/HEIF/WEBP formats — added sharp normalization pipeline
- Fixed: Event photos not showing from Day1/, Day2/, Edited/ subfolders — recursive scan

### Features
- AI face search: selfie upload → Vision API → landmark similarity → matched gallery
- Gallery ภาพทั้งหมด tab: masonry grid, lazy load, lightbox, pagination
- AI search ค้นหาด้วย AI tab: drag-drop / file picker / camera selfie upload
- Sticky tab bar on event detail page (gold underline on active)
- Event grid sorted newest-first
- Recursive subfolder scan (Day1, Day2, Edited) for both gallery and face search
- Paginated photo listing with encoded pageToken (skips folder re-scan)
- Poster_info image shown as event hero/card cover
- Similarity threshold: 0.68 | Sharp: max 1200px, quality 82

### Performance
- Batched Vision API: 16 images per request
- Parallel thumbnail downloads within each batch
- Thumbnail-first download: 800px thumb → full-res fallback
- CDN cache: photos 1h, gallery 5min, events 2min, poster 1 day

---

## 2026-05-16

### Initial Build
- Next.js 14 project lica-photo on GitHub (Nithirut/lica-photo)
- Deployed to Vercel (lica-photo.vercel.app)
- Team event flow: /team-downloads → event grid → /team-downloads/[event-id]
- Google Drive API v3 + service account (nt-photo-service@nt-photo.iam.gserviceaccount.com)
- events.js, poster.js, photo.js, photos.js, face-search.js API routes
