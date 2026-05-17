// lib/face-search-helpers.js
// Pure face geometry: landmark normalization + similarity scoring
// No I/O — pure functions, easy to unit-test

const KEY_LANDMARK_TYPES=['LEFT_EYE','RIGHT_EYE','NOSE_TIP','MOUTH_LEFT','MOUTH_RIGHT','LEFT_EYE_LEFT_CORNER','RIGHT_EYE_RIGHT_CORNER'];

export function normalizeLandmarks(landmarks,box) {
  if(!landmarks||!box||!box.vertices||box.vertices.length<3) return [];
  const x0=box.vertices[0]?.x||0,y0=box.vertices[0]?.y||0;
  const x1=box.vertices[1]?.x||0,y2=box.vertices[2]?.y||0;
  const w=x1-x0,h=y2-y0;
  if(w===0||h===0) return [];
  return landmarks.map(l=>({
    type:l.type,
    x:((l.position?.x||0)-x0)/w,
    y:((l.position?.y||0)-y0)/h,
  }));
}

export function faceSimilarity(marks1,marks2) {
  let totalDist=0,count=0;
  for(const type of KEY_LANDMARK_TYPES) {
    const m1=marks1.find(m=>m.type===type),m2=marks2.find(m=>m.type===type);
    if(m1&&m2){totalDist+=Math.sqrt((m1.x-m2.x)**2+(m1.y-m2.y)**2);count++;}
  }
  if(count===0) return 0;
  return Math.max(0,1-(totalDist/count)*3);
}

export function bestMatchScore(selfieMarks,faceAnnotations) {
  let best=0;
  for(const face of(faceAnnotations||[])){
    const score=faceSimilarity(selfieMarks,normalizeLandmarks(face.landmarks,face.boundingPoly));
    if(score>best) best=score;
  }
  return best;
}
