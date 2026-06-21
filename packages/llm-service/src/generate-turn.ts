import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { LLMGameResponseSchema } from "@hydrone/core";
import type { TurnContext, LLMGameResponse } from "@hydrone/core";
import { composePrompt } from "./prompt-composer";

export async function generateTurn(ctx: TurnContext): Promise<LLMGameResponse> {
  const { system, prompt } = composePrompt(ctx);

  try {
    const result = await generateObject({
      model: anthropic("claude-sonnet-4-6"),
      schema: LLMGameResponseSchema,
      system,
      prompt,
      temperature: 0.8,
      maxTokens: 1000,
    });

    return result.object as LLMGameResponse;
  } catch (error) {
    console.error("generateTurn failed, returning fallback:", error);
    return {
      narrative_text:
        "The system stutters... reality blurs for a moment before snapping back into focus.",
      character_portrait_mood: "neutral",
      system_log_message:
        "LLM_ERR: Narrative generation failed. Using fallback response.",
      chosen_action_id: ctx.action_id,
      suggested_action_buttons: ctx.allowed_actions.slice(0, 5).map((a) => ({
        button_label: a.label,
        action_id: a.template_id,
      })),
    };
  }
}
