import {
  pgTable,
  text,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { Mutation } from './zod';

export const worldNodes = pgTable('world_nodes', {
  node_id: text('node_id').primaryKey(),
  zone: text('zone').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  is_unlocked: boolean('is_unlocked').notNull().default(false),
  is_corrupted: boolean('is_corrupted').notNull().default(false),
  allowed_actions: jsonb('allowed_actions').$type<string[]>().notNull().default([]),
});

export const itemCatalog = pgTable('item_catalog', {
  item_id: text('item_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
});

export const actionTemplates = pgTable('action_templates', {
  template_id: text('template_id').primaryKey(),
  label: text('label').notNull(),
  narrative_hint: text('narrative_hint').notNull(),
  requires: jsonb('requires')
    .$type<{ items: string[]; flags: Record<string, boolean> }>()
    .notNull(),
  effects: jsonb('effects').$type<Mutation[]>().notNull(),
});

export const playerInventory = pgTable(
  'player_inventory',
  {
    session_id: text('session_id').notNull(),
    item_id: text('item_id').notNull(),
    acquired_timestamp: timestamp('acquired_timestamp').notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.session_id, table.item_id] })]
);

export const storyFlags = pgTable(
  'story_flags',
  {
    session_id: text('session_id').notNull(),
    key: text('key').notNull(),
    value: boolean('value').notNull(),
  },
  (table) => [primaryKey({ columns: [table.session_id, table.key] })]
);

export const sessions = pgTable('sessions', {
  session_id: text('session_id').primaryKey(),
  user_id: text('user_id').notNull(),
  current_location_id: text('current_location_id').notNull(),
  last_updated: timestamp('last_updated').notNull().defaultNow(),
});

export const historicalLedger = pgTable('historical_ledger', {
  id: text('id').primaryKey(),
  session_id: text('session_id').notNull(),
  ts: timestamp('ts').notNull().defaultNow(),
  action: text('action').notNull(),
  narrative_summary: text('narrative_summary').notNull(),
});
