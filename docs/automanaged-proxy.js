import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const app = express();
app.use(express.json());

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Request limits
const GUEST_REQUEST_LIMIT = 15;
const USER_REQUEST_LIMIT = 20;

// Provider-specific configuration (OpenRouter + Groq)
const PROVIDER_CONFIGS = {
    openrouter: {
        apiKey: process.env.AUTOMANAGED_API_KEY_OPENROUTER || process.env.AUTOMANAGED_API_KEY,
        baseURL: process.env.AUTOMANAGED_BASE_URL_OPENROUTER || process.env.AUTOMANAGED_BASE_URL || 'https://openrouter.ai/api/v1'
    },
    groq: {
        apiKey: process.env.AUTOMANAGED_API_KEY__GROQ || process.env.AUTOMANAGED_API_KEY_GROQ,
        baseURL: process.env.AUTOMANAGED_BASE_URL_GROQ || 'https://api.groq.com/openai/v1'
    }
};

// Automanaged AI configuration
const AUTOMANAGED_CONFIG = {
    defaultModel: process.env.AUTOMANAGED_MODEL || 'google/gemini-2.0-flash-exp:free',
    providers: PROVIDER_CONFIGS
};

// Available models for automanaged mode (managed by backend)
const AVAILABLE_MODELS = [
    {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash (Free)',
        description: 'Fast and capable, completely free tier from Google',
        provider: 'Google',
        providerKey: 'openrouter',
        contextWindow: 32768
    },
    {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        description: '120B open-source mixture with OpenAI-compatible responses via Groq',
        provider: 'Groq',
        providerKey: 'groq',
        contextWindow: 32768
    },
    {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        description: 'Meta\'s flagship reasoning model hosted on Groq',
        provider: 'Groq',
        providerKey: 'groq',
        contextWindow: 131072
    },
    {
        id: 'qwen/qwen3-32b',
        name: 'Qwen 3 32B',
        description: 'Aligned Qwen 3 32B instruct model served by Groq',
        provider: 'Groq',
        providerKey: 'groq',
        contextWindow: 131072
    }
];

/**
 * Get or create request usage record
 * Handles concurrent requests with race condition protection
 */
async function getOrCreateUsage(userId, sessionId) {
    // Try to get existing record
    const { data, error } = await supabase
        .from('user_request_usage')
        .select('*')
        .or(userId ? `user_id.eq.${userId}` : `session_id.eq.${sessionId}`)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Database error: ${error.message}`);
    }

    if (data) {
        return data;
    }

    // Try to create new record
    const { data: newRecord, error: insertError } = await supabase
        .from('user_request_usage')
        .insert({
            user_id: userId || null,
            session_id: userId ? null : sessionId,
            request_count: 0,
            last_request_at: new Date().toISOString()
        })
        .select()
        .single();

    // If insert succeeded, return the new record
    if (!insertError) {
        return newRecord;
    }

    // Handle race condition: another request created the record between our SELECT and INSERT
    // This happens when multiple models call the backend in parallel
    if (insertError.code === '23505') { // Unique constraint violation
        console.log('⚠️  Race condition detected, retrying SELECT...');
        const { data: existingRecord, error: retryError } = await supabase
            .from('user_request_usage')
            .select('*')
            .or(userId ? `user_id.eq.${userId}` : `session_id.eq.${sessionId}`)
            .single();
        
        if (retryError) {
            throw new Error(`Failed to retrieve usage record after race condition: ${retryError.message}`);
        }
        
        return existingRecord;
    }

    // Other insert errors
    throw new Error(`Failed to create usage record: ${insertError.message}`);
}

/**
 * Check if user/session has remaining requests
 */
async function checkRequestLimits(userId, sessionId) {
    const usage = await getOrCreateUsage(userId, sessionId);
    const limit = userId ? USER_REQUEST_LIMIT : GUEST_REQUEST_LIMIT;
    const remaining = Math.max(0, limit - usage.request_count);

    return {
        requestCount: usage.request_count,
        limit,
        remaining,
        hasRequests: remaining > 0
    };
}

/**
 * Increment request count
 */
async function incrementRequestCount(userId, sessionId) {
    // First, get the current usage record
    const usage = await getOrCreateUsage(userId, sessionId);
    
    // Then increment it
    const { data, error } = await supabase
        .from('user_request_usage')
        .update({
            request_count: usage.request_count + 1,
            last_request_at: new Date().toISOString()
        })
        .eq('id', usage.id)
        .select()
        .single();

    if (error) {
        console.error('Failed to increment request count:', error);
        throw new Error(`Failed to increment request count: ${error.message}`);
    }

    console.log(`✅ Request counted: ${data.request_count}/${userId ? USER_REQUEST_LIMIT : GUEST_REQUEST_LIMIT}`);
    return data;
}

/**
 * Build endpoint URL for chat completions (matching frontend logic)
 */
function buildChatEndpoint(baseURL) {
    const trimmed = (baseURL || '').replace(/\/$/, '');
    if (trimmed.endsWith('/chat/completions')) {
        return trimmed;
    }
    return `${trimmed}/chat/completions`;
}

/**
 * Get provider-specific extra headers (matching frontend aiService.js)
 */
function getExtraHeaders(baseURL = '') {
    if (typeof baseURL === 'string' && baseURL.includes('openrouter.ai')) {
        return {
            "HTTP-Referer": "https://infinite-canvas.app",
            "X-Title": "Infinite Canvas AI"
        };
    }
    return {};
}

/**
 * Call OpenAI-compatible API with streaming (matching frontend aiService.js logic)
 */
async function callOpenAICompatible(messages, model, providerConfig, onToken) {
    if (!providerConfig || !providerConfig.baseURL || !providerConfig.apiKey) {
        throw new Error(`Missing provider configuration for model: ${model}`);
    }

    const endpoint = buildChatEndpoint(providerConfig.baseURL);
    
    // Build headers with provider-specific extras
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
        'Accept': 'text/event-stream'
    };
    
    // Add extra headers for OpenRouter or other providers
    const extraHeaders = getExtraHeaders(providerConfig.baseURL);
    Object.entries(extraHeaders).forEach(([key, value]) => {
        headers[key] = value;
    });
    
    console.log('🤖 Calling AI Provider:', model);
    console.log('🔗 Endpoint:', endpoint);
    
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: model,
            messages,
            temperature: 0.7,
            stream: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    let fullContent = '';
    let buffer = '';

    // Node.js stream handling (node-fetch returns a Node.js stream)
    for await (const chunk of response.body) {
        buffer += chunk.toString('utf-8');

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const rawLine = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            const line = rawLine.trim();
            if (!line) continue;
            if (line.startsWith(':')) continue; // SSE comment / heartbeat

            if (!line.startsWith('data:')) {
                continue;
            }

            const data = line.slice(5).trim();
                
            if (data === '[DONE]') {
                continue;
            }

            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                
                if (content) {
                    fullContent += content;
                    if (onToken) {
                        await onToken({ content, full: fullContent, done: false });
                    }
                }
            } catch (e) {
                // Skip invalid JSON
                continue;
            }
        }
    }

    console.log('✅ Response completed, length:', fullContent.length);
    return fullContent;
}

/**
 * GET /api/automanaged/models
 * Get available models for automanaged mode
 */
app.get('/api/automanaged/models', (req, res) => {
    res.json({
        models: AVAILABLE_MODELS,
        defaultModel: AUTOMANAGED_CONFIG.defaultModel
    });
});

/**
 * POST /api/automanaged/check-limits
 * Check remaining requests for user or guest session
 */
app.post('/api/automanaged/check-limits', async (req, res) => {
    try {
        const { userId, sessionId } = req.body;

        if (!userId && !sessionId) {
            return res.status(400).json({ error: 'Either userId or sessionId required' });
        }

        const limits = await checkRequestLimits(userId, sessionId);
        res.json(limits);
    } catch (error) {
        console.error('Error checking limits:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/automanaged/generate
 * Generate AI response for single request
 */
app.post('/api/automanaged/generate', async (req, res) => {
    try {
        const { userId, sessionId, messages, systemPrompt, model } = req.body;

        if (!userId && !sessionId) {
            return res.status(400).json({ error: 'Either userId or sessionId required' });
        }

        // Validate and get model
        const selectedModel = model || AUTOMANAGED_CONFIG.defaultModel;
        const modelEntry = AVAILABLE_MODELS.find(m => m.id === selectedModel);
        
        if (!modelEntry) {
            return res.status(400).json({ 
                error: 'Invalid model selected',
                availableModels: AVAILABLE_MODELS.map(m => m.id)
            });
        }

        const providerKey = modelEntry.providerKey || 'openrouter';
        const providerConfig = PROVIDER_CONFIGS[providerKey];

        if (!providerConfig || !providerConfig.baseURL || !providerConfig.apiKey) {
            return res.status(500).json({
                error: `Missing provider configuration for model ${selectedModel}`,
                provider: providerKey
            });
        }

        // Check limits
        const limits = await checkRequestLimits(userId, sessionId);
        if (!limits.hasRequests) {
            return res.status(429).json({
                error: 'Request limit reached',
                requestCount: limits.requestCount,
                limit: limits.limit,
                isGuest: !userId
            });
        }

        // Prepare messages with system prompt
        const finalMessages = [...messages];
        if (systemPrompt) {
            finalMessages.unshift({ role: 'system', content: systemPrompt });
        }

        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let requestIncremented = false;

        // Call API with streaming (pass selected model)
        const content = await callOpenAICompatible(finalMessages, selectedModel, providerConfig, async (update) => {
            res.write(`data: ${JSON.stringify(update)}\n\n`);
            
            // Increment on first successful token
            if (!requestIncremented && update.content) {
                console.log('📊 Incrementing request count...');
                try {
                    await incrementRequestCount(userId, sessionId);
                    requestIncremented = true;
                } catch (err) {
                    console.error('❌ Failed to increment:', err);
                }
            }
        });

        // Send final message
        res.write(`data: ${JSON.stringify({ content, full: content, done: true })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('Error generating response:', error);
        
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        } else {
            res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
            res.end();
        }
    }
});

/**
 * POST /api/automanaged/merge-guest-usage
 * Merge guest session usage into user account after login
 */
app.post('/api/automanaged/merge-guest-usage', async (req, res) => {
    try {
        const { userId, sessionId } = req.body;

        if (!userId || !sessionId) {
            return res.status(400).json({ error: 'Both userId and sessionId required' });
        }

        // Get guest usage
        const { data: guestUsage } = await supabase
            .from('user_request_usage')
            .select('*')
            .eq('session_id', sessionId)
            .is('user_id', null)
            .single();

        if (!guestUsage) {
            // No guest usage to merge
            return res.json({ merged: false, message: 'No guest usage found' });
        }

        // Get or create user usage
        const userUsage = await getOrCreateUsage(userId, null);

        // Merge counts (but cap at user limit)
        const totalCount = Math.min(
            userUsage.request_count + guestUsage.request_count,
            USER_REQUEST_LIMIT
        );

        // Update user usage
        await supabase
            .from('user_request_usage')
            .update({ request_count: totalCount })
            .eq('user_id', userId);

        // Delete guest session
        await supabase
            .from('user_request_usage')
            .delete()
            .eq('session_id', sessionId)
            .is('user_id', null);

        res.json({
            merged: true,
            guestCount: guestUsage.request_count,
            newTotal: totalCount
        });

    } catch (error) {
        console.error('Error merging usage:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 4000;

// Only start server if running locally (not in Vercel serverless environment)
// Vercel will import the Express app directly without calling listen()
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Automanaged AI proxy running on port ${PORT}`);
        const defaultModelId = AUTOMANAGED_CONFIG.defaultModel;
        const defaultModelEntry = AVAILABLE_MODELS.find(model => model.id === defaultModelId);
        const defaultDisplay = defaultModelEntry ? defaultModelEntry.id : defaultModelId;
        const otherModels = AVAILABLE_MODELS
            .filter(model => model.id !== defaultModelId)
            .map(model => `      ${model.id}`);

        console.log(`📊 Available models: ${AVAILABLE_MODELS.length}`);
        console.log(`   - ${defaultDisplay}`);
        if (otherModels.length > 0) {
            console.log('');
            otherModels.forEach(modelLine => console.log(modelLine));
        }

        console.log('🔗 Providers:');
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
            const baseURL = config?.baseURL || '(not configured)';
            const hasKey = config?.apiKey ? '✅ key' : '⚠️ missing key';
            console.log(`   • ${key}: ${baseURL} (${hasKey})`);
        });
    });
}

export default app;
