::: {align="center"}
🌍 PulseAI
REAL-TIME AI DISASTER INTELLIGENCE PLATFORM
Live disaster data. Clearer insights. Safer decisions.
![Live](https://img.shields.io/badge/🌐%20LIVE%20DEMO-PulseAI-00C7D9?style=for-the-badge)
![Next.js](https://img.shields.io/badge/NEXT.JS-App%20Router-000000?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TYPESCRIPT-Strict%20Typing-3178C6?style=for-the-badge&logo=typescript)
![Deployed on](https://img.shields.io/badge/DEPLOYED%20ON-Vercel-000000?style=for-the-badge&logo=vercel)
Explore the Live App ·
View Source
Code · Report
an Issue
:::
---
Overview
PulseAI is a real-time disaster intelligence web application that
brings earthquake data, natural-event information, interactive mapping,
and AI-powered safety guidance together in one dashboard.
Built with Next.js, TypeScript, public disaster data services, and
Google Gemini, PulseAI is designed to make disaster-related
information easier to explore and understand through a clean, modern
interface.
> **Live demo:** https://pulse-ai-two-theta.vercel.app
Highlights
---
Capability                          Description
---
Disaster dashboard              View a consolidated overview of
disaster-related information.
Earthquake monitoring           Retrieve and explore earthquake
information from USGS data
services.
Natural-event tracking          Explore events provided by NASA's
Earth Observatory Natural Event
Tracker (EONET).
Interactive map                 View geographic event information
on a map interface.
AI assistant                    Ask disaster-related questions and
receive Gemini-generated
explanations and general safety
guidance.
Alerts                          Visit a dedicated page for
disaster-related alert information.
Weather                         Access the application's weather
page.
Reports and settings            Navigate reporting and application
settings pages.
Technology
::: {align="center"}
Frontend             Data & AI               Delivery
---
Next.js App Router   USGS earthquake data    Vercel
TypeScript           NASA EONET API          GitHub
Tailwind CSS         Google Gemini API       Git
Lucide React         Leaflet map ecosystem  
:::
Application Architecture
PulseAI uses the Next.js App Router, with server-side route handlers for
application API requests.
``` text
PulseAI/
├── app/
│   ├── api/
│   │   ├── ai-assistant/
│   │   │   └── route.ts
│   │   ├── earthquakes/
│   │   │   └── route.ts
│   │   └── natural-events/
│   │       └── route.ts
│   ├── ai-assistant/
│   ├── alerts/
│   ├── components/
│   │   └── EarthquakeMap.tsx
│   ├── earthquakes/
│   ├── natural-events/
│   ├── reports/
│   ├── settings/
│   ├── weather/
│   ├── layout.tsx
│   └── page.tsx
├── public/
├── .env.local
├── package.json
└── README.md
```
This diagram highlights the principal application areas. The exact
project structure may evolve as features are updated.
Run Locally
Requirements
Node.js LTS
npm
A Google Gemini API key for AI Assistant functionality
1. Clone the repository
``` bash
git clone https://github.com/hemanthmaddula146-sudo/PulseAI.git
cd PulseAI
```
2. Install dependencies
``` bash
npm install
```
3. Configure environment variables
Create a `.env.local` file in the project root:
``` env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_FALLBACK_MODEL=gemini-3.8-flash
```
Use the model names configured in your application and supported by your
Gemini API access. If your code does not use `GEMINI_FALLBACK_MODEL`,
omit that variable.
Keep credentials private. Do not commit `.env.local`, publish API
keys, or expose private keys through `NEXT_PUBLIC_` variables. Configure
production secrets in Vercel's project environment settings.
4. Start the development server
``` bash
npm run dev
```
Open http://localhost:3000 in your browser.
5. Build for production
``` bash
npm run build
npm run start
```
Data Sources & AI
USGS: Earthquake information is sourced from USGS data services.
NASA EONET: Natural-event information is sourced from NASA's
Earth Observatory Natural Event Tracker.
Google Gemini: The AI assistant uses the Gemini API to generate
responses based on the configured model and API credentials.
Data availability, update frequency, and API limits depend on the
respective providers and network conditions.
Deployment
PulseAI is deployed on Vercel and connected to the GitHub
repository.
Production URL: https://pulse-ai-two-theta.vercel.app
For your own deployment:
Import the GitHub repository into Vercel.
Confirm that Vercel detects the project as a Next.js application.
Configure the required Gemini environment variables in the Vercel
project settings.
Deploy and wait for the build to complete.
Test the dashboard, map, data routes, and AI Assistant on the
deployed site.
When the repository is connected to Vercel, pushing changes to the
configured production branch can trigger a new deployment.
Security & Responsible Use
Never commit API keys or secrets to source control.
Keep Gemini API credentials on the server side.
Rotate a key immediately if it is accidentally exposed.
PulseAI is an informational project, not an official
emergency-response system.
AI-generated responses can be incomplete or incorrect. During an
emergency, follow local authorities and official
emergency-management guidance.
Roadmap
Potential future improvements include:
More detailed event filtering and map layers.
Improved alert prioritization and configurable notifications.
Additional accessibility and mobile usability refinements.
Expanded automated tests and error handling.
Clearer event timelines and source attribution.
Author
Hemanth Maddula
GitHub:
@hemanthmaddula146-sudo
Project repository:
PulseAI
Live application:
pulse-ai-two-theta.vercel.app
---
::: {align="center"}
Built to make disaster information easier to explore and understand.
If PulseAI is useful or interesting to you, consider giving the
repository a ⭐.
:::
