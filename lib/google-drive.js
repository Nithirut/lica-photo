// lib/google-drive.js
// Shared Google Drive helpers
import { driveLog } from './logger.js';

const MAX_DEPTH=3,MAX_FOLDERS=50;

export async function collectFolderIds(drive,rootId,opts={}) {
  const maxDepth=opts.maxDepth??MAX_DEPTH,maxFolders=opts.maxFolders??MAX_FOLDERS;
  const ids=[rootId];
  async function scan(folderId,depth) {
    if(depth>=maxDepth||ids.length>=maxFolders) return;
    try {
      const res=await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields:'files(id,name)',pageSize:20,
      });
      const subs=res.data.files||[];
      driveLog.info('subfolder_scan',{parentId:folderId,depth,found:subs.map(s=>s.name)});
      await Promise.all(subs.map(async(sf)=>{
        if(ids.length<maxFolders){ids.push(sf.id);await scan(sf.id,depth+1);}
      }));
    } catch(e){driveLog.error('subfolder_scan_failed',e,{folderId,depth});}
  }
  await scan(rootId,0);
  driveLog.info('collect_folders_done',{rootId,total:ids.length});
  return ids;
}

export async function downloadFileBase64(drive,auth,fileId) {
  try {
    const meta=await drive.files.get({fileId,fields:'thumbnailLink,mimeType,name'});
    const thumbLink=meta.data.thumbnailLink;
    driveLog.info('download_meta',{fileId,name:meta.data.name,mimeType:meta.data.mimeType,hasThumb:!!thumbLink});
    if(thumbLink) {
      let url800=thumbLink.replace(/=s\d+$/,'=s800').replace(/=s\d+&/,'=s800&');
      if(!url800.includes('=s800')) url800=thumbLink+'=s800';
      const token=(await(await auth.getClient()).getAccessToken()).token;
      if(token) {
        const fetchRes=await fetch(url800,{headers:{Authorization:`Bearer ${token}`}});
        driveLog.info('download_thumb_fetch',{fileId,status:fetchRes.status});
        if(fetchRes.ok){
          const buf=Buffer.from(await fetchRes.arrayBuffer());
          driveLog.info('download_thumb_ok',{fileId,bytes:buf.length});
          return buf.toString('base64');
        }
        driveLog.warn('download_thumb_bad_status',{fileId,status:fetchRes.status});
      } else { driveLog.warn('download_thumb_no_token',{fileId}); }
    }
  } catch(e){driveLog.error('download_thumb_exception',e,{fileId});}
  driveLog.info('download_fullres_attempt',{fileId});
  try {
    const fileRes=await drive.files.get({fileId,alt:'media'},{responseType:'arraybuffer'});
    driveLog.info('download_fullres_ok',{fileId,bytes:fileRes.data?.byteLength});
    return Buffer.from(fileRes.data).toString('base64');
  } catch(e2){driveLog.error('download_fullres_exception',e2,{fileId});return null;}
}

export function buildPhotoQuery(folderIds,opts={}) {
  const excludePoster=opts.excludePoster!==false;
  const folderClause=folderIds.map(id=>`'${id}' in parents`).join(' or ');
  const posterClause=excludePoster?" and not name contains 'Poster_info'":'';
  return `(${folderClause}) and mimeType contains 'image/'${posterClause} and trashed=false`;
}
