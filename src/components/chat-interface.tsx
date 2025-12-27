'use client';

import { useAuth } from '@/lib/auth';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, orderBy, query, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, type Message } from '@/components/chat-message';
import { MessageInput } from '@/components/message-input';
import { aiDetectIssue } from '@/ai/flows/ai-detects-potential-issues';
import { aiDetectIssueResolution } from '@/ai/flows/ai-detects-issue-resolution';
import { aiMatchPullRequestWithIssue } from '@/ai/flows/ai-matches-pr-with-issue';
import { Button } from './ui/button';
import { Github, Sparkles, ExternalLink, GitPullRequest, ListTodo, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiCreateGithubIssue } from '@/ai/flows/ai-creates-github-issues';
import { aiListGithubIssues } from '@/ai/flows/ai-list-github-issues';
import { aiListGithubPRs } from '@/ai/flows/ai-list-github-prs';
import { aiScanRecentCommits } from '@/ai/flows/ai-scan-recent-commits';
import { ScrollArea } from './ui/scroll-area';
import Link from 'next/link';
import KanbanBoard, { KanbanIssue } from '@/components/kanban-board';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { ErrorBoundary } from '@/components/error-boundary';
import { scanText, maskSecret, type SecretLeak } from '@/lib/security';
import { checkHealth, analyzeLog, type Incident } from '@/lib/monitoring';
import { SecurityAlert, IncidentAlert } from '@/components/chat/message-types';
import { Shield, Activity } from 'lucide-react';

type ChatInterfaceProps = {
  repoFullName: string;
  channelId: string;
};

export function ChatInterface({ repoFullName, channelId }: ChatInterfaceProps) {
  const { user, githubToken } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isKanbanOpen, setIsKanbanOpen] = useState(false);
  const [isMdUp, setIsMdUp] = useState(false);

  const encodedRepoFullName = encodeURIComponent(repoFullName);

  const messagesRef = useMemoFirebase(() => 
    firestore ? collection(firestore, 'repos', encodedRepoFullName, 'channels', channelId, 'messages') : null
  , [firestore, encodedRepoFullName, channelId]);

  const messagesQuery = useMemoFirebase(() =>
    messagesRef ? query(messagesRef, orderBy('timestamp', 'asc')) : null
  , [messagesRef]);

  const { data: serverMessages, isLoading } = useCollection<Message>(messagesQuery);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [lastIssueDetectionTime, setLastIssueDetectionTime] = useState<number>(0);

  const messages = useMemo(() => {
    const messageMap = new Map<string, Message>();

    // Add server messages to the map first
    (serverMessages || []).forEach(msg => {
      messageMap.set(msg.id, msg);
    });

    // Add optimistic messages, replacing server messages if a tempId matches
    optimisticMessages.forEach(optMsg => {
      // If an optimistic message has a tempId, see if a server message also has it.
      // If so, the server message in the map is the 'real' one, so we don't add the optimistic one.
      const serverMsgWithTempId = Array.from(messageMap.values()).find(sm => sm.tempId === optMsg.tempId);

      if (optMsg.tempId && serverMsgWithTempId) {
        // The optimistic message has been confirmed by the server.
        // The server version is already in the map, so do nothing.
      } else {
        // This is a new optimistic message, or one that hasn't been confirmed yet.
        messageMap.set(optMsg.id, optMsg);
      }
    });

    return Array.from(messageMap.values()).sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0));
  }, [serverMessages, optimisticMessages]);


  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  // Track viewport for responsive Kanban behavior (md breakpoint: 768px)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMdUp('matches' in e ? e.matches : (e as MediaQueryList).matches);
    // Initialize
    setIsMdUp(mq.matches);
    // Subscribe
    try {
      mq.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
      return () => mq.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
    } catch {
      // Safari fallback
      mq.addListener(handler as any);
      return () => mq.removeListener(handler as any);
    }
  }, []);

  const sendBotMessage = async (text: string, type: 'issue-list' | 'pr-list' | 'pr-verification', data: any[]) => {
    if (!messagesRef) return;
    const tempId = `temp_${Date.now()}`;
    const botMessage: Omit<Message, 'id' | 'timestamp'> = {
      sender: '0cto AI',
      senderId: 'ai_assistant',
      avatarUrl: '/brain-circuit.svg',
      text: text,
      isSystemMessage: true,
      systemMessageType: type,
      systemMessageData: data,
    };
    const finalBotMessage = { ...botMessage, timestamp: serverTimestamp(), tempId: tempId };
    
    const tempOptimisticMessage: Message = {
      ...botMessage,
      id: tempId,
      timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
      tempId: tempId,
    }
    setOptimisticMessages(prev => [...prev, tempOptimisticMessage]);

    try {
        await addDoc(messagesRef, finalBotMessage);
    } catch(e) {
        console.error("Error sending bot message:", e);
        // Optionally remove the optimistic message on failure
        setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
    }
  }

  const handleListIssues = async () => {
    if (!githubToken) return;
    setIsBotThinking(true);
    try {
      const [repoOwner, repoName] = repoFullName.split('/');
      const { issues } = await aiListGithubIssues({ repoOwner, repoName, accessToken: githubToken });
      if (issues.length > 0) {
        const text = `Here are the open issues for ${repoFullName}:`;
        await sendBotMessage(text, 'issue-list', issues);
      } else {
        await sendBotMessage(`There are no open issues for ${repoFullName}.`, 'issue-list', []);
      }
    } catch(e) {
      console.error(e);
      await sendBotMessage('Sorry, I was unable to fetch the list of issues.', 'issue-list', []);
    } finally {
      setIsBotThinking(false);
    }
  }

  const handleListPRs = async () => {
    if (!githubToken) return;
    setIsBotThinking(true);
    try {
        const [repoOwner, repoName] = repoFullName.split('/');
        const { prs } = await aiListGithubPRs({ repoOwner, repoName, accessToken: githubToken });
        if (prs.length > 0) {
            const text = `Here are the open pull requests for ${repoFullName}:`;
            await sendBotMessage(text, 'pr-list', prs);
        } else {
            await sendBotMessage(`There are no open pull requests for ${repoFullName}.`, 'pr-list', []);
        }
    } catch(e) {
        console.error(e);
        await sendBotMessage('Sorry, I was unable to fetch the list of pull requests.', 'pr-list', []);
    } finally {
      setIsBotThinking(false);
    }
  }

  const handleManualPRVerification = async (issueRef: string) => {
    if (!githubToken || !user) return;
    setIsBotThinking(true);
    
    try {
      const [repoOwner, repoName] = repoFullName.split('/');
      const matchResult = await aiMatchPullRequestWithIssue({
        repoOwner,
        repoName,
        issueReference: issueRef,
        claimedBy: user.displayName || user.uid,
        accessToken: githubToken,
      });

      const text = matchResult.matchFound 
        ? `✅ **PR Verification**: Found ${matchResult.matchingPRs.length} matching pull request${matchResult.matchingPRs.length > 1 ? 's' : ''} for "${issueRef}"` 
        : `❌ **PR Verification**: No matching pull requests found for "${issueRef}".`;
        
      await sendBotMessage(text, 'pr-verification', matchResult.matchingPRs);
    } catch(e) {
      console.error(e);
      await sendBotMessage('Sorry, I was unable to verify pull requests.', 'pr-verification', []);
    } finally {
      setIsBotThinking(false);
    }
  }

  const handleSendMessage = async (text: string, mentions: string[] = []) => {
    if (!text.trim() || !user || !messagesRef) return;

    if (text.trim() === '/issuelist') {
      await handleListIssues();
      return;
    }
    if (text.trim() === '/prlist') {
      await handleListPRs();
      return;
    }
    if (text.trim().startsWith('/solved')) {
      const issueRef = text.trim().replace('/solved', '').trim() || 'recent issue';
      await handleManualPRVerification(issueRef);
      return;
    }

    // 1. Security Scan
    const scanResult = await scanText(text, 'chat');
    let finalContent = text;
    let securityAlert = null;

    if (scanResult.isLeak) {
        // Mask the secret in the message
        finalContent = maskSecret(text, scanResult.leaks);
        securityAlert = scanResult.leaks[0];
    }

    const tempId = `temp_${Date.now()}`;
    const newMessage: Omit<Message, 'id' | 'timestamp'> = {
      sender: user.displayName || 'Anonymous',
      senderId: user.uid,
      avatarUrl: user.photoURL || '',
      text: finalContent,
      isIssue: false,
      ...(mentions.length > 0 && { mentions }),
    };
    
    const finalNewMessage = { ...newMessage, timestamp: serverTimestamp(), tempId: tempId };

    const tempOptimisticMessage: Message = {
      ...newMessage,
      id: tempId,
      timestamp: { seconds: Date.now() / 1000, nanoseconds: 0 },
      tempId: tempId,
    }
    setOptimisticMessages(prev => [...prev, tempOptimisticMessage]);


    try {
      const newDocRef = await addDoc(messagesRef, finalNewMessage);
      
      // If leak detected, send a system alert immediately after
      if (securityAlert) {
        const alertTempId = `temp_alert_${Date.now()}`;
        const alertMessage: Omit<Message, 'id' | 'timestamp'> = {
            sender: '0cto Security',
            senderId: 'system_security',
            avatarUrl: '/shield-alert.svg',
            text: 'Security Alert',
            isSystemMessage: true,
            systemMessageType: 'security-alert',
            systemMessageData: [securityAlert],
        };
        await addDoc(messagesRef, { ...alertMessage, timestamp: serverTimestamp(), tempId: alertTempId });

        // Auto-remove the leaked message after 10 seconds
        setTimeout(async () => {
            try {
                await deleteDoc(newDocRef);
                // Optionally notify that it was removed?
                // For now, just silent removal as requested.
            } catch (e) {
                console.error("Failed to auto-remove message", e);
            }
        }, 10000);
      }
      
      const recentMessages = (serverMessages ?? []).slice(-9).map(m => ({ 
        sender: m.sender, 
        text: m.text,
        senderId: m.senderId 
      }));
      recentMessages.push({ 
        sender: newMessage.sender, 
        text: newMessage.text, 
        senderId: newMessage.senderId 
      });
      
      // Check for issue resolution claims
      const resolutionResult = await aiDetectIssueResolution({
        messages: recentMessages,
        currentUserId: user.uid,
      });

      if (resolutionResult.isResolutionClaim && resolutionResult.issueReference && githubToken) {
        // User claims to have resolved an issue - check for matching PRs
        const [repoOwner, repoName] = repoFullName.split('/');
        const matchResult = await aiMatchPullRequestWithIssue({
          repoOwner,
          repoName,
          issueReference: resolutionResult.issueReference,
          claimedBy: user.displayName || user.uid,
          accessToken: githubToken,
        });

        // Send AI response about PR verification
        const verificationTempId = `temp_verification_${Date.now()}`;
        const verificationMessage: Omit<Message, 'id' | 'timestamp'> = {
          sender: '0cto AI',
          senderId: 'ai_assistant',
          avatarUrl: '/brain-circuit.svg',
          text: matchResult.matchFound 
            ? `✅ **PR Verification**: I found ${matchResult.matchingPRs.length} matching pull request${matchResult.matchingPRs.length > 1 ? 's' : ''} for "${resolutionResult.issueReference}"` 
            : `❌ **PR Verification**: No matching pull requests found for "${resolutionResult.issueReference}". ${resolutionResult.resolutionMethod === 'pull_request' ? 'You mentioned creating a PR - it might not be visible yet or may need different keywords.' : ''}`,
          isSystemMessage: true,
          systemMessageType: 'pr-verification',
          systemMessageData: matchResult.matchingPRs,
        };

        const finalVerificationMessage = { ...verificationMessage, timestamp: serverTimestamp(), tempId: verificationTempId };
        const tempOptimisticVerificationMessage: Message = {
          ...verificationMessage,
          id: verificationTempId,
          timestamp: { seconds: Date.now() / 1000 + 2, nanoseconds: 0 },
          tempId: verificationTempId,
        };

        setOptimisticMessages(prev => [...prev, tempOptimisticVerificationMessage]);
        await addDoc(messagesRef, finalVerificationMessage);
      }
      
      let detectionResult = await aiDetectIssue({ 
        messages: recentMessages.map(m => ({ sender: m.sender, text: m.text })),
        ...(mentions.length > 0 && { mentions })
      });

      // Fallback heuristic if AI fails (e.g. rate limit)
      if (!detectionResult) {
          const lowerText = text.toLowerCase();
          if (lowerText.match(/\b(fix|bug|issue|crash|error|fail|broken|ui|map|jira)\b/i) || lowerText.startsWith('/issue')) {
             detectionResult = {
                 is_issue: true,
                 title: text.length > 50 ? text.substring(0, 47) + '...' : text,
                 description: text,
                 priority: 'medium',
                 assignees: []
             };
          } else {
             detectionResult = { is_issue: false, title: '', description: '', priority: 'low' };
          }
      }
      
      if (detectionResult.is_issue) {
          const now = Date.now();
          // Rate limit: 1 minute cooldown
          if (now - lastIssueDetectionTime < 60000) {
              const warningTempId = `temp_warn_${now}`;
              const warningMessage: Omit<Message, 'id' | 'timestamp'> = {
                  sender: '0cto AI',
                  senderId: 'ai_assistant',
                  avatarUrl: '/brain-circuit.svg',
                  text: '⚠️ **Spam Protection**: You are generating issues too quickly. Please wait a moment before reporting another issue.',
                  isSystemMessage: true,
                  systemMessageType: 'generic', // Using generic for simple text alerts
                  systemMessageData: [],
              };
              await addDoc(messagesRef, { ...warningMessage, timestamp: serverTimestamp(), tempId: warningTempId });
          } else {
              setLastIssueDetectionTime(now);
              
              const aiTempId = `temp_ai_${Date.now()}`;
              const aiMessage: Omit<Message, 'id' | 'timestamp'> = {
                  sender: '0cto AI',
                  senderId: 'ai_assistant',
                  avatarUrl: '/brain-circuit.svg',
                  text: `I've detected a potential issue: **${detectionResult.title}**${detectionResult.assignees && detectionResult.assignees.length > 0 ? `\n\nSuggested assignees: ${detectionResult.assignees.map(a => `@${a}`).join(', ')}` : ''}`,
                  isIssue: true,
                  issueDetails: {
                      title: detectionResult.title,
                      description: detectionResult.description,
                      priority: detectionResult.priority,
                      ...(detectionResult.assignees && detectionResult.assignees.length > 0 && { assignees: detectionResult.assignees }),
                  },
                  status: 'pending'
              };
              const finalAiMessage = { ...aiMessage, timestamp: serverTimestamp(), tempId: aiTempId };

              const tempOptimisticAiMessage: Message = {
                ...aiMessage,
                id: aiTempId,
                timestamp: { seconds: Date.now() / 1000 + 1, nanoseconds: 0 },
                tempId: aiTempId,
              }
              setOptimisticMessages(prev => [...prev, tempOptimisticAiMessage]);
              await addDoc(messagesRef, finalAiMessage);
          }
      }
    } catch (error) {
      console.error('Error sending message or detecting issue:', error);
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not send message.',
      });
    }
  };

  const handleCreateIssue = async (message: Message) => {
    if (!message.issueDetails || !githubToken || !repoFullName || !firestore || !messagesRef) return;
    setIsCreatingIssue(true);
    try {
        const [repoOwner, repoName] = repoFullName.split('/');
        const result = await aiCreateGithubIssue({
            repoOwner,
            repoName,
            issueTitle: message.issueDetails.title,
            issueDescription: message.issueDetails.description,
            accessToken: githubToken,
            ...(message.issueDetails.assignees && message.issueDetails.assignees.length > 0 && { assignees: message.issueDetails.assignees }),
        });

        const messageRef = doc(messagesRef, message.id);
        await updateDoc(messageRef, {
            issueUrl: result.issueUrl,
            status: 'completed'
        });

        setOptimisticMessages(prevMessages => prevMessages.map(msg => 
            msg.id === message.id 
                ? { ...msg, issueUrl: result.issueUrl, status: 'completed' } 
                : msg
        ));


        toast({
            title: 'GitHub Issue Created!',
            description: (
                <a href={result.issueUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    Click here to view the issue.
                </a>
            ),
        });
    } catch (error) {
        console.error('Failed to create GitHub issue:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to create GitHub issue.',
        });
    } finally {
        setIsCreatingIssue(false);
    }
  };

  const renderSystemMessage = (msg: Message) => {
    if (msg.systemMessageType === 'issue-list' || msg.systemMessageType === 'pr-list') {
      const Icon = msg.systemMessageType === 'issue-list' ? ListTodo : GitPullRequest;
      return (
        <div className='ml-12 mt-2 space-y-2'>
          {msg.systemMessageData?.map((item: any) => (
            <Link href={item.html_url} key={item.id} target="_blank">
                <div  className='flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors'>
                    <Icon className='h-5 w-5 text-primary' />
                    <div className='flex-1 truncate'>
                        <span className='font-medium'>#{item.number} {item.title}</span>
                        <p className='text-xs text-muted-foreground'>
                            Opened by {item.user.login}
                        </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
            </Link>
          ))}
        </div>
      )
    }
    
    if (msg.systemMessageType === 'pr-verification') {
      const matchingPRs = msg.systemMessageData || [];
      return (
        <div className='ml-12 mt-2 space-y-2'>
          {matchingPRs.length > 0 ? (
            matchingPRs.map((pr: any) => (
              <Link href={pr.url} key={pr.number} target="_blank">
                <div className='flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/50 transition-colors'>
                  <div className='flex items-center gap-2'>
                    <GitPullRequest className='h-5 w-5 text-green-600' />
                    {pr.matchConfidence === 'high' && <CheckCircle className='h-4 w-4 text-green-600' />}
                    {pr.matchConfidence === 'medium' && <CheckCircle className='h-4 w-4 text-yellow-600' />}
                    {pr.matchConfidence === 'low' && <AlertCircle className='h-4 w-4 text-orange-600' />}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium'>#{pr.number} {pr.title}</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        pr.matchConfidence === 'high' ? 'bg-green-100 text-green-800' :
                        pr.matchConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {pr.matchConfidence} confidence
                      </span>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      By {pr.author} • {pr.matchReason}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))
          ) : (
            <div className='flex items-center gap-3 p-2 rounded-md border bg-muted/50'>
              <AlertCircle className='h-5 w-5 text-muted-foreground' />
              <div className='flex-1'>
                <span className='text-sm text-muted-foreground'>
                  No matching pull requests found. The PR might be in a different repository or use different keywords.
                </span>
              </div>
            </div>
          )}
        </div>
      )
    }
    
    return null;
  }

  // Derive AI-created issues from chat messages (for Kanban intake)
  const aiIssuesForKanban: Array<Pick<KanbanIssue, 'id' | 'title' | 'summary' | 'priority' | 'assignee'>> = useMemo(() => {
    const issues: Array<Pick<KanbanIssue, 'id' | 'title' | 'summary' | 'priority' | 'assignee'>> = [];
    for (const msg of messages) {
      if (msg.isIssue && msg.issueDetails?.title) {
        const priority: any = (msg.issueDetails.priority || 'medium').toString().toLowerCase();
        const normalized: 'high' | 'medium' | 'low' = ['high','medium','low'].includes(priority) ? priority : 'medium';
        const assigneeName = msg.issueDetails.assignees && msg.issueDetails.assignees.length > 0 ? msg.issueDetails.assignees[0] : undefined;
        issues.push({
          id: msg.id,
          title: msg.issueDetails.title,
          summary: msg.issueDetails.description || undefined,
          priority: normalized,
          assignee: assigneeName ? { name: assigneeName } : undefined,
        });
      }
    }
    return issues;
  }, [messages]);

  const sidePanelOpen = isKanbanOpen && isMdUp;
  const sheetOpen = isKanbanOpen && !isMdUp;

  const handleScanCommits = async () => {
    if (!githubToken || !messagesRef) return;
    
    // Send a "Scanning..." message
    const tempId = `temp_scan_${Date.now()}`;
    await addDoc(messagesRef, {
        sender: '0cto Security',
        senderId: 'system_security',
        avatarUrl: '/shield-alert.svg',
        text: 'Scanning recent commits for secrets...',
        isSystemMessage: false,
        timestamp: serverTimestamp(),
        tempId
    });

    try {
        const [repoOwner, repoName] = repoFullName.split('/');
        const leaks = await aiScanRecentCommits({ repoOwner, repoName, accessToken: githubToken });
        
        if (leaks.length === 0) {
             await addDoc(messagesRef, {
                sender: '0cto Security',
                senderId: 'system_security',
                avatarUrl: '/shield-alert.svg',
                text: '✅ No secrets found in recent commits.',
                isSystemMessage: false,
                timestamp: serverTimestamp(),
                tempId: `temp_scan_res_${Date.now()}`
            });
        } else {
            // Report leaks
            for (const commitLeak of leaks) {
                for (const leak of commitLeak.leaks) {
                     const alertMessage: Omit<Message, 'id' | 'timestamp'> = {
                        sender: '0cto Security',
                        senderId: 'system_security',
                        avatarUrl: '/shield-alert.svg',
                        text: 'Security Alert',
                        isSystemMessage: true,
                        systemMessageType: 'security-alert',
                        systemMessageData: [{
                            ...leak,
                            context: `Commit ${commitLeak.commitHash.slice(0,7)} by ${commitLeak.author}`
                        }],
                    };
                    await addDoc(messagesRef, { ...alertMessage, timestamp: serverTimestamp(), tempId: `temp_leak_${Date.now()}_${Math.random()}` });
                }
            }
        }

    } catch (e) {
        console.error(e);
         await addDoc(messagesRef, {
            sender: '0cto Security',
            senderId: 'system_security',
            avatarUrl: '/shield-alert.svg',
            text: '❌ Error scanning commits.',
            isSystemMessage: false,
            timestamp: serverTimestamp(),
            tempId: `temp_scan_err_${Date.now()}`
        });
    }
  };

  const handleSimulateIncident = async () => {
    if (!messagesRef) return;
    
    const incident: Incident = {
        id: `inc_${Date.now()}`,
        serviceName: 'Local Dev Server',
        status: 'down',
        timestamp: Date.now(),
        errorSummary: await analyzeLog('ConnectionRefused: 5432'),
        lastCommit: {
            hash: 'a1b2c3d',
            author: 'dev-user',
            message: 'Update db config',
        }
    };

    const tempId = `temp_inc_${Date.now()}`;
    const alertMessage: Omit<Message, 'id' | 'timestamp'> = {
        sender: '0cto Monitor',
        senderId: 'system_monitor',
        avatarUrl: '/activity.svg',
        text: 'Incident Alert',
        isSystemMessage: true,
        systemMessageType: 'incident-alert',
        systemMessageData: [incident],
    };
    
    await addDoc(messagesRef, { ...alertMessage, timestamp: serverTimestamp(), tempId });
  };

  return (
    <div className="flex h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 backdrop-blur-xl shadow-2xl">
      {/* Chat panel: full width by default, halves when Kanban is open (desktop) */}
      <div className={
        sidePanelOpen
          ? 'flex flex-col w-full md:w-1/2 transition-all duration-300 ease-in-out border-r border-white/10'
          : 'flex flex-col w-full transition-all duration-300 ease-in-out'
      }>
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Live Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white" onClick={handleScanCommits} title="Scan Commits for Secrets">
                <Shield className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white" onClick={handleSimulateIncident} title="Simulate Incident">
                <Activity className="h-4 w-4" />
            </Button>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsKanbanOpen(v => !v)}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
            >
                <ListTodo className="h-4 w-4 mr-2" />
                {isKanbanOpen ? 'Hide Kanban' : 'Show Kanban'}
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 bg-transparent" ref={scrollAreaRef}>
          <div className="p-4 space-y-6">
            {isLoading && messages.length === 0 && (
              <div className="flex flex-col justify-center items-center h-full py-20 space-y-4">
                <div className="relative h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
                    <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin-reverse"></div>
                </div>
                <p className="text-sm text-white/50 animate-pulse">Initializing secure connection...</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ChatMessage message={msg} />
                {msg.isIssue && (
                  <div className="ml-14 mt-3 flex flex-col gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-white/10 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">AI Suggestion</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">
                        I've detected a potential issue that could be tracked. Would you like to create a GitHub issue for this?
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                        {msg.issueUrl ? (
                        <Button asChild size="sm" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-cyan-400 hover:text-cyan-300">
                            <Link href={msg.issueUrl} target="_blank">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Issue
                            </Link>
                        </Button>
                        ) : (
                        <Button 
                            size="sm"
                            onClick={() => handleCreateIssue(msg)}
                            disabled={isCreatingIssue || msg.status === 'completed'}
                            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20"
                        >
                            <Github className="mr-2 h-4 w-4" />
                            {isCreatingIssue ? 'Creating...' : 'Create GitHub Issue'}
                        </Button>
                        )}
                    </div>
                  </div>
                )}
                {msg.isSystemMessage && renderSystemMessage(msg)}
              </div>
            ))}
            {isBotThinking && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <ChatMessage message={{
                    id: 'thinking',
                    sender: '0cto AI',
                    senderId: 'ai_assistant',
                    avatarUrl: '/brain-circuit.svg',
                    text: 'Thinking...',
                    timestamp: null,
                  }} />
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-white/10 bg-black/40 backdrop-blur-xl">
          <MessageInput onSendMessage={handleSendMessage} disabled={isBotThinking} repoFullName={repoFullName} />
        </div>
      </div>
      {/* Kanban board: desktop (side panel), mobile (Sheet) */}
      {sidePanelOpen && (
        <div className="hidden md:flex w-1/2 bg-black/20 backdrop-blur-sm animate-in slide-in-from-right-10 duration-300">
          <ErrorBoundary>
            <KanbanBoard repoFullName={repoFullName} aiIssues={aiIssuesForKanban} className="w-full h-full p-4" />
          </ErrorBoundary>
        </div>
      )}
      {/* Mobile Kanban as a Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => setIsKanbanOpen(open)}>
        <SheetContent side="right" className="w-full sm:max-w-lg md:hidden bg-black/90 border-l border-white/10 backdrop-blur-xl">
          <SheetHeader>
            <SheetTitle className="text-white">Kanban Board</SheetTitle>
          </SheetHeader>
          <div className="mt-4 h-full">
            <ErrorBoundary>
              <KanbanBoard repoFullName={repoFullName} aiIssues={aiIssuesForKanban} />
            </ErrorBoundary>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
