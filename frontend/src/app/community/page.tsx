import { CommunityBoard } from '@/components/community/CommunityBoard';

export const metadata = {
  title: '동료 지원 네트워크 | TeachGuard AI',
  description: '교사들의 익명 소통 및 고민 상담 커뮤니티',
};

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
      <CommunityBoard />
    </div>
  );
}
