'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { PostDetail } from './PostDetail';
import { CreatePostModal } from './CreatePostModal';
import { useAuth } from '@/context/AuthContext';

interface Post {
  id: string;
  author: string;
  title: string;
  content: string;
  created_at: string;
  isMine: boolean;
}

export function CommunityBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) return;
      const response = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/community/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('게시글을 불러오는데 실패했습니다.', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (title: string, content: string) => {
    const token = await getToken();
    if (!token) {
      alert("로그인이 필요합니다.");
      return;
    }
    const response = await fetch('https://teachguard-backend-84878824642.asia-northeast3.run.app/api/community/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, content })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '게시글 등록에 실패했습니다.');
    }
    
    await fetchPosts();
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/community/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('삭제 권한이 없거나 오류가 발생했습니다.');
      }
      
      setSelectedPost(null);
      await fetchPosts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (selectedPost) {
    return (
      <PostDetail 
        post={selectedPost} 
        onBack={() => setSelectedPost(null)}
        onDelete={handleDeletePost}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">동료 지원 네트워크</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            고민을 나누고 위로를 받으세요. 모든 글은 철저히 익명으로 보호됩니다.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>새 글 작성</Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gray-500">불러오는 중...</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div 
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {post.author}
                </span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                {post.title}
              </h3>
              <p className="line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
                {post.content}
              </p>
            </div>
          ))}
          
          {posts.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              아직 등록된 게시글이 없습니다. 첫 글을 작성해보세요!
            </div>
          )}
        </div>
      )}

      <CreatePostModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </div>
  );
}
