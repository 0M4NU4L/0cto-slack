interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class RepoCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly TTL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_ENTRIES = 50;

  constructor() {
    this.cache = new Map();
    this.loadFromLocalStorage();
  }

  private getCacheKey(owner: string, repo: string, sha?: string): string {
    return sha ? `${owner}/${repo}:${sha}` : `${owner}/${repo}`;
  }

  private loadFromLocalStorage() {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("canvas-cache");
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          const entry = value as CacheEntry<any>;
          if (Date.now() < entry.expiresAt) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch (error) {
      console.warn("Failed to load cache from localStorage:", error);
    }
  }

  private saveToLocalStorage() {
    if (typeof window === "undefined") return;

    try {
      const cacheObject: Record<string, CacheEntry<any>> = {};
      this.cache.forEach((value, key) => {
        cacheObject[key] = value;
      });
      localStorage.setItem("canvas-cache", JSON.stringify(cacheObject));
    } catch (error) {
      console.warn("Failed to save cache to localStorage:", error);
    }
  }

  get<T>(owner: string, repo: string, sha?: string): T | null {
    const key = this.getCacheKey(owner, repo, sha);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return null;
    }

    return entry.data as T;
  }

  set<T>(owner: string, repo: string, data: T, sha?: string) {
    // Enforce max entries (LRU-style)
    if (this.cache.size >= this.MAX_ENTRIES) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const key = this.getCacheKey(owner, repo, sha);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.TTL,
    };

    this.cache.set(key, entry);
    this.saveToLocalStorage();
  }

  clear() {
    this.cache.clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem("canvas-cache");
    }
  }

  getCacheStats() {
    return {
      entries: this.cache.size,
      maxEntries: this.MAX_ENTRIES,
      ttlMinutes: this.TTL / (60 * 1000),
    };
  }
}

export default new RepoCache();
