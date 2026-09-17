import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://uhetyyqtzubgtuljskyw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1hTCx4BqfqhprfF1snrj_A_pJxCWYAB';
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
