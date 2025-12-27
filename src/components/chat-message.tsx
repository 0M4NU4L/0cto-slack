'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

export type Message = {
    id: string;
    sender: string;
    senderId: string;
    avatarUrl: string;
    text: string;
    timestamp: {
      seconds: number;
      nanoseconds: number;
    } | null;
    mentions?: string[]; // Array of mentioned usernames
    isIssue?: boolean;
    issueDetails?: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      assignees?: string[]; // Array of GitHub usernames to assign
    };
    issueUrl?: string; // URL of the created GitHub issue
    status?: 'pending' | 'completed'; // Status of the AI suggestion
    isSystemMessage?: boolean;
    systemMessageType?: 'issue-list' | 'pr-list' | 'pr-verification' | 'security-alert' | 'incident-alert';
    systemMessageData?: any[];
    tempId?: string; // temporary Id for optimistic updates
};

import { SecurityAlert, IncidentAlert } from '@/components/chat/message-types';
import { IssueList } from '@/components/chat/issue-list';
import { PRList } from '@/components/chat/pr-list';
import { PRVerification } from '@/components/chat/pr-verification';

type ChatMessageProps = {
  message: Message;
};

export function ChatMessage({ message }: ChatMessageProps) {
  const { sender, avatarUrl, text, timestamp, mentions, isSystemMessage, systemMessageType, systemMessageData } = message;

  const timeAgo = timestamp
    ? formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
    : 'just now';
  
  const isAI = sender === '0cto AI';
  const isSecurity = sender === '0cto Security';

  // Function to render text with highlighted mentions
  const renderTextWithMentions = (text: string) => {
    if (!mentions || mentions.length === 0) {
      return text;
    }

    // Create a regex to match @mentions
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the highlighted mention
      const mentionedUser = match[1];
      if (mentions.includes(mentionedUser)) {
        parts.push(
          <span
            key={match.index}
            className="bg-primary/10 text-primary font-medium px-1 rounded"
          >
            @{mentionedUser}
          </span>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (isSystemMessage && systemMessageType) {
    if (systemMessageType === 'security-alert' && systemMessageData && systemMessageData.length > 0) {
        return <SecurityAlert leak={systemMessageData[0]} />;
    }
    if (systemMessageType === 'incident-alert' && systemMessageData && systemMessageData.length > 0) {
        return <IncidentAlert incident={systemMessageData[0]} />;
    }
    // ... other system messages (issue-list, pr-list, etc.) would go here if we refactored them
  }

  return (
    <div className={`flex items-start gap-4 group ${isAI ? 'bg-purple-500/5' : isSecurity ? 'bg-red-500/5' : 'hover:bg-white/5'} p-4 rounded-xl transition-colors duration-200`}>
      <Avatar className={`h-10 w-10 ring-2 ring-offset-2 ring-offset-black ${isAI ? 'ring-purple-500' : isSecurity ? 'ring-red-500' : 'ring-white/10'}`}>
        <AvatarImage src={avatarUrl} alt={sender} />
        <AvatarFallback className="bg-white/10 text-white">{sender.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`font-bold text-sm ${isAI ? 'text-purple-400' : isSecurity ? 'text-red-400' : 'text-white'}`}>{sender}</span>
          <span className="text-xs text-white/40">{timeAgo}</span>
          {isAI && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase tracking-wider">
                AI
            </span>
          )}
          {isSecurity && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 uppercase tracking-wider">
                SECURITY
            </span>
          )}
        </div>
        <div className={`text-sm leading-relaxed ${isAI ? 'text-gray-300' : 'text-gray-200'} whitespace-pre-wrap`}>
          {renderTextWithMentions(text)}
        </div>
        
        {/* Render System Message Content if embedded in a standard message wrapper (legacy support) */}
        {isSystemMessage && systemMessageType === 'issue-list' && (
            // Placeholder for IssueList component if we were to extract it
            <div className="mt-2 p-2 bg-black/20 rounded border border-white/10">
                <pre className="text-xs text-white/70 overflow-x-auto">{JSON.stringify(systemMessageData, null, 2)}</pre>
            </div>
        )}
      </div>
    </div>
  );
}
