-- =====================================================
-- migration: enable extensions
-- description: enables pgvector and unaccent extensions for semantic search and better text search
-- tables affected: none (extensions only)
-- author: prawnikgpt
-- date: 2025-01-12
-- =====================================================

-- enable pgvector extension for vector similarity search
-- this extension adds vector data type and similarity search operators
-- required for storing and searching embeddings from ollama models
create extension if not exists vector;

-- enable unaccent extension for better polish text search
-- removes diacritics (polish characters like ą, ć, ę, ł, ń, ó, ś, ź, ż)
-- improves full-text search quality for polish language
create extension if not exists unaccent;

-- note: these extensions are safe to run multiple times (if not exists)
-- they are required before creating any tables that use vector type

