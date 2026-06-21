import { z } from 'zod';

export const MutationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add_item'), item_id: z.string() }),
  z.object({ type: z.literal('remove_item'), item_id: z.string() }),
  z.object({ type: z.literal('set_flag'), key: z.string(), value: z.boolean() }),
  z.object({ type: z.literal('unlock_node'), node_id: z.string() }),
  z.object({ type: z.literal('corrupt_node'), node_id: z.string() }),
  z.object({ type: z.literal('move_to'), node_id: z.string() }),
]);
export type Mutation = z.infer<typeof MutationSchema>;

export const WorldNodeSchema = z.object({
  node_id: z.string(),
  zone: z.string(),
  name: z.string(),
  description: z.string(),
  is_unlocked: z.boolean(),
  is_corrupted: z.boolean(),
  allowed_actions: z.array(z.string()),
});
export type WorldNode = z.infer<typeof WorldNodeSchema>;

export const ItemCatalogEntrySchema = z.object({
  item_id: z.string(),
  name: z.string(),
  description: z.string(),
});
export type ItemCatalogEntry = z.infer<typeof ItemCatalogEntrySchema>;

export const ActionTemplateSchema = z.object({
  template_id: z.string(),
  label: z.string(),
  narrative_hint: z.string(),
  requires: z.object({
    items: z.array(z.string()),
    flags: z.record(z.string(), z.boolean()),
  }),
  effects: z.array(MutationSchema),
});
export type ActionTemplate = z.infer<typeof ActionTemplateSchema>;

export const NodeSpecSchema = z.object({
  node_name: z.string(),
  zone: z.string(),
  edges: z.array(z.string()),
  action_template_ids: z.array(z.string()),
  item_ids: z.array(z.string()),
});
export type NodeSpec = z.infer<typeof NodeSpecSchema>;

export const LLMGameResponseSchema = z.object({
  narrative_text: z.string(),
  character_portrait_mood: z.enum([
    'neutral',
    'excited',
    'worried',
    'triumphant',
    'defeated',
  ]),
  system_log_message: z.string(),
  chosen_action_id: z.string(),
  new_node_spec: NodeSpecSchema.optional(),
  suggested_action_buttons: z.array(
    z.object({ button_label: z.string(), action_id: z.string() })
  ),
});
export type LLMGameResponse = z.infer<typeof LLMGameResponseSchema>;

export const SubGraphSchema = z.object({
  session_id: z.string(),
  current_node: WorldNodeSchema,
  neighbors: z.array(WorldNodeSchema),
  inventory: z.array(z.string()),
  flags: z.record(z.string(), z.boolean()),
});
export type SubGraph = z.infer<typeof SubGraphSchema>;

export const WorldStateSchema = z.object({
  session_id: z.string(),
  current_location_id: z.string(),
  inventory: z.array(z.string()),
  flags: z.record(z.string(), z.boolean()),
});
export type WorldState = z.infer<typeof WorldStateSchema>;

export const LoreDocSchema = z.object({
  type: z.literal('knowledge'),
  title: z.string(),
  content: z.string(),
});
export type LoreDoc = z.infer<typeof LoreDocSchema>;

export const LedgerEntrySchema = z.object({
  session_id: z.string(),
  ts: z.date(),
  action: z.string(),
  narrative_summary: z.string(),
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const ChunkSchema = z.object({
  content: z.string(),
  relevance_score: z.number(),
});
export type Chunk = z.infer<typeof ChunkSchema>;

export const TurnContextSchema = z.object({
  session_id: z.string(),
  subgraph: SubGraphSchema,
  allowed_actions: z.array(ActionTemplateSchema),
  memory_chunks: z.array(ChunkSchema),
  action_id: z.string(),
});
export type TurnContext = z.infer<typeof TurnContextSchema>;
