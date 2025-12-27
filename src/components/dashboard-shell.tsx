'use client';

import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { Logo } from '@/components/logo';
import { RepoList } from '@/components/repo-list';
import { Button } from './ui/button';
import { Bell, UserPlus, ArrowLeft, MessageSquare, Settings } from 'lucide-react';
import { Separator } from './ui/separator';
import { InviteCollaboratorDialog } from './invite-collaborator';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isInviteOpen, setInviteOpen] = useState(false);
  const pathname = usePathname();
  
  const pathSegments = pathname.split('/').filter(Boolean);
  // pathSegments: ['dashboard', 'owner', 'repo', 'channels', 'general']
  // or ['dashboard', 'owner', 'repo', 'info']
  const isRepoView = pathSegments.length >= 3 && pathSegments[0] === 'dashboard';

  const repoOwner = isRepoView ? pathSegments[1] : null;
  const repoName = isRepoView ? pathSegments[2] : null;
  const repoFullName = repoOwner && repoName ? `${repoOwner}/${repoName}` : null;
  
  const pageType = pathSegments.length > 3 ? pathSegments[3] : null; // 'channels' or 'info'
  const pageId = pathSegments.length > 4 ? pathSegments[4] : null; // 'general' or null

  let headerTitle = "Select a Repository";
  if (repoName) {
      if (pageType === 'info') {
          headerTitle = `${repoName} - Info`;
      } else if (pageType === 'channels' && pageId) {
          headerTitle = `# ${pageId}`;
      } else {
          headerTitle = repoName;
      }
  }


  return (
    <SidebarProvider style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="flex h-full w-full overflow-hidden bg-transparent">
        <Sidebar collapsible={isRepoView ? "offcanvas" : "icon"} className="border-r-0 bg-black/20 backdrop-blur-xl border-r border-white/5">
          <SidebarHeader className="p-4 pb-2">
            <Logo />
          </SidebarHeader>
          <SidebarContent className="p-2 gap-4">
            <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-bold text-cyan-400/80 uppercase tracking-wider px-2 mb-2">Repositories</SidebarGroupLabel>
                <div className="max-h-[60vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <RepoList />
                </div>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-bold text-purple-400/80 uppercase tracking-wider px-2 mb-2">Integrations</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="hover:bg-white/5 hover:text-cyan-300 transition-all duration-200 rounded-lg">
                      <Link href="/dashboard/slack" className="flex items-center gap-3 px-2 py-2">
                        <div className="p-1.5 rounded-md bg-purple-500/20 text-purple-300">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <span className="font-medium">Slack Integration</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 bg-gradient-to-t from-black/40 to-transparent">
            {/* Future content for sidebar footer */}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="bg-transparent h-full overflow-hidden">
          <header className="sticky top-4 z-10 mx-4 mb-4 flex h-16 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/40 px-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-4">
              {isRepoView ? (
                  <Link href="/dashboard">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 hover:text-cyan-300 transition-colors md:hidden">
                      <ArrowLeft className="h-5 w-5" />
                      <span className="sr-only">Back to repositories</span>
                    </Button>
                  </Link>
              ) : (
                <SidebarTrigger className="md:hidden text-white/70 hover:text-white" />
              )}
              <div className="flex flex-col">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  {isRepoView && <span className="text-muted-foreground font-normal">Repository /</span>}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">{headerTitle}</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-cyan-400 font-medium bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </div>
                  <span className="hidden sm:inline text-xs uppercase tracking-wider">AI Active</span>
              </div>
              <Separator orientation="vertical" className="h-6 bg-white/10" />
              {repoFullName && (
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-white/10 text-white/70 hover:text-white" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-5 w-5" />
                  <span className="sr-only">Invite Collaborators</span>
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-white/10 text-white/70 hover:text-white">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
              </Button>
              <UserNav />
            </div>
          </header>
          <main className="flex-1 overflow-hidden p-4 pt-0 flex flex-col">
            <div className="mx-auto max-w-7xl w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
      {repoFullName && <InviteCollaboratorDialog isOpen={isInviteOpen} onOpenChange={setInviteOpen} repoFullName={repoFullName} />}
    </SidebarProvider>
  );
}
