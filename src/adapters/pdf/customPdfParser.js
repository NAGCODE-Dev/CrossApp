/**
 * Custom PDF Parser
 * Parser especializado para o formato específico dos PDFs de treino.
 */

import { normalizeSpaces, removeEmptyLines } from '../../core/utils/text.js';
import { lbsToKg } from '../../core/utils/math.js';

/**
 * Detecta número da semana no PDF
 * @param {string} text - Texto do PDF
 * @returns {number[]} Array de números de semanas encontradas
 */
export function detectWeekNumbers(text) {
  const matches = text.match(/SEMANA\s+(\d+)/gi);
  if (!matches) return [];

  const weekNumbers = matches
    .map((match) => {
      const num = match.match(/\d+/);
      return num ? parseInt(num[0], 10) : null;
    })
    .filter(Boolean);

  // Remove duplicados e ordena
  return [...new Set(weekNumbers)].sort((a, b) => a - b);
}

/**
 * Divide PDF em múltiplas semanas
 * @param {string} text - Texto do PDF
 * @returns {Array} Array de objetos { weekNumber, text }
 */
export function splitPdfIntoWeeks(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n');
  const weeks = [];
  let currentWeek = null;
  let currentText = [];

  lines.forEach((line) => {
    // Detecta início de nova semana
    const weekMatch = line.match(/SEMANA\s+(\d+)/i);

    if (weekMatch) {
      // Salva semana anterior se existir
      if (currentWeek !== null && currentText.length > 0) {
        weeks.push({ weekNumber: currentWeek, text: currentText.join('\n') });
      }

      // Inicia nova semana
      currentWeek = parseInt(weekMatch[1], 10);
      currentText = [line];
    } else if (currentWeek !== null) {
      currentText.push(line);
    }
  });

  // Salva última semana
  if (currentWeek !== null && currentText.length > 0) {
    weeks.push({ weekNumber: currentWeek, text: currentText.join('\n') });
  }

  return weeks;
}

/**
 * Normaliza nomes de dias (suporta variações)
 * @param {string} line - Linha do PDF
 * @returns {string|null} Nome do dia normalizado ou null
 */
export function detectDayName(line) {
  const dayMap = {
    SEGUNDA: 'Segunda',
    TERÇA: 'Terça',
    TERCA: 'Terça',
    QUARTA: 'Quarta',
    QUINTA: 'Quinta',
    QUI: 'Quinta',
    SEXTA: 'Sexta',
    SEX: 'Sexta',
    SÁBADO: 'Sábado',
    SABADO: 'Sábado',
    SAB: 'Sábado',
    DOMINGO: 'Domingo',
  };

  const upper = line.trim().toUpperCase();

  // Verifica se linha é exatamente um nome de dia
  if (dayMap[upper]) return dayMap[upper];

  // Verifica se começa com nome de dia
  for (const [key, value] of Object.entries(dayMap)) {
    if (upper.startsWith(key)) return value;
  }

  return null;
}

/**
 * Detecta blocos de treino (WOD, MANHÃ, TARDE, etc)
 * @param {string} line - Linha
 * @returns {string|null} Tipo de bloco ou null
 */
export function detectBlockType(line) {
  const upper = line.trim().toUpperCase();

  if (/^WOD\b/.test(upper)) return 'WOD';
  if (upper === 'WOD 2') return 'WOD 2';
  if (upper === 'MANHÃ' || upper === 'MANHA') return 'MANHÃ';
  if (upper === 'TARDE') return 'TARDE';
  if (upper.includes('OPTIONAL')) return 'OPTIONAL';
  if (/AMRAP|FOR TIME|EMOM/.test(upper)) return 'TIMED_WOD';

  return null;
}

export function detectPeriodName(line) {
  const upper = line.trim().toUpperCase();
  if (upper === 'MANHÃ' || upper === 'MANHA') return 'manhã';
  if (upper === 'TARDE') return 'tarde';
  return null;
}

/**
 * Verifica se linha deve ser ignorada
 * @param {string} line - Linha
 * @returns {boolean}
 */
export function shouldSkipLine(line) {
  if (!line || line.trim().length === 0) return true;

  const lower = line.toLowerCase();
  const upper = line.trim().toUpperCase();

  return (
    lower.includes('gmail.com') ||
    lower.includes('hotmail.com') ||
    line.startsWith('Garanta') ||
    line.startsWith('Treine') ||
    lower.includes('licensed to') ||
    lower.includes('hp1570') ||
    lower.includes('www.bsbstrong.com') ||
    lower.includes('#trainwithapurpose') ||
    upper === 'BSB' ||
    upper === 'STRONG' ||
    upper === 'BSB STRONG' ||
    /^\d{1,3}$/.test(line.trim()) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line)
  );
}

/**
 * Parse de uma semana específica em estrutura de treinos
 * @param {string} weekText - Texto de uma semana
 * @param {number} weekNumber - Número da semana
 * @returns {Object} Estrutura de treino da semana
 */
export function parseWeekText(weekText, weekNumber) {
  const lines = removeEmptyLines(String(weekText || '').replace(/\r/g, '')).split('\n').map((l) => normalizeSpaces(l));
  const workouts = [];
  let currentDay = null;
  let currentBlock = null;
  let currentBlockTitle = '';
  let currentPeriod = null;
  let currentLines = [];
  const flushCurrentBlock = () => {
    if (!currentDay || currentLines.length === 0) return;
    if (!workouts.find((w) => w.day === currentDay)) {
      workouts.push({ day: currentDay, blocks: [] });
    }
    const workout = workouts.find((w) => w.day === currentDay);
    workout.blocks.push(buildStructuredBlock({
      type: currentBlock || 'DEFAULT',
      title: currentBlockTitle,
      period: currentPeriod,
      lines: currentLines,
    }));
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    // Pula linhas vazias ou inválidas
    if (shouldSkipLine(line)) continue;

    // Detecta novo dia
    const dayName = detectDayName(line);
    if (dayName) {
      flushCurrentBlock();
      currentDay = dayName;
      currentBlock = null;
      currentBlockTitle = '';
      currentPeriod = null;
      currentLines = [];
      continue;
    }

    const period = detectPeriodName(line);
    if (period) {
      flushCurrentBlock();
      currentPeriod = period;
      currentBlock = null;
      currentBlockTitle = '';
      currentLines = [];
      continue;
    }

    const nextMeaningfulLine = findNextMeaningfulLine(lines, index + 1);
    const timedWodFormatLine = currentBlock && detectBlockType(line) === 'TIMED_WOD';
    const blockDescriptor = timedWodFormatLine
      ? null
      : detectStructuredBlock(line, nextMeaningfulLine, { allowInferred: !currentBlock });
    if (blockDescriptor) {
      flushCurrentBlock();
      currentBlock = blockDescriptor.type;
      currentBlockTitle = blockDescriptor.title;
      currentLines = blockDescriptor.includeLine ? [line] : [];
      continue;
    }

    if (currentDay) {
      currentLines.push(line);
    }
  }

  // Salva último bloco
  flushCurrentBlock();

  return { weekNumber, workouts };
}

/**
 * Parse completo de PDF com múltiplas semanas (ou apenas 1)
 * @param {string} pdfText - Texto completo do PDF
 * @returns {Array} Array de semanas parseadas
 */
export function parseMultiWeekPdf(pdfText) {
  if (!pdfText || typeof pdfText !== 'string') return [];

  // Divide em semanas
  const weeks = splitPdfIntoWeeks(pdfText);

  // Parse de cada semana
  return weeks.map((week) => parseWeekText(week.text, week.weekNumber));
}

/**
 * Extrai treino de um dia específico de uma semana
 * @param {Object} parsedWeek - Semana parseada
 * @param {string} dayName - Nome do dia
 * @returns {Object|null} Treino do dia ou null
 */
export function getWorkoutFromWeek(parsedWeek, dayName) {
  if (!parsedWeek || !parsedWeek.workouts) return null;
  return parsedWeek.workouts.find((w) => w.day === dayName) || null;
}

/**
 * Valida formato do PDF
 * @param {string} pdfText - Texto do PDF
 * @returns {Object} Resultado da validação
 */
export function validateCustomPdfFormat(pdfText) {
  if (!pdfText || typeof pdfText !== 'string') {
    return { valid: false, error: 'Texto vazio' };
  }

  const weekNumbers = detectWeekNumbers(pdfText);

  // Aceita 1 ou mais semanas (não força mínimo de 2)
  if (weekNumbers.length === 0) {
    return {
      valid: false,
      error: 'Nenhuma semana encontrada. Procure por "SEMANA XX" no PDF.',
    };
  }

  const days = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];
  const foundDays = days.filter((day) => new RegExp(day, 'i').test(pdfText));

  if (foundDays.length === 0) {
    return {
      valid: false,
      error: 'Nenhum dia da semana encontrado.',
    };
  }

  return {
    valid: true,
    weekNumbers,
    daysFound: foundDays.length,
    weeksCount: weekNumbers.length,
  };
}

function findNextMeaningfulLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    const candidate = lines[index]?.trim?.() || '';
    if (!candidate || shouldSkipLine(candidate)) continue;
    return candidate;
  }
  return '';
}

function detectStructuredBlock(line, nextLine = '', options = {}) {
  const { allowInferred = true } = options;
  const upper = line.trim().toUpperCase();
  const basicBlockType = detectBlockType(line);
  if (basicBlockType && !detectPeriodName(line)) {
    return {
      type: mapLegacyBlockTypeToStructuredType(basicBlockType),
      title: line.trim(),
      includeLine: false,
    };
  }

  if (/^LOW INTENSITY ROW\b/.test(upper)) {
    return { type: 'ENGINE', title: line.trim(), includeLine: true };
  }

  if (/^GYMNASTICS\b/.test(upper)) {
    return { type: 'GYMNASTICS', title: line.trim(), includeLine: true };
  }

  if (/^ACESS[ÓO]RIOS\b|^ACCESSORIES\b/.test(upper)) {
    return { type: 'ACCESSORIES', title: line.trim(), includeLine: false };
  }

  if (allowInferred && looksLikeStrengthHeader(line, nextLine)) {
    return { type: 'STRENGTH', title: line.trim(), includeLine: true };
  }

  return null;
}

function looksLikeStrengthHeader(line, nextLine = '') {
  const upper = line.trim().toUpperCase();
  if (!upper || /[a-zà-ÿ]/.test(line)) return false;
  if (detectDayName(line) || detectPeriodName(line) || shouldSkipLine(line)) return false;
  if (/^OBJETIVO\b|^REST\b|^RECOVERY\b/.test(upper)) return false;
  if (!/[A-Z]/.test(upper)) return false;
  return isStrengthSchemeLine(nextLine) || isAccessorySchemeLine(nextLine);
}

function isStrengthSchemeLine(line = '') {
  return /^(\d+\+)+\d+\s*@\??$/i.test(line.trim()) || /^\d+\s*@\?\s*\+\s*\d+$/i.test(line.trim());
}

function isAccessorySchemeLine(line = '') {
  return /^\d+\s*x\s*\d+$/i.test(line.trim());
}

function mapLegacyBlockTypeToStructuredType(type) {
  const upper = String(type || '').trim().toUpperCase();
  if (upper.includes('WOD')) return 'WOD';
  if (upper === 'OPTIONAL') return 'OPTIONAL';
  if (upper === 'TIMED_WOD') return 'WOD';
  return upper || 'DEFAULT';
}

function buildStructuredBlock({ type, title, period, lines }) {
  const normalizedLines = (lines || []).map((line) => String(line || '').trim()).filter(Boolean);
  const references = normalizedLines.filter((line) => /https?:\/\/\S+/i.test(line));
  const effectiveLines = normalizedLines.filter((line) => !/https?:\/\/\S+/i.test(line));
  const parsed = parseStructuredBlockContent({
    type,
    title,
    period,
    lines: effectiveLines,
  });

  return {
    type: type || 'DEFAULT',
    title: title || '',
    period: period || null,
    lines: effectiveLines,
    references,
    parsed,
  };
}

function parseStructuredBlockContent({ type, title, period, lines }) {
  const items = [];
  let format = null;
  let rounds = null;
  let timeCapMinutes = null;
  let goal = '';

  lines.forEach((line) => {
    const upper = line.toUpperCase();

    const amrapMatch = upper.match(/^(\d+)\s*['’]?\s*AMRAP\b/);
    if (amrapMatch) {
      format = 'amrap';
      timeCapMinutes = Number(amrapMatch[1]);
      items.push({ type: 'format', format, timeCapMinutes, raw: line });
      return;
    }

    const roundsMatch = upper.match(/^(\d+)\s*X$/);
    if (roundsMatch) {
      rounds = Number(roundsMatch[1]);
      items.push({ type: 'rounds', rounds, raw: line });
      return;
    }

    const goalMatch = line.match(/^OBJETIVO\s*=\s*(.+)$/i);
    if (goalMatch) {
      goal = goalMatch[1].trim();
      items.push({ type: 'goal', text: goal, raw: line });
      return;
    }

    const restMatch = upper.match(/^(?:(\d+)\s*['’]\s*)?REST(?:\s+TOTAL)?(?:\s+(\d+)\s*['’])?$/);
    if (restMatch) {
      const minutes = Number(restMatch[1] || restMatch[2] || 0);
      items.push({ type: 'rest', durationMinutes: minutes || null, raw: line });
      return;
    }

    const recoveryMatch = upper.match(/^(\d+)\s*['’]\s*RECOVERY ROW\b/);
    if (recoveryMatch) {
      items.push({ type: 'recovery', modality: 'row', durationMinutes: Number(recoveryMatch[1]), raw: line });
      return;
    }

    if (/^https?:\/\//i.test(line)) {
      items.push({ type: 'reference', url: line.trim(), raw: line });
      return;
    }

    if (isStrengthSchemeLine(line)) {
      items.push({ type: 'strength_scheme', scheme: line.trim(), intensityUnknown: line.includes('?'), raw: line });
      return;
    }

    if (isAccessorySchemeLine(line)) {
      const match = line.trim().match(/^(\d+)\s*x\s*(\d+)$/i);
      items.push({
        type: 'scheme',
        sets: Number(match[1]),
        reps: Number(match[2]),
        raw: line,
      });
      return;
    }

    const movement = parseMovementLine(line);
    if (movement) {
      items.push(movement);
      return;
    }

    if (line.trim()) {
      items.push({ type: 'note', text: line.trim(), raw: line });
    }
  });

  return {
    blockType: String(type || 'DEFAULT').toLowerCase(),
    title: title || '',
    period: period || null,
    format,
    rounds,
    timeCapMinutes,
    goal: goal || null,
    items,
  };
}

function parseMovementLine(line) {
  const raw = String(line || '').trim();
  if (!raw) return null;

  const pairLoadMatch = raw.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*LBS?/i);
  const heightMatch = raw.match(/\((\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*CM\)/i);
  const alternativeMatch = raw.match(/\(OU\s+([^)]+)\)/i);
  const noteMatch = raw.match(/\((?!OU\s)([^)]+)\)/i);
  const repsMatch = raw.match(/^(\d+)\s+(.*)$/);
  const distanceMatch = raw.match(/^(\d+)\s*M\s+(.*)$/i);

  const item = {
    type: 'movement',
    raw,
    name: raw,
  };

  if (distanceMatch) {
    item.distanceMeters = Number(distanceMatch[1]);
    item.name = cleanupMovementName(distanceMatch[2]);
  } else if (repsMatch) {
    item.reps = Number(repsMatch[1]);
    item.name = cleanupMovementName(repsMatch[2]);
  }

  if (pairLoadMatch) {
    const maleLb = Number(pairLoadMatch[1]);
    const femaleLb = Number(pairLoadMatch[2]);
    item.load = {
      maleLb,
      femaleLb,
      maleKg: roundKg(lbsToKg(maleLb)),
      femaleKg: roundKg(lbsToKg(femaleLb)),
    };
  }

  if (heightMatch) {
    item.boxHeightCm = {
      min: Number(heightMatch[1]),
      max: Number(heightMatch[2]),
    };
  }

  if (alternativeMatch) {
    item.alternatives = [cleanupMovementName(alternativeMatch[1])];
  }

  if (noteMatch) {
    item.notes = noteMatch[1].trim();
  }

  return item;
}

function cleanupMovementName(value) {
  return String(value || '')
    .replace(/\(([^)]+)\)/g, '')
    .replace(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*LBS?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function roundKg(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}
