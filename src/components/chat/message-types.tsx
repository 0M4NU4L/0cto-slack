import { AlertTriangle, ShieldAlert, XCircle, CheckCircle2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SecurityAlert({ leak, onDismiss }: { leak: any, onDismiss?: () => void }) {
  return (
    <div className="my-2 p-4 rounded-lg border border-red-500/30 bg-red-500/10 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-red-500/20 text-red-400">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
            Security Alert: {leak.type.toUpperCase()} Leak Detected
            <Badge variant="outline" className="border-red-500/50 text-red-400 text-[10px] h-5">CRITICAL</Badge>
          </h4>
          <p className="text-xs text-white/70 mt-1">
            A potential secret was detected in <strong>{leak.context}</strong>. 
            The value has been masked in the chat history.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="destructive" className="h-7 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30">
              Rotate Key
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-white/50 hover:text-white" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IncidentAlert({ incident }: { incident: any }) {
  return (
    <div className="my-2 rounded-lg border border-orange-500/30 bg-orange-500/5 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-orange-500/10 p-3 border-b border-orange-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-orange-400 animate-pulse" />
          <span className="font-bold text-sm text-orange-400">Incident Detected</span>
        </div>
        <span className="text-xs font-mono text-orange-400/70">{new Date(incident.timestamp).toLocaleTimeString()}</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1">Service Status</div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-white font-medium">{incident.serviceName} is DOWN</span>
          </div>
        </div>
        
        {incident.errorSummary && (
          <div className="bg-black/20 rounded p-2 border border-white/5">
            <div className="text-xs text-orange-300 font-mono mb-1">AI Analysis:</div>
            <p className="text-sm text-white/80 leading-relaxed">{incident.errorSummary}</p>
          </div>
        )}

        {incident.lastCommit && (
          <div className="flex items-center gap-3 bg-white/5 rounded p-2">
            <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 text-xs font-bold">
              {incident.lastCommit.author.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/50">Suspected Cause (Last Commit)</div>
              <div className="text-sm text-white truncate">{incident.lastCommit.message}</div>
            </div>
            <div className="text-xs font-mono text-white/30">{incident.lastCommit.hash}</div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white border-none flex-1">
            Acknowledge
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-white flex-1">
            View Logs
          </Button>
        </div>
      </div>
    </div>
  );
}
