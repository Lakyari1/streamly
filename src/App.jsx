import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, useParams, NavLink } from 'react-router-dom';
import { API, Storage } from './services/api';

import Movies from './pages/Movies';
import TvShows from './pages/TvShows';
import Anime from './pages/Anime';

// --- Shared Components ---

function useLazyLoad() {
  const ref = useRef();
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
    }, { rootMargin: '200px' });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, isVisible];
}

const MediaCard = ({ item }) => {
  const type = item.media_type || (item.name ? 'tv' : 'movie');
  const slug = `${item.id}-${(item.title || item.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  const score = item.vote_average ? (item.vote_average).toFixed(1) : '';
  const year = (item.release_date || item.first_air_date || '').split('-')[0];

  return (
    <Link to={`/${type}/${slug}`} className="media-card">
      <div className="poster-wrap">
        {item.poster_path ? (
          <img src={`https://image.tmdb.org/t/p/w342${item.poster_path}`} loading="lazy" alt={item.title || item.name} />
        ) : <div className="skeleton" style={{width:'100%', height:'100%'}}/>}
        {score > 0 && <div className="rating-ring">{score}</div>}
      </div>
      <h3 className="card-title">{item.title || item.name}</h3>
      <p className="card-meta">{year} • {type.toUpperCase()}</p>
    </Link>
  );
};

const MediaRow = ({ title, fetcher, link }) => {
  const [ref, isVisible] = useLazyLoad();
  const [items, setItems] = useState([]);
  const scrollRef = useRef();

  useEffect(() => {
    if (isVisible) fetcher().then(d => d && setItems(d.results || d));
  }, [isVisible, fetcher]);

  const scroll = (dir) => {
    scrollRef.current.scrollBy({ left: dir * 600, behavior: 'smooth' });
  };

  if (isVisible && items.length === 0) return null;

  return (
    <div className="media-row-container" ref={ref}>
      <div className="section-header">
        <h2 className="section-title">{title}</h2>
        {link && <Link to={link} className="view-all">View All &gt;</Link>}
      </div>
      <div style={{position: 'relative'}}>
        <button className="row-arrow left" onClick={() => scroll(-1)}>‹</button>
        <div className="media-row" ref={scrollRef}>
          {!isVisible ? [...Array(10)].map((_,i) => <div key={i} className="skeleton media-card" style={{height: '270px'}}/>) 
           : items.map(item => <MediaCard key={item.id} item={item} />)}
        </div>
        <button className="row-arrow right" onClick={() => scroll(1)}>›</button>
      </div>
    </div>
  );
};

// --- Pages ---

const Home = () => {
  const [trending, setTrending] = useState([]);
  const [top10, setTop10] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [cw, setCw] = useState([]);

  useEffect(() => {
    API.getTrending().then(d => d && setTrending(d.results.slice(0, 5)));
    API.getTopMovies().then(d => d && setTop10(d.results.slice(0, 10)));
    Storage.get('continue_watching').then(setCw);
  }, []);

  useEffect(() => {
    if (trending.length === 0) return;
    const timer = setInterval(() => setHeroIdx(i => (i + 1) % 5), 6000);
    return () => clearInterval(timer);
  }, [trending]);

  const heroItem = trending[heroIdx];

  const fetchProviders = async () => {
    const res = await API.getProviders();
    return res ? res.results.sort((a,b) => a.display_priority - b.display_priority).slice(0, 18) : [];
  };
  const fetchStudios = async () => {
    const ids = [420, 174, 33, 2, 4, 521, 25, 1632, 21, 3, 5, 12, 923, 1];
    const results = await Promise.all(ids.map(id => API.getCompany(id)));
    return results.filter(r => r && r.logo_path); 
  };

  return (
    <div style={{paddingBottom: '100px'}}>
      {/* Hero */}
      {heroItem ? (
        <div className="hero">
          <div className="hero-bg" style={{backgroundImage: `url(https://image.tmdb.org/t/p/original${heroItem.backdrop_path})`}} />
          <div className="hero-content">
            <h1 className="hero-title">{heroItem.title || heroItem.name}</h1>
            <div className="hero-meta">
              <span>★ {(heroItem.vote_average/2).toFixed(1)}/5</span>
              <span>{Math.round(heroItem.vote_average * 10)}% Score</span>
              <span>{(heroItem.release_date || heroItem.first_air_date || '').split('-')[0]}</span>
              <span className="hero-chip">Trending Today</span>
            </div>
            <p className="hero-overview">{heroItem.overview}</p>
            <div className="hero-buttons">
              <Link to={`/${heroItem.media_type}/${heroItem.id}`} className="btn btn-red">▶ Watch Now</Link>
              <Link to={`/${heroItem.media_type}/${heroItem.id}`} className="btn btn-dark">ℹ Info</Link>
            </div>
          </div>
          <div className="hero-thumbs">
            {trending.map((t, idx) => (
              <img 
                key={t.id} src={`https://image.tmdb.org/t/p/w185${t.poster_path}`} 
                className={`thumb ${idx === heroIdx ? 'active' : ''}`}
                onClick={() => setHeroIdx(idx)}
                alt="thumb"
              />
            ))}
          </div>
        </div>
      ) : <div className="hero skeleton" />}

      {/* Continue Watching */}
      {cw.length > 0 && (
        <div className="media-row-container" style={{marginTop: '20px'}}>
          <div className="section-header"><h2 className="section-title">Continue Watching</h2></div>
          <div className="media-row">
            {cw.map(item => {
              const left = Math.ceil((item.totalDuration - item.currentTime) / 60);
              return (
                <div key={item.uKey} className="cw-card" onClick={(e) => { if(e.target.tagName !== 'BUTTON') window.location.href=`/play?id=${item.id}&type=${item.type}&season=${item.season || ''}&episode=${item.episode || ''}` }}>
                  <button className="cw-close" onClick={async (e) => { 
                    e.preventDefault(); 
                    e.stopPropagation(); 
                    await Storage.removeProgress(item.uKey); 
                    const updated = await Storage.get('continue_watching');
                    setCw(updated); 
                  }}>✕</button>
                  <div style={{position: 'relative'}}>
                    <img src={`https://image.tmdb.org/t/p/w300${item.backdrop || item.poster}`} className="cw-thumb" alt={item.title} />
                    <span className="cw-badge">{left}m left</span>
                    <div className="cw-progress"><div className="cw-progress-fill" style={{width: `${(item.currentTime/item.totalDuration)*100}%`}}/></div>
                  </div>
                  <div className="cw-info"><p className="cw-title">{item.title}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 10 */}
      {top10.length > 0 && (
        <div className="media-row-container">
          <div className="section-header">
            <h2 className="section-title" style={{fontSize: '28px', color: 'var(--accent)'}}>TOP 10 <span style={{fontSize:'12px', color:'var(--text-muted)', marginLeft:'8px'}}>MOVIES TODAY</span></h2>
          </div>
          <div className="media-row">
            {top10.map((item, idx) => (
              <div key={item.id} className="top10-card">
                <div className="top10-number">{idx + 1}</div>
                <MediaCard item={{...item, media_type: 'movie'}} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard Rows */}
      <MediaRow title="Now Playing Movies" fetcher={API.getNowPlaying} link="/browse/movie-now_playing" />
      
      {/* Providers Row */}
      <div className="media-row-container">
        <div className="section-header"><h2 className="section-title">Top Providers</h2></div>
        <div className="media-row">
          {(() => {
            const [provs, setProvs] = useState([]);
            useEffect(() => { fetchProviders().then(setProvs); }, []);
            return provs.map(p => (
              <Link key={p.provider_id} to={`/browse/provider-${p.provider_id}`} className="logo-card">
                <img src={`https://image.tmdb.org/t/p/w200${p.logo_path}`} alt={p.provider_name} />
              </Link>
            ));
          })()}
        </div>
      </div>

      <MediaRow title="Recently Added Movies" fetcher={API.getRecentMovies} link="/browse/movie-recent" />
      
      {/* Studios Row */}
      <div className="media-row-container">
        <div className="section-header"><h2 className="section-title">Studios</h2></div>
        <div className="media-row">
          {(() => {
            const [studios, setStudios] = useState([]);
            useEffect(() => { fetchStudios().then(setStudios); }, []);
            return studios.map(s => (
              <Link key={s.id} to={`/browse/studio-${s.id}`} className="logo-card">
                <img src={`https://image.tmdb.org/t/p/w200${s.logo_path}`} alt={s.name} />
              </Link>
            ));
          })()}
        </div>
      </div>

      <MediaRow title="Top Rated Blockbusters" fetcher={API.getTopRatedMovies} link="/browse/movie-top_rated" />
      <MediaRow title="Popular TV Shows" fetcher={API.getPopularTV} link="/browse/tv-popular" />
      <MediaRow title="Recently Added TV Shows" fetcher={API.getRecentTV} link="/browse/tv-recent" />
      <MediaRow title="Bollywood Hits" fetcher={API.getBollywood} link="/browse/movie-bollywood" />
      <MediaRow title="History Movies" fetcher={() => API.getByGenre('movie', 36)} link="/browse/movie-history" />
      <MediaRow title="Thriller Movies" fetcher={() => API.getByGenre('movie', 53)} link="/browse/movie-thriller" />
      <MediaRow title="Science Fiction Movies" fetcher={() => API.getByGenre('movie', 878)} link="/browse/movie-scifi" />
      <MediaRow title="Fantasy Movies" fetcher={() => API.getByGenre('movie', 14)} link="/browse/movie-fantasy" />
      <MediaRow title="Action & Adventure Shows" fetcher={() => API.getByGenre('tv', 10759)} link="/browse/tv-action" />
    </div>
  );
};

const Details = () => {
  const { idSlug } = useParams();
  const loc = useLocation();
  const type = loc.pathname.includes('/tv/') ? 'tv' : 'movie';
  
  const id = idSlug.split('-')[0];
  const [data, setData] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [selSeason, setSelSeason] = useState(1);
  const [inWl, setInWl] = useState(false);
  const [inFav, setInFav] = useState(false);

  useEffect(() => {
    window.scrollTo(0,0);
    setData(null);
    API.getDetails(type, id).then(async (d) => {
      if(d) {
        setData(d);
        setInWl(await Storage.isInList('watchlist', id));
        setInFav(await Storage.isInList('favorites', id));
      }
    });
  }, [type, id]);

  useEffect(() => {
    if (type === 'tv' && data) {
      API.getSeason(id, selSeason).then(setSeasonData);
    }
  }, [type, id, selSeason, data]);

  if (!data) return <div className="details-page"><div className="skeleton details-bg"/></div>;

  const trailer = data.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  const bgNode = trailer 
    ? <iframe src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailer.key}&modestbranding=1`} />
    : <img src={`https://image.tmdb.org/t/p/original${data.backdrop_path}`} alt="bg" />;

  const recs = (data.recommendations?.results?.length > 0 ? data.recommendations.results : data.similar?.results) || [];

  return (
    <div className="details-page">
      <div className="details-bg">{bgNode}</div>
      <div className="details-header">
        <img src={`https://image.tmdb.org/t/p/w500${data.poster_path}`} className="details-poster" alt={data.title} />
        <div>
          <div style={{display:'flex', gap:'8px', marginBottom:'8px'}}>
            <span className="hero-chip">{type === 'movie' ? 'MOVIE' : 'TV SERIES'}</span>
            <span className="hero-chip" style={{background:'#27272a'}}>{data.status}</span>
          </div>
          <h1 style={{fontSize:'48px', margin:'0 0 8px'}}>{data.title || data.name}</h1>
          {data.tagline && <p style={{fontStyle:'italic', color:'#d4d4d8', margin:'0 0 12px'}}>{data.tagline}</p>}
          <p style={{color:'var(--text-muted)'}}>{(data.release_date || data.first_air_date)} • {data.runtime || (data.episode_run_time && data.episode_run_time[0]) || '?'} min</p>
          
          <div className="action-row">
            <div className="rating-ring" style={{position:'relative', top:0, right:0, width:'50px', height:'50px', fontSize:'16px'}}>
              {Math.round(data.vote_average * 10)}<span style={{fontSize:'10px'}}>%</span>
            </div>
            <Link to={`/play?id=${id}&type=${type}${type==='tv'?'&season=1&episode=1':''}`} className="btn btn-red" style={{padding:'14px 32px'}}>▶ Watch Now</Link>
            <button className={`circle-btn ${inWl ? 'active' : ''}`} onClick={async () => setInWl(await Storage.toggleList('watchlist', data))}>✚</button>
            <button className={`circle-btn ${inFav ? 'active' : ''}`} onClick={async () => setInFav(await Storage.toggleList('favorites', data))}>♥</button>
          </div>
          
          <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'24px'}}>
            {data.genres?.map(g => <span key={g.id} style={{border:'1px solid #3f3f46', padding:'4px 12px', borderRadius:'99px', fontSize:'12px'}}>{g.name}</span>)}
          </div>
          <p style={{lineHeight:1.6, maxWidth:'800px'}}>{data.overview}</p>
        </div>
      </div>

      <div className="media-row-container" style={{marginTop:'40px'}}>
        <h2 className="section-title">Cast</h2>
        <div className="media-row">
          {data.credits?.cast?.slice(0,12).map(c => (
            <Link key={c.cast_id || c.id} to={`/person/${c.id}-${c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`} style={{width:'130px', minWidth:'130px', textDecoration: 'none', color: 'inherit'}}>
              <div style={{width:'100%', aspectRatio:'2/3', background:'var(--card-bg)', borderRadius:'8px', overflow:'hidden', marginBottom:'8px'}}>
                {c.profile_path && <img src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} style={{width:'100%', height:'100%', objectFit:'cover'}} alt={c.name}/>}
              </div>
              <p style={{margin:0, fontSize:'13px', fontWeight:600}}>{c.name}</p>
              <p style={{margin:0, fontSize:'11px', color:'var(--text-muted)'}}>{c.character}</p>
            </Link>
          ))}
        </div>
      </div>

      {type === 'tv' && (
        <div className="media-row-container" style={{marginTop:'40px'}}>
          <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px'}}>
            <h2 className="section-title" style={{margin:0}}>Episodes</h2>
            <select value={selSeason} onChange={e => setSelSeason(Number(e.target.value))} style={{background:'var(--card-bg)', color:'white', border:'1px solid #3f3f46', padding:'8px', borderRadius:'8px'}}>
              {data.seasons?.filter(s => s.season_number > 0).map(s => <option key={s.id} value={s.season_number}>{s.name}</option>)}
            </select>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
            {seasonData?.episodes?.map(ep => (
              <Link key={ep.id} to={`/play?id=${id}&type=tv&season=${selSeason}&episode=${ep.episode_number}`} style={{display:'flex', gap:'16px', background:'var(--card-bg)', padding:'12px', borderRadius:'12px', textDecoration:'none', color:'white'}}>
                <div style={{width:'160px', minWidth:'160px', aspectRatio:'16/9', background:'#000', borderRadius:'8px', overflow:'hidden'}}>
                  {ep.still_path && <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} style={{width:'100%', height:'100%', objectFit:'cover'}} alt={ep.name}/>}
                </div>
                <div>
                  <h4 style={{margin:'0 0 8px'}}>{ep.episode_number}. {ep.name}</h4>
                  <p style={{fontSize:'12px', color:'var(--text-muted)', margin:'0 0 8px'}}>{ep.runtime} min</p>
                  <p style={{fontSize:'13px', color:'#d4d4d8', margin:0, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{ep.overview}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="media-row-container" style={{marginTop:'40px'}}>
          <h2 className="section-title">More Like This</h2>
          <div className="media-row">{recs.map(item => <MediaCard key={item.id} item={item}/>)}</div>
        </div>
      )}
    </div>
  );
};

const Player = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const id = params.get('id');
  const type = params.get('type');
  const season = params.get('season');
  const episode = params.get('episode');
  const [server, setServer] = useState('vidsrc.to');
  const [data, setData] = useState(null);
  const [seasonData, setSeasonData] = useState(null);

  useEffect(() => { 
    API.getDetails(type, id).then(setData); 
  }, [type, id]);

  useEffect(() => {
    if (type === 'tv' && season) {
      API.getSeason(id, season).then(setSeasonData);
    }
  }, [type, id, season]);

  useEffect(() => {
    if (!data) return;
    let t;
    async function setupTimer() {
      const cwList = await Storage.get('continue_watching');
      const uKey = `${type}-${id}${type==='tv'?`-${season}-${episode}`:''}`;
      const existing = cwList.find(i => i.uKey === uKey);
      
      let current = existing ? existing.currentTime : 0;
      const total = type === 'movie' ? 7200 : 2700; 
      
      t = setInterval(async () => {
        current += 5;
        await Storage.saveProgress({
          type, id, season, episode, title: data.title || data.name,
          poster: data.poster_path, backdrop: data.backdrop_path
        }, current, total);
      }, 5000);
    }
    setupTimer();
    return () => clearInterval(t);
  }, [data, id, type, season, episode]);

  const handleNext = () => {
    const currentEp = Number(episode);
    const currentSzn = Number(season);
    
    if (seasonData && currentEp < seasonData.episodes.length) {
      nav(`/play?id=${id}&type=tv&season=${currentSzn}&episode=${currentEp + 1}`, { replace: true });
    } else if (data && currentSzn < data.number_of_seasons) {
      nav(`/play?id=${id}&type=tv&season=${currentSzn + 1}&episode=1`, { replace: true });
    }
  };

  const hasNext = type === 'tv' && (
    (seasonData && Number(episode) < seasonData.episodes.length) || 
    (data && Number(season) < data.number_of_seasons)
  );

  const servers = {
    'vidsrc.to': `https://vidsrc.to/embed/${type}/${id}${type==='tv'?`/${season}/${episode}`:''}`,
    'vidsrc.me': `https://vidsrc.me/embed/${type}?tmdb=${id}${type==='tv'?`&season=${season}&episode=${episode}`:''}`,
    'superembed': `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1${type==='tv'?`&s=${season}&e=${episode}`:''}`
  };

  return (
    <div style={{width:'100%', height:'100dvh', background:'#000', display:'flex', flexDirection:'column'}}>
      <div style={{padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px', background:'rgba(0,0,0,0.8)', zIndex:10}}>
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <button onClick={() => nav(-1)} style={{background:'none', border:'none', color:'white', fontSize:'24px', cursor:'pointer'}}>←</button>
          <h2 style={{margin:0, fontSize:'18px'}}>{data ? (data.title || data.name) : 'Loading...'} {type==='tv' ? `• S${season} E${episode}` : ''}</h2>
        </div>
        
        <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
          {hasNext && (
            <button 
              onClick={handleNext} 
              className="btn btn-red" 
              style={{padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap'}}
            >
              Next Episode ⏭
            </button>
          )}

          <select value={server} onChange={e => setServer(e.target.value)} style={{background:'#27272a', color:'white', padding:'8px 16px', borderRadius:'8px', border:'none'}}>
            {Object.keys(servers).map(s => <option key={s} value={s}>Server: {s}</option>)}
          </select>
        </div>
      </div>
      <iframe src={servers[server]} style={{flex:1, width:'100%', border:'none'}} allowFullScreen />
    </div>
  );
};

const GridPage = ({ title, fetchUrl }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const observer = useRef();

  useEffect(() => {
    window.scrollTo(0,0);
    setItems([]); setPage(1); setLoading(true);
    API.getGrid(fetchUrl, 1).then(d => {
      if(d) setItems(d.results);
      setLoading(false);
    });
  }, [fetchUrl]);

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setLoading(true);
        API.getGrid(fetchUrl, page + 1).then(d => {
          if(d) {
            setItems(prev => {
              const newItems = d.results.filter(n => !prev.some(p => p.id === n.id));
              return [...prev, ...newItems];
            });
            setPage(p => p + 1);
          }
          setLoading(false);
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, fetchUrl, page]);

  return (
    <div className="grid-container">
      <div className="section-header"><h2 className="section-title">{title}</h2></div>
      <div className="media-grid">
        {items.map((item, i) => {
          if (items.length === i + 1) {
            return (
              <div ref={lastElementRef} key={item.id + '-' + i} style={{display: 'contents'}}>
                <MediaCard item={item} />
              </div>
            );
          }
          return <MediaCard key={item.id + '-' + i} item={item} />
        })}
      </div>
      {loading && <p style={{textAlign:'center', marginTop:'40px', color:'var(--text-muted)'}}>Loading more...</p>}
    </div>
  );
};

const Person = () => {
  const { idSlug } = useParams();
  const id = idSlug.split('-')[0];
  const [person, setPerson] = useState(null);

  useEffect(() => {
    window.scrollTo(0,0);
    API.getPerson(id).then(setPerson);
  }, [id]);

  if (!person) return <div style={{padding:'100px', textAlign:'center'}}>Loading...</div>;

  const credits = person.combined_credits?.cast?.sort((a, b) => b.popularity - a.popularity) || [];

  return (
    <div className="grid-container" style={{paddingTop:'40px'}}>
      <div style={{display:'flex', gap:'32px', marginBottom:'40px', flexWrap:'wrap'}}>
        {person.profile_path && (
          <img src={`https://image.tmdb.org/t/p/w300${person.profile_path}`} style={{borderRadius:'12px', width:'250px', objectFit:'cover'}} alt={person.name} />
        )}
        <div style={{flex:1, minWidth:'300px'}}>
          <h1 style={{fontSize:'40px', margin:'0 0 16px'}}>{person.name}</h1>
          <p style={{color:'var(--text-muted)', marginBottom:'16px'}}>Born: {person.birthday || 'Unknown'} {person.place_of_birth && `in ${person.place_of_birth}`}</p>
          <p style={{lineHeight:1.6, whiteSpace:'pre-wrap'}}>{person.biography || 'No biography available.'}</p>
        </div>
      </div>
      
      <div className="section-header"><h2 className="section-title">Known For</h2></div>
      <div className="media-grid">
        {credits.slice(0, 20).map((item, i) => <MediaCard key={item.id+'-'+i} item={item} />)}
      </div>
    </div>
  );
};

function useSearchParams() {
  return [new URLSearchParams(useLocation().search)];
}

const Search = () => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [type, setType] = useState('movie');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [rating, setRating] = useState('');
  
  useEffect(() => {
    if (isAdvanced) {
      API.discoverAdvanced(type, genre, year, rating).then(d => d && setResults(d.results));
    } else {
      const timer = setTimeout(() => {
        if (q.trim()) API.search(q).then(d => d && setResults(d.results.filter(i => i.media_type !== 'person')));
        else setResults([]);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [q, isAdvanced, type, genre, year, rating]);

  return (
    <div className="grid-container">
      <div style={{display:'flex', gap:'16px', marginBottom:'20px'}}>
        <button className={`btn ${!isAdvanced ? 'btn-red' : 'btn-dark'}`} onClick={() => setIsAdvanced(false)}>Text Search</button>
        <button className={`btn ${isAdvanced ? 'btn-red' : 'btn-dark'}`} onClick={() => setIsAdvanced(true)}>Advanced Filters</button>
      </div>

      {!isAdvanced ? (
        <input type="text" autoFocus placeholder="Search movies, TV shows..." value={q} onChange={e => setQ(e.target.value)} className="search-input" />
      ) : (
        <div style={{display:'flex', gap:'16px', flexWrap:'wrap', marginBottom:'20px', background:'#18181b', padding:'16px', borderRadius:'12px'}}>
          <select value={type} onChange={e => setType(e.target.value)} style={{padding:'12px', borderRadius:'8px', background:'#27272a', color:'white', border:'none'}}>
            <option value="movie">Movies</option>
            <option value="tv">TV Shows</option>
          </select>
          <select value={genre} onChange={e => setGenre(e.target.value)} style={{padding:'12px', borderRadius:'8px', background:'#27272a', color:'white', border:'none'}}>
            <option value="">All Genres</option>
            <option value="28">Action</option>
            <option value="35">Comedy</option>
            <option value="18">Drama</option>
            <option value="878">Sci-Fi</option>
            <option value="27">Horror</option>
            <option value="16">Animation</option>
          </select>
          <input type="number" placeholder="Year (e.g. 2023)" value={year} onChange={e => setYear(e.target.value)} style={{padding:'12px', borderRadius:'8px', background:'#27272a', color:'white', border:'none', width:'150px'}} />
          <input type="number" placeholder="Min Rating (1-10)" value={rating} onChange={e => setRating(e.target.value)} style={{padding:'12px', borderRadius:'8px', background:'#27272a', color:'white', border:'none', width:'150px'}} max="10" min="1" />
        </div>
      )}

      {results?.length > 0 ? (
        <div className="media-grid">{results.map((item, i) => <MediaCard key={item.id+'-'+i} item={item} />)}</div>
      ) : (q || isAdvanced) && <p style={{textAlign:'center', color:'var(--text-muted)'}}>No results found.</p>}
    </div>
  );
};

const Library = () => {
  const [tab, setTab] = useState('cw');
  const [cw, setCw] = useState([]);
  const [wl, setWl] = useState([]);
  const [fav, setFav] = useState([]);

  useEffect(() => {
    async function loadLibrary() {
      setCw(await Storage.get('continue_watching'));
      setWl(await Storage.get('watchlist'));
      setFav(await Storage.get('favorites'));
    }
    loadLibrary();
  }, [tab]);

  const renderGrid = (list) => (
    list.length === 0 ? <p style={{color:'var(--text-muted)'}}>Nothing here yet.</p> :
    <div className="media-grid">{list.map(item => <MediaCard key={item.id} item={item} />)}</div>
  );

  return (
    <div className="grid-container">
      <div style={{display:'flex', gap:'16px', marginBottom:'40px'}}>
        {[['cw', 'Continue Watching'], ['wl', 'Watchlist'], ['fav', 'Favorites']].map(([k,v]) => (
          <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'btn-red' : 'btn-dark'}`}>{v}</button>
        ))}
      </div>
      {tab === 'cw' && (cw.length === 0 ? <p style={{color:'var(--text-muted)'}}>No watched items.</p> : 
        <div className="media-grid">
          {cw.map(item => (
            <Link key={item.uKey} to={`/play?id=${item.id}&type=${item.type}&season=${item.season||''}&episode=${item.episode||''}`} className="media-card" style={{width:'100%'}}>
              <div className="poster-wrap" style={{aspectRatio:'16/9'}}><img src={`https://image.tmdb.org/t/p/w500${item.backdrop || item.poster}`} alt={item.title}/></div>
              <h3 className="card-title">{item.title}</h3>
              <p className="card-meta">{Math.ceil((item.totalDuration - item.currentTime)/60)}m left</p>
            </Link>
          ))}
        </div>
      )}
      {tab === 'wl' && renderGrid(wl)}
      {tab === 'fav' && renderGrid(fav)}
    </div>
  );
};

// Layout with Nav
const Layout = ({ children }) => {
  const loc = useLocation();
  if (loc.pathname.startsWith('/play')) return children;
  
  return (
    <>
      {children}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({isActive}) => isActive ? 'brand-s active' : 'brand-s'}>S</NavLink>
        <NavLink to="/movies">Movies</NavLink>
        <NavLink to="/tv-shows">TV Shows</NavLink>
        <NavLink to="/anime">Anime</NavLink>
        <NavLink to="/search">Search</NavLink>
        <NavLink to="/library">Library</NavLink>
      </nav>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movie/:idSlug" element={<Details />} />
          <Route path="/tv/:idSlug" element={<Details />} />
          <Route path="/play" element={<Player />} />
          <Route path="/person/:idSlug" element={<Person />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/tv-shows" element={<TvShows />} />
          <Route path="/anime" element={<Anime />} />
          <Route path="/browse/:slug" element={<GridPage title="Browse" fetchUrl="/discover/movie?sort_by=popularity.desc" />} /> 
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="*" element={<div style={{padding:'100px', textAlign:'center'}}><h2>404 - Not Found</h2></div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}