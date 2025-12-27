'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

type CreateChannelDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  repoFullName: string;
};

export function CreateChannelDialog({
  isOpen,
  onOpenChange,
  repoFullName,
}: CreateChannelDialogProps) {
  const [channelName, setChannelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleCreateChannel = async () => {
    if (!channelName.trim() || !firestore) return;
    setIsLoading(true);

    const formattedChannelName = channelName.trim().toLowerCase().replace(/\s+/g, '-');
    const encodedRepoFullName = encodeURIComponent(repoFullName);
    const channelRef = doc(firestore, 'repos', encodedRepoFullName, 'channels', formattedChannelName);

    try {
      await setDoc(channelRef, {
        name: formattedChannelName,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Channel Created!',
        description: `#${formattedChannelName} has been created.`,
      });
      onOpenChange(false);
      setChannelName('');
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create channel. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-black/90 border border-white/10 backdrop-blur-xl text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Create a new channel</DialogTitle>
          <DialogDescription className="text-white/60">
            Channels are for focused discussions within the <span className="text-cyan-400 font-mono">{repoFullName}</span> repository.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            id="channel-name"
            placeholder="e.g., feature-x or bug-squashing"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/20"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-white/10 text-white hover:bg-white/10 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleCreateChannel}
            disabled={isLoading || !channelName.trim()}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    