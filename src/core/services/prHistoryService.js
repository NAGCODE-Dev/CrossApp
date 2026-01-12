/**
 * PR History Service
 * Gerencia histórico de PRs para gráficos de progresso
 */

/**
 * Salva histórico de PR
 * @param {string} exerciseName - Nome do exercício
 * @param {number} value - Valor do PR (kg)
 * @param {string} date - Data (ISO string)
 * @returns {boolean}
 */
export function savePRHistory(exerciseName, value, date = new Date().toISOString()) {
  const history = getPRHistory();
  
  if (!history[exerciseName]) {
    history[exerciseName] = [];
  }
  
  // Adiciona novo registro
  history[exerciseName].push({
    value: value,
    date: date,
    timestamp: Date.now()
  });
  
  // Ordena por data
  history[exerciseName].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Salva no localStorage
  try {
    localStorage.setItem('pr_history', JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Erro ao salvar histórico de PR:', error);
    return false;
  }
}

/**
 * Obtém histórico de todos os PRs
 * @returns {Object}
 */
export function getPRHistory() {
  try {
    const data = localStorage.getItem('pr_history');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Erro ao carregar histórico de PRs:', error);
    return {};
  }
}

/**
 * Obtém histórico de um exercício específico
 * @param {string} exerciseName - Nome do exercício
 * @returns {Array}
 */
export function getExerciseHistory(exerciseName) {
  const history = getPRHistory();
  return history[exerciseName] || [];
}

/**
 * Calcula progresso (% de aumento desde o primeiro registro)
 * @param {string} exerciseName - Nome do exercício
 * @returns {number|null} Percentual de progresso
 */
export function getProgress(exerciseName) {
  const history = getExerciseHistory(exerciseName);
  
  if (history.length < 2) return null;
  
  const first = history[0].value;
  const last = history[history.length - 1].value;
  
  return ((last - first) / first) * 100;
}

/**
 * Limpa histórico de um exercício
 * @param {string} exerciseName - Nome do exercício
 * @returns {boolean}
 */
export function clearExerciseHistory(exerciseName) {
  const history = getPRHistory();
  delete history[exerciseName];
  
  try {
    localStorage.setItem('pr_history', JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Erro ao limpar histórico:', error);
    return false;
  }
}
