import { z } from 'zod';

// SECURITY: Input validation schemas to prevent malicious/oversized inputs

export const ChatQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(2000, 'Query too long (max 2000 characters)'),
  resourceIds: z.array(z.string()).max(500, 'Too many resources selected').optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string().max(3000, 'Message too long (max 3,000 characters)') // query (2000) + response (500) + buffer
  })).max(50, 'Conversation history too long').optional()
});

export const BookmarkSchema = z.object({
  id: z.string(),
  title: z.string().max(200, 'Title too long'),
  type: z.string().max(50, 'Type too long').optional(),
  url: z.string().url('Invalid URL').optional()
});

export type ChatQueryInput = z.infer<typeof ChatQuerySchema>;
export type BookmarkInput = z.infer<typeof BookmarkSchema>;
