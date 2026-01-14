import { Router, Request, Response } from "express";
import { getSmartSchedulerAgent, type SearchRequest, type AvailabilityRequest, type BookingRequest } from "../agents/smart-scheduler";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express router
export const smartSchedulerRouter = Router();

// Helper to generate unique IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Agent Card Discovery Endpoint
// ============================================

/**
 * @swagger
 * /api/smart-scheduler/.well-known/agent-card.json:
 *   get:
 *     summary: Get agent card for A2A discovery
 *     description: Returns the agent card with capabilities and protocol information
 *     tags: [Smart Scheduler Agent]
 *     responses:
 *       200:
 *         description: Agent card JSON
 */
smartSchedulerRouter.get('/.well-known/agent-card.json', (req: Request, res: Response) => {
  try {
    const agentCardPath = join(__dirname, '../agents/agent-card.json');
    const agentCard = JSON.parse(readFileSync(agentCardPath, 'utf-8'));

    // Update URLs with actual host
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    agentCard.url = `${baseUrl}/api/smart-scheduler`;
    agentCard.protocols.a2a.endpoint = `${baseUrl}/api/smart-scheduler/a2a`;
    agentCard.protocols.mcp.endpoint = `${baseUrl}/api/smart-scheduler/mcp/tools`;
    agentCard.protocols.rest.endpoints = {
      search: `${baseUrl}/api/smart-scheduler/search`,
      availability: `${baseUrl}/api/smart-scheduler/availability/{providerId}`,
      booking: `${baseUrl}/api/smart-scheduler/booking/{slotId}`,
    };

    res.json(agentCard);
  } catch (error) {
    console.error('Error loading agent card:', error);
    res.status(500).json({ error: 'Failed to load agent card' });
  }
});

// ============================================
// REST API Endpoints
// ============================================

/**
 * @swagger
 * /api/smart-scheduler/search:
 *   post:
 *     summary: Search for healthcare providers
 *     description: Search providers by specialty, location, insurance, and languages
 *     tags: [Smart Scheduler Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               specialty:
 *                 type: string
 *               location:
 *                 type: string
 *               insurance:
 *                 type: array
 *                 items:
 *                   type: string
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *               dateFrom:
 *                 type: string
 *               dateTo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Search results
 */
smartSchedulerRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const agent = getSmartSchedulerAgent();
    const searchRequest: SearchRequest = req.body;
    const result = await agent.searchProviders(searchRequest);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * @swagger
 * /api/smart-scheduler/availability/{providerId}:
 *   get:
 *     summary: Get provider availability
 *     description: Get available appointment slots for a specific provider
 *     tags: [Smart Scheduler Agent]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability information
 */
smartSchedulerRouter.get('/availability/:providerId', async (req: Request, res: Response) => {
  try {
    const agent = getSmartSchedulerAgent();
    const availabilityRequest: AvailabilityRequest = {
      providerId: req.params.providerId,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };
    const result = await agent.getAvailability(availabilityRequest);
    res.json(result);
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to get availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * @swagger
 * /api/smart-scheduler/booking/{slotId}:
 *   get:
 *     summary: Get booking information
 *     description: Get booking URL and phone number for a slot
 *     tags: [Smart Scheduler Agent]
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking information
 */
smartSchedulerRouter.get('/booking/:slotId', async (req: Request, res: Response) => {
  try {
    const agent = getSmartSchedulerAgent();
    const bookingRequest: BookingRequest = {
      slotId: req.params.slotId,
    };
    const result = await agent.getBookingInfo(bookingRequest);
    res.json(result);
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to get booking info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * @swagger
 * /api/smart-scheduler/providers:
 *   get:
 *     summary: Get all providers
 *     tags: [Smart Scheduler Agent]
 *     responses:
 *       200:
 *         description: List of all providers
 */
smartSchedulerRouter.get('/providers', async (req: Request, res: Response) => {
  try {
    const agent = getSmartSchedulerAgent();
    const result = await agent.getAllProviders();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get providers: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * @swagger
 * /api/smart-scheduler/locations:
 *   get:
 *     summary: Get all locations
 *     tags: [Smart Scheduler Agent]
 *     responses:
 *       200:
 *         description: List of all locations
 */
smartSchedulerRouter.get('/locations', async (req: Request, res: Response) => {
  try {
    const agent = getSmartSchedulerAgent();
    const result = await agent.getAllLocations();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get locations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

/**
 * @swagger
 * /api/smart-scheduler/slots:
 *   get:
 *     summary: Get all slots
 *     tags: [Smart Scheduler Agent]
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *       - in: query
 *         name: availableOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of slots
 */
smartSchedulerRouter.get('/slots', async (req: Request, res: Response) => {
  try {
    const agent = getSmartSchedulerAgent();
    const result = await agent.getAllSlots({
      start: req.query.start as string | undefined,
      end: req.query.end as string | undefined,
      availableOnly: req.query.availableOnly === 'true',
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to get slots: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

// ============================================
// A2A (Agent-to-Agent) JSON-RPC 2.0 Endpoint
// ============================================

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: any;
  id: string | number | null;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

interface TaskSnapshot {
  taskId: string;
  contextId: string;
  status: "submitted" | "working" | "input-required" | "completed" | "failed";
  conversation: Array<{
    role: "user" | "agent";
    parts: Array<{ type: string; text?: string; data?: any }>;
  }>;
  artifacts?: Array<{
    id: string;
    mimeType: string;
    data: any;
  }>;
}

/**
 * @swagger
 * /api/smart-scheduler/a2a:
 *   post:
 *     summary: A2A JSON-RPC 2.0 endpoint
 *     description: Agent-to-agent communication using JSON-RPC 2.0 protocol
 *     tags: [Smart Scheduler Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jsonrpc
 *               - method
 *             properties:
 *               jsonrpc:
 *                 type: string
 *                 enum: ["2.0"]
 *               method:
 *                 type: string
 *               params:
 *                 type: object
 *               id:
 *                 oneOf:
 *                   - type: string
 *                   - type: number
 *     responses:
 *       200:
 *         description: JSON-RPC response
 */
smartSchedulerRouter.post('/a2a', async (req: Request, res: Response) => {
  const request: JsonRpcRequest = req.body;
  const agent = getSmartSchedulerAgent();

  // Validate JSON-RPC request
  if (request.jsonrpc !== "2.0") {
    return res.json(createErrorResponse(request.id, -32600, "Invalid Request: jsonrpc must be '2.0'"));
  }

  if (!request.method) {
    return res.json(createErrorResponse(request.id, -32600, "Invalid Request: method is required"));
  }

  try {
    let result: any;
    const params = request.params || {};
    const contextId = params.contextId || generateId();

    switch (request.method) {
      case "message/send":
        // Handle message-based interaction
        result = await handleMessageSend(agent, params, contextId);
        break;

      case "search_providers":
        result = await agent.searchProviders(params, contextId);
        break;

      case "get_availability":
        result = await agent.getAvailability(params, contextId);
        break;

      case "get_booking":
        result = await agent.getBookingInfo(params, contextId);
        break;

      case "get_providers":
        result = await agent.getAllProviders();
        break;

      case "get_locations":
        result = await agent.getAllLocations();
        break;

      case "get_slots":
        result = await agent.getAllSlots(params);
        break;

      case "agent/info":
        result = agent.getCapabilities();
        break;

      case "agent/status":
        result = agent.getStatus(params.contextId);
        break;

      default:
        return res.json(createErrorResponse(request.id, -32601, `Method not found: ${request.method}`));
    }

    // Wrap result in TaskSnapshot format for A2A compliance
    const taskSnapshot: TaskSnapshot = {
      taskId: generateId(),
      contextId,
      status: result.success !== false ? "completed" : "failed",
      conversation: [
        {
          role: "agent",
          parts: [
            {
              type: "text",
              text: result.message || JSON.stringify(result),
            },
            {
              type: "data",
              data: result.data || result,
            },
          ],
        },
      ],
    };

    res.json(createSuccessResponse(request.id, taskSnapshot));
  } catch (error) {
    console.error('A2A error:', error);
    res.json(createErrorResponse(
      request.id,
      -32603,
      `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
    ));
  }
});

// Handle message/send method - extract intent from message
async function handleMessageSend(agent: ReturnType<typeof getSmartSchedulerAgent>, params: any, contextId: string) {
  const message = params.message;

  if (!message || !message.parts || !Array.isArray(message.parts)) {
    return {
      success: false,
      message: "Invalid message format: expected message.parts array",
    };
  }

  // Extract text from message parts
  const textParts = message.parts.filter((p: any) => p.type === "text");
  const text = textParts.map((p: any) => p.text).join(" ").toLowerCase();

  // Check for list/show all commands first
  if (text.includes("list") || text.includes("show all") || text.includes("all providers") || text.includes("all doctors")) {
    return await agent.searchProviders({}, contextId);
  }

  if (text.includes("all locations") || text.includes("list locations")) {
    return await agent.getAllLocations();
  }

  if (text.includes("all slots") || text.includes("list slots")) {
    return await agent.getAllSlots({ availableOnly: true });
  }

  // Intent detection - any request mentioning providers, doctors, specialists triggers search
  const isSearchIntent = text.includes("search") ||
    text.includes("find") ||
    text.includes("looking for") ||
    text.includes("need") ||
    text.includes("want") ||
    text.includes("show") ||
    text.includes("doctor") ||
    text.includes("provider") ||
    text.includes("specialist") ||
    // Specialty mentions also trigger search
    text.includes("dermatolog") ||
    text.includes("cardiolog") ||
    text.includes("pediatr") ||
    text.includes("neurolog") ||
    text.includes("primary care") ||
    text.includes("obgyn") ||
    text.includes("gynecolog") ||
    text.includes("orthoped") ||
    text.includes("psychiatr") ||
    text.includes("psycholog");

  if (isSearchIntent) {
    // Extract search parameters from text
    const searchParams: SearchRequest = {};

    // Extract specialty if mentioned - expanded list with variations
    const specialtyPatterns: { pattern: RegExp; specialty: string }[] = [
      { pattern: /dermatolog/i, specialty: "Dermatology" },
      { pattern: /cardiolog/i, specialty: "Cardiology" },
      { pattern: /primary care|family (medicine|doctor|physician)|general pract/i, specialty: "Primary Care" },
      { pattern: /pediatr/i, specialty: "Pediatrics" },
      { pattern: /obgyn|gynecolog|obstetric/i, specialty: "OB/GYN" },
      { pattern: /neurolog/i, specialty: "Neurology" },
      { pattern: /orthoped/i, specialty: "Orthopedics" },
      { pattern: /psychiatr/i, specialty: "Psychiatry" },
      { pattern: /psycholog/i, specialty: "Psychology" },
      { pattern: /ophthalm|eye doctor/i, specialty: "Ophthalmology" },
      { pattern: /oncolog/i, specialty: "Oncology" },
      { pattern: /urolog/i, specialty: "Urology" },
      { pattern: /endocrin/i, specialty: "Endocrinology" },
      { pattern: /gastro/i, specialty: "Gastroenterology" },
      { pattern: /pulmon/i, specialty: "Pulmonology" },
      { pattern: /rheumat/i, specialty: "Rheumatology" },
      { pattern: /allerg|immunolog/i, specialty: "Allergy/Immunology" },
      { pattern: /infectious/i, specialty: "Infectious Disease" },
      { pattern: /nephrol/i, specialty: "Nephrology" },
      { pattern: /hematol/i, specialty: "Hematology" },
    ];

    for (const { pattern, specialty } of specialtyPatterns) {
      if (pattern.test(text)) {
        searchParams.specialty = specialty;
        break;
      }
    }

    // Extract location - look for city names, states, or zip codes
    const zipMatch = text.match(/\b\d{5}\b/);
    if (zipMatch) {
      searchParams.location = zipMatch[0];
    } else {
      // Check for "in [location]" or "near [location]" patterns
      const locationMatch = text.match(/(?:in|near|around|at)\s+([a-zA-Z\s]+?)(?:\s+area|\s+region|\s*$|,|\.|that|who)/i);
      if (locationMatch) {
        searchParams.location = locationMatch[1].trim();
      } else {
        // Check for common city/state names
        const locationPatterns: { pattern: RegExp; location: string }[] = [
          { pattern: /\bboston\b/i, location: "Boston" },
          { pattern: /\bnew york\b|\bnyc\b/i, location: "New York" },
          { pattern: /\blos angeles\b|\bla\b/i, location: "Los Angeles" },
          { pattern: /\bchicago\b/i, location: "Chicago" },
          { pattern: /\bhouston\b/i, location: "Houston" },
          { pattern: /\bphoenix\b/i, location: "Phoenix" },
          { pattern: /\bphiladelphia\b/i, location: "Philadelphia" },
          { pattern: /\bsan antonio\b/i, location: "San Antonio" },
          { pattern: /\bsan diego\b/i, location: "San Diego" },
          { pattern: /\bdallas\b/i, location: "Dallas" },
          { pattern: /\bsan jose\b/i, location: "San Jose" },
          { pattern: /\baustin\b/i, location: "Austin" },
          { pattern: /\bseattle\b/i, location: "Seattle" },
          { pattern: /\bdenver\b/i, location: "Denver" },
          { pattern: /\batlanta\b/i, location: "Atlanta" },
          { pattern: /\bmiami\b/i, location: "Miami" },
        ];

        for (const { pattern, location } of locationPatterns) {
          if (pattern.test(text)) {
            searchParams.location = location;
            break;
          }
        }
      }
    }

    // Extract insurance - expanded list
    const insurancePatterns: { pattern: RegExp; insurance: string }[] = [
      { pattern: /\bmedicare\b/i, insurance: "Medicare" },
      { pattern: /\bmedicaid\b/i, insurance: "Medicaid" },
      { pattern: /\bblue cross|bcbs\b/i, insurance: "Blue Cross Blue Shield" },
      { pattern: /\baetna\b/i, insurance: "Aetna" },
      { pattern: /\bunited\s*health/i, insurance: "UnitedHealthcare" },
      { pattern: /\bcigna\b/i, insurance: "Cigna" },
      { pattern: /\bhumana\b/i, insurance: "Humana" },
      { pattern: /\bkaiser\b/i, insurance: "Kaiser" },
    ];

    for (const { pattern, insurance } of insurancePatterns) {
      if (pattern.test(text)) {
        searchParams.insurance = searchParams.insurance || [];
        searchParams.insurance.push(insurance);
      }
    }

    // Extract language preferences
    const languagePatterns: { pattern: RegExp; language: string }[] = [
      { pattern: /\bspanish\b/i, language: "Spanish" },
      { pattern: /\bchinese\b|\bmandarin\b|\bcantonese\b/i, language: "Chinese" },
      { pattern: /\bfrench\b/i, language: "French" },
      { pattern: /\bvietnamese\b/i, language: "Vietnamese" },
      { pattern: /\bkorean\b/i, language: "Korean" },
      { pattern: /\bgerman\b/i, language: "German" },
      { pattern: /\btagalog\b|\bfilipino\b/i, language: "Tagalog" },
      { pattern: /\barabic\b/i, language: "Arabic" },
      { pattern: /\brussian\b/i, language: "Russian" },
      { pattern: /\bportuguese\b/i, language: "Portuguese" },
    ];

    for (const { pattern, language } of languagePatterns) {
      if (pattern.test(text)) {
        searchParams.languages = searchParams.languages || [];
        searchParams.languages.push(language);
      }
    }

    return await agent.searchProviders(searchParams, contextId);
  } else if (text.includes("availability") || text.includes("available") || text.includes("slots") || text.includes("appointment time")) {
    // Look for a provider ID in message data
    const dataParts = message.parts.filter((p: any) => p.type === "data");
    const providerId = dataParts[0]?.data?.providerId;

    if (providerId) {
      return await agent.getAvailability({ providerId }, contextId);
    }

    // If asking about availability without a provider, return available slots
    return await agent.getAllSlots({ availableOnly: true });
  } else if (text.includes("book") || text.includes("schedule") || text.includes("reserve")) {
    const dataParts = message.parts.filter((p: any) => p.type === "data");
    const slotId = dataParts[0]?.data?.slotId;

    if (slotId) {
      return await agent.getBookingInfo({ slotId }, contextId);
    }

    return {
      success: false,
      message: "To book an appointment, first search for providers, then select a slot. I'll provide booking information once you choose a specific time.",
    };
  } else if (text.includes("help") || text.includes("what can you") || text.includes("how do")) {
    return {
      success: true,
      message: "I can help you with healthcare scheduling! Try:\n\n• \"Find dermatologists in Boston\"\n• \"Show me Spanish-speaking doctors\"\n• \"Search for cardiologists that accept Medicare\"\n• \"List all providers\"\n• \"Show available appointments\"",
      data: agent.getCapabilities(),
    };
  }

  // Default: run a general search to show available providers
  return await agent.searchProviders({}, contextId);
}

// ============================================
// MCP Tools Endpoint
// ============================================

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPToolResponse {
  content: string;
}

/**
 * @swagger
 * /api/smart-scheduler/mcp/tools:
 *   get:
 *     summary: Get MCP tool definitions
 *     tags: [Smart Scheduler Agent]
 *     responses:
 *       200:
 *         description: MCP tool definitions for Claude
 */
smartSchedulerRouter.get('/mcp/tools', (req: Request, res: Response) => {
  const tools = [
    {
      name: "search_healthcare_providers",
      description: "Search for healthcare providers by specialty, location, insurance, and languages. Returns matching providers with available appointment slots.",
      inputSchema: {
        type: "object",
        properties: {
          specialty: {
            type: "string",
            description: "Medical specialty (e.g., 'Dermatology', 'Cardiology')",
          },
          location: {
            type: "string",
            description: "Location - city/state or zip code (e.g., 'Boston, MA' or '02115')",
          },
          insurance: {
            type: "array",
            items: { type: "string" },
            description: "Insurance types to filter by (e.g., ['Medicare', 'Blue Cross Blue Shield'])",
          },
          languages: {
            type: "array",
            items: { type: "string" },
            description: "Languages spoken by provider (e.g., ['English', 'Spanish'])",
          },
          dateFrom: {
            type: "string",
            description: "Start date for availability (ISO 8601)",
          },
          dateTo: {
            type: "string",
            description: "End date for availability (ISO 8601)",
          },
        },
      },
    },
    {
      name: "get_provider_availability",
      description: "Get available appointment slots for a specific healthcare provider within a date range.",
      inputSchema: {
        type: "object",
        properties: {
          providerId: {
            type: "string",
            description: "The provider's unique identifier",
          },
          startDate: {
            type: "string",
            description: "Start date for availability search (ISO 8601)",
          },
          endDate: {
            type: "string",
            description: "End date for availability search (ISO 8601)",
          },
        },
        required: ["providerId"],
      },
    },
    {
      name: "get_appointment_booking_link",
      description: "Get the booking URL or phone number for a specific appointment slot.",
      inputSchema: {
        type: "object",
        properties: {
          slotId: {
            type: "string",
            description: "The unique identifier of the selected appointment slot",
          },
        },
        required: ["slotId"],
      },
    },
  ];

  res.json({ tools });
});

/**
 * @swagger
 * /api/smart-scheduler/mcp/tools:
 *   post:
 *     summary: Execute MCP tool
 *     tags: [Smart Scheduler Agent]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - arguments
 *             properties:
 *               name:
 *                 type: string
 *               arguments:
 *                 type: object
 *     responses:
 *       200:
 *         description: Tool execution result
 */
smartSchedulerRouter.post('/mcp/tools', async (req: Request, res: Response) => {
  const toolCall: MCPToolCall = req.body;
  const agent = getSmartSchedulerAgent();

  try {
    let result: any;

    switch (toolCall.name) {
      case "search_healthcare_providers":
        result = await agent.searchProviders(toolCall.arguments);
        break;

      case "get_provider_availability":
        result = await agent.getAvailability({
          providerId: toolCall.arguments.providerId,
          startDate: toolCall.arguments.startDate,
          endDate: toolCall.arguments.endDate,
        });
        break;

      case "get_appointment_booking_link":
        result = await agent.getBookingInfo({
          slotId: toolCall.arguments.slotId,
        });
        break;

      default:
        result = {
          success: false,
          message: `Unknown tool: ${toolCall.name}`,
        };
    }

    // Return MCP-compliant response
    const response: MCPToolResponse = {
      content: JSON.stringify(result, null, 2),
    };

    res.json(response);
  } catch (error) {
    console.error('MCP tool error:', error);
    const response: MCPToolResponse = {
      content: JSON.stringify({
        success: false,
        message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }),
    };
    res.json(response);
  }
});

// ============================================
// Helper Functions
// ============================================

function createSuccessResponse(id: string | number | null, result: any): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    result,
    id,
  };
}

function createErrorResponse(id: string | number | null, code: number, message: string, data?: any): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    error: {
      code,
      message,
      data,
    },
    id,
  };
}

export default smartSchedulerRouter;
