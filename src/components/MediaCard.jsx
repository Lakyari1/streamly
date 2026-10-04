import { Link } from 'react-router-dom';

export default function MediaCard({ item }) {
  if (!item) return null;

  const title = item.title || item.name || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || '';
  const year = releaseDate ? releaseDate.split('-')[0] : '';
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  
  // Format the URL slug exactly like App.jsx does for consistency
  const slug = `${item.id}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

  return (
    <Link to={`/${mediaType}/${slug}`} className="media-card">
      {/* FIXED: Changed poster-wrapper to poster-wrap to link up with index.css */}
      <div className="poster-wrap">
        <img
          src={
            item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : 'https://via.placeholder.com/500x750?text=No+Poster'
          }
          alt={title}
          loading="lazy"
          decoding="async"
        />
        {rating && rating > 0 && (
          {/* FIXED: Changed rating-badge to rating-ring */}
          <div className="rating-ring">{rating}</div>
        )}
      </div>
      
      <h3 className="card-title">{title}</h3>
      {/* FIXED: Formatted exactly like the Home page cards using card-meta */}
      {year && <p className="card-meta">{year} • {mediaType.toUpperCase()}</p>}
    </Link>
  );
}