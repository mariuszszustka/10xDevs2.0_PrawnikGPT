-- =====================================================
-- migration: enable extensions
-- description: enables pgvector and unaccent extensions for semantic search and text processing
-- tables affected: none (extensions only)
-- author: prawnikgpt
-- date: 2025-11-18
-- notes: these extensions must be enabled before creating tables with vector types
-- =====================================================

-- enable pgvector extension for vector similarity search
-- this extension adds the vector data type and similarity search operators (<=>)
-- required for storing and searching embeddings from ollama models (nomic-embed-text, mxbai-embed-large)
-- supports vectors up to 16,000 dimensions (we use 1024 for flexibility)
create extension if not exists vector;

-- enable unaccent extension for better polish text search
-- removes polish diacritics: ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z
-- improves full-text search tolerance for typos and alternative spellings
-- example: "prawo" matches "práwo" or "prąwo"
create extension if not exists unaccent;

-- note: these extensions are safe to run multiple times (if not exists)
-- supabase has both extensions available by default in all projects
-- no additional configuration needed

