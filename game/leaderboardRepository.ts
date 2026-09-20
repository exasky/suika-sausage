// @ts-nocheck

import { supabaseClient } from '../shared/supabaseClient.js';
import { getLeaderboardTable } from './sets.js';

export async function getTopScores(setKey, limit = 3) {
  const { data, error } = await supabaseClient
    .from(getLeaderboardTable(setKey))
    .select('name, score')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function submitScore(setKey, name, score) {
  const { error } = await supabaseClient.from(getLeaderboardTable(setKey)).insert([{ name, score }]);
  if (error) throw error;
}
