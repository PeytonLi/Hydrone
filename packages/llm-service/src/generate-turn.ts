import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { LLMGameResponseSchema } from "@hydrone/core";
import type { TurnContext, LLMGameResponse } from "@hydrone/core";
import { composePrompt } from "./prompt-composer";

function getModel() {
  // DeepSeek (fast, cheap) — preferred if key is set
  if (process.env.DEEPSEEK_API_KEY) {
    const deepseek = createOpenAI({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    console.log("[LLM] Using DeepSeek (deepseek-chat)");
    return deepseek("deepseek-chat");
  }

  // Anthropic Claude (fallback)
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("[LLM] Using Anthropic (claude-sonnet-4-6)");
    return anthropic("claude-sonnet-4-6");
  }

  return null;
}

export async function generateTurn(ctx: TurnContext): Promise<LLMGameResponse> {
  const { system, prompt } = composePrompt(ctx);
  const model = getModel();

  if (!model) {
    console.warn("[LLM] No LLM provider configured — using fallback narration");
    return {
      narrative_text:
        "The system hums quietly. No AI narrator is connected — set DEEPSEEK_API_KEY or ANTHROPIC_API_KEY.",
      character_portrait_mood: "neutral",
      system_log_message: "LLM_OFFLINE: No API key configured.",
      chosen_action_id: ctx.action_id,
      suggested_action_buttons: ctx.allowed_actions.slice(0, 5).map((a) => ({
        button_label: a.label,
        action_id: a.template_id,
      })),
    };
  }

  try {
    const result = await generateObject({
      model: model as any,
      schema: LLMGameResponseSchema,
      system,
      prompt,
      temperature: 0.8,
      maxTokens: 2000,
    });

    const usage = (result as any).usage;
    return {
      ...(result.object as LLMGameResponse),
      promptTokens: usage?.promptTokens ?? undefined,
      completionTokens: usage?.completionTokens ?? undefined,
    };
  } catch (error: any) {
    // DeepSeek sometimes string-encodes nested objects like new_node_spec.
    // Try to recover by parsing the raw text response.
    const rawText = error?.text || error?.value?.text || error?.response?.text;
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
        // If new_node_spec is a string, parse it into an object
        if (typeof parsed.new_node_spec === "string") {
          parsed.new_node_spec = JSON.parse(parsed.new_node_spec);
        }
        const validated = LLMGameResponseSchema.safeParse(parsed);
        if (validated.success) {
          console.log("[LLM] Recovered from string-encoded new_node_spec");
          return validated.data;
        }
      } catch {
        // Recovery failed, fall through to fallback
      }
    }

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
