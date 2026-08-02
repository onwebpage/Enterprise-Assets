import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ApiResponse } from '@/lib/api';
import { getToken } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiConversation {
  id: number;
  orgId: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  liked: boolean | null;
  createdAt: string;
}

export interface ChatResponse {
  conversationId: number;
  message: AiMessage;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: () => api.get<ApiResponse<AiConversation[]>>('/ai/conversations').then(r => r.data),
    staleTime: 10_000,
  });
}

export function useConversationMessages(conversationId: number | null) {
  return useQuery({
    queryKey: ['ai', 'conversations', conversationId, 'messages'],
    queryFn: () =>
      api.get<ApiResponse<AiMessage[]>>(`/ai/conversations/${conversationId}/messages`).then(r => r.data),
    enabled: conversationId !== null,
    staleTime: 0,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (title?: string) =>
      api.post<ApiResponse<AiConversation>>('/ai/conversations', { title }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/ai/conversations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'conversations'] }),
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: (body: { message: string; conversationId?: number }) =>
      api.post<ApiResponse<ChatResponse>>('/ai/chat', body).then(r => r.data),
  });
}

export function useMessageFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: number; liked: boolean }) =>
      api.patch(`/ai/messages/${id}/feedback`, { liked }),
    onSuccess: (_data, vars) => {
      // Optimistically update locally — no full refetch needed
      qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}
