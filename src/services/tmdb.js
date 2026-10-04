const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export async function fetchTrending() {
  try {
    const response = await fetch(`${BASE_URL}/trending/all/day?api_key=${API_KEY}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching trending:", error);
    return { results: [] };
  }
}

export async function searchMedia(query) {
  try {
    const response = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching media:", error);
    return { results: [] };
  }
}

export async function fetchMediaDetails(id, mediaType = 'movie') {
  try {
    const response = await fetch(`${BASE_URL}/${mediaType}/${id}?api_key=${API_KEY}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching media details:", error);
    return null;
  }
}