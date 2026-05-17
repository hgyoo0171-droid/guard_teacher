import { TrendReport } from '@/components/trend/TrendReport';

export const metadata = {
  title: '예방 및 트렌드 분석 리포트 | TeachGuard AI',
  description: '익명화된 교권침해 데이터 기반 트렌드 분석 및 예방 가이드',
};

export default function TrendPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <TrendReport />
    </div>
  );
}
