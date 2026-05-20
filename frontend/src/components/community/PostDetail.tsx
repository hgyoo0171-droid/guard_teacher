'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Comment {
  id: string;
  post_id: string;
  author: string;
  content: string;
  created_at: string;
  isMine: boolean;
}

interface Post {
  id: string;
  author: string;
  title: string;
  content: string;
  created_at: string;
  isMine: boolean;
}

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function PostDetail({ post, onBack, onDelete }: PostDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const fetchComments = async () => {
    try {
      // API call to fetch comments
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/community/posts/${post.id}/comments`, {
        headers: {
          'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026'
        }
      });
      if (!response.ok) throw new Error('댓글을 불러오는데 실패했습니다.');
      const data = await response.json();
      setComments(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch(`https://teachguard-backend-84878824642.asia-northeast3.run.app/api/community/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer TeachGuardSecureToken_KimTeacher2026'
        },
        body: JSON.stringify({ content: newComment })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '댓글 등록 실패');
      }
      
      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={onBack} size="sm">
          &larr; 목록으로
        </Button>
        {post.isMine && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(post.id)}>
            삭제하기
          </Button>
        )}
      </div>

      <div className="mb-8 border-b pb-6 dark:border-gray-700">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{post.title}</h1>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="font-medium text-blue-600 dark:text-blue-400">{post.author}</span>
          <span>{new Date(post.created_at).toLocaleString()}</span>
        </div>
        <div className="mt-6 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {post.content}
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          댓글 {comments.length}개
        </h3>
        
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleCommentSubmit} className="flex gap-3">
          <div className="flex-1">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="따뜻한 조언과 공감을 남겨주세요 (익명)"
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            등록
          </Button>
        </form>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-750">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {comment.author} {comment.isMine && <span className="text-blue-500">(나)</span>}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-800 dark:text-gray-200">{comment.content}</p>
            </div>
          ))}
          
          {comments.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              첫 댓글을 남겨보세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
