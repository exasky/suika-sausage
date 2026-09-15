import { SCALE } from './config.js';

export const MERGE_SETS = {
  sausages: {
    leaderboardTable: 'leaderboard_sausages', // Nom de ta table Supabase
    bgmUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    items: [
      { key: '1_cocktail', name: 'Cocktail', radius: 14, score: 1 },
      { key: '2_merguez', name: 'Merguez', radius: 20, score: 3 },
      { key: '3_chipolata', name: 'Chipolata', radius: 28, score: 6 },
      { key: '4_francfort', name: 'Francfort', radius: 38, score: 10 },
      { key: '5_diot', name: 'Diot', radius: 48, score: 15 },
      { key: '6_montbeliard', name: 'Montbéliard', radius: 60, score: 21 },
      { key: '7_toulouse', name: 'Toulouse', radius: 73, score: 28 },
      { key: '8_boudin', name: 'Boudin Noir', radius: 86, score: 36 },
      { key: '9_morteau', name: 'Morteau', radius: 98, score: 45 },
      { key: '10_jesus', name: 'Jésus', radius: 110, score: 55 },
      { key: '11_mortadelle', name: 'Mortadelle', radius: 125, score: 66 },
    ],
  },
  explosives: {
    leaderboardTable: 'leaderboard_explosives', // Nom de ta table Supabase
    bgmUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    items: [
      { key: '1_petard', name: 'Pétard', radius: 14, score: 1 },
      { key: '2_fusee', name: 'Fusée', radius: 20, score: 3 },
      { key: '3_dynamite', name: 'Dynamite', radius: 28, score: 6 },
      { key: '4_grenade', name: 'Grenade', radius: 38, score: 10 },
      { key: '5_c4', name: 'C4', radius: 48, score: 15 },
      { key: '6_bombe', name: 'Bombe', radius: 60, score: 21 },
      { key: '7_mine', name: 'Mine', radius: 67, score: 28 },
      { key: '8_roquette', name: 'Roquette', radius: 80, score: 36 },
      { key: '9_missile', name: 'Missile', radius: 90, score: 45 },
      { key: '10_nuke', name: 'Bombe Nuke', radius: 100, score: 55 },
      { key: '11_tnt', name: 'Super TNT', radius: 110, score: 66 },
    ],
  },
};

export function getScaledSet(setKey) {
  return MERGE_SETS[setKey].items.map((type) => ({
    ...type,
    radius: type.radius * SCALE,
  }));
}

export function getLeaderboardTable(setKey) {
  return MERGE_SETS[setKey].leaderboardTable;
}
