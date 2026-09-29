// Espelha defaultState()/DEFAULT_SETTINGS do frontend (src/LifeQuest.jsx) —
// é o estado que toda conta nova recebe antes de jogar a primeira vez.
const DEFAULT_SETTINGS = {
  characterName: '', avatarIcon: 'sparkles', theme: 'dark', accent: 'purple',
  notifHabits: true, notifCelebrate: true, notifGoals: true, sound: true,
  timezone: 'America/Sao_Paulo', dateFormat: 'dd/mm/aaaa', units: 'metrico',
};

function defaultState() {
  return {
    level: 1, xp: 0, habits: [], missions: [], weeklyMissions: [], goals: [],
    events: [], journal: [], notifications: [], xpLog: {}, settings: DEFAULT_SETTINGS,
  };
}

module.exports = { defaultState };
