# AUAR Panel Delivery Planner

A full-stack application for managing and optimizing the delivery of construction panels using AI.

## Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- An OpenAI API Key (for the AI planning features)

## Setup Instructions

### Option A: Running with Docker Compose (Recommended - One-Shot Setup)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auar
   ```

2. **Configure your OpenAI API Key**
   Make sure you have your OpenAI API Key exported in your environment, or create a `.env` file in the project root:
   ```bash
   echo "OPENAI_API_KEY=your_openai_key_here" > .env
   ```

3. **Launch with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the App**
   - The frontend will be available at `http://localhost:8080`
   - The backend runs on `http://localhost:3001`

---

### Option B: Running Locally

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auar
   ```

2. **Install dependencies**
   Install both frontend and backend dependencies from the root directory:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Navigate to the `server` directory and copy the example environment file:
   ```bash
   cd server
   cp .env.example .env
   ```
   Open `server/.env` and insert your actual OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-real-key-here
   PORT=3001
   ```

4. **Start the Application**
   From the root of the project, run the dev script which starts both the client and server concurrently:
   ```bash
   cd ..
   npm run dev
   ```

5. **Access the App**
   - The frontend will be available at `http://localhost:5173`
   - The backend runs on `http://localhost:3001`

## Features
- **AI Planning:** Use natural language commands to auto-generate valid delivery stacks that respect strict sequence and weight constraints.
- **Manual Adjustments:** Drag and drop panels to adjust AI proposals or edit committed stacks with built-in LIFO validation.
- **Exception Handling:** Quickly report damaged panels and commission replacements.
