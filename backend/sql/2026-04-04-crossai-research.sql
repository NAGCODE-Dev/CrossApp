CREATE TABLE IF NOT EXISTS study_documents (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'study',
  citation_label TEXT,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_year INT,
  abstract TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES study_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  section_title TEXT,
  page_label TEXT,
  content TEXT NOT NULL,
  token_count INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_study_chunks_document_id ON study_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_study_chunks_tsv
  ON study_chunks
  USING GIN (to_tsvector('simple', content));

CREATE INDEX IF NOT EXISTS idx_study_documents_title_tsv
  ON study_documents
  USING GIN (to_tsvector('simple', coalesce(title, '')));
