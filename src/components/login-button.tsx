'use client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GithubIcon } from '@/components/github-icon';
import { Chrome } from 'lucide-react';

export function LoginButton() {
  const { signInWithGitHub, signInWithGoogle } = useAuth();
  return (
    <div className='flex gap-4'>
      <Button 
        onClick={signInWithGitHub} 
        size="lg" 
        className="relative overflow-hidden font-bold bg-white text-black hover:bg-gray-200 border-0 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all duration-300 group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        <GithubIcon className="mr-2 h-5 w-5" />
        Login with GitHub
      </Button>
      <Button 
        onClick={signInWithGoogle} 
        size="lg" 
        variant="outline"
        className="font-bold border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-white/40 text-white shadow-lg transition-all duration-300"
      >
        <Chrome className="mr-2 h-5 w-5 text-cyan-400" />
        Login with Google
      </Button>
    </div>
  );
}
