import { SCALE } from './config.js';

export const MERGE_SETS = {
  sausages: {
    label: 'Saucisses', // Nom affiché dans les onglets UI
    leaderboardTable: 'leaderboard_sausages', // Nom de ta table Supabase
    bgmUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    bgImage: 'assets/sausages/bg.jpg',
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
    label: 'Explosifs',
    leaderboardTable: 'leaderboard_explosives', // Nom de ta table Supabase
    bgmUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
    bgImage: 'assets/explosives/bg.jpg',
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
  cheeses: {
    label: 'Fromages',
    leaderboardTable: 'leaderboard_cheeses',
    // Musique chill / accordéon & guitare acoustique
    bgmUrl: 'https://cdn.pixabay.com/audio/2026/08/22/audio_3ebc293155.mp3',
    bgImage: 'assets/cheeses/bg.jpg',
    items: [
      { key: '1_babybel', name: 'Babybel', radius: 14, score: 1 },
      { key: '2_crottin', name: 'Crottin de Chavignol', radius: 20, score: 3 },
      { key: '3_picodon', name: 'Picodon', radius: 28, score: 6 },
      { key: '4_saint_marcellin', name: 'Saint-Marcellin', radius: 38, score: 10 },
      { key: '5_rocamadour', name: 'Rocamadour', radius: 43, score: 15 },
      { key: '6_camembert', name: 'Camembert', radius: 50, score: 21 },
      { key: '7_munster', name: 'Munster', radius: 58, score: 28 },
      { key: '8_reblochon', name: 'Reblochon', radius: 67, score: 36 },
      { key: '9_roquefort', name: 'Roquefort (Quart)', radius: 77, score: 45 },
      { key: '10_brie', name: 'Brie de Meaux (Pointe)', radius: 88, score: 55 },
      { key: '11_meule_comte', name: 'Meule de Comté', radius: 105, score: 66 },
    ],
  },
  cats: {
    label: 'Chats',
    leaderboardTable: 'leaderboard_cats',
    // Musique lo-fi / ronronnement chill
    bgmUrl: 'https://cdn.pixabay.com/audio/2025/02/21/audio_8fb7a20b57.mp3',
    bgImage: 'assets/cats/bg.jpg',
    popSoundUrl: 'https://cdn.pixabay.com/audio/2026/01/03/audio_f6c8585800.mp3', // Petit miaou court
    items: [
      { key: '1_chaton', name: 'Chaton', radius: 14, score: 1 },
      { key: '2_singapura', name: 'Singapura', radius: 20, score: 3 },
      { key: '3_munchkin', name: 'Munchkin', radius: 28, score: 6 },
      { key: '4_siamois', name: 'Siamois', radius: 38, score: 10 },
      { key: '5_sphynx', name: 'Sphynx', radius: 48, score: 15 },
      { key: '6_europien', name: 'Européen', radius: 60, score: 21 },
      { key: '7_chartreux', name: 'Chartreux', radius: 73, score: 28 },
      { key: '8_bengal', name: 'Bengal', radius: 86, score: 36 },
      { key: '9_persan', name: 'Persan', radius: 98, score: 45 },
      { key: '10_ragdoll', name: 'Ragdoll', radius: 110, score: 55 },
      { key: '11_maine_coon', name: 'Maine Coon', radius: 125, score: 66 },
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
