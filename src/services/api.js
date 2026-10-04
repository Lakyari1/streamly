import { createClient } from '@supabase/supabase-js';

// --- Supabase Client Setup ---
const SUPABASE_URL = 'https://deootghosgoannagfykn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_-LpqGR5FXbP3L_N_i12tw_skr5r...';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// --- TMDB API ---
const API_KEY = '2f24247dea39287ae1563b8a7347f41d';
const BASE_URL = 'https://api.themoviedb.org/3';

export const API = {
  getTrending: async () => {
    try { const res = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getTopMovies: async () => {
    try { const res = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getNowPlaying: async () => {
    try { const res = await fetch(`${BASE_URL}/movie/now_playing?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getRecentMovies: async () => {
    try { const res = await fetch(`${BASE_URL}/movie/upcoming?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getTopRatedMovies: async () => {
    try { const res = await fetch(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getPopularTV: async () => {
    try { const res = await fetch(`${BASE_URL}/tv/popular?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getRecentTV: async () => {
    try { const res = await fetch(`${BASE_URL}/tv/on_the_air?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getBollywood: async () => {
    try { const res = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&with_original_language=hi`); return await res.json(); } catch(e){return null;}
  },
  getByGenre: async (type, genreId) => {
    try { const res = await fetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${genreId}`); return await res.json(); } catch(e){return null;}
  },
  getDetails: async (type, id) => {
    try { const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&append_to_response=videos,credits,similar,recommendations`); return await res.json(); } catch(e){return null;}
  },
  getSeason: async (id, seasonNum) => {
    try { const res = await fetch(`${BASE_URL}/tv/${id}/season/${seasonNum}?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getGrid: async (url, page = 1) => {
    try { const res = await fetch(`${BASE_URL}${url}&api_key=${API_KEY}&page=${page}`); return await res.json(); } catch(e){return null;}
  },
  search: async (query) => {
    try { const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`); return await res.json(); } catch(e){return null;}
  },
  getProviders: async () => {
    try { const res = await fetch(`${BASE_URL}/watch/providers/movie?api_key=${API_KEY}&watch_region=US`); return await res.json(); } catch(e){return null;}
  },
  getCompany: async (id) => {
    try { const res = await fetch(`${BASE_URL}/company/${id}?api_key=${API_KEY}`); return await res.json(); } catch(e){return null;}
  },
  getPerson: async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/person/${id}?api_key=${API_KEY}&append_to_response=combined_credits`);
      return await res.json();
    } catch (err) { return null; }
  },
  discoverAdvanced: async (type, genre, year, rating, page = 1) => {
    try {
      let url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&page=${page}&sort_by=popularity.desc`;
      if (genre) url += `&with_genres=${genre}`;
      if (year) url += type === 'movie' ? `&primary_release_year=${year}` : `&first_air_date_year=${year}`;
      if (rating) url += `&vote_average.gte=${rating}`;
      const res = await fetch(url);
      return await res.json();
    } catch (err) { return null; }
  }
};

// --- Cloud & Local Storage Helper ---
export const Storage = {
  get: async (key) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
    }

    const { data, error } = await supabase
      .from('user_items')
      .select('item_data')
      .eq('user_id', user.id)
      .eq('list_type', key);

    if (error) return [];
    return data.map(row => row.item_data);
  },

  isInList: async (key, id) => {
    const items = await Storage.get(key);
    return items.some(i => String(i.id) === String(id));
  },

  toggleList: async (key, item) => {
    const { data: { user } } = await supabase.auth.getUser();
    const itemId = String(item.id);
    
    if (!user) {
      let list = [];
      try { list = JSON.parse(localStorage.getItem(key)) || []; } catch (e) {}
      const exists = list.some(i => String(i.id) === itemId);
      const updated = exists ? list.filter(i => String(i.id) !== itemId) : [item, ...list];
      localStorage.setItem(key, JSON.stringify(updated));
      return !exists;
    }

    const exists = await Storage.isInList(key, itemId);
    if (exists) {
      await supabase.from('user_items').delete().eq('user_id', user.id).eq('list_type', key).eq('media_id', itemId);
      return false;
    } else {
      await supabase.from('user_items').insert({
        user_id: user.id,
        list_type: key,
        media_id: itemId,
        item_data: item
      });
      return true;
    }
  },

  saveProgress: async (item, currentTime, totalDuration) => {
    const uKey = `${item.type}-${item.id}${item.season ? `-${item.season}-${item.episode}` : ''}`;
    const payload = { ...item, currentTime, totalDuration, uKey };
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      let list = [];
      try { list = JSON.parse(localStorage.getItem('continue_watching')) || []; } catch (e) {}
      const filtered = list.filter(i => i.uKey !== uKey);
      localStorage.setItem('continue_watching', JSON.stringify([payload, ...filtered]));
      return;
    }

    await supabase.from('user_items').upsert({
      user_id: user.id,
      list_type: 'continue_watching',
      media_id: uKey,
      item_data: payload,
      updated_at: new Date()
    }, { onConflict: 'user_id,list_type,media_id' });
  },

  removeProgress: async (uKey) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      let list = [];
      try { list = JSON.parse(localStorage.getItem('continue_watching')) || []; } catch (e) {}
      localStorage.setItem('continue_watching', JSON.stringify(list.filter(i => i.uKey !== uKey)));
      return;
    }

    await supabase.from('user_items').delete().eq('user_id', user.id).eq('list_type', 'continue_watching').eq('media_id', uKey);
  }
};