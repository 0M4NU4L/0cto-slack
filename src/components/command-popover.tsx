'use client';

import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bot, GitPullRequest, Github, UserPlus, ListTodo, GitPullRequestArrow } from 'lucide-react';

const commands = [
  { name: '/issue', description: 'Create a new GitHub issue. Use @username to assign.', icon: <Github className="w-4 h-4" /> },
  { name: '/issuelist', description: 'List open issues.', icon: <ListTodo className="w-4 h-4" /> },
  { name: '/prlist', description: 'List open pull requests.', icon: <GitPullRequestArrow className="w-4 h-4" /> },
  { name: '/solved', description: 'Mark an issue as solved and verify PRs.', icon: <GitPullRequest className="w-4 h-4" /> },
  { name: '/collaborator', description: 'Invite a collaborator.', icon: <UserPlus className="w-4 h-4" /> },
  { name: '/ask', description: 'Ask the AI a question.', icon: <Bot className="w-4 h-4" /> },
];

type CommandPopoverProps = {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommandSelect: (command: string) => void;
};

export function CommandPopover({ children, open, onOpenChange, onCommandSelect }: CommandPopoverProps) {
  console.log('CommandPopover render - open:', open); // Debug log

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-1 bg-black/90 border border-white/10 backdrop-blur-xl text-white shadow-2xl shadow-purple-500/10" align="start" side="top">
        <div className="p-2 text-xs font-bold text-white/50 uppercase tracking-wider">Available Commands</div>
        <div className="flex flex-col gap-1">
          {commands.map((command, index) => (
            <button
              key={command.name}
              onClick={() => {
                console.log('Command selected:', command.name); // Debug log
                onCommandSelect(command.name);
              }}
              className="flex items-center gap-3 p-2 rounded-lg text-left hover:bg-white/10 transition-all duration-200 group"
            >
              <div className="p-2 bg-white/5 rounded-md text-cyan-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/10 transition-colors">{command.icon}</div>
              <div>
                <div className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">{command.name}</div>
                <div className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{command.description}</div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
