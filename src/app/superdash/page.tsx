"use client";

import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import html2canvas from "html2canvas";
import { useRef, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

function DashboardContent() {
  const contentRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [userData, setUserData] = useState({
    username: "",
    name: "",
    avatar: "",
  });
  const [githubStats, setGithubStats] = useState({
    totalRepos: 0,
    totalLinesOfCode: 0,
    topLanguages: [] as { name: string; percentage: number; color: string }[],
    topCategory: "Web Apps",
    peakDay: "Tuesday",
    peakHour: "10 PM",
    isNightOwl: true,
    activityGrid: [] as number[],
    isLoading: true,
  });

  // Language colors mapping
  const languageColors: Record<string, string> = {
    JavaScript: "#F7DF1E",
    TypeScript: "#3178C6",
    Python: "#3776AB",
    Java: "#ED8B00",
    "C++": "#00599C",
    C: "#A8B9CC",
    "C#": "#239120",
    Go: "#00ADD8",
    Rust: "#DEA584",
    Ruby: "#CC342D",
    PHP: "#777BB4",
    Swift: "#FA7343",
    Kotlin: "#7F52FF",
    Dart: "#0175C2",
    HTML: "#E34F26",
    CSS: "#1572B6",
    SCSS: "#CC6699",
    Vue: "#4FC08D",
    Shell: "#89E051",
    Dockerfile: "#2496ED",
  };

  useEffect(() => {
    const username = searchParams.get("username") || "";
    const name = searchParams.get("name") || "";
    const avatar = searchParams.get("avatar") || "";

    // Try to get from URL params first, then localStorage
    if (username) {
      setUserData({ username, name, avatar });
      fetchGithubStats(username);
    } else {
      const storedUser = localStorage.getItem("github_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const user = {
          username: parsed.username || parsed.login || "",
          name: parsed.name || "",
          avatar: parsed.avatar || parsed.avatar_url || "",
        };
        setUserData(user);
        if (user.username) {
          fetchGithubStats(user.username);
        }
      }
    }
  }, [searchParams]);

  const fetchGithubStats = async (username: string) => {
    try {
      // Get GitHub token from storage
      const token =
        localStorage.getItem("github_token") ||
        sessionStorage.getItem("github_token");

      const headers: HeadersInit = {
        Accept: "application/vnd.github.v3+json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch user's repositories
      const reposResponse = await fetch(
        `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
        { headers }
      );
      const repos = await reposResponse.json();

      if (Array.isArray(repos)) {
        const totalRepos = repos.length;

        // Estimate lines of code from repo sizes (size is in KB)
        const totalSizeKB = repos.reduce(
          (acc: number, repo: { size?: number }) => acc + (repo.size || 0),
          0
        );
        const estimatedLines = Math.round(totalSizeKB * 25);

        // Calculate language statistics
        const languageCount: Record<string, number> = {};
        repos.forEach((repo: { language?: string }) => {
          if (repo.language) {
            languageCount[repo.language] =
              (languageCount[repo.language] || 0) + 1;
          }
        });

        // Sort languages by count and get top 3
        const sortedLanguages = Object.entries(languageCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3);

        const totalLanguageCount = Object.values(languageCount).reduce(
          (a, b) => a + b,
          0
        );
        const topLanguages = sortedLanguages.map(([name, count]) => ({
          name,
          percentage: Math.round((count / totalLanguageCount) * 100),
          color: languageColors[name] || "#8B5CF6",
        }));

        // Determine top category based on languages and repo topics
        let topCategory = "Web Apps";
        const webLanguages = [
          "JavaScript",
          "TypeScript",
          "HTML",
          "CSS",
          "Vue",
          "SCSS",
        ];
        const mobileLanguages = ["Swift", "Kotlin", "Dart", "Java"];
        const dataLanguages = ["Python", "R", "Julia"];
        const systemLanguages = ["C", "C++", "Rust", "Go"];

        const webCount = sortedLanguages.filter(([lang]) =>
          webLanguages.includes(lang)
        ).length;
        const mobileCount = sortedLanguages.filter(([lang]) =>
          mobileLanguages.includes(lang)
        ).length;
        const dataCount = sortedLanguages.filter(([lang]) =>
          dataLanguages.includes(lang)
        ).length;
        const systemCount = sortedLanguages.filter(([lang]) =>
          systemLanguages.includes(lang)
        ).length;

        if (
          mobileCount > webCount &&
          mobileCount >= dataCount &&
          mobileCount >= systemCount
        ) {
          topCategory = "Mobile Apps";
        } else if (
          dataCount > webCount &&
          dataCount >= mobileCount &&
          dataCount >= systemCount
        ) {
          topCategory = "Data Science";
        } else if (
          systemCount > webCount &&
          systemCount >= mobileCount &&
          systemCount >= dataCount
        ) {
          topCategory = "System Tools";
        }

        // Fetch recent activity to analyze patterns
        let peakDay = "Tuesday";
        let peakHour = "10 PM";
        let isNightOwl = true;
        const activityGrid: number[] = Array(35).fill(1);

        try {
          // Get events to analyze activity times (includes Push, PR, Issues, etc.)
          const eventsResponse = await fetch(
            `https://api.github.com/users/${username}/events?per_page=100`,
            { headers }
          );
          const events = await eventsResponse.json();

          if (Array.isArray(events) && events.length > 0) {
            const dayCount: Record<string, number> = {};
            const hourCount: Record<number, number> = {};
            const nightHourCount = { night: 0, day: 0 }; // 8PM-4AM vs 5AM-7PM
            const days = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            const dateActivityMap: Record<string, number> = {}; // For activity grid

            // Activity event types to consider
            const activityTypes = [
              "PushEvent",
              "PullRequestEvent",
              "IssuesEvent",
              "CreateEvent",
              "PullRequestReviewEvent",
              "IssueCommentEvent",
            ];

            events.forEach(
              (event: {
                type?: string;
                created_at?: string;
                payload?: { commits?: unknown[] };
              }) => {
                if (
                  activityTypes.includes(event.type || "") &&
                  event.created_at
                ) {
                  const date = new Date(event.created_at);
                  const day = days[date.getDay()];
                  const hour = date.getHours();
                  const dateKey = date.toISOString().split("T")[0];

                  // Weight PushEvents by commit count
                  let weight = 1;
                  if (event.type === "PushEvent" && event.payload?.commits) {
                    weight = Math.min(event.payload.commits.length, 5); // Cap at 5 to avoid skewing
                  }

                  dayCount[day] = (dayCount[day] || 0) + weight;
                  hourCount[hour] = (hourCount[hour] || 0) + weight;
                  dateActivityMap[dateKey] =
                    (dateActivityMap[dateKey] || 0) + weight;

                  // Track night vs day activity (night: 8PM-4AM)
                  if (hour >= 20 || hour <= 4) {
                    nightHourCount.night += weight;
                  } else {
                    nightHourCount.day += weight;
                  }
                }
              }
            );

            // Find peak day
            const peakDayEntry = Object.entries(dayCount).sort(
              ([, a], [, b]) => b - a
            )[0];
            if (peakDayEntry) {
              peakDay = peakDayEntry[0];
            }

            // Find peak hour
            const peakHourEntry = Object.entries(hourCount).sort(
              ([, a], [, b]) => b - a
            )[0];
            if (peakHourEntry) {
              const hour = parseInt(peakHourEntry[0]);
              const period = hour >= 12 ? "PM" : "AM";
              const displayHour = hour % 12 || 12;
              peakHour = `${displayHour} ${period}`;
            }

            // Determine night owl based on overall pattern, not just peak hour
            isNightOwl = nightHourCount.night > nightHourCount.day * 0.5; // Night owl if >1/3 of activity is at night

            // Generate activity grid for last 5 weeks (35 days)
            const today = new Date();
            const activityValues: number[] = [];
            for (let i = 34; i >= 0; i--) {
              const date = new Date(today);
              date.setDate(date.getDate() - i);
              const dateKey = date.toISOString().split("T")[0];
              activityValues.push(dateActivityMap[dateKey] || 0);
            }

            // Normalize activity grid to levels 1-3
            const maxActivity = Math.max(...activityValues, 1);
            for (let i = 0; i < 35; i++) {
              const normalized = activityValues[i] / maxActivity;
              activityGrid[i] =
                activityValues[i] === 0 ? 1 : normalized > 0.5 ? 3 : 2;
            }
          }
        } catch (eventError) {
          console.error("Error fetching events:", eventError);
        }

        setGithubStats({
          totalRepos,
          totalLinesOfCode: estimatedLines,
          topLanguages,
          topCategory,
          peakDay,
          peakHour,
          isNightOwl,
          activityGrid,
          isLoading: false,
        });
      } else {
        setGithubStats((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Error fetching GitHub stats:", error);
      setGithubStats((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const captureScreenshot = async () => {
    if (!contentRef.current) return null;

    try {
      console.log("[v0] Starting screenshot capture...");

      const element = contentRef.current;
      const clone = element.cloneNode(true) as HTMLElement;

      // Add clone to document temporarily (hidden)
      clone.style.position = "absolute";
      clone.style.left = "-9999px";
      document.body.appendChild(clone);

      // Get all elements with computed styles and convert oklch to rgb
      const allElements = clone.querySelectorAll("*");
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const computed = window.getComputedStyle(el);

        // Convert background color
        if (
          computed.backgroundColor &&
          computed.backgroundColor.includes("oklch")
        ) {
          htmlEl.style.backgroundColor = convertOklchToRgb(
            computed.backgroundColor
          );
        }

        // Convert text color
        if (computed.color && computed.color.includes("oklch")) {
          htmlEl.style.color = convertOklchToRgb(computed.color);
        }

        // Convert border color
        if (computed.borderColor && computed.borderColor.includes("oklch")) {
          htmlEl.style.borderColor = convertOklchToRgb(computed.borderColor);
        }
      });

      const canvas = await html2canvas(clone, {
        backgroundColor: "#050505",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      });

      // Remove clone
      document.body.removeChild(clone);
      console.log("[v0] Screenshot captured successfully");

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      });
    } catch (error) {
      console.error("[v0] Error capturing screenshot:", error);
      return null;
    }
  };

  const convertOklchToRgb = (oklchString: string): string => {
    const colorMap: Record<string, string> = {
      "oklch(1 0 0)": "rgb(255, 255, 255)",
      "oklch(0.145 0 0)": "rgb(37, 37, 37)",
      "oklch(0.97 0 0)": "rgb(247, 247, 247)",
      "oklch(0.205 0 0)": "rgb(52, 52, 52)",
      "oklch(0.985 0 0)": "rgb(251, 251, 251)",
      "oklch(0.922 0 0)": "rgb(235, 235, 235)",
      "oklch(0.269 0 0)": "rgb(69, 69, 69)",
      "oklch(0.708 0 0)": "rgb(180, 180, 180)",
      "oklch(0.556 0 0)": "rgb(142, 142, 142)",
      "oklch(0.439 0 0)": "rgb(112, 112, 112)",
    };

    for (const [oklch, rgb] of Object.entries(colorMap)) {
      if (oklchString.includes(oklch)) {
        return rgb;
      }
    }

    return "rgb(0, 0, 0)";
  };

  const handleDownloadImage = async () => {
    console.log("[v0] Download Image clicked");
    const blob = await captureScreenshot();
    if (!blob) {
      alert("Failed to capture image. Please try again.");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${userData.username || "octo"}-2025-wrapped.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    console.log("[v0] Image downloaded successfully");
  };

  const handleShareOnX = async () => {
    console.log("[v0] Share on X clicked");
    const blob = await captureScreenshot();
    if (!blob) {
      alert("Failed to capture image. Please try again.");
      return;
    }

    if (navigator.share && navigator.canShare) {
      try {
        const file = new File(
          [blob],
          `${userData.username || "octo"}-2025-wrapped.png`,
          {
            type: "image/png",
          }
        );

        const shareData = {
          title: "My 2025 Wrapped",
          text: "Check out my 2025 Wrapped from Octo!",
          files: [file],
        };

        if (navigator.canShare(shareData)) {
          console.log("[v0] Using Web Share API with image");
          await navigator.share(shareData);
          return;
        }
      } catch (error) {
        console.error("[v0] Web Share API error:", error);
      }
    }

    console.log("[v0] Using fallback: download + Twitter intent");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${userData.username || "octo"}-2025-wrapped.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    setTimeout(() => {
      const text = encodeURIComponent("Check out my 2025 Wrapped from Octo!");
      const shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
      window.open(shareUrl, "_blank", "width=550,height=420");
    }, 500);
  };

  return (
    <div
      className={`${plusJakarta.variable} ${spaceGrotesk.variable} font-[family-name:var(--font-plus-jakarta)]`}
    >
      <div className="fixed top-4 left-4 z-50">
        <Link href="/onboard">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-black/50 backdrop-blur"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-full transition-all shadow-lg hover:scale-110 bg-white text-black hover:bg-[#00d4ff]"
          aria-label="Scroll to top"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <path d="M18 15l-6-6-6 6"></path>
          </svg>
        </button>
      )}

      <div className="min-h-screen bg-black text-white flex justify-center px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-10 selection:bg-[#ccf381] selection:text-black">
        <style jsx global>{`
          body {
            background-image: radial-gradient(
                circle at 10% 20%,
                rgba(121, 40, 202, 0.08) 0%,
                transparent 40%
              ),
              radial-gradient(
                circle at 90% 80%,
                rgba(204, 243, 129, 0.05) 0%,
                transparent 40%
              );
          }
        `}</style>

        <div
          ref={contentRef}
          className="w-full max-w-[1200px] flex flex-col gap-6"
        >
          <header className="flex justify-between items-center py-4 sm:py-5 mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ccf381"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M9 3v18"></path>
                <path d="M15 9h-6"></path>
              </svg>
              <div className="font-[family-name:var(--font-space-grotesk)] font-bold text-xl sm:text-2xl tracking-tight">
                Octo
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <button className="bg-transparent text-white border border-white/20 px-4 py-2 rounded-full font-semibold text-sm transition-transform hover:scale-105 whitespace-nowrap">
                  Enter Chat
                </button>
              </Link>
              <Link href="/canvas">
                <button className="bg-white text-black px-4 py-2 rounded-full font-semibold text-sm transition-all hover:scale-105 hover:bg-[#ccf381] flex items-center gap-2 whitespace-nowrap">
                  Visualize Code
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </button>
              </Link>
              <div className="flex items-center gap-2 sm:gap-3 bg-[#121212] border border-[#262626] py-1.5 px-3 sm:px-4 rounded-full text-sm font-medium">
                {userData.avatar ? (
                  <img
                    src={userData.avatar}
                    alt="User"
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border-2 border-[#050505]"
                  />
                ) : (
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[#7928ca] to-[#ff0080] flex items-center justify-center text-xs font-bold">
                    {(userData.name || userData.username || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <span className="text-white">
                  {userData.name || userData.username || "User"}
                </span>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4 sm:gap-6">
            <div className="md:col-span-2 bg-black rounded-[32px] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-end min-h-[380px] border border-[#262626] transition-all hover:border-[#404040] hover:-translate-y-0.5">
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center p-4 sm:p-8">
                <div className="relative animate-scale-in stagger-4">
                  <div className="relative rounded-xl border border-border bg-card/60 glass p-5 sm:p-8 hover-lift">
                    {/* Terminal header dots */}
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-destructive/60 transition-colors hover:bg-destructive" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500/60 transition-colors hover:bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-primary/60 transition-colors hover:bg-primary" />
                    </div>
                    <div className="absolute top-3.5 left-1/2 -translate-x-1/2 bg-background/50 rounded-md px-3 py-1 font-mono text-xs text-muted-foreground">
                      terminal://{userData.username || "octo"}
                    </div>

                    <pre className="mt-6 overflow-hidden font-mono text-[10px] leading-relaxed text-white sm:text-xs md:text-sm">
                      <span className="sm:hidden">{`┌───────────────────────┐
│  ██████╗ ██████╗████████╗██████╗
│ ██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗
│ ██║   ██║██║        ██║   ██║   ██║
│ ██║   ██║██║        ██║   ██║   ██║
│ ╚██████╔╝╚██████╗   ██║   ╚██████╔╝
│  ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝
│                       
│  > projects: 8        
│  > status: building   
└───────────────────────┘`}</span>
                      <span className="hidden sm:block">{`┌─────────────────────────────────────┐
│                                     │
│  ██████╗  ██████╗████████╗ ██████╗  │
│ ██╔═══██╗██╔════╝╚══██╔══╝██╔═══██╗ │
│ ██║   ██║██║        ██║   ██║   ██║ │
│ ██║   ██║██║        ██║   ██║   ██║ │
│ ╚██████╔╝╚██████╗   ██║   ╚██████╔╝ │
│  ╚═════╝  ╚═════╝   ╚═╝    ╚═════╝  │
│           ${(userData.name || userData.username || "Developer").padEnd(22)}│
│                                     │
│   > projects loaded: 8              │
│   > status: building                │
│   > last commit: today              │
│                                     │
└─────────────────────────────────────┘`}</span>
                    </pre>
                  </div>

                  <div className="absolute -right-2 sm:-right-6 -top-2 sm:-top-6 rounded-lg border border-primary/40 bg-primary/15 glass px-3 sm:px-4 py-1.5 font-mono text-[11px] sm:text-xs text-primary animate-float">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      v1.0.0
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#121212] rounded-[32px] p-6 sm:p-8 flex flex-col justify-between min-h-[380px] border border-[#262626] transition-all hover:border-[#404040] hover:-translate-y-0.5">
              <div>
                <div className="text-xs sm:text-sm text-[#a1a1aa] uppercase tracking-wider font-semibold mb-2">
                  Total Projects
                </div>
                <div className="font-[family-name:var(--font-space-grotesk)] text-5xl sm:text-6xl font-bold leading-none mb-0 bg-gradient-to-br from-[#7928ca] to-[#ff0080] bg-clip-text text-transparent">
                  {githubStats.isLoading ? "..." : githubStats.totalRepos}
                </div>
              </div>

              <div className="mt-8">
                <div className="text-xs sm:text-sm text-[#a1a1aa] uppercase tracking-wider font-semibold mb-2">
                  Lines of Code
                </div>
                <div className="font-[family-name:var(--font-space-grotesk)] text-4xl sm:text-5xl font-bold leading-none text-white mb-3">
                  {githubStats.isLoading
                    ? "..."
                    : formatNumber(githubStats.totalLinesOfCode)}
                </div>
              </div>
            </div>

            <div className="bg-white text-black rounded-[32px] p-6 sm:p-8 flex flex-col justify-between min-h-[320px] sm:min-h-[380px] border border-[#262626] transition-all hover:border-[#404040] hover:-translate-y-0.5">
              <div className="flex justify-between items-start mb-6">
                <span className="bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold">
                  Dev Persona
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="19" cy="12" r="2"></circle>
                  <circle cx="5" cy="12" r="2"></circle>
                </svg>
              </div>

              <div className="text-center flex-1 flex flex-col justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10 sm:w-12 sm:h-12"
                  >
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                </div>
                <div className="text-sm font-semibold uppercase mb-2 opacity-60 tracking-wide">
                  You are a
                </div>
                <div className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-[36px] font-bold leading-tight tracking-tight mb-6">
                  Full Stack
                  <br />
                  Developer
                </div>
              </div>

              <div className="text-sm leading-relaxed font-medium border-t border-black/10 pt-5">
                Building with passion. You love clean code and seamless
                collaboration.
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-[#1a1a1a] to-[#121212] rounded-[32px] p-6 sm:p-8 border border-[#262626] transition-all hover:border-[#404040] hover:-translate-y-0.5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-[family-name:var(--font-space-grotesk)] text-xl sm:text-2xl font-bold">
                  Top Tech Stack
                </h3>
                <span className="text-sm text-[#a1a1aa]">Most used</span>
              </div>

              <div className="space-y-5">
                {githubStats.isLoading ? (
                  <div className="text-[#a1a1aa]">Loading...</div>
                ) : githubStats.topLanguages.length > 0 ? (
                  githubStats.topLanguages.map((lang, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${lang.color}20` }}
                      >
                        <span
                          className="font-bold font-mono text-sm"
                          style={{ color: lang.color }}
                        >
                          {lang.name.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-white">
                            {lang.name}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {lang.percentage}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${lang.percentage}%`,
                              backgroundColor: lang.color,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[#a1a1aa]">
                    No language data available
                  </div>
                )}
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-[#FF6B35] to-[#F7931E] rounded-[32px] p-6 sm:p-8 overflow-hidden flex flex-col justify-between min-h-[320px] sm:min-h-[380px] border border-[#262626] transition-all hover:-translate-y-0.5">
              <img
                src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=600&auto=format&fit=crop"
                alt="Texture"
                className="absolute top-0 left-0 w-full h-full object-cover mix-blend-overlay opacity-50"
              />
              <div className="relative z-10">
                <div className="font-bold text-sm uppercase mb-1 text-black">
                  Top Category
                </div>
                <div className="font-[family-name:var(--font-space-grotesk)] text-3xl sm:text-4xl font-bold text-black">
                  {githubStats.isLoading ? "..." : githubStats.topCategory}
                </div>
              </div>

              <div className="relative z-10">
                <div className="font-semibold text-sm mb-3 text-black">
                  Favorite Palette
                </div>
                <div className="flex gap-2">
                  <div className="w-12 h-12 rounded-full bg-black border-2 border-black"></div>
                  <div className="w-12 h-12 rounded-full bg-[#7928ca] border-2 border-black"></div>
                  <div className="w-12 h-12 rounded-full bg-[#ccf381] border-2 border-black"></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[32px] p-6 sm:p-8 border border-[#262626] transition-all hover:border-[#404040] hover:-translate-y-0.5">
              <div className="text-xs sm:text-sm text-[#a1a1aa] uppercase tracking-wider font-semibold mb-2">
                Peak Productivity
              </div>
              <div className="text-2xl sm:text-[28px] font-bold text-white mb-1">
                {githubStats.isLoading
                  ? "..."
                  : `${githubStats.peakDay}, ${githubStats.peakHour}`}
              </div>
              <div className="text-sm text-[#a1a1aa] mb-6">
                {githubStats.isLoading
                  ? "..."
                  : githubStats.isNightOwl
                  ? "You are a night owl."
                  : "You are an early bird."}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {(githubStats.activityGrid.length > 0
                  ? githubStats.activityGrid
                  : [
                      1, 2, 1, 3, 2, 1, 1, 2, 3, 3, 3, 3, 2, 1, 1, 2, 3, 2, 1,
                      1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 2, 3, 2, 1, 2,
                    ]
                ).map((level, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded ${
                      level === 1
                        ? "bg-[#262626]"
                        : level === 2
                        ? "bg-[#7928ca]/40"
                        : "bg-[#7928ca]"
                    }`}
                  ></div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-[#121212] to-[#1a1a1a] rounded-[32px] p-6 sm:p-8 lg:p-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 min-h-[200px] sm:min-h-[240px] border border-[#262626] transition-all hover:border-[#404040] hover:-translate-y-0.5">
              <div>
                <h3 className="font-[family-name:var(--font-space-grotesk)] text-2xl sm:text-3xl font-bold mb-2">
                  Ready to collaborate?
                </h3>
                <p className="text-[#a1a1aa] text-sm sm:text-base">
                  Start chatting with your team and build amazing projects with
                  Octo
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <Link href="/dashboard">
                  <button className="bg-transparent text-white border border-white/20 px-6 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-transform hover:scale-105 whitespace-nowrap">
                    Enter Chat
                  </button>
                </Link>
                <Link href="/canvas">
                  <button className="bg-white text-black px-6 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base transition-all hover:scale-105 hover:bg-[#ccf381] flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto">
                    Visualize Code
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white text-xl">Loading dashboard...</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
