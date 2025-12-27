"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github, User, Loader2 } from "lucide-react";
import Link from "next/link";

function OnboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userData, setUserData] = useState({
    username: "",
    name: "",
    avatar: "",
    token: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // First try to get data from URL params (from OAuth callback)
    const username = searchParams.get("username") || "";
    const name = searchParams.get("name") || "";
    const avatar = searchParams.get("avatar") || "";
    const token = searchParams.get("token") || "";

    if (username || token) {
      setUserData({ username, name, avatar, token });

      // Store token in localStorage and sessionStorage for persistence
      if (token) {
        try {
          localStorage.setItem("github_token", token);
          sessionStorage.setItem("github_token", token);
          localStorage.setItem(
            "github_user",
            JSON.stringify({ username, name, avatar })
          );
          sessionStorage.setItem(
            "github_user",
            JSON.stringify({ username, name, avatar })
          );
          console.log("✅ GitHub token stored successfully");
        } catch (error) {
          console.error("❌ Failed to store token:", error);
        }
      }
      setIsLoading(false);
    } else {
      // Try to get from sessionStorage (set by OAuth callback)
      try {
        const storedToken = sessionStorage.getItem("github_token");
        const storedUser = sessionStorage.getItem("github_user");

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          setUserData({
            username: user.login || user.username || "",
            name: user.name || "",
            avatar: user.avatar_url || user.avatar || "",
            token: storedToken,
          });

          // Also store in localStorage for persistence
          localStorage.setItem("github_token", storedToken);
          localStorage.setItem("github_user", storedUser);
          setIsLoading(false);
        } else {
          // No auth data found, redirect to home
          console.warn("⚠️ No auth data found, redirecting to home");
          router.push("/");
        }
      } catch (error) {
        console.error("❌ Failed to retrieve stored auth:", error);
        router.push("/");
      }
    }
  }, [searchParams, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button
              variant="outline"
              className="mb-8 border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 md:p-12">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome to 0cto!
              </h1>
              <p className="text-gray-300 text-lg">
                You&apos;ve successfully authenticated with GitHub
              </p>
            </div>

            <div className="flex flex-col items-center mb-8">
              {userData.avatar ? (
                <img
                  src={userData.avatar}
                  alt={userData.username}
                  className="w-32 h-32 rounded-full border-4 border-white/20 mb-6"
                />
              ) : (
                <div className="w-32 h-32 rounded-full border-4 border-white/20 mb-6 bg-white/10 flex items-center justify-center">
                  <User className="h-16 w-16 text-white/50" />
                </div>
              )}

              <div className="space-y-4 w-full max-w-md">
                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
                  <Github className="h-5 w-5 text-white" />
                  <div>
                    <p className="text-sm text-gray-400">GitHub Username</p>
                    <p className="text-white font-medium">
                      {userData.username || "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 rounded-lg p-4 border border-white/10">
                  <User className="h-5 w-5 text-white" />
                  <div>
                    <p className="text-sm text-gray-400">Full Name</p>
                    <p className="text-white font-medium">
                      {userData.name || "Not available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-3">
                What&apos;s Next?
              </h2>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    Explore your personalized dashboard with all your projects
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    Connect with your team members and start collaborating
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>
                    Set up your first project and integrate with your GitHub
                    repositories
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>Customize your workspace settings and preferences</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/superdash">
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 w-full sm:w-auto"
                >
                  Go to Dashboard
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                View Documentation
              </Button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Need help getting started?{" "}
              <a href="#" className="text-white hover:underline">
                Check out our guide
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-white mx-auto mb-4" />
            <p className="text-gray-300">Loading...</p>
          </div>
        </div>
      }
    >
      <OnboardContent />
    </Suspense>
  );
}
