import { Link } from 'react-router-dom';

export default function MediaCard({ item }) {
  if (!item) return null;

  const title = item.title || item.name || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || '';
  const year = releaseDate ? releaseDate.split('-')[0] : '';
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  return (
    <Link to={`/watch/${mediaType}/${item.id}`} className="media-card">
      <div className="poster-wrapper">
        <img
          src={
            item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : 'https://via.placeholder.com/500x750?text=No+Poster'
          }
          alt={title}
          loading="lazy"
          decoding="async"
          className="media-card-poster"
        />
        {rating && rating > 0 && (
          <span className="rating-badge">★ {rating}</span>
        )}
      </div>
      <div className="card-info">
        <h3 className="card-title">{title}</h3>
        {year && <span className="card-year">{year}</span>}
      </div>
    </Link>
  );
}