'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
          ? '아이디 또는 비밀번호가 올바르지 않습니다.'
          : err.code === 'auth/email-already-in-use'
          ? '이미 가입된 이메일입니다.'
          : '로그인/회원가입 처리 중 오류가 발생했습니다.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-indigo text-white shadow-lg shadow-brand-indigo/30 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <Typography variant="h1" className="text-3xl font-extrabold text-slate-900 tracking-tight">
            TeachGuard AI
          </Typography>
          <Typography variant="p" className="text-slate-500 text-sm">
            대한민국 교사의 권리와 마음을 지키는 통합 안전망
          </Typography>
        </div>

        <Card hoverable={false} className="bg-white p-8 shadow-xl border border-slate-100 rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <Input
                label="교육청 이메일 주소"
                type="email"
                required
                placeholder="teacher@school.go.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
              <Input
                label="비밀번호"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3.5 rounded-2xl text-base font-bold shadow-md"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : isLoginMode ? '안전 로그인 (Secure Login)' : '교사 계정 가입하기'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
              }}
              className="text-sm font-bold text-brand-indigo hover:text-brand-indigo-dark transition-colors"
            >
              {isLoginMode ? "처음이신가요? 새 교사 계정 만들기" : "이미 계정이 있으신가요? 로그인하기"}
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400">
          본 시스템은 교사 인증(NEIS 등)을 통해 안전하게 암호화되어 보호됩니다.
        </p>

      </div>
    </div>
  );
}
