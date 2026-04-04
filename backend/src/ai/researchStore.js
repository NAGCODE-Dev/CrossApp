import { pool } from '../db.js';

function isMissingRelationError(error) {
  return error?.code === '42P01' || error?.code === '42703';
}

async function safeQuery(query, params = []) {
  try {
    return await pool.query(query, params);
  } catch (error) {
    if (isMissingRelationError(error)) {
      return { rows: [] };
    }
    throw error;
  }
}

export async function searchLocalResearchChunks({ question, limit = 6 }) {
  const rawQuestion = String(question || '').trim();
  if (!rawQuestion) return [];

  const tokens = Array.from(new Set(
    rawQuestion
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/[^\p{L}\p{N}-]/gu, '').trim())
      .filter((token) => token.length >= 3),
  ));

  const result = await safeQuery(
    `SELECT
       c.id,
       c.document_id,
       c.chunk_index,
       c.content,
       c.section_title,
       c.page_label,
       d.title,
       d.source_type,
       d.citation_label,
       d.authors,
       d.published_year
     FROM study_chunks c
     JOIN study_documents d ON d.id = c.document_id
     ORDER BY d.published_year DESC NULLS LAST, c.chunk_index ASC
     LIMIT 200`,
    [],
  );

  return result.rows
    .map((row) => {
      const titleHaystack = `${row.title || ''} ${row.citation_label || ''}`.toLowerCase();
      const contentHaystack = `${row.section_title || ''} ${row.content || ''}`.toLowerCase();
      const titleMatches = tokens.filter((token) => titleHaystack.includes(token));
      const contentMatches = tokens.filter((token) => contentHaystack.includes(token));
      const keywordBoost =
        (tokens.includes('concurrent') && titleHaystack.includes('concurrent') ? 12 : 0)
        + (tokens.some((token) => token.includes('deload') || token.includes('fadig')) && titleHaystack.includes('deload') ? 12 : 0)
        + (tokens.includes('cardio') && titleHaystack.includes('concurrent') ? 6 : 0);
      return {
        id: row.id,
        documentId: row.document_id,
        title: row.title || row.citation_label || 'Fonte sem título',
        citationLabel: row.citation_label || row.title || 'Fonte local',
        sourceType: row.source_type || 'study',
        authors: row.authors || [],
        publishedYear: row.published_year || null,
        sectionTitle: row.section_title || '',
        pageLabel: row.page_label || '',
        content: row.content || '',
        rank: (titleMatches.length * 4) + contentMatches.length + keywordBoost,
      };
    })
    .filter((row) => row.rank > 0)
    .sort((a, b) => (b.rank - a.rank) || ((b.publishedYear || 0) - (a.publishedYear || 0)))
    .slice(0, Math.max(Number(limit) || 6, 1));
}
