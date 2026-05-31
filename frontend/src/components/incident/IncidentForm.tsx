'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Typography } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { useAuth } from '@/context/AuthContext';
import { createProgressLog } from '@/lib/caseProgressApi';

// 1. Zod 유효성 검사 스키마 정의
export const incidentSchema = z.object({
  teacherName: z.string().optional(),
  incidentDate: z.string().optional(),
  incidentTime: z.string().optional(),
  perpetratorType: z.string().optional(),
  perpetratorDetail: z.string().optional(),
  locationType: z.string().optional(),
  locationDetail: z.string().optional(),
  natures: z.array(z.string()).optional(),
  description: z.string().optional(),
  evidenceMemo: z.string().optional(),
});

export type IncidentFormValues = z.infer<typeof incidentSchema>;

interface IncidentFormProps {
  onSuccess: (data: IncidentFormValues) => void;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({ onSuccess }) => {
  const { user, getToken } = useAuth();
  const displayName = user?.displayName || user?.email?.split('@')[0] || '익명 교사';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<IncidentFormValues>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      teacherName: displayName,
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: '14:00',
      natures: [],
      description: '',
      evidenceMemo: '',
    }
  });

  const selectedNatures = watch('natures') || [];

  // 침해의 성격 다중 선택 핸들러
  const handleNatureToggle = (nature: string) => {
    if (selectedNatures.includes(nature)) {
      setValue('natures', selectedNatures.filter(n => n !== nature), { shouldValidate: true });
    } else {
      setValue('natures', [...selectedNatures, nature], { shouldValidate: true });
    }
  };

  const natureOptions = [
    { label: '🗣️ 폭언 및 고성', value: '폭언' },
    { label: '💔 모욕 및 비하', value: '모욕' },
    { label: '📢 허위사실 명예훼손', value: '명예훼손' },
    { label: '👿 지속적 협박/공포 유발', value: '협박' },
    { label: '👊 폭행 및 신체 접촉', value: '폭행' },
    { label: '🚫 정당한 수업활동 방해', value: '수업방해' },
    { label: '📞 밤샘 연락/악성 민원', value: '악성민원' },
    { label: '🔍 기타 교권 침해', value: '기타' }
  ];

  // 백엔드로 전송하는 API 연동 로직
  const sendToGenkitBackend = async (data: IncidentFormValues) => {
    const token = await getToken();
    const response = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/incidents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...data,
        submittedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('백엔드 전송에 실패했습니다.');
    }
    
    return await response.json();
  };

  const onSubmit = async (data: IncidentFormValues) => {
    try {
      // 백엔드 연동은 백그라운드에서 비동기로 실행하여 UI 블로킹 방지 (무한 대기 해결)
      sendToGenkitBackend(data).catch(e => {
        console.warn('백엔드 전송 실패 (무시):', e);
      });

      // ✅ 폼 데이터를 '사건 진행 현황(타임라인)'의 1단계로 Firebase DB에 자동 연동 등록
      try {
        const naturesStr = data.natures ? data.natures.join(', ') : '미입력';
        createProgressLog({
          step: 1,
          stepTitle: '📥 교권 침해 공식 접수',
          logDate: data.incidentDate || new Date().toISOString().split('T')[0],
          location: data.locationDetail || '장소 미상',
          content: `[침해유형: ${naturesStr}]\n가해자: ${data.perpetratorDetail || '미상'}\n\n${data.description || '상세 경위 없음'}`,
          requiredDocuments: data.evidenceMemo || undefined,
        }).catch(e => console.warn('타임라인 자동 등록 백그라운드 실패:', e));
      } catch (e) {
        console.warn('타임라인 연동 로직 에러:', e);
      }

      onSuccess(data);
    } catch (err) {
      console.error('사건 기록 저장 실패:', err);
      alert('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <div className="w-full font-sans">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* 교사 성함 및 시간 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="교사 성함"
            placeholder="홍길동"
            error={errors.teacherName?.message}
            {...register('teacherName')}
          />
          <Input
            label="사건 발생일"
            type="date"
            error={errors.incidentDate?.message}
            {...register('incidentDate')}
          />
          <Input
            label="사건 발생 시각"
            type="time"
            error={errors.incidentTime?.message}
            {...register('incidentTime')}
          />
        </div>

        {/* 가해자 정보 (대분류 + 구체서술) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">가해자 대분류</label>
            <select
              className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 transition-all duration-200 outline-none text-sm text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:border-brand-azure focus:ring-2 focus:ring-brand-azure/20
                ${errors.perpetratorType ? 'border-red-500 ring-2 ring-red-500/10' : ''}`}
              {...register('perpetratorType')}
            >
              <option value="">-- 분류 선택 --</option>
              <option value="STUDENT">학생 (Student)</option>
              <option value="PARENT">학부모 (Parent)</option>
              <option value="COLLEAGUE">동료 교사 (Colleague)</option>
              <option value="ADMINISTRATOR">학교 관리자 (Administrator)</option>
              <option value="THIRD_PARTY">제3자 (Third Party)</option>
            </select>
            {errors.perpetratorType && <span className="text-xs font-medium text-red-500">{errors.perpetratorType.message}</span>}
          </div>
          
          <div className="md:col-span-2">
            <Input
              label="가해자 구체 정보 및 성함"
              placeholder="예: 5학년 2반 김OO 학생의 학부모 (또는 학생 본인)"
              error={errors.perpetratorDetail?.message}
              {...register('perpetratorDetail')}
            />
          </div>
        </div>

        {/* 장소 정보 (대분류 + 구체서술) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">장소 대분류</label>
            <select
              className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-slate-800 transition-all duration-200 outline-none text-sm text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 focus:border-brand-azure focus:ring-2 focus:ring-brand-azure/20
                ${errors.locationType ? 'border-red-500 ring-2 ring-red-500/10' : ''}`}
              {...register('locationType')}
            >
              <option value="">-- 분류 선택 --</option>
              <option value="CLASSROOM">교실 (Classroom)</option>
              <option value="STAFF_ROOM">교무실 / 행정실 (Staff Room)</option>
              <option value="CORRIDOR">복도 / 계단 (Corridor)</option>
              <option value="PLAYGROUND">운동장 / 강당 (Playground)</option>
              <option value="ONLINE">메신저 / 온라인 (Online/SNS)</option>
              <option value="PHONE">전화 통화 (Phone)</option>
              <option value="OTHER">기타 장소 (Other)</option>
            </select>
            {errors.locationType && <span className="text-xs font-medium text-red-500">{errors.locationType.message}</span>}
          </div>
          
          <div className="md:col-span-2">
            <Input
              label="구체적인 장소 기술"
              placeholder="예: 5학년 2반 교실 앞 복도 구석, 또는 퇴근 후 전화상"
              error={errors.locationDetail?.message}
              {...register('locationDetail')}
            />
          </div>
        </div>

        {/* 침해의 성격 (다중 선택 체크박스) */}
        <div className="space-y-2 font-sans">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">침해의 성격 (중복 선택 가능)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {natureOptions.map((opt) => {
              const isChecked = selectedNatures.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => handleNatureToggle(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 outline-none text-left
                    ${isChecked
                      ? 'bg-brand-indigo/10 text-brand-indigo border-brand-indigo font-bold dark:bg-brand-indigo/25 dark:text-brand-indigo-light dark:border-brand-indigo-light'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors duration-150
                    ${isChecked ? 'bg-brand-indigo border-brand-indigo text-white dark:bg-brand-indigo-light dark:border-brand-indigo-light' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    {isChecked && (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          {errors.natures && <span className="text-xs font-medium text-red-500 block mt-1">{errors.natures.message}</span>}
        </div>

        {/* 상세 경위 */}
        <Textarea
          label="사건 경위 상세 기술 (최소 20자 이상)"
          placeholder="예시: 수업 지도를 위해 학생의 휴대폰 사용 제지를 진행하자, 방과 후 해당 학생의 학부모가 교무실로 거세게 들이닥쳐 다른 동료 교사 및 학생들이 있는 자리에서 교사의 기본 자질이 없다는 등의 고함을 질러 큰 수치심과 공포감을 유발하였습니다."
          error={errors.description?.message}
          rows={5}
          {...register('description')}
        />

        {/* 증거 메모 */}
        <Textarea
          label="확보된 증거 자료에 관한 메모"
          placeholder="예시: 소란 직후 교무실 녹음 파일 1건(10분), 목격한 동료 교사 2명의 구두 진술 협조 약속."
          error={errors.evidenceMemo?.message}
          rows={3}
          {...register('evidenceMemo')}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" variant="primary" className="px-8 shadow-md" isLoading={isSubmitting}>
            기록 암호화 제출하기
          </Button>
        </div>

      </form>
    </div>
  );
};
