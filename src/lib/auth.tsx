'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, signOut, User, GithubAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { githubProvider, googleProvider } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  githubToken: string | null;
  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading, auth } = useFirebase();
  const [githubToken, setGithubToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('github_token');
    }
    return null;
  });
  const router = useRouter();

  // Update githubToken when it changes in sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('github_token');
      if (token && token !== githubToken) {
        setGithubToken(token);
      }
    }
  }, [githubToken]);

  useEffect(() => {
    if (!isUserLoading && !user && typeof window !== 'undefined') {
      // Don't clear token if we have a GitHub token (OAuth flow in progress)
      const hasGithubToken = sessionStorage.getItem('github_token');
      if (!hasGithubToken) {
        sessionStorage.removeItem('github_token');
        setGithubToken(null);
      }
    }
  }, [user, isUserLoading]);

  const signInWithGitHub = async () => {
    // Use direct GitHub OAuth instead of Firebase Auth
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error("GitHub Client ID not found");
      return;
    }

    // Use the configured app URL to ensure it matches GitHub settings exactly
    // This avoids issues where window.location.origin might be 127.0.0.1 vs localhost
    const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    // Remove trailing slash if present to avoid double slashes in redirectUri
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/github/callback`;
    const scope = 'repo user:email read:org';
    
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', clientId);
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
    githubAuthUrl.searchParams.set('scope', scope);
    githubAuthUrl.searchParams.set('state', Math.random().toString(36).substring(7));
    
    // Redirect to GitHub OAuth
    window.location.href = githubAuthUrl.toString();
  };

  const signInWithGoogle = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/dashboard');
    } catch (error) {
      console.error("Authentication Error", error);
    }
  };

  const signOutAndRedirect = async () => {
    if (!auth) return;
    await signOut(auth);
    setGithubToken(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('github_token');
    }
    router.push('/');
  };

  const value = { user, loading: isUserLoading, githubToken, signInWithGitHub, signInWithGoogle, signOut: signOutAndRedirect };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
