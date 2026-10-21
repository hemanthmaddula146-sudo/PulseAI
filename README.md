# 🌍 PulseAI — AI-Powered Disaster Intelligence Platform

PulseAI is an AI-powered disaster intelligence platform designed to monitor earthquakes and natural events, visualize disaster information, and provide AI-driven safety guidance.

The platform brings disaster information and safety assistance together in an interactive dashboard.

## ✨ Features

- 🌎 **Earthquake Monitoring** — Retrieve and explore earthquake information.
- 🌪️ **Natural Event Tracking** — View natural events using NASA's Earth Observatory Natural Event Tracker (EONET).
- 🗺️ **Interactive Map** — Visualize earthquake locations and geographic information.
- 🤖 **AI Assistant** — Get AI-generated answers and disaster safety guidance.
- 🚨 **Alerts and Risk Awareness** — Access disaster-related information and safety guidance.
- 🌦️ **Weather Information** — Explore weather information through the dashboard.
- 📊 **Interactive Dashboard** — Navigate disaster monitoring features from one place.

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, TypeScript
- **Styling:** Tailwind CSS
- **Mapping:** Leaflet and React Leaflet
- **AI:** Google Gemini API
- **Data Sources:** USGS earthquake feeds and NASA EONET

## 🚀 Getting Started

### Prerequisites

Install the following before running the project:

- Node.js
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/hemanthmaddula146-sudo/PulseAI.git
```

### 2. Open the project directory

```bash
cd PulseAI/frontend
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env.local` file inside the `frontend` directory.

Add your Google Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Replace `your_gemini_api_key` with your own API key.

**Security:** Never commit `.env.local` or expose your API key in public repositories.

### 5. Start the development server

```bash
npm run dev
```

### 6. Open PulseAI

Visit:

http://localhost:3000

## 📁 Project Structure

```text
PulseAI/
└── frontend/
    ├── app/
    │   ├── ai-assistant/
    │   ├── alerts/
    │   ├── api/
    │   │   ├── ai-assistant/
    │   │   ├── earthquakes/
    │   │   └── natural-events/
    │   ├── components/
    │   ├── earthquakes/
    │   ├── natural-events/
    │   ├── reports/
    │   ├── settings/
    │   ├── weather/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── public/
    ├── package.json
    └── README.md
```

## 🔐 API Key Security

- Keep API keys in local environment variables.
- Do not upload `.env.local` to GitHub.
- Configure the required environment variables separately when deploying.

## 🎯 Project Goal

PulseAI aims to make disaster information easier to access and understand by combining real-time event data, interactive visualization, and AI-powered safety guidance.

## 👨‍💻 Author

Developed as an AI-powered disaster intelligence project.

## 📄 License

No license has been specified yet.