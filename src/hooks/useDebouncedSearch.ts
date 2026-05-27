// src/hooks/useDebouncedSearch.ts
import { useState, useEffect } from 'react';
import { memoryService } from '../services/memory';
import { MemorySearchResult } from '../types/memory';

export const useDebouncedSearch = (query: string, userId: string) => {
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    const delayDebounce = setTimeout(async () => {
      try {
        const matches = await memoryService.searchMemories(query);
        const mappedResults: MemorySearchResult[] = matches.map((m) => ({
          memory: m,
          score: 0.9,
          highlights: [],
        }));
        setResults(mappedResults);
      } catch (e: any) {
        console.error('Search failed:', e);
        setError(e.message || 'Search execution failed');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, userId]);

  return {
    results,
    isSearching,
    error,
  };
};
export default useDebouncedSearch;
