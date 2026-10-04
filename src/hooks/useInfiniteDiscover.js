import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// In-memory cache to restore state instantly when pressing "Back"
const pageCache = new Map();

export function useInfiniteDiscover(mediaType, baseParams = {}) {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Extract filters from URL
  const sort = searchParams.get('sort') || 'popularity.desc';
  const genres = searchParams.get('genres') || '';
  const year = searchParams.get('year') || '';
  const language = searchParams.get('language') || '';
  const rating = searchParams.get('rating') || '';
  
  // Anime specific toggle (defaults to TV if on anime page)
  const actualMediaType = searchParams.get('type') || mediaType; 

  const cacheKey = `${actualMediaType}-${sort}-${genres}-${year}-${language}-${rating}-${JSON.stringify(baseParams)}`;

  // Reset when filters change
  useEffect(() => {
    if (pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey);
      setItems(cached.items);
      setPage(cached.page);
      setTotalPages(cached.totalPages);
      setTotalResults(cached.totalResults);
      setLoading(false);
      setError(false);
    } else {
      setItems([]);
      setPage(1);
      setTotalPages(1);
      setTotalResults(0);
      setLoading(true);
      setError(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    // Prevent fetching if we're pulling from cache for this exact page
    if (pageCache.has(cacheKey) && pageCache.get(cacheKey).page >= page) return;

    const controller = new AbortController();
    setLoading(true);
    setError(false);

    const fetchPage = async () => {
      try {
        const query = new URLSearchParams({
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          page: page.toString(),
          sort_by: sort,
          include_adult: 'false',
          ...baseParams
        });

        if (genres) query.append('with_genres', genres);
        if (language) query.append('with_original_language', language);
        
        if (year) {
          if (actualMediaType === 'movie') query.append('primary_release_year', year);
          else query.append('first_air_date_year', year);
        }

        if (rating) {
          query.append('vote_average.gte', rating);
          query.append('vote_count.gte', '50');
        }

        if (sort === 'vote_average.desc') {
          query.append('vote_count.gte', '200'); // Prevent 1-vote wonders
        }

        const endpoint = actualMediaType === 'movie' ? '/discover/movie' : '/discover/tv';
        const res = await fetch(`https://api.themoviedb.org/3${endpoint}?${query.toString()}`, {
          signal: controller.signal
        });

        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();

        setItems(prev => {
          const combined = page === 1 ? data.results : [...prev, ...data.results];
          // Deduplicate by ID
          const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
          
          // Update cache
          const maxPages = Math.min(data.total_pages, 500); // TMDB hard limit
          pageCache.set(cacheKey, { 
            items: uniqueItems, 
            page, 
            totalPages: maxPages, 
            totalResults: data.total_results 
          });
          
          return uniqueItems;
        });

        setTotalPages(Math.min(data.total_pages, 500));
        setTotalResults(data.total_results);
      } catch (err) {
        if (err.name !== 'AbortError') setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
    return () => controller.abort();
  }, [page, cacheKey]); // Re-run if page increments

  return { items, loading, error, page, totalPages, totalResults, setPage };
}