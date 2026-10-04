import { useRef, useCallback } from 'react';
import { useInfiniteDiscover } from '../hooks/useInfiniteDiscover';
import FilterBar from '../components/FilterBar';
import MediaCard from '../components/MediaCard';

export default function TvShows() {
  const { items, loading, error, page, totalPages, totalResults, setPage } = useInfiniteDiscover('tv');
  const observer = useRef();

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && page < totalPages) {
        setPage(prev => prev + 1);
      }
    }, { rootMargin: '600px' });
    
    if (node) observer.current.observe(node);
  }, [loading, page, totalPages, setPage]);

  return (
    <div className="page-container">
      <FilterBar mediaType="tv" />
      
      <div className="results-count">
        {totalResults > 0 && `${items.length} of ${totalResults > 10000 ? '10,000+' : totalResults} titles`}
      </div>

      {items.length === 0 && !loading && !error && (
        <div className="empty-state">No titles match these filters.</div>
      )}

      <div className="media-grid">
        {items.map((item, index) => (
          <div 
            ref={items.length === index + 1 ? lastElementRef : null} 
            key={`${item.id}-${index}`}
            className="media-card-wrapper"
          >
            <MediaCard item={item} />
          </div>
        ))}
        
        {loading && Array.from({ length: 20 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="skeleton-card" />
        ))}
      </div>

      {error && (
        <div className="error-state">
          <p>Failed to load more titles.</p>
          <button onClick={() => setPage(page)}>Retry</button>
        </div>
      )}

      {!loading && page >= totalPages && items.length > 0 && (
        <div className="end-of-results">You've reached the end.</div>
      )}
    </div>
  );
}