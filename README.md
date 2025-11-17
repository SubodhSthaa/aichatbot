A support chatbot API built with FastAPI that connects to a local LM Studio model, classifies issues (IT vs E‑Banking vs General), maintains per‑session chat history in SQLite, and exposes simple endpoints for chat, ticketing, and health checks.

Overview
This service provides a REST API for an internal support chatbot.
It integrates with LM Studio via the OpenAI‑compatible chat completions API, persists chat sessions and history in SQLite, and allows users or frontend apps to create and list support tickets.

Features
FastAPI‑based HTTP API with CORS enabled for browser frontends.

Integration with LM Studio (/v1/chat/completions) using a specified local model.

Chat sessions with persistent history stored in SQLite (chat_sessions, chat_history).

Simple keyword‑based issue classification into E‑Banking, IT Support, or General.

Ticket creation and listing backed by a tickets table in SQLite.

Basic health check and custom error handlers for 404 and 500 responses.

Architecture
The application is a single FastAPI app configured in one module.
On startup it initializes an SQLite database file (support_system.db) with tables for tickets, chat sessions, and chat history, plus useful indexes for query performance.

Requirements
Install dependencies using pip or your preferred environment manager.

bash
pip install fastapi uvicorn httpx pydantic "uvicorn[standard]"
Python standard library modules used include sqlite3, uuid, logging, os, and datetime, so no extra installation is needed for them.

You also need LM Studio (or another OpenAI‑compatible server) running locally and exposing the chat completions endpoint at http://localhost:1030/v1/chat/completions.

Configuration
Key configuration constants at the top of the file:

python
LMSTUDIO_URL = "http://localhost:1030/v1/chat/completions"
MODEL_NAME = "openai/gpt-oss-20b"
MAX_HISTORY_MESSAGES = 10
MAX_TOKENS = 512
DB_FILE = "support_system.db"
LMSTUDIO_URL: URL of the LM Studio (or compatible) chat completions endpoint.

MODEL_NAME: Model identifier to send in the completion payload.

MAX_HISTORY_MESSAGES: Maximum number of previous messages included in each model call to limit context size.

MAX_TOKENS: Maximum tokens to generate per response.

To adjust for your environment or model, change these constants or promote them to environment variables.

Database schema
The init_db() function creates three tables if they do not exist:

tickets

id (TEXT, primary key)

user (TEXT, required)

email (TEXT, required)

type (TEXT, required, logical category like E‑Banking or IT Support)

description (TEXT, required)

session_id (TEXT, nullable, links to chat session)

status (TEXT, default 'open')

created_at, updated_at (TIMESTAMP, default CURRENT_TIMESTAMP)

chat_sessions

id (TEXT, primary key)

created_at (TIMESTAMP)

last_activity (TIMESTAMP)

chat_history

id (INTEGER, primary key autoincrement)

session_id (TEXT, foreign key to chat_sessions.id)

role (TEXT, user or assistant)

content (TEXT)

timestamp (TIMESTAMP, default CURRENT_TIMESTAMP)

Indexes are created on chat_history.session_id, tickets.type, and tickets.status for better performance when querying history and tickets.

AI behavior and classification
The get_ai_response coroutine builds a conversation for LM Studio with:

A detailed system prompt that constrains the assistant to short, clear, IT‑support‐style answers.

Up to MAX_HISTORY_MESSAGES previous messages from this session, plus the latest user message.

The LM Studio response is read from result["choices"][0]["message"], using the content field or falling back to reasoning_content if present.

Issue type classification is done by classify_issue_type(message: str) -> str using simple keyword lists:

E‑Banking keywords such as bank, account, transaction, loan, card.

IT Support keywords such as password, login, computer, network, email, printer.

Scores are computed by counting how many keywords appear in the lowercase message:

If E‑Banking score is highest and greater than zero, it returns "E-Banking".

Else if IT score is greater than zero, it returns "IT Support".

Otherwise it returns "General".

This category is returned from the /chat endpoint and can be used by the frontend to decide routing or ticket types.

API endpoints
Root: GET /
Serves index.html from the current working directory if it exists using FileResponse.

If the file is missing, returns {"error": "index.html not found"} with HTTP 404.

This allows a simple static frontend to be hosted directly by the API.

Chat: POST /chat
Request body (ChatMessage model):

json
{
  "message": "string",
  "session_id": "optional-string"
}
Behavior:

Reads session_id from the body or from the Session-ID header; if neither is present, generates a new ID like session_<uuid>.

Ensures the session exists or creates it, and updates last_activity.

Fetches existing history for that session from chat_history.

Calls the LM Studio backend with the system prompt, history, and the new user message.

Saves both the user message and assistant response to chat_history.

Response JSON:

json
{
  "response": "AI reply text",
  "category": "E-Banking | IT Support | General",
  "session_id": "session-id-string"
}
On internal errors it returns HTTP 500 with a generic error message and a short user‑friendly response string.

Create ticket: POST /ticket
Request body (generic dict in the code, but effectively this shape):

json
{
  "user": "John Doe",
  "email": "john@example.com",
  "type": "IT Support",
  "description": "My laptop will not start.",
  "session_id": "optional-session-id"
}
Behavior:

Generates a ticket ID like TKT-YYYYMMDD-XXXXXXXX.

Validates that user, email, type, and description are present and non‑empty (after trimming).

Inserts a new row into tickets with status set to 'open'.

Returns the created ticket representation and a success message.

Successful response:

json
{
  "message": "Ticket created successfully!",
  "ticket": {
    "id": "TKT-20251117-ABCD1234",
    "user": "John Doe",
    "email": "john@example.com",
    "type": "IT Support",
    "description": "My laptop will not start.",
    "status": "open",
    "created_at": "2025-11-17T19:41:00.000000"
  }
}
If a required field is missing, it raises HTTP 400 with "Missing required field: <field>".

List tickets: GET /tickets
Returns all tickets ordered by created_at descending.

Response shape:

json
{
  "tickets": [
    {
      "id": "TKT-20251117-ABCD1234",
      "user": "John Doe",
      "email": "john@example.com",
      "type": "IT Support",
      "description": "My laptop will not start.",
      "status": "open",
      "created_at": "2025-11-17 19:41:00",
      "updated_at": "2025-11-17 19:41:00"
    }
  ]
}
If the query fails, it returns HTTP 500 with "Failed to fetch tickets".

Session history: GET /sessions/{session_id}/history
Returns all chat messages for a given session ID.

Response:

json
{
  "session_id": "session_123",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello, how can I help you?" }
  ]
}
On errors it responds with HTTP 500 and "Failed to fetch session history".

Health check: GET /health
Simple health endpoint.

Response:

json
{
  "status": "healthy",
  "timestamp": "2025-11-17T19:41:00.000000",
  "version": "1.0.0"
}
Error handling
The app defines global FastAPI exception handlers:

404 handler returning {"error": "Endpoint not found"}.

500 handler logging the error and returning {"error": "Internal server error"}.

Individual endpoints also catch exceptions and either re‑raise HTTPException or convert unexpected failures into HTTP 500 responses with friendly error messages.

CORS configuration
CORS middleware is configured to allow all origins, methods, and headers:

python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
This is convenient for development and testing from any frontend, but for production it is recommended to restrict allow_origins to trusted domains.

Running the server
Assuming the code lives in main.py and LM Studio is already running on localhost:1030, start the FastAPI app with Uvicorn.

bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
Then the main endpoints are available at:

http://localhost:8000/ – optional static frontend (index.html) if present.

http://localhost:8000/chat – chat with the support bot.

http://localhost:8000/ticket – create tickets.

http://localhost:8000/tickets – list tickets.

http://localhost:8000/health – health probe.

Example usage
Example chat request using curl:

bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I cannot access my email account.",
    "session_id": "session_123"
  }'
Example ticket creation from the chat context:

bash
curl -X POST http://localhost:8000/ticket \
  -H "Content-Type: application/json" \
  -d '{
    "user": "Jane Smith",
    "email": "jane.smith@example.com",
    "type": "IT Support",
    "description": "Email login fails with an error.",
    "session_id": "session_123"
  }'
