// @ts-nocheck

import { MERGE_SETS } from '../game/sets.js';
import { supabaseClient } from '../shared/supabaseClient.js'; // Ajuste le chemin selon ton projet

// 1. Gestion du thème Sombre / Clair
function applyThemePreference() {
  const isDarkMode = localStorage.getItem('isDarkMode') !== 'false';
  document.body.classList.toggle('light-theme', !isDarkMode);
}

// 2. Chargement des scores depuis Supabase
async function fetchAndRenderLeaderboard(setKey) {
  const tbody = document.getElementById('leaderboard-rows');
  const setConfig = MERGE_SETS[setKey];

  if (!setConfig || !setConfig.leaderboardTable) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px 0;">Configuration invalide.</td></tr>`;
    return;
  }

  // Affichage d'un état de chargement
  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; opacity: 0.6; padding: 20px 0;">Chargement des scores...</td></tr>`;

  try {
    // Requête Supabase sur la table configurée dans sets.js
    const { data, error } = await supabaseClient
      .from(setConfig.leaderboardTable)
      .select('name, score, created_at')
      .order('score', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; opacity: 0.6; padding: 20px 0;">Aucun score enregistré pour ce mode.</td></tr>`;
      return;
    }

    // Injection des lignes
    tbody.innerHTML = data
      .map((entry, index) => {
        const dateFormatted = entry.created_at
          ? new Date(entry.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : '-';

        return `
          <tr>
            <td class="col-rank"><strong>${index + 1}</strong></td>
            <td class="col-player">${escapeHtml(entry.name || 'Anonyme')}</td>
            <td class="col-score">${Number(entry.score).toLocaleString()}</td>
            <td class="col-date">${dateFormatted}</td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Erreur lors de la récupération du classement :', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ff5555; padding: 20px 0;">Impossible de charger les scores.</td></tr>`;
  }
}

// Sécurisation contre le XSS pour les pseudo joueurs
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

// 3. Génération dynamique des onglets
function setupTabs() {
  const tabsContainer = document.getElementById('game-tabs');
  const setKeys = Object.keys(MERGE_SETS);

  // Déterminer le set actif (via URL ?game=... ou premier par défaut)
  const urlParams = new URLSearchParams(window.location.search);
  let activeGame = urlParams.get('game');
  if (!MERGE_SETS[activeGame]) {
    activeGame = setKeys[0];
  }

  tabsContainer.innerHTML = '';

  setKeys.forEach((key) => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${key === activeGame ? 'active' : ''}`;
    btn.dataset.game = key;
    btn.textContent = MERGE_SETS[key].label || key;

    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');

      const selectedGame = e.target.dataset.game;

      // Mettre à jour l'URL sans recharger la page
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('game', selectedGame);
      window.history.pushState({}, '', newUrl);

      fetchAndRenderLeaderboard(selectedGame);
    });

    tabsContainer.appendChild(btn);
  });

  // Charger le leaderboard initial
  fetchAndRenderLeaderboard(activeGame);
}

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
  applyThemePreference();
  setupTabs();
});
