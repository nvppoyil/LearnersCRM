import { createClient } from '@supabase/supabase-js';

const fetchNoStore = (url, options = {}) =>
  fetch(url, { ...options, cache: 'no-store' });

export const db = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { fetch: fetchNoStore },
  });
