# GitStory

## Project Overview

GitStory is an interactive, AI-powered tool designed to visualize and analyze GitHub repositories through a conversational interface. It transforms the way developers interact with code history by providing a chat-based experience that can render rich, interactive components such as commit timelines, pull request summaries, diff viewers, and risk heatmaps. By leveraging advanced AI models and the Tambo framework, GitStory allows users to explore codebases, understand complex changes, and gain insights into repository health without leaving the interface.

## Key Features

- **Conversational Interface**: Interact with your repository using natural language to ask questions about commits, PRs, and potential issues.
- **Interactive Components**:
  - **Commit Timeline**: Visualize the history of changes with a timeline view.
  - **PR Summary**: Get detailed summaries of pull requests including status, customized descriptions, and file impacts.
  - **Diff Viewer**: Review code changes with a syntax-highlighted, side-by-side or unified difference viewer.
  - **Risk Heatmap**: Identify potential hotspots and high-risk areas in your codebase based on recent activity and complexity.
- **Repository Context**: Automatically fetches and maintains context for the connected GitHub repository to provide accurate and relevant answers.
- **Seamless GitHub Integration**: Authenticate securely with GitHub to access private and public repositories.
- **Dual-View Experience**: Features a chat interface for conversation and a dedicated side panel ("Canvas") for detailed component views, ensuring a clean and organized workflow.

## Technology Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Tambo SDK (@tambo-ai/react, @tambo-ai/typescript-sdk)
- **UI Components**: Lucide React for icons, custom components for specific visualizations.
- **State Management**: React Hooks and Context API for managing thread state and component registry.

## Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager
- A GitHub account for authentication
- A Tambo API key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/gitstory.git
    cd gitstory
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env.local` file in the root directory and add your API key:
    ```env
    NEXT_PUBLIC_TAMBO_API_KEY=your_tambo_api_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Access the application:**
    Open `http://localhost:3000` in your browser.

## Architecture

GitStory utilizes the Tambo framework to bridge the gap between Large Language Models (LLMs) and UI rendering. The application registers specific React components that the AI can dynamically render in response to user queries.

**Registered Components:**

- **Commit-Timeline**: Displays a scrolling timeline of commits with details like author, hash, message, and impacted files.
- **Diff-Viewer**: Provides a side-by-side or unified view of file changes, complete with syntax highlighting and line numbers.
- **PR-Summary**: Generates a structured summary of a Pull Request, including descriptions, file changes, and status indicators.
- **Risk-Heatmap**: Visualizes code complexity and churn to highlight potential high-risk areas in the repository.
- **Contributor-Network**: Visualizes the network of contributors to the repository.

These components are integrated directly into the chat stream and can be viewed in a dedicated, expandable side panel ("Canvas") for better readability and interaction. The application follows a modern Next.js 14 architecture, leveraging server components and client-side interactivity where appropriate.
