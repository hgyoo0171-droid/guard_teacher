import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export interface ProgressLog {
  id: string;
  step: number;
  stepTitle: string;
  logDate: string;
  location?: string;
  content: string;
  requiredDocuments?: string;
  remarks?: string;
  createdAt?: any;
}

export type CreateProgressLogInput = Omit<ProgressLog, 'id' | 'createdAt'>;
export type UpdateProgressLogInput = Partial<CreateProgressLogInput>;

export async function fetchProgressLogs(token?: string): Promise<ProgressLog[]> {
  const user = auth.currentUser;
  let logs: ProgressLog[] = [];
  
  if (user) {
    try {
      const q = query(collection(db, 'progressLogs'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      logs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as ProgressLog));
    } catch (error) {
      console.warn("Firebase fetch error, falling back to localStorage", error);
    }
  }

  // 로컬 스토리지에 저장된 항목도 무조건 불러와서 합침 (데모/오프라인 환경 완벽 보장)
  try {
    const localLogs = JSON.parse(localStorage.getItem('mock_progress_logs') || '[]');
    logs = [...logs, ...localLogs];
  } catch (e) {}

  return logs;
}

export async function createProgressLog(
  input: CreateProgressLogInput,
  token?: string
): Promise<ProgressLog> {
  const user = auth.currentUser;
  
  // 1. 무조건 로컬 스토리지에 먼저 저장 (데모/UI 즉각 반영 100% 보장)
  const newLog = { id: `local-${Date.now()}`, ...input };
  try {
    const localLogs = JSON.parse(localStorage.getItem('mock_progress_logs') || '[]');
    localLogs.push(newLog);
    localStorage.setItem('mock_progress_logs', JSON.stringify(localLogs));
  } catch (e) {
    console.error("로컬 스토리지 저장 실패:", e);
  }

  // 2. 백그라운드로 Firebase DB에도 동시 저장 시도
  if (user) {
    try {
      const docRef = await addDoc(collection(db, 'progressLogs'), {
        ...input,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      // 파이어베이스 성공 시 id 교체해서 리턴
      return { id: docRef.id, ...input } as ProgressLog;
    } catch (error) {
      console.warn("Firebase write error, using localStorage only", error);
    }
  }
  
  return newLog as ProgressLog;
}

export async function updateProgressLog(
  id: string,
  input: UpdateProgressLogInput,
  token?: string
): Promise<ProgressLog> {
  if (id.startsWith('local-')) {
    const logs = JSON.parse(localStorage.getItem('mock_progress_logs') || '[]');
    const index = logs.findIndex((l: any) => l.id === id);
    if (index > -1) {
      logs[index] = { ...logs[index], ...input };
      localStorage.setItem('mock_progress_logs', JSON.stringify(logs));
    }
    return { id, ...input } as ProgressLog;
  }
  await updateDoc(doc(db, 'progressLogs', id), input as any);
  return { id, ...input } as ProgressLog;
}

export async function deleteProgressLog(id: string, token?: string): Promise<void> {
  if (id.startsWith('local-')) {
    const logs = JSON.parse(localStorage.getItem('mock_progress_logs') || '[]');
    const filtered = logs.filter((l: any) => l.id !== id);
    localStorage.setItem('mock_progress_logs', JSON.stringify(filtered));
    return;
  }
  try {
    await deleteDoc(doc(db, 'progressLogs', id));
  } catch (e) {
    console.warn("Firebase delete error", e);
  }
}

export const MOCK_PROGRESS_LOGS: ProgressLog[] = [];

