# AI Product Manager Copilot

## 🖼️ Project Screenshots

Here’s a preview of the application 👇

<p align="center">
  <img src="./static/homepage.png" width="800" alt="AI Product Manager Copilot Screenshot" />
</p>

---

# 🚀 Overview

AI Product Manager Copilot is an AI-powered assistant designed to help Product Managers streamline the complete product development lifecycle. It leverages Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), and intelligent workflows to generate Product Requirement Documents (PRDs), user stories, acceptance criteria, feature prioritization, market research, roadmap planning, and release documentation.

The application enables product teams to reduce manual effort, improve collaboration, and accelerate decision-making using Generative AI.

---

# 🧠 Objective

To build an intelligent AI assistant that helps Product Managers:

- Generate detailed Product Requirement Documents (PRDs)
- Create user stories with acceptance criteria
- Prioritize features using AI recommendations
- Perform competitor and market analysis
- Generate product roadmaps
- Assist in sprint planning
- Answer product-related questions using RAG
- Improve team productivity with AI automation

---

# ⚙️ Tech Stack

## 🖥 Frontend

- React.js
- HTML5
- CSS3
- JavaScript
- Tailwind CSS

## ⚙️ Backend

- Python
- FastAPI / Flask
- LangChain
- LangGraph
- Pydantic

## 🤖 AI & LLM

- Google Gemini
- OpenAI GPT
- Hugging Face
- Prompt Engineering

## 🧠 Retrieval

- LangChain
- FAISS / ChromaDB
- RAG (Retrieval-Augmented Generation)

## 📄 Document Processing

- PyPDF2
- Unstructured
- Sentence Transformers

## ☁️ Deployment

- Render / Railway / Vercel
- GitHub

---

# ✨ Features

✅ AI-powered Product Requirement Document (PRD) generation

✅ Automatic User Story generation

✅ Acceptance Criteria generation

✅ Feature Prioritization (MoSCoW, RICE, Kano)

✅ Product Roadmap generation

✅ Competitor Analysis

✅ Market Research Assistant

✅ Sprint Planning Assistant

✅ AI Chat powered by RAG

✅ Document Upload (PDF, DOCX)

✅ Context-aware Product Q&A

✅ Clean and responsive UI

---

# 📂 Knowledge Base

The assistant retrieves information from uploaded documents such as:

- Product Requirement Documents
- Business Requirement Documents
- Technical Specifications
- Market Research Reports
- Customer Feedback
- Feature Requests
- Release Notes
- Product Documentation

---

# 🧠 AI Workflow

### Input

- Product Idea
- Business Goal
- User Requirements
- Uploaded Documents

↓

### Processing

- Prompt Engineering
- Context Retrieval (RAG)
- LLM Reasoning
- Feature Analysis

↓

### Output

- PRD
- User Stories
- Acceptance Criteria
- Product Roadmap
- Prioritized Backlog
- AI Recommendations

---

# 🔍 RAG Pipeline

### Document Processing

- Upload documents
- Extract text
- Split into chunks
- Generate embeddings
- Store in Vector Database

### Retrieval

- User asks a question
- Relevant chunks are retrieved
- Context is passed to LLM

### Response

- Accurate
- Context-aware
- Hallucination reduced

---

# 🌐 Application Flow

### Frontend

- User enters product details or uploads documents.
- User selects required AI task.
- Request is sent to backend.

### Backend

- Backend retrieves relevant knowledge using RAG.
- LLM generates intelligent responses.
- Result is returned to frontend.

### Output

- Product documentation
- AI recommendations
- Product insights
- Roadmap
- User stories

---

# 🚀 Deployment

### Steps

1. Push project to GitHub

2. Deploy Backend on Render

3. Deploy Frontend on Vercel

4. Configure Environment Variables

5. Add Gemini/OpenAI API Key

6. Launch Application

---

# 📁 Folder Structure

```
AI-Product-Manager-Copilot/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app.py
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── rag/
│   └── prompts/
│
├── data/
│
├── vectorstore/
│
├── uploads/
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

# 🛠 Setup Instructions

### Clone Repository

```bash
git clone https://github.com/<your-username>/AI-Product-Manager-Copilot.git

cd AI-Product-Manager-Copilot
```

### Create Virtual Environment

```bash
python -m venv venv

source venv/bin/activate

# Windows

venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Add Environment Variables

Create a `.env` file

```env
GOOGLE_API_KEY=YOUR_API_KEY

OPENAI_API_KEY=YOUR_API_KEY
```

### Run Backend

```bash
python app.py
```

### Run Frontend

```bash
npm install

npm start
```

---

# 📦 Requirements

```
Flask
FastAPI
LangChain
LangGraph
chromadb
faiss-cpu
sentence-transformers
google-generativeai
openai
python-dotenv
PyPDF2
unstructured
pandas
numpy
gunicorn
```

---

# 🎯 Future Improvements

- Multi-agent AI workflow
- Jira Integration
- GitHub Integration
- Slack Integration
- Notion Integration
- Sprint Analytics Dashboard
- AI Risk Assessment
- Product KPI Dashboard
- Voice-enabled Product Assistant
- Multi-language support

---

# 🙌 Acknowledgments

- Google Gemini
- OpenAI
- LangChain
- LangGraph
- ChromaDB
- FAISS
- Hugging Face
- Render
- Vercel

---

# 👨‍💻 Author

**Yash Raj**

Infosys Springboard virtual 7.0 Internship 




⭐ If you found this project useful, don't forget to **Star** this repository!