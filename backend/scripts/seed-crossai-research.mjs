import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = process.argv[2] || '.env.supabase';
const envPath = path.resolve(__dirname, '..', '..', envFile);

if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/^DATABASE_URL=(.*)$/m);
  if (match?.[1]) {
    process.env.DATABASE_URL = match[1].trim();
  }
}

const { pool } = await import('../src/db.js');

const STUDIES = [
  {
    slug: 'dolan-2024-time-equated-concurrent-training',
    title: 'The Effect of Time-Equated Concurrent Training Programs in Resistance-Trained Men',
    sourceType: 'trial',
    citationLabel: 'Dolan et al., 2024',
    authors: ['Chad Dolan', 'Justin M. Quiles', 'Jacob A. Goldsmith', 'Michael C. Zourdos'],
    publishedYear: 2024,
    abstract: 'Ensaio com homens treinados comparando treino de força isolado versus força combinada com ciclismo intervalado, ciclismo contínuo moderado ou circuito com barra.',
    metadata: {
      doi: '10.5114/jhk/185637',
      sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/38689592/',
      tags: ['concurrent training', 'strength', 'hypertrophy', 'endurance'],
    },
    chunks: [
      {
        sectionTitle: 'Resumo',
        content: 'Em homens já treinados, cerca de uma hora semanal de treino concorrente com ciclismo moderado, ciclismo intervalado ou circuito com barra, feito em dias sem treino de força, produziu ganhos de agachamento, supino e hipertrofia comparáveis ao treino de força isolado.',
      },
      {
        sectionTitle: 'Aplicação prática',
        content: 'O estudo sugere que o efeito de interferência pode ser pequeno quando o volume aeróbio é baixo, o condicionamento é bem dosado e as sessões de endurance não competem diretamente com o treino de força principal do mesmo dia.',
      },
    ],
  },
  {
    slug: 'vikestad-dalen-2024-sequence-endurance-performance',
    title: 'Effect of Strength and Endurance Training Sequence on Endurance Performance',
    sourceType: 'systematic-review',
    citationLabel: 'Vikestad & Dalen, 2024',
    authors: ['Vidar Vikestad', 'Terje Dalen'],
    publishedYear: 2024,
    abstract: 'Revisão de 15 estudos randomizados comparando a ordem endurance-força versus força-endurance e seus efeitos sobre desempenho de endurance.',
    metadata: {
      doi: '10.3390/sports12080226',
      sourceUrl: 'https://www.mdpi.com/2075-4663/12/8/226',
      tags: ['concurrent training', 'sequence', 'endurance performance', 'review'],
    },
    chunks: [
      {
        sectionTitle: 'Resumo',
        content: 'A revisão encontrou melhora de endurance nas duas sequências de treino concorrente, com efeitos pequenos e inconclusivos quando se compara fazer endurance antes da força versus força antes do endurance.',
      },
      {
        sectionTitle: 'Aplicação prática',
        content: 'Para desempenho aeróbio, a ordem das sessões dentro do treino concorrente parece importar menos do que controle de volume, qualidade da sessão e aderência. A revisão pede mais estudos em atletas mais treinados.',
      },
    ],
  },
  {
    slug: 'integrating-deloading-delphi-2023',
    title: 'Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach',
    sourceType: 'consensus',
    citationLabel: 'Delphi Consensus, 2023',
    authors: ['Eric Helms', 'Pat Davidson', 'Milo Wolf', 'panel internacional'],
    publishedYear: 2023,
    abstract: 'Consenso internacional sobre quando e como inserir deloads em programas de força e physique.',
    metadata: {
      sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10511399/',
      tags: ['deload', 'fatigue management', 'strength training', 'consensus'],
    },
    chunks: [
      {
        sectionTitle: 'Resumo',
        content: 'O consenso descreve deload como uma redução planejada e temporária de estresse de treino para controlar fadiga acumulada e melhorar a prontidão para o bloco seguinte. A decisão pode ser pré-planejada ou autorregulada conforme sinais de desempenho e recuperação.',
      },
      {
        sectionTitle: 'Aplicação prática',
        content: 'As recomendações favorecem reduzir volume, proximidade da falha ou frequência por um período curto, em vez de interromper totalmente o treino. O texto também destaca que a evidência experimental direta sobre superioridade de um modelo único de deload ainda é limitada.',
      },
    ],
  },
  {
    slug: 'effects-of-deload-periods-2026',
    title: 'Effects of Deload Periods in Resistance Training on Muscle Hypertrophy and Strength Endurance in Untrained Young Men Using a Randomized Within Subject Design',
    sourceType: 'trial',
    citationLabel: 'Deload Trial, 2026',
    authors: ['Autoria conforme PMC'],
    publishedYear: 2026,
    abstract: 'Estudo com homens não treinados testando deloads por redução de frequência e número de séries no meio e ao final de um bloco de oito semanas.',
    metadata: {
      sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13031491/',
      tags: ['deload', 'hypertrophy', 'strength endurance', 'trial'],
    },
    chunks: [
      {
        sectionTitle: 'Resumo',
        content: 'Em iniciantes, inserir semanas de deload com menor frequência e menor número de séries no meio e no fim de um bloco não impediu progresso de hipertrofia e resistência de força, sugerindo que a redução temporária de carga pode coexistir com adaptações positivas.',
      },
      {
        sectionTitle: 'Aplicação prática',
        content: 'O estudo é útil para discutir gestão de fadiga, mas deve ser interpretado com cautela para atletas treinados, porque a amostra era de jovens sem experiência prévia em musculação.',
      },
    ],
  },
];

async function ensureSchema() {
  const sqlPath = path.resolve(__dirname, '..', 'sql', '2026-04-04-crossai-research.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
}

async function upsertStudy(client, study) {
  const docRes = await client.query(
    `INSERT INTO study_documents (
       slug, title, source_type, citation_label, authors, published_year, abstract, tags, metadata
     )
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb,$9::jsonb)
     ON CONFLICT (slug) DO UPDATE
       SET title = EXCLUDED.title,
           source_type = EXCLUDED.source_type,
           citation_label = EXCLUDED.citation_label,
           authors = EXCLUDED.authors,
           published_year = EXCLUDED.published_year,
           abstract = EXCLUDED.abstract,
           tags = EXCLUDED.tags,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
     RETURNING id`,
    [
      study.slug,
      study.title,
      study.sourceType,
      study.citationLabel,
      JSON.stringify(study.authors || []),
      study.publishedYear,
      study.abstract,
      JSON.stringify(study.metadata?.tags || []),
      JSON.stringify(study.metadata || {}),
    ],
  );

  const documentId = docRes.rows[0].id;
  await client.query('DELETE FROM study_chunks WHERE document_id = $1', [documentId]);

  for (const [index, chunk] of study.chunks.entries()) {
    await client.query(
      `INSERT INTO study_chunks (document_id, chunk_index, section_title, page_label, content, token_count, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        documentId,
        index,
        chunk.sectionTitle || null,
        chunk.pageLabel || null,
        chunk.content,
        chunk.content.split(/\s+/).filter(Boolean).length,
        JSON.stringify({ sourceUrl: study.metadata?.sourceUrl || null }),
      ],
    );
  }
}

async function main() {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const study of STUDIES) {
      await upsertStudy(client, study);
    }
    await client.query('COMMIT');
    console.log('seed-crossai-research-ok', STUDIES.length);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('seed-crossai-research-fail', error);
  process.exit(1);
});
