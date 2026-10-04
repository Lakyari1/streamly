import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://deootghosgoannagfykn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = sb_publishable_-LpqGR5fXBF03pL_N_i2Tw_sKr5ryRq;

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);