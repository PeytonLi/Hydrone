import { ACTION_TEMPLATES } from "../content/seed";
import type { ActionTemplate } from "../schema/zod";

// In-memory registry seeded from authored templates.
// Dynamic templates (LLM-generated) are added via register().
// loadSeed() repopulates from Postgres on cold start so dynamic templates
// created in previous server instances survive restarts.
const registry = new Map<string, ActionTemplate>(
  ACTION_TEMPLATES.map((t) => [t.template_id, t]),
);

export const templateRegistry = {
  get: (id: string): ActionTemplate | undefined => registry.get(id),
  getAll: (): ActionTemplate[] => Array.from(registry.values()),
  register: (t: ActionTemplate): void => {
    registry.set(t.template_id, t);
  },
  registerMany: (templates: ActionTemplate[]): void => {
    for (const t of templates) registry.set(t.template_id, t);
  },
};
