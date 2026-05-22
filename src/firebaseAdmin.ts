import * as admin from 'firebase-admin';

// 서비스 어카운트 키 없이 초기화하면 배포 환경(GCP/Cloud Run)에서는 기본 서비스 계정을 사용합니다.
// 로컬 개발 환경에서는 GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 세팅해야 합니다.
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error) {
  console.log('Firebase admin initialization failed (might be missing credentials in local env):', error);
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
