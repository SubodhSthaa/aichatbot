# Support Chatbot API

A FastAPI-based backend service that provides an AI-powered support
chatbot, automatic issue classification, chat session history, and a
lightweight ticketing system.\
It integrates with **LM Studio** (local LLM server) to provide
intelligent responses for IT/E-Banking/General inquiries.

## Features

### AI-Powered Chat System

-   Sends user messages to an LLM (via LM Studio API)
-   Chat sessions with persistent history
-   Strict system prompt ensures concise, clean responses

### Automatic Issue Classification

Categories include: - E-Banking\
- IT Support\
- General

### Ticketing System

-   Create support tickets\
-   Auto-generated Ticket IDs\
-   Stores user, email, issue type, and description\
-   Retrieve all created tickets\
-   SQLite-backed storage

### Session Management

-   Auto-creates session IDs
-   Saves full chat history
-   View past sessions through API

### API Endpoints

-   `/chat`
-   `/ticket`
-   `/tickets`
-   `/sessions/{id}/history`
-   `/health`

------------------------------------------------------------------------

## Installation

### 1. Clone the Project

``` bash
git clone <repo-url>
cd <project-folder>
```

### 2. Install Dependencies

``` bash
pip install fastapi uvicorn httpx pydantic
```

### 3. Start LM Studio

Ensure LM Studio is running at:

    http://localhost:1030/v1/chat/completions

### 4. Run the API

``` bash
uvicorn main:app --reload
```

------------------------------------------------------------------------

## Endpoint Documentation

Available via FastAPI: - Swagger → `/docs` - ReDoc → `/redoc`

------------------------------------------------------------------------

## Database Schema

SQLite tables include: - `tickets` - `chat_sessions` - `chat_history`

Indexes for performance: - `idx_chat_history_session` -
`idx_tickets_type` - `idx_tickets_status`

------------------------------------------------------------------------

## Future Enhancements

-   JWT authentication
-   Admin dashboard
-   Docker deployment
-   Unit tests
-   Rate limiting

------------------------------------------------------------------------

## License

MIT License
