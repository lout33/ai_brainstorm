// Council Module
// Implements the 3-stage LLM Council workflow:
// Stage 1: (Already done by agent - multiple responses exist)
// Stage 2: Each model ranks the anonymized responses
// Stage 3: Chairman synthesizes final response

import { sendChatCompletion, extractMessageContent } from './openrouter-client.js';

/**
 * Stage 2: Collect rankings from each model
 * Each model evaluates and ranks the anonymized responses
 *
 * @param {string} userQuery - The original user query
 * @param {Array} responses - Array of {modelId, modelName, content}
 * @param {string} apiKey - OpenRouter API key
 * @returns {Object} {rankings, labelToModel}
 */
export async function collectRankings(userQuery, responses, apiKey) {
  // Create anonymized labels (Response A, Response B, etc.)
  const labels = responses.map((_, i) => String.fromCharCode(65 + i)); // A, B, C...

  // Create mapping from label to model
  const labelToModel = {};
  labels.forEach((label, i) => {
    labelToModel[`Response ${label}`] = {
      modelId: responses[i].modelId,
      modelName: responses[i].modelName
    };
  });

  // Build anonymized responses text
  const responsesText = responses.map((r, i) =>
    `Response ${labels[i]}:\n${r.content}`
  ).join('\n\n');

  // Build ranking prompt
  const rankingPrompt = `You are evaluating different responses to the following question:

Question: ${userQuery}

Here are the responses from different models (anonymized):

${responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`;

  const messages = [{ role: 'user', content: rankingPrompt }];

  // Query all models in parallel for their rankings
  const rankingPromises = responses.map(async (r) => {
    try {
      const response = await sendChatCompletion(r.modelId, messages, apiKey);
      const content = extractMessageContent(response);
      return {
        modelId: r.modelId,
        modelName: r.modelName,
        fullRanking: content,
        parsedRanking: parseRanking(content)
      };
    } catch (error) {
      console.error(`Error getting ranking from ${r.modelName}:`, error);
      return {
        modelId: r.modelId,
        modelName: r.modelName,
        fullRanking: `Error: ${error.message}`,
        parsedRanking: []
      };
    }
  });

  const rankings = await Promise.all(rankingPromises);

  return { rankings, labelToModel };
}

/**
 * Stage 3: Chairman synthesizes the final response
 *
 * @param {string} userQuery - The original user query
 * @param {Array} responses - Array of {modelId, modelName, content}
 * @param {Array} rankings - Rankings from stage 2
 * @param {string} chairmanModelId - Model ID to use as chairman
 * @param {string} apiKey - OpenRouter API key
 * @returns {Object} {modelId, modelName, content}
 */
export async function synthesizeFinal(userQuery, responses, rankings, chairmanModelId, apiKey) {
  // Build stage 1 context (individual responses)
  const stage1Text = responses.map(r =>
    `Model: ${r.modelName}\nResponse: ${r.content}`
  ).join('\n\n');

  // Build stage 2 context (rankings)
  const stage2Text = rankings.map(r =>
    `Model: ${r.modelName}\nRanking: ${r.fullRanking}`
  ).join('\n\n');

  const chairmanPrompt = `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: ${userQuery}

STAGE 1 - Individual Responses:
${stage1Text}

STAGE 2 - Peer Rankings:
${stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`;

  const messages = [{ role: 'user', content: chairmanPrompt }];

  try {
    const response = await sendChatCompletion(chairmanModelId, messages, apiKey);
    const content = extractMessageContent(response);

    // Find chairman name
    const chairmanModel = responses.find(r => r.modelId === chairmanModelId);

    return {
      modelId: chairmanModelId,
      modelName: chairmanModel?.modelName || 'Chairman',
      content
    };
  } catch (error) {
    console.error('Error in chairman synthesis:', error);
    return {
      modelId: chairmanModelId,
      modelName: 'Chairman',
      content: `Error synthesizing response: ${error.message}`
    };
  }
}

/**
 * Parse the FINAL RANKING section from a model's response
 *
 * @param {string} text - Full ranking response text
 * @returns {Array} Array of response labels in ranked order
 */
export function parseRanking(text) {
  // Look for "FINAL RANKING:" section
  if (text.includes('FINAL RANKING:')) {
    const parts = text.split('FINAL RANKING:');
    if (parts.length >= 2) {
      const rankingSection = parts[1];

      // Try to extract numbered list format (e.g., "1. Response A")
      const numberedMatches = rankingSection.match(/\d+\.\s*Response [A-Z]/g);
      if (numberedMatches) {
        return numberedMatches.map(m => {
          const match = m.match(/Response [A-Z]/);
          return match ? match[0] : null;
        }).filter(Boolean);
      }

      // Fallback: Extract all "Response X" patterns in order
      const matches = rankingSection.match(/Response [A-Z]/g);
      return matches || [];
    }
  }

  // Fallback: try to find any "Response X" patterns in order
  const matches = text.match(/Response [A-Z]/g);
  return matches || [];
}

/**
 * Calculate aggregate rankings across all models
 *
 * @param {Array} rankings - Rankings from each model
 * @param {Object} labelToModel - Mapping from labels to model info
 * @returns {Array} Sorted array of {modelId, modelName, avgRank, rankingsCount}
 */
export function calculateAggregateRankings(rankings, labelToModel) {
  // Track positions for each response
  const positionsByLabel = {};

  for (const ranking of rankings) {
    const parsed = ranking.parsedRanking;

    for (let position = 0; position < parsed.length; position++) {
      const label = parsed[position];
      if (!positionsByLabel[label]) {
        positionsByLabel[label] = [];
      }
      positionsByLabel[label].push(position + 1); // 1-indexed position
    }
  }

  // Calculate average position for each model
  const aggregate = [];
  for (const [label, positions] of Object.entries(positionsByLabel)) {
    if (positions.length > 0 && labelToModel[label]) {
      const avgRank = positions.reduce((a, b) => a + b, 0) / positions.length;
      aggregate.push({
        label,
        modelId: labelToModel[label].modelId,
        modelName: labelToModel[label].modelName,
        avgRank: Math.round(avgRank * 100) / 100,
        rankingsCount: positions.length
      });
    }
  }

  // Sort by average rank (lower is better)
  aggregate.sort((a, b) => a.avgRank - b.avgRank);

  return aggregate;
}

/**
 * Run the full council process (stages 2 and 3)
 * Stage 1 (collecting responses) is already done by the agent
 *
 * @param {string} userQuery - The original user query
 * @param {Array} responses - Array of {modelId, modelName, content}
 * @param {string} apiKey - OpenRouter API key
 * @param {string} chairmanModelId - Optional chairman model ID (defaults to first model)
 * @returns {Object} {rankings, labelToModel, aggregateRankings, synthesis}
 */
export async function runCouncil(userQuery, responses, apiKey, chairmanModelId = null) {
  // Validate we have enough responses
  if (responses.length < 2) {
    throw new Error('Council requires at least 2 responses');
  }

  // Default chairman to first model
  const chairman = chairmanModelId || responses[0].modelId;

  // Stage 2: Collect rankings
  const { rankings, labelToModel } = await collectRankings(userQuery, responses, apiKey);

  // Calculate aggregate rankings
  const aggregateRankings = calculateAggregateRankings(rankings, labelToModel);

  // Stage 3: Chairman synthesis
  const synthesis = await synthesizeFinal(userQuery, responses, rankings, chairman, apiKey);

  return {
    rankings,
    labelToModel,
    aggregateRankings,
    synthesis
  };
}
