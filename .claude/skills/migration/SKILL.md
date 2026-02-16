---
name: migration
description: Create and apply a Supabase database migration with RLS policies
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Grep, Glob, mcp__claude_ai_Supabase__apply_migration, mcp__claude_ai_Supabase__list_tables, mcp__claude_ai_Supabase__execute_sql, mcp__claude_ai_Supabase__list_migrations
argument-hint: [migration description]
---

# Migration Skill — Supabase Database Migration

## Rules

1. Use `snake_case` for migration names.
2. ALWAYS include RLS policies for new tables.
3. Enable RLS on every table: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
4. Use the Supabase MCP tools to apply the migration.
5. Verify with `list_tables` after applying.

## Usage

The argument `$ARGUMENTS` describes the schema change.

## Workflow

1. Review existing tables with `list_tables` to understand current schema.
2. Review existing migrations with `list_migrations` to avoid conflicts.
3. Write the migration SQL with:
   - Table creation / alteration
   - RLS enablement
   - RLS policies (SELECT, INSERT, UPDATE, DELETE as needed)
   - Indexes for frequently queried columns
4. Apply with `apply_migration`.
5. Verify with `list_tables`.

## Migration Template

```sql
-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own rows"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rows"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rows"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rows"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```
