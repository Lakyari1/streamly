import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function FilterBar({ mediaType, isAnime = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [genresList, setGenresList] = useState([]);

  const currentSort = searchParams.get('sort') || 'popularity.desc';
  const currentGenres = searchParams.get('genres') ? searchParams.get('genres').split(',') : [];
  const currentYear = searchParams.get('year') || '';
  const currentLang = searchParams.get('language') || '';
  const currentRating = searchParams.get('rating') || '';
  const currentType = searchParams.get('type') || mediaType;

  // Fetch available genres dynamically
  useEffect(() => {
    const fetchGenres = async () => {
      const type = currentType === 'movie' ? 'movie' : 'tv';
      const res = await fetch(`https://api.themoviedb.org/3/genre/${type}/list?api_key=${import.meta.env.VITE_TMDB_API_KEY}`);
      const data = await res.json();
      setGenresList(data.genres || []);
    };
    fetchGenres();
  }, [currentType]);

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) newParams.set(key, value);
    else newParams.delete(key);
    // Reset to page 1 implicitly handled by URL change
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGenre = (id) => {
    const idStr = id.toString();
    const newGenres = currentGenres.includes(idStr) 
      ? currentGenres.filter(g => g !== idStr)
      : [...currentGenres, idStr];
    updateFilter('genres', newGenres.join(','));
  };

  const clearFilters = () => {
    setSearchParams(isAnime ? new URLSearchParams({ type: currentType }) : new URLSearchParams());
  };

  const hasActiveFilters = currentSort !== 'popularity.desc' || currentGenres.length > 0 || currentYear || currentLang || currentRating;
  const years = Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="filter-bar sticky-top">
      <div className="filter-controls">
        {isAnime && (
          <select value={currentType} onChange={(e) => updateFilter('type', e.target.value)}>
            <option value="tv">Anime Series</option>
            <option value="movie">Anime Movies</option>
          </select>
        )}

        <select value={currentSort} onChange={(e) => updateFilter('sort', e.target.value)}>
          <option value="popularity.desc">Popularity</option>
          <option value="vote_average.desc">Top Rated</option>
          <option value={currentType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc'}>Newest</option>
          <option value={currentType === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc'}>Oldest</option>
          <option value="original_title.asc">A to Z</option>
        </select>

        <select value={currentYear} onChange={(e) => updateFilter('year', e.target.value)}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={currentLang} onChange={(e) => updateFilter('language', e.target.value)}>
          <option value="">All Languages</option>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="ja">Japanese</option>
          <option value="ko">Korean</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
        </select>

        <select value={currentRating} onChange={(e) => updateFilter('rating', e.target.value)}>
          <option value="">Any Rating</option>
          <option value="6">6+ Stars</option>
          <option value="7">7+ Stars</option>
          <option value="8">8+ Stars</option>
        </select>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="clear-filters-btn">Clear</button>
        )}
      </div>

      <div className="genre-pills">
        {genresList.map(genre => (
          <button 
            key={genre.id} 
            className={`pill ${currentGenres.includes(genre.id.toString()) ? 'active' : ''}`}
            onClick={() => toggleGenre(genre.id)}
          >
            {genre.name}
          </button>
        ))}
      </div>
    </div>
  );
}