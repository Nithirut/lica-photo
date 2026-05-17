# LICA Photo — Architecture

> Last updated: 2026-05-17

## Overview

Next.js 14 (Pages Router) on Vercel. Google Drive via service account. Cloud Vision API for AI face search.

**Stack:** Next.js 14 · React 18 · googleapis 140 · sharp 0.33 · Vercel Hobby
**GCP project:** nt-photo (953816117597)
**Service account:** nt-photo-service@nt-photo.iam.gserviceaccount.com

## Directory Structure

```
lica-photo/
├── pages/
│   ├── team-downloads/
│   │   ├── index.js          ← event selection grid
│   │   └── [event-id].js     ← gallery + face search tabs
│   └── api/drive/
│       ├── events.js         ← list event folders
│       ├── poster.js         ← proxy poster image
│       ├── photo.js          ← proxy single photo
│       ├── photos.js         ← paginated gallery list
│       └── face-search.js    ← AI face search endpoint
├── lib/
│   ├── logger.js             ← structured logging
│   ├── google-drive.js       ← Drive helpers
│   ├── image-processing.js   ← sharp normalization
│   └── face-search-helpers.js ← face geometry
├── components/
│   └── ErrorBoundary.jsx
└── docs/
    ├── architecture.md
    └── changelog.md
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| /api/drive/events | GET | List event folders, sorted newest-first |
| /api/drive/poster?fileId | GET | Proxy Poster_info image, cache 1d |
| /api/drive/photo?fileId&size | GET | Proxy photo: thumb redirect or full stream |
| /api/drive/photos?eventId&pageToken | GET | Paginated photo list (recursive folders) |
| /api/drive/face-search | POST | AI face search: {eventId, selfie} |

## AI Face Search Pipeline

```
Selfie upload (any format)
  → normalizeSelfie()    sharp: HEIC/WEBP/PNG → JPEG 1200px, rotate EXIF
  → Vision FACE_DETECTION on selfie
  → normalizeLandmarks() scale to [0,1] relative to face box
  → collectFolderIds()   recursive Drive subfolder scan (maxDepth=2, maxFolders=20)
  → drive.files.list()   up to 120 photos
  → Batches of 16:
      downloadFileBase64()     thumbnail 800px → full-res fallback
      vision.images.annotate() batch FACE_DETECTION
      bestMatchScore()         Euclidean landmark distance, threshold 0.68
  → Return matches sorted by score DESC
```

## Logging

| Import | Tag | Used in |
|--------|-----|---------|
| faceLog | [FACE SEARCH] | face-search.js |
| driveLog | [GOOGLE DRIVE] | google-drive.js |
| imageLog | [IMAGE PROC] | image-processing.js |
| galleryLog | [GALLERY] | photos.js |

Production: warn + error + perf (>500ms) only.
Development: all levels.

## Caching

| Resource | s-maxage | stale-while-revalidate |
|----------|----------|----------------------|
| Events | 120s | 300s |
| Photos list | 300s | 600s |
| Single photo | 3600s | 86400s |
| Poster | 86400s | — |

## Git Branches

| Branch | Purpose |
|--------|---------|
| main | Production — auto-deploys to Vercel |
| develop | Integration — merge features here first |
| feature/* | Individual feature branches |

Rule: never commit directly to main.
