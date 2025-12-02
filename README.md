# PrawnikGPT - Intelligent Legal Assistant

PrawnikGPT is a Retrieval-Augmented Generation (RAG) based legal assistant designed to answer questions about Polish law. It leverages a FastAPI backend, a Supabase database with pgvector for semantic search, and OLLAMA for Large Language Model (LLM) integration.

## ✨ Key Features

- **RAG Pipeline**: Provides accurate, context-aware answers to legal questions by retrieving relevant information from a vectorized database of legal acts.
- **Dual Response System**: Offers both a "fast response" using a smaller, quicker model and a more detailed "accurate response" from a larger, more powerful model.
- **Query Management**: Users can view their query history, see detailed results, and manage their data.
- **Response Ratings**: A feedback system allows users to rate the quality of generated responses (thumbs up/down).
- **Legal Acts Browser**: A comprehensive interface to browse, search (with full-text search), and view relationships between legal acts.
- **Secure Authentication**: User management and authentication are handled securely through Supabase.

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **LLM & Embeddings**: OLLAMA (running models like Mistral, Llama, etc.)
- **Caching**: Redis (for caching RAG context)
- **Frontend**: Astro (with TypeScript)
- **Testing**: Pytest
- **Code Quality**: Ruff, Prettier, ESLint
- **DevOps**: Docker, Husky (pre-commit hooks)

## 📂 Project Structure

```
/
├── backend/            # FastAPI application source code
│   ├── db/             # Database access layer (repositories)
│   ├── models/         # Pydantic models for data validation
│   ├── routers/        # API endpoint definitions
│   ├── services/       # Business logic (RAG pipeline, LLM services)
│   └── tests/          # Unit and integration tests
├── src/                # Astro frontend source code
│   ├── lib/            # Supabase client, API client, types
│   ├── pages/          # Application pages/routes
│   └── layouts/        # Astro layouts
├── supabase/           # Supabase configuration and migrations
│   └── migrations/     # Database schema migrations
├── docs/               # Project documentation
├── scripts/            # Utility and automation scripts
├── .env.example        # Environment variable template
├── package.json        # Frontend dependencies
└── requirements.txt    # Backend dependencies
```

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js (version specified in `.nvmrc`)
- Docker and Docker Compose
- An active Supabase project
- OLLAMA installed and running locally

### 1. Clone the Repository

```bash
git clone <repository-url>
cd prawnik_v01
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your credentials for Supabase, OLLAMA, and Redis.

```bash
cp .env.example .env
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Frontend Setup

```bash
# From the root directory
npm install
```

### 5. Apply Database Migrations

Make sure your Supabase CLI is configured, then apply the migrations.

```bash
supabase db push
```

## 🏃 Running the Application

### 1. Run the Backend Server

```bash
# From the backend/ directory
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Run the Frontend Development Server

```bash
# From the root directory
npm run dev
```

The application should now be available at `http://localhost:4321`.

## 🧪 Testing

To run the backend tests, execute the following command from the `backend/` directory:

```bash
pytest
```