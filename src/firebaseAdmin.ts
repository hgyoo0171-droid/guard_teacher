import * as admin from 'firebase-admin';

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: "teachguard-ai", // 토큰 검증용 최소 설정
    });
  }
} catch (error) {
  console.log('Firebase admin initialization failed:', error);
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
