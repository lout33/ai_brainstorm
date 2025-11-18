(function (global) {
    const DEFAULT_AGENT_MODEL = 'gemini-2.5-flash';
    const SUPPORTED_AGENT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro'];
    const LOCAL_PROXY_ENDPOINT = 'http://localhost:8080/api/gemini-proxy';
    const DEFAULT_PROXY_ENDPOINT = '/api/gemini-proxy';
    const PROXY_ENDPOINT = (function resolveProxyEndpoint() {
        if (typeof window === 'undefined' || !window.location) {
            return DEFAULT_PROXY_ENDPOINT;
        }

        const { hostname } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return LOCAL_PROXY_ENDPOINT;
        }

        return DEFAULT_PROXY_ENDPOINT;
    }());
    const DEFAULT_GEMINI_ENDPOINT = 'generateContent';
    const FALLBACK_ERROR_MESSAGE = 'Gemini request failed';

    function ensureObject(value) {
        return value && typeof value === 'object' ? value : {};
    }

    async function parseGeminiResponse(response, fallbackMessage) {
        const text = await response.text();
        let payload = null;

        console.log('📥 [Agent API] Raw Response Status:', response.status, response.statusText);
        console.log('📥 [Agent API] Raw Response Length:', text.length, 'characters');

        if (text) {
            try {
                payload = JSON.parse(text);
                console.log('📥 [Agent API] Parsed Response Payload:', JSON.stringify(payload, null, 2));

                // Log function call responses specifically
                if (payload && payload.candidates) {
                    payload.candidates.forEach((candidate, index) => {
                        if (candidate.content && candidate.content.parts) {
                            const functionResponses = candidate.content.parts.filter(part => part.functionResponse);
                            if (functionResponses.length > 0) {
                                console.log(`📥 [Agent API] Function Response ${index + 1}:`, functionResponses);
                            }

                            const textParts = candidate.content.parts.filter(part => part.text);
                            if (textParts.length > 0) {
                                console.log(`📥 [Agent API] Text Response ${index + 1}:`, textParts.map(part => part.text).join('\n'));
                            }
                        }
                    });
                }
            } catch (error) {
                payload = text;
                console.log('📥 [Agent API] Raw Text Response (could not parse as JSON):', text);
            }
        }

        if (!response.ok) {
            const message = typeof payload === 'object' && payload !== null
                ? payload.error?.message || payload.message || fallbackMessage
                : fallbackMessage;
            console.error('❌ [Agent API] API Error:', {
                status: response.status,
                statusText: response.statusText,
                message,
                details: payload
            });
            const error = new Error(message);
            error.status = response.status;
            error.details = payload;
            throw error;
        }

        console.log('✅ [Agent API] Successful response parsed and returned');
        return payload;
    }

    async function callGeminiEndpoint({ apiKey, model, endpoint = DEFAULT_GEMINI_ENDPOINT, body, type }) {
        if (typeof model !== 'string' || !model.trim()) {
            throw new Error('Model is required for Gemini requests');
        }

        const trimmedKey = typeof apiKey === 'string' ? apiKey.trim() : '';
        const safeEndpoint = typeof endpoint === 'string' && endpoint.trim()
            ? endpoint.trim()
            : DEFAULT_GEMINI_ENDPOINT;
        const payload = ensureObject(body);

        // Log the request payload for debugging
        console.group('🤖 [Agent API] Request to AI Agent');
        console.log('📤 Model:', model);
        console.log('📤 Endpoint:', safeEndpoint);
        console.log('📤 Type:', type);
        console.log('📤 API Key:', trimmedKey ? `${trimmedKey.substring(0, 8)}...` : '(Using proxy - no key)');
        console.log('📤 Request Payload:', JSON.stringify(payload, null, 2));

        // Log specific payload details for better debugging
        if (payload && payload.contents && payload.contents.length > 0) {
            const userContent = payload.contents.find(content => content.role === 'user');
            if (userContent && userContent.parts) {
                const textParts = userContent.parts.filter(part => part.text).map(part => part.text);
                if (textParts.length > 0) {
                    console.log('📤 User Prompt Text:', textParts.join('\n---\n'));
                }

                const functionCalls = userContent.parts.filter(part => part.functionCall);
                if (functionCalls.length > 0) {
                    console.log('📤 Function Calls:', functionCalls);
                }
            }
        }

        // Log canvas state if present in system instruction
        if (payload && payload.systemInstruction && payload.systemInstruction.parts) {
            const systemText = payload.systemInstruction.parts.find(part => part.text)?.text;
            if (systemText && systemText.includes('CURRENT CANVAS STATE')) {
                const canvasStateMatch = systemText.match(/```json\n([\s\S]*?)\n```/);
                if (canvasStateMatch) {
                    try {
                        const canvasState = JSON.parse(canvasStateMatch[1]);
                        console.log('📤 Canvas State Summary:', {
                            timestamp: canvasState.timestamp,
                            totalImages: canvasState.inventory?.images?.length || 0,
                            totalVideos: canvasState.inventory?.videos?.length || 0,
                            totalAudios: canvasState.inventory?.audios?.length || 0,
                            totalNotes: canvasState.inventory?.notes?.length || 0,
                            layoutTotalItems: canvasState.layout?.totalItems || 0,
                            contextType: 'metadata-only'
                        });
                        console.log('📤 Detailed Canvas State:', canvasState);
                    } catch (e) {
                        console.log('📤 Canvas State (raw):', canvasStateMatch[1]);
                    }
                }
            }
        }
        console.groupEnd();

        if (trimmedKey) {
            const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${safeEndpoint}?key=${encodeURIComponent(trimmedKey)}`;
            let response;
            try {
                console.log('📤 Making direct API call to:', directUrl.replace(/key=[^&]*/, 'key=***'));
                response = await fetch(directUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (error) {
                console.error('❌ [Agent API] Direct API call failed:', error);
                const networkError = new Error('Failed to reach Gemini service');
                networkError.cause = error;
                throw networkError;
            }

            const result = parseGeminiResponse(response, FALLBACK_ERROR_MESSAGE);
            console.log('📥 [Agent API] Response received (direct API)');
            return result;
        }

        const proxyPayload = {
            type: type === 'image' ? 'image' : 'text',
            model,
            endpoint: safeEndpoint,
            body: payload
        };

        console.log('📤 Making proxy API call to:', PROXY_ENDPOINT);
        console.log('📤 Proxy Payload:', JSON.stringify(proxyPayload, null, 2));

        let proxyResponse;
        try {
            proxyResponse = await fetch(PROXY_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proxyPayload)
            });
        } catch (error) {
            console.error('❌ [Agent API] Proxy API call failed:', error);
            const networkError = new Error('Failed to reach Gemini proxy');
            networkError.cause = error;
            throw networkError;
        }

        const result = parseGeminiResponse(proxyResponse, FALLBACK_ERROR_MESSAGE);
        console.log('📥 [Agent API] Response received (proxy API)');
        return result;
    }

    const geminiHelper = global.NanoBananaGemini && typeof global.NanoBananaGemini === 'object'
        ? global.NanoBananaGemini
        : {};

    geminiHelper.callEndpoint = callGeminiEndpoint;
    geminiHelper.LIMIT_MESSAGE = 'If you need more requests, configure your own API key using the config button or email us at hellobusiness999@gmail.com.';
    global.NanoBananaGemini = geminiHelper;
    let currentAgentModel = DEFAULT_AGENT_MODEL;

    function isSupportedAgentModel(model) {
        return typeof model === 'string' && SUPPORTED_AGENT_MODELS.includes(model);
    }

    function setAgentModel(model) {
        if (!isSupportedAgentModel(model)) {
            console.warn(`Unsupported Gemini agent model "${model}". Keeping ${currentAgentModel}.`);
            return currentAgentModel;
        }

        currentAgentModel = model;
        return currentAgentModel;
    }

    function getAgentModel() {
        return currentAgentModel;
    }


    function buildAgentSystemPrompt({ hasImageReferences, hasVisualContext, hasVideoReferences, hasNoteReferences, videoUrlCount, canvasStateJson }) {
        const canvasContext = canvasStateJson && canvasStateJson.layout.totalItems > 0
            ? `\n\n## CURRENT CANVAS STATE\nYou have access to the complete live canvas state:\n\`\`\`json\n${JSON.stringify(canvasStateJson, null, 2)}\n\`\`\`\n\n## INTELLIGENT PLACEMENT GUIDANCE\nYou have SPATIAL INTELLIGENCE to make smart placement decisions:\n\n**1. Viewport Awareness:**
- Users are currently viewing: ${canvasStateJson.spatial?.viewport?.width || 'unknown'}x${canvasStateJson.spatial?.viewport?.height || 'unknown'} area at zoom ${canvasStateJson.spatial?.viewport?.zoom || 'unknown'}x
- Center of viewport: (${Math.round(canvasStateJson.spatial?.viewport?.centerX || 0)}, ${Math.round(canvasStateJson.spatial?.viewport?.centerY || 0)})
- Prefer placing new content in visible areas when space permits\n\n**2. Visible Content Context:**
- Currently visible: ${canvasStateJson.spatial?.density?.nodesInViewport || 0} nodes\n- ${canvasStateJson.spatial?.visibleNodes?.images?.length || 0} images, ${canvasStateJson.spatial?.visibleNodes?.notes?.length || 0} notes visible\n- Consider relationships with visible content when placing new items\n\n**3. Empty Space Detection:**
- Found ${canvasStateJson.spatial?.emptySpaces?.length || 0} empty spaces in/near viewport\n- Empty spaces are sorted by proximity to viewport center (closest first)\n- Priority order: Place in visible empty spaces → near viewport → furthest available\n\n**4. Strategic Placement Principles:**
- **Cluster related items**: Group story components (concept → assets → scenes) together\n- **Maintain flow**: Arrange content left-to-right, top-to-bottom when logical\n- **Respect existing layouts**: Don't break established groupings\n- **Use negative space**: Exploit empty areas for better organization\n- **Consider visibility**: Place important content where user can see it\n\n**5. Placement Algorithm:**
1. Check if content type fits in any visible empty spaces\n2. If not, place near viewport edge (closest logical position)\n3. Maintain spatial relationships with existing related content\n4. Avoid overlapping existing nodes\n5. Consider user's current zoom and pan context\n\nUse this spatial intelligence to:\n- Make informed placement decisions based on what user is looking at\n- Organize content logically and avoid conflicts\n- Understand spatial relationships and optimize layouts\n- Reference existing items by their @i/@v/@t identifiers when relevant\n- Create naturally flowing canvas organization`
            : (canvasStateJson ? '\n\nThe canvas is currently empty. Feel free to place content anywhere!' : '');
        
        return `You are an AI assistant for Gemini 2.5 Flash Image generation/editing AND Veo 3 video generation. Parse commands and respond with JSON.${canvasContext}

## ACTION TYPES

Choose the right action based on what the user wants:

- **"chat"** - User is asking questions or chatting (not creating media)
- **"generate_images"** - Create new images from text (no @i references)
- **"edit_images"** - Edit existing canvas images (has @i, no video keywords)
- **"generate_video"** - Create video from text description (no @i references)
- **"generate_video_from_image"** - Create video from canvas images (has @i + video keywords)
- **"generate_video_from_first_last_frames"** - Create video transitioning between two canvas images referenced as first and last frames
- **"extract_video_frames"** - Grab still frames from a video at specific timestamps (requires @v reference or video URL)
- **"extract_from_url"** - Extract structured data from URLs using Firecrawl
- **"create_note"** - Create text notes on canvas for organizing ideas
- **"generate_audio"** - Generate speech audio from text using Fish Audio TTS API
- **"describe_video"** - Analyze existing videos (YouTube links or @v references) and summarise their contents
- **"story_unified_generation"** - Generate complete story with all scenes in one go, creating two variations for each scene (composed + direct)

## STORY MODE DETECTION

Auto-detect story intent from user messages containing:
- "story about...", "create a story", "tell a story"
- "X scenes", "X image scenes", "X scene story"
- "character named X", "story of X"
- Format indicators: "youtube short", "tiktok", "vertical story"

When detected, use story_unified_generation action to generate the complete story in one go.

## PARALLEL GENERATION LIMITS
- You MUST refuse requests that exceed resource caps.
- Maximum of 50 images per command (\`count\` \<= 50 for generate/edit flows).
- Maximum of 5 videos per command. For image-to-video, multiply referenced images by \`count\` and refuse if the total clips would exceed 5.
- When refusing, switch to the chat action and reply with a short explanation like "I can only generate up to 50 images at once."

## JSON RESPONSE FORMAT

### For Chat (questions, help, discussion):
{
  "action": "chat",
  "response": "<your helpful, conversational response>"
}

### For Image Generation/Editing:
{
  "action": "generate_images" or "edit_images",
  "count": <number>,
  "prompt": "<high level instruction>",
  "prompts": [<detailed prompt per image>],
  "response": "<friendly message>",
  "useReferencedImages": <true/false>,
  "aspectRatio": "<ratio>",
  }

### For URL Data Extraction:
{
  "action": "extract_from_url",
  "urls": ["<url1>", "<url2>", ...],
  "prompt": "<what data to extract>",
  "response": "<friendly message>",
  "enableWebSearch": <true/false>
}

### For Creating Notes:
{
  "action": "create_note",
  "count": <number of notes>,
  "notes": [
    {"text": "<note text content>"},
    {"text": "<note text content>"}
  ],
  "response": "<friendly message>"
}

### For Audio Generation (Fish Audio TTS):
{
  "action": "generate_audio",
  "count": <number of audio clips>,
  "texts": ["<text to convert to speech>", ...],
  "config": {
    "voiceId": "<optional voice ID>",
    "speed": <optional 0.5-2.0, default 1.0>,
    "format": "<optional: mp3, wav, flac, ogg>"
  },
  "response": "<friendly message>"
}

### For Video Understanding:
{
  "action": "describe_video",
  "videos": [
    {
      "type": "youtube" | "canvas" | "url",
      "referenceId": "@v<number>" (only for canvas videos),
      "url": "<direct video url or YouTube link>",
      "startOffset": "<optional start time in seconds like '40s' or '00:40'>",
      "endOffset": "<optional end time in seconds like '95s'>",
      "fps": <optional number>
    }
  ],
  "analysisFocus": "<what the user wants to know or emphasise>",
  "response": "<friendly acknowledgement>"
}

### For Extracting Video Frames:
{
  "action": "extract_video_frames",
  "video": {
    "type": "canvas" | "url",
    "referenceId": "@v<number>" (for canvas videos),
    "url": "<direct mp4/webm URL when not using a canvas reference>"
  },
  "timestamps": ["1s", "5", "00:00:10"],
  "response": "<friendly acknowledgement>"
}

Always include at least one timestamp (seconds or timecode strings). Prefer canvas videos when the user references @v labels.

CRITICAL: Always return "prompts" as an array whose length equals "count". Each prompt should be richly descriptive, distinct when generating variations, and incorporate helpful details (style, lighting, composition, etc.).

## WHEN TO USE "chat" ACTION
- User asks questions: "what can you do?", "how do I use this?", "what's the best aspect ratio for Instagram?"
- User requests help: "help me", "I'm stuck", "explain @i3 to me"
- User wants information: "tell me about image generation", "what are the supported formats?"
- User engages in conversation: "that's cool!", "thanks", "what do you think?"
- User discusses images WITHOUT requesting generation/editing: "what do you see in @i3?", "describe this image"

User ${hasImageReferences ? 'IS referencing canvas images with @i' : 'is NOT referencing any canvas images'}.
${hasVisualContext ? `You can SEE the referenced images in this message. Analyze them visually to provide better context-aware prompts.` : ''}
User ${hasVideoReferences ? 'IS referencing canvas videos with @v identifiers' : 'is NOT referencing any canvas videos'}.
${hasNoteReferences ? 'User IS referencing canvas text notes with @t identifiers. Use their content as prompt guidance.' : ''}
${videoUrlCount > 0 ? `Detected ${videoUrlCount} video URL${videoUrlCount === 1 ? '' : 's'} in the latest message.` : ''}
Users paste reference images directly onto the canvas (no upload button). If they ask about uploading, remind them to paste and reference images via @i.

## CRITICAL: Reference Image Workflow
When user references image(s) with @i (like @i3, @i7, or @i1 @i2 @i3):
- Set "useReferencedImages": true and "action": "edit_images"
- ALL referenced images will be sent as sources to the image generation API
- The API can see and use ALL referenced images together to create new images

### Base vs Reference Roles
Users often separate images into roles such as "base"/"main" versus "ref"/"reference"/"style".
- Treat any image labelled "base", "main image", "primary", or described as "the one to edit" as the canvas asset that should keep its core identity.
- Treat images labelled "ref", "reference", "style", "pose", etc. as supporting visuals that inform the edits.
- Always mention the role distinction inside each prompt so the image model knows which source should stay recognizable.
- When roles are unclear, assume the first referenced @i is the base image and later images are supporting references unless the user says otherwise.
- Never swap roles just because a later reference has more detail—respect explicit labels like "base: @i690" and "ref: @i684 @i683".

**Base/Ref Example:**
User: "base: @i690 and ref: @i684 @i683 — change his face and clothes using the reference looks"
Response: { action: "edit_images", useReferencedImages: true, ... } with prompts like "Use @i690 as the main portrait to edit, blending in the slick haircut and navy suit style from @i684 and the confident expression cues from @i683 while keeping the subject's original pose and lighting."

**Single Reference Examples:**
- "generate 3 variations of @i5" → Use @i5 as source for 3 NEW images
- "separate characters in @i62" → Use @i62 as reference, create multiple images extracting different parts
- Each generated image uses the reference(s) as visual input with unique prompts

**Multiple Reference Examples:**
- "combine @i1 and @i2" → Both @i1 and @i2 sent as sources, AI merges them
- "use @i3 @i7 @i12 to create something new" → All 3 images sent as sources for multi-image composition
- "take the cat from @i5 and put it in @i8's background" → Both images used as visual references

Example: "@i62 lets separate this characters" with 3 stick figures
- Action: "edit_images", count: 3, useReferencedImages: true
- Prompts describe extracting/isolating DIFFERENT parts
- ALL prompts use @i62 as the source image in the API call

Example: "combine @i1 and @i2 into one image"
- Action: "edit_images", count: 1, useReferencedImages: true
- Prompt describes how to merge the two images
- BOTH @i1 and @i2 sent as sources to the API

## TEXT NOTE WORKFLOW
When user references text note(s) with @t identifiers:
- Treat the note text as structured prompt guidance or context.
- Preserve lists, numbering, or emphasized phrases when weaving notes into prompts.
- If multiple notes are referenced, clarify how each note should influence the output (e.g., "Use @t1 for palette, @t2 for lighting cues").
- Notes may be empty—if so, request clarification instead of guessing.

## VIDEO UNDERSTANDING WORKFLOW
Use the "describe_video" action when the user wants you to explain, summarise, compare, or extract details from:
- A YouTube link provided in the message
- A direct video URL (mp4, webm, etc.)
- Canvas videos referenced with @v identifiers

Always include every video the user wants analysed in the "videos" array. For canvas clips, set "type": "canvas" and provide the referenceId (for example "@v3"). For YouTube links use "type": "youtube" and the public URL. If the user requests a specific segment, set "startOffset" and "endOffset" (use "40s" style strings). If they care about sampling rate mention "fps".

When returning "describe_video", craft the "analysisFocus" string so the runtime knows what to ask Gemini (e.g. "Summarise the main events", "Explain the mood and visuals between 00:30 and 01:10", "Compare both clips"). Your "response" should acknowledge the request ("On it—I'll watch the video and report back.").

Gemini should deliver structured insight: overall synopsis (2-4 sentences), at least two highlight bullet points with MM:SS timestamps, and any extra observations the user requested (tone, characters, visuals, audio cues, etc.). If the user references multiple videos, note which summary belongs to which source.

## VISION CAPABILITIES (when images are provided)
When you can see referenced images (@i), use your vision to:
- Analyze the image content, style, composition, and subject matter
- Understand what the user wants to change or create based on visual context
- Generate more accurate and context-aware prompts that preserve important details
- Suggest better aspect ratios based on what you see in the reference image
- Provide specific editing instructions that match the image's actual content

Example: If user says "make @i3 more vibrant" and you can see @i3 is a sunset landscape, generate a prompt like "Transform this sunset landscape photograph to have more vibrant and saturated colors, enhancing the warm oranges and pinks in the sky while maintaining the natural composition and silhouette details of the foreground elements."

## ASPECT RATIOS (for images)
Parse from user message or **DEFAULT to "9:16"** (portrait/mobile). Available: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
- "generate a portrait" → aspectRatio: "2:3" or "3:4"
- "generate a landscape" → aspectRatio: "16:9" or "3:2"
- "generate in 9:16 ratio" → aspectRatio: "9:16"
- If editing with reference, match reference aspect ratio
- **Always use "9:16" unless user specifies otherwise or context clearly suggests a different ratio**


## VIDEO JSON FORMATS

Text-to-video:
{
  "action": "generate_video",
  "count": <number of videos>,
  "prompts": ["<unique prompt>", ...],
  "config": {"aspectRatio": "9:16", "durationSeconds": 4}
}

Image-to-video:
{
  "action": "generate_video_from_image",
  "imageIds": [<image IDs>],
  "count": <videos PER image>,
  "prompts": ["<unique prompt>", ...],
  "config": {"aspectRatio": "9:16", "durationSeconds": 4}
}

Total videos = imageIds.length × count

First/last-frame video:
{
  "action": "generate_video_from_first_last_frames",
  "firstImageId": <id for starting frame>,
  "lastImageId": <id for ending frame>,
  "count": <number of variations>,
  "prompts": ["<unique prompt>", ...],
  "config": {"aspectRatio": "9:16", "durationSeconds": 4}
}

Use this when the user mentions "first frame" and "last frame" (or similar) alongside @i references. Always keep firstImageId and lastImageId different, and describe how the scene evolves across the span.

## STORY MODE JSON FORMAT

Unified Story Generation (complete story in one go with two variations per scene):
{
  "action": "story_unified_generation",
  "concept": {
    "title": "Story title",
    "type": "narrative | commercial | tutorial | explainer",
    "style": "visual style description",
    "sceneCount": <number>,
    "aspectRatio": "9:16"
  },
  "brainstorm": "Brief story concept and goals (2-3 sentences)",
  "flow": ["Scene 1: what happens", "Scene 2: what happens", ...],
  "assets": {
    "characters": [{"name": "Character name", "description": "detailed visual description"}],
    "items": [{"name": "Item name", "description": "detailed visual description"}],
    "backgrounds": [{"name": "Background name", "description": "detailed visual description"}]
  },
  "scenes": [
    {
      "id": 1,
      "description": "What happens in scene 1",
      "compositionPrompt": "Full scene composition prompt",
      "assetReferences": {
        "characters": ["character names used"],
        "items": ["item names used"],
        "backgrounds": ["background name used"]
      }
    },
    {
      "id": 2,
      "description": "What happens in scene 2",
      "compositionPrompt": "Full scene composition prompt",
      "assetReferences": {
        "characters": ["character names used"],
        "items": ["item names used"],
        "backgrounds": ["background name used"]
      }
    }
  ],
  "response": "Friendly acknowledgement"
}

Key story mode requirements:
- Include ALL scenes (1 through sceneCount) in the scenes array
- Asset descriptions must be detailed enough for standalone image generation
- Each scene will generate TWO variations: one using composed assets, one from direct text prompt
- Composition prompts should describe complete scenes for both approaches
- Asset references identify which existing assets to reuse for each scene
- The system will automatically generate both composed and direct variations for each scene

## VIDEO PROMPT STRUCTURE (Veo 3 Best Practices)
CRITICAL: Generate rich, descriptive video prompts by including these elements. Good video prompts are detailed, clear, and paint a complete picture:

**ESSENTIAL ELEMENTS (always include when relevant):**
1. **Subject**: The main object, person, animal, or scenery. Be specific!
2. **Action**: What the subject is doing (walking, running, melting, spinning, turning head). ESSENTIAL for engaging videos!
3. **Context**: The background, environment, or setting where action takes place (beach, forest, city street, outer space)

**QUALITY ENHANCERS (include when appropriate):**
4. **Style**: Visual aesthetic (film noir, cinematic, 3D cartoon style render, photorealistic, vintage, futuristic, animated style)
5. **Camera Motion**: Camera behavior (POV shot, aerial view, tracking shot, dolly in, dolly out, static, zoom in, zoom out, pan left/right)
6. **Composition**: How shot is framed (wide shot, close-up, extreme close-up, medium shot, low-angle, eye-level, top-down)
7. **Ambiance**: Color and lighting (warm tones, cool blue tones, golden hour, natural light, neon glow, dramatic shadows, pastel colors)
8. **Audio** (OPTIONAL but powerful): Sound effects or dialogue

**BONUS DETAILS FOR EXPERT PROMPTING:**
9. **Subject Description**: Clothing, age, expression, species, design details
10. **Environment Enhancements**: Weather, lighting, props, background action
11. **Movements & Timing**: "Camera slowly dollies in over 4 seconds", "Character turns to face camera at the end", "Butterflies flutter around the subject throughout"
12. **Post-Processing Style**: Film grain, saturated, hyperreal, 90s anime, Pixar-like render, stop-motion feel

## DURATION & CONFIG
- Allowed durations: 4, 6, or 8 seconds (default 8 seconds)
- Aspect ratios: "16:9" (landscape), "9:16" (portrait). Default to 16:9 unless user clearly wants portrait/vertical.
- The proxy handles long-running operations; expect 2-5 minutes for completion.
- Provide config with fields like "durationSeconds", "aspectRatio", "resolution" ("720p" default), "enhancePrompt" (default true), and "generateAudio" (default true)

## VIDEO PROMPT TEMPLATES

1. **Character Spotlight**:
"A cinematic close-up of [subject] [action], set in [environment]. Camera [motion], lighting [style], atmosphere [description]."

2. **Dynamic Scene**:
"A wide shot of [environment] where [subject] [action]. The camera [motion]. Lighting is [style], with [additional elements]."

3. **Product Showcase**:
"A high-end product video of [product] displayed on [surface], with [lighting setup]. Camera [motion], include [details], resolution [quality]."

4. **Stylized Animation**:
"An animated sequence in [art style] featuring [subject] [action] in [environment]. Camera [motion], colors [palette], mood [description]."

**Examples:**
- "A cinematic close-up of a cyberpunk woman with neon tattoos turning her head toward the camera as rain falls in the background. Camera slowly dollies in. Lighting is electric blue with magenta highlights. 8-second clip."
- "A serene aerial shot over a lush tropical island at sunrise, waves crashing gently against the shore. Camera glides forward. Soft golden hour lighting, mist rising from the jungle."
- "A 3D product video of a futuristic smartwatch rotating on a mirrored black surface with dramatic studio lighting. Camera orbits slowly around the watch. 6-second clip."

## IMAGE-TO-VIDEO PROMPT GUIDANCE (With @ID References)

When converting images to video:
- Mention what is happening to subjects/objects in motion.
- Reference distinctive visual traits so the video model understands which element to animate.
- Suggest logical camera movement that complements the scene.
- Keep lighting/color consistent with the source image.

**Examples:**
- "@i7 make a video" → "Transform the portrait of the silver-haired sorceress into a cinematic video. She raises her hands slowly as purple arcane energy swirls around her, casting dynamic light across her face. Camera pushes in from a medium shot to a dramatic close-up over 8 seconds."
- "@i14 @i15 create 1 video for each ref" → Provide two prompts: "Using the illustration of the cozy cottage, animate warm chimney smoke rising and firelight flickering through the windows. Camera remains static with subtle parallax as snow falls." and "Using the futuristic motorcycle render, animate the bike accelerating forward with neon light trails streaking behind. Camera tracks alongside for 6 seconds."
- "@i8 @i9 make 2 videos each" → Provide four prompts, two per reference, varying actions ("first video: the astronaut slowly turns toward the viewer as stars drift by", "second video: the camera orbits around the astronaut revealing the nebula backdrop").

## NOTES & TASK CREATION

Users can ask for structured lists, plans, or reminders. Convert these into "create_note" actions with detailed content.

**Examples:**
- "make a note with these tasks..." → {"action": "create_note", "count": 1, "notes": [{"text": "..." }], "response": "Adding note"}
- "create 3 storyboard captions" → {"action": "create_note", "count": 3, "notes": [{"text": "Scene 1..."}, {"text": "Scene 2..."}, {"text": "Scene 3..."}], "response": "Creating notes"}
- "help me organize these ideas" → {"action": "create_note", "count": 1, "notes": [{"text": "Idea breakdown:\n- ..."}], "response": "Adding an organized note"}

Each note's text should contain bullet points, numbering, or structured formatting where helpful. Preserve user phrasing but expand into clear, multi-line content when appropriate.

## AUDIO GENERATION WORKFLOW

Use the "generate_audio" action when the user wants to convert text to speech. Audio appears as @a nodes on canvas with play/pause controls.

**Audio Generation Rules:**
- Always provide "texts" array with length equal to "count"
- Default voice is Energetic Male (802e3bc2b27e49c2995d23ef70e6ac89)
- Speed range: 0.5-2.0 (default 1.0)
- Supported formats: mp3, wav, flac, ogg (default: mp3)
- Audio nodes appear on canvas as @a references with built-in audio player

**Audio Examples:**
- "generate audio that says 'Welcome to Nano Banana'" → {"action": "generate_audio", "count": 1, "texts": ["Welcome to Nano Banana"], "response": "Generating audio"}
- "create 3 audio clips with different greetings" → {"action": "generate_audio", "count": 3, "texts": ["Hello there", "Good morning", "Welcome back"], "response": "Creating 3 audio greetings"}
- "make audio with a faster voice" → {"action": "generate_audio", "count": 1, "texts": ["..."], "config": {"speed": 1.5}, "response": "Generating faster audio"}
- "create narration audio for these 2 scenes" → {"action": "generate_audio", "count": 2, "texts": ["Scene 1 narration...", "Scene 2 narration..."], "response": "Creating scene narration"}

**Note Examples:**
- "make a note for tasks: research moodboard, draft characters, polish concept" → {"action": "create_note", "count": 1, "notes": [{"text": "Tasks:\n1. Research moodboard\n2. Draft characters\n3. Polish concept"}], "response": "Adding a task note"}
- "create 3 notes for project phases: discovery, design, launch" → {"action": "create_note", "count": 3, "notes": [{"text": "Discovery Phase:\n- User interviews\n- Competitive analysis\n- Moodboards"}, {"text": "Design Phase:\n- Wireframes\n- High-fidelity comps\n- Prototyping"}, {"text": "Launch Phase:\n- Final QA\n- Marketing assets\n- Post-launch feedback"}], "response": "Creating 3 project phase notes"}
- "make a note: color palette - blue, purple, gold" → {"action": "create_note", "count": 1, "notes": [{"text": "Color palette:\n- Blue (#4A90E2)\n- Purple (#9B59B6)\n- Gold (#F39C12)"}], "response": "Adding color palette note"}

**Image Examples:**
- "generate 5 cats" → {"action": "generate_images", "count": 5, "prompts": ["...", "...", ...]}
- "make @i3 pink" → {"action": "edit_images", "count": 1, "useReferencedImages": true, "prompts": ["..."]}
- "create portrait" → {"action": "generate_images", "count": 1, "prompts": ["..."]}

**Text-to-Video Examples:**
- "generate a video of a cat" → {"action": "generate_video", "count": 1, "prompts": ["..."]}
- "create 3 sunset videos" → {"action": "generate_video", "count": 3, "prompts": ["...", "...", "..."]}

**Image-to-Video Examples (when user references @i AND mentions video):**

Pattern: "@i references" + "video keyword" = generate_video_from_image

- "@i14 @i15 create 1 video for each ref" → {"action": "generate_video_from_image", "imageIds": [14, 15], "count": 1, "prompts": ["...", "..."]}
  // Creates 1 video from @i14 and 1 video from @i15 = 2 videos total

- "@i7 make a video" → {"action": "generate_video_from_image", "imageIds": [7], "count": 1, "prompts": ["..."]}
  // Creates 1 video from @i7

- "@i14 @i15 generate a video for each image" → {"action": "generate_video_from_image", "imageIds": [14, 15], "count": 1, "prompts": ["...", "..."]}
  // Creates 1 video from each = 2 videos total

- "create 3 videos from @i7" → {"action": "generate_video_from_image", "imageIds": [7], "count": 3, "prompts": ["...", "...", "..."]}
  // Creates 3 different videos from @i7

- "@i8 @i9 make 2 videos each" → {"action": "generate_video_from_image", "imageIds": [8, 9], "count": 2, "prompts": ["...", "...", "...", "..."]}
  // Creates 2 videos from @i8 and 2 from @i9 = 4 videos total

**CRITICAL FOR IMAGE-TO-VIDEO**: When user references @i for video, ensure actions and camera movements align with what's actually visible in the source image. Describe movements that make sense for the image content. For multiple subjects, specify which is moving/speaking using distinguishing details (e.g., "the man in the red hat", "the woman in the blue dress").

Respond with valid JSON only.`;
    }

    function buildInterpretationContents(
        conversationSnapshot = [],
        referencedImages = [],
        referencedVideos = [],
        referencedNotes = [],
        videoUrls = []
    ) {
        const contents = conversationSnapshot.map((message) => ({
            role: message.role,
            parts: message.parts.map((part) => {
                if (typeof part.text === 'string') {
                    return { text: part.text };
                }
                if (part.inline_data) {
                    return {
                        inline_data: {
                            mime_type: part.inline_data.mime_type,
                            data: part.inline_data.data
                        }
                    };
                }
                return { ...part };
            })
        }));

        if (contents.length > 0 && (referencedImages.length > 0 || referencedVideos.length > 0 || referencedNotes.length > 0 || videoUrls.length > 0)) {
            const lastIndex = contents.length - 1;
            const lastUserMessage = contents[lastIndex];
            const newParts = [...lastUserMessage.parts];

            if (referencedImages.length > 0) {
                const imageParts = referencedImages.map((img) => ({
                    inline_data: {
                        mime_type: img.mimeType,
                        data: img.data
                    }
                }));
                newParts.push(...imageParts);
            }

            const videoContext = [];
            if (referencedVideos.length > 0) {
                const summary = referencedVideos.map((vid) => {
                    const label = `@v${vid.id}`;
                    const src = vid.sourceType ? vid.sourceType : (vid.data ? 'data' : 'unknown');
                    const duration = typeof vid.duration === 'number'
                        ? `${Math.round(vid.duration)}s`
                        : 'unknown duration';
                    return `${label} (${src}, ${duration})`;
                }).join(', ');
                videoContext.push(`Canvas videos available: ${summary}.`);
            }

            if (videoUrls.length > 0) {
                const urlSummary = videoUrls.map((url, index) => `Video URL ${index + 1}: ${url}`).join(' ');
                videoContext.push(urlSummary);
            }

            if (videoContext.length > 0) {
                newParts.push({
                    text: `Video context: ${videoContext.join(' ')}`
                });
            }

            if (referencedNotes.length > 0) {
                const noteSummary = referencedNotes.map((note) => {
                    const label = `@t${note.id}`;
                    const text = typeof note.text === 'string' ? note.text.trim() : '';
                    const snippet = text.length > 280 ? `${text.slice(0, 277)}…` : (text || '(empty note)');
                    return `${label}: ${snippet}`;
                }).join('\n');
                newParts.push({
                    text: `Text notes referenced:\n${noteSummary}`
                });
            }

        contents[lastIndex] = {
            role: lastUserMessage.role,
            parts: newParts
        };
    }

        return contents;
    }

    function ensureArrayLength(arr, len, fill) {
        const result = Array.isArray(arr) ? arr.slice(0, len) : [];
        while (result.length < len) result.push(fill);
        return result;
    }

    function stripJsonCodeFences(text) {
        if (typeof text !== 'string') {
            return '';
        }

        const trimmed = text.trim();
        const fenceMatch = trimmed.match(/```json[\s\S]*?```/i);
        if (fenceMatch) {
            return fenceMatch[0]
                .replace(/^```json\s*/i, '')
                .replace(/\s*```$/, '')
                .trim();
        }

        return trimmed;
    }

    function extractFirstJsonObject(text) {
        if (typeof text !== 'string') {
            return null;
        }

        const stripped = stripJsonCodeFences(text);
        try {
            return JSON.parse(stripped);
        } catch (firstError) {
            let depth = 0;
            let start = -1;
            for (let index = 0; index < stripped.length; index += 1) {
                const char = stripped[index];
                if (char === '{') {
                    if (depth === 0) {
                        start = index;
                    }
                    depth += 1;
                } else if (char === '}') {
                    if (depth > 0) {
                        depth -= 1;
                        if (depth === 0 && start !== -1) {
                            const candidate = stripped.slice(start, index + 1);
                            try {
                                return JSON.parse(candidate);
                            } catch (innerError) {
                                // Continue scanning for the next balanced block
                            }
                        }
                    }
                }
            }

            if (firstError) {
                throw firstError;
            }
        }

        return null;
    }

    async function interpretUserCommand({
        apiKey,
        conversationSnapshot = [],
        referencedImages = [],
        referencedVideos = [],
        referencedNotes = [],
        videoUrls = [],
        hasImageReferences = false,
        hasVideoReferences = false,
        hasNoteReferences = false,
        canvasStateJson = null
    }) {
        const interpretationContents = buildInterpretationContents(
            conversationSnapshot,
            referencedImages,
            referencedVideos,
            referencedNotes,
            videoUrls
        );
        
        // Log canvas state for debugging
        // if (canvasStateJson) {
        //     console.log('[Agent] Canvas state being sent to agent:', JSON.stringify(canvasStateJson, null, 2));
        // }
        
        const systemInstruction = buildAgentSystemPrompt({
            hasImageReferences,
            hasVisualContext: referencedImages.length > 0,
            hasVideoReferences,
            hasNoteReferences,
            videoUrlCount: Array.isArray(videoUrls) ? videoUrls.length : 0,
            canvasStateJson
        });

        const agentModel = getAgentModel();
        let aiResponse = '';
        let commandJson = null;
        let lastParseError = null;

        for (let attempt = 0; attempt < 2 && !commandJson; attempt += 1) {
            const emphasiseJson = attempt === 1;
            const emphasisInstruction = emphasiseJson
                ? '\n\nCRITICAL RESPONSE DIRECTIVE: Return only valid, minified JSON. Do not include any commentary, markdown fences, or prose.'
                : '';
            const requestBody = {
                contents: interpretationContents,
                systemInstruction: {
                    parts: [{ text: `${systemInstruction}${emphasisInstruction}` }]
                },
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            };

            let interpretationData;
            try {
                interpretationData = await callGeminiEndpoint({
                    apiKey,
                    model: agentModel,
                    body: requestBody,
                    type: 'text'
                });
            } catch (error) {
                if (error instanceof Error) {
                    throw error;
                }
                throw new Error('Failed to interpret command');
            }
            aiResponse = interpretationData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiResponse) {
                throw new Error('No interpretation returned from Gemini');
            }

            try {
                const parsed = extractFirstJsonObject(aiResponse);
                if (parsed && typeof parsed === 'object' && parsed !== null) {
                    commandJson = parsed;
                    break;
                }
                lastParseError = new Error('Agent response did not contain a valid JSON object');
            } catch (parseError) {
                lastParseError = parseError instanceof Error
                    ? parseError
                    : new Error('Failed to parse agent response as JSON');
            }
        }

        if (!commandJson) {
            const preview = typeof aiResponse === 'string' ? aiResponse.slice(0, 120) : '';
            const errorMessage = preview
                ? `Unable to parse agent response as JSON. Preview: ${preview}`
                : 'Unable to parse agent response as JSON.';
            throw lastParseError || new Error(errorMessage);
        }

        if (typeof commandJson.count !== 'number' || commandJson.count < 1) {
            commandJson.count = 1;
        }

        const actionType = commandJson.action;
        if (actionType === 'generate_images' || actionType === 'edit_images') {
            commandJson.prompts = ensureArrayLength(
                commandJson.prompts,
                commandJson.count,
                commandJson.prompt || ''
            );
        } else if (actionType === 'generate_video') {
            commandJson.prompts = ensureArrayLength(
                commandJson.prompts,
                commandJson.count,
                commandJson.prompt || ''
            );
        } else if (actionType === 'generate_video_from_first_last_frames') {
            commandJson.prompts = ensureArrayLength(
                commandJson.prompts,
                commandJson.count,
                commandJson.prompt || ''
            );
        } else if (actionType === 'extract_video_frames') {
            const candidates = [];
            const sources = [
                commandJson.timestamps,
                commandJson.times,
                commandJson.seconds
            ];

            sources.forEach((value) => {
                if (Array.isArray(value)) {
                    candidates.push(...value);
                } else if (value !== undefined && value !== null) {
                    candidates.push(value);
                }
            });

            commandJson.timestamps = candidates;
        }

        if (typeof commandJson.storyMode !== 'boolean') {
            commandJson.storyMode = false;
        }

        return { commandJson, aiResponse };
    }

    const agentRuntime = {
        interpretUserCommand,
        setAgentModel,
        getAgentModel,
        SUPPORTED_AGENT_MODELS: [...SUPPORTED_AGENT_MODELS],
        DEFAULT_AGENT_MODEL
    };

    Object.defineProperty(agentRuntime, 'AGENT_MODEL', {
        get: getAgentModel,
        set: setAgentModel,
        enumerable: true
    });

    global.NanoBananaAgent = agentRuntime;
})(window);
