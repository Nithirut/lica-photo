// lib/image-processing.js
// Image normalization: any format → JPEG 1200px, quality 82, EXIF rotate, strip metadata
import sharp from 'sharp';
import { imageLog } from './logger.js';

export async function normalizeSelfie(selfieDataUrl) {
  const match=selfieDataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if(!match) throw new Error('Invalid selfie data URL');
  const mimeType=match[1].toLowerCase(),rawBase64=match[2];
  const inputBuffer=Buffer.from(rawBase64,'base64');
  const originalKB=Math.round(inputBuffer.length/1024);
  imageLog.info('selfie_parse',{mimeType,originalKB,bufferBytes:inputBuffer.length,base64Preview:rawBase64.slice(0,20),isEmpty:inputBuffer.length===0});
  if(inputBuffer.length===0) throw new Error('Selfie buffer is empty after base64 decode');
  try {
    const meta=await sharp(inputBuffer,{failOn:'none'}).metadata();
    imageLog.info('selfie_sharp_meta',{format:meta.format,width:meta.width,height:meta.height,hasExif:!!meta.exif,orientation:meta.orientation??'none'});
  } catch(e){imageLog.warn('selfie_meta_read_failed',{message:e.message});}
  let normalized;
  try {
    normalized=await sharp(inputBuffer,{failOn:'none'})
      .rotate()
      .resize(1200,1200,{fit:'inside',withoutEnlargement:true})
      .jpeg({quality:82})
      .toBuffer();
  } catch(sharpErr){
    imageLog.error('selfie_sharp_failed',sharpErr,{mimeType,originalKB});
    imageLog.warn('selfie_sharp_fallback',{note:'sending raw base64'});
    return rawBase64;
  }
  const normalizedKB=Math.round(normalized.length/1024);
  imageLog.info('selfie_normalized',{originalKB,normalizedKB,compressionRatio:(normalizedKB/originalKB).toFixed(2)});
  return normalized.toString('base64');
}

export function detectFormat(dataUrl) {
  const match=dataUrl.match(/^data:image/([^;]+);/);
  if(!match) return 'unknown';
  const raw=match[1].toLowerCase();
  if(raw==='jpg'||raw==='jpeg') return 'jpeg';
  if(raw==='heic'||raw==='heif') return 'heic';
  return raw;
}
