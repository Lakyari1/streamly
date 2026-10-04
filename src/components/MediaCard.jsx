import { Link } from 'react-router-dom';

export default function MediaCard({ item }) {
  if (!item) return null;

  const title = item.title || item.name || 'Untitled';
  const releaseDate = item.release_date || item.first_air_date || '';
  const year = releaseDate ? releaseDate.split('-')[0] : '';
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  // Same slug format as App.jsx
  const slug = `${item.id}-${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;

  return (
    <Link to={`/${mediaType}/${slug}`} className="media-card">
      <div className="poster-wrap">
        {item.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
            alt={title}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="skeleton" style={{ width: '100%', height: '100%' }} />
        )}
        {rating && Number(rating) > 0 && (
          <div className="rating-ring">{rating}</div>
        )}
      </div>

      <h3 className="card-title">{title}</h3>
      {year && <p className="card-meta">{year} • {mediaType.toUpperCase()}</p>}
    </Link>
  );
}