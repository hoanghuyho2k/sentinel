-- db/create_tables.sql

CREATE TABLE IF NOT EXISTS compliance_results (
  id SERIAL PRIMARY KEY,
  commit_hash VARCHAR(128),
  repo_name VARCHAR(255),
  commit_message TEXT,
  files_changed TEXT[],
  labels TEXT[],
  is_compliant BOOLEAN,
  compliance_message TEXT,
  compliance_title TEXT,
  category TEXT,
  confidence REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id SERIAL PRIMARY KEY,
  commit_hash VARCHAR(128),
  repo_name VARCHAR(255),
  risk_score NUMERIC,
  factors JSONB,
  risk_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_chat (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(128),
  commit_hash VARCHAR(128),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
