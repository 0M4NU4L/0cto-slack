import { Cpu, Sparkles } from 'lucide-react';

export function Logo({ className }: { className?: string }) {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.5)] border border-white/20">
                <Cpu className="h-6 w-6 text-white" />
                <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-cyan-300 animate-pulse" />
            </div>
            <div className="group-data-[collapsible=icon]:hidden flex flex-col">
              <span className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-cyan-200 font-headline">
                0cto
              </span>
              <span className="text-[0.6rem] uppercase tracking-widest text-muted-foreground font-mono">AI Dev Agent</span>
            </div>
        </div>
    );
}

export function LogoIcon({ className }: { className?: string }) {
    return (
        <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shadow-[0_0_30px_rgba(168,85,247,0.6)] border border-white/20 ${className}`}>
            <Cpu className="h-8 w-8 text-white animate-pulse" />
            <div className="absolute inset-0 rounded-2xl bg-white/10 blur-xl -z-10"></div>
        </div>

    );
}
