# Screenalyze 📸 🤖

**Screenalyze** is a mobile application that listens for screenshots in the background, analyses captured content (such as YouTube video tutorials, system design slides, architecture diagrams, and code snippets), generates insightful AI summaries, and triggers interactive notifications, action prompts and appended workflow asking: **"What would you like to do with this screenshot?"**

An application that analyzes screenshots captured in the background to interpret visual content and context. It generates concise summaries of the visual information and provides workflow suggestions based on that context. The software transforms information within screenshots into understandable overviews and actionable guidance to help users identify relevant next steps and ways to organize their work. Core functionality includes background screenshot analysis, contextual summarization, and the generation of workflow recommendations derived from the analyzed content.

---

## 🚀 Key Features

1. **Automatic Screenshot Detection**:
   - Uses `expo-screen-capture` (`ScreenCapture.addScreenshotListener`) to detect screenshots taken while inside the app.
   - Uses `AppState` lifecycle listeners to detect screenshots captured outside (e.g., in YouTube or browser) as soon as you switch back to Screenalyze.
   - Queries `expo-media-library` to retrieve the newest photo/screenshot.

2. **Multimodal AI Analysis & Summarization**:
   - Analyzes visual contents to identify core topics, architectural patterns, and key takeaways.
   - Direct integration with **OpenAI GPT-4o Multimodal Vision API** (user-configurable API key in Settings or `.env`).

3. **Interactive Notification & Action Workflow**:
   - Upon detecting and analyzing a screenshot, Screenalyze sends a local notification with actionable buttons (`expo-notifications`).
   - Simultaneously renders an in-app HUD banner and interactive action prompt:
     - 📝 **Create a tutorial**: Synthesizes a step-by-step implementation guide with architecture specs and code.
     - 💡 **Explain this tutorial**: Provides deep-dive conceptual breakdown and trade-off analysis.
     - 🏗️ **Extract architecture**: Generates textual system topology, data flow, and service boundaries.
     - 📤 **Share this tutorial & summary**: Native sharing via `expo-sharing` or one-tap clipboard copy.
     - ✍️ **Custom instruction (Type yourself)**: Full natural language input to ask any specific question (e.g., *"Generate interview questions for this"*).

4. **History & Library**:
   - Persistent offline storage (`@react-native-async-storage/async-storage`).
   - Search across tutorials, filter by category (System Design, YouTube Tutorials, Code), and inspect generated artifacts.

---

## 🛠 Project Structure

```
src/
├── app/
│   ├── _layout.tsx              # Root Stack layout, notification response handler
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar navigator
│   │   ├── index.tsx            # Live screenshot monitor & feed
│   │   ├── history.tsx          # Past screenshots & search
│   │   └── settings.tsx         # OpenAI API key & notification preferences
│   └── screenshot/
│       └── [id].tsx             # Detailed view, image zoom, & tutorial reader
├── components/
│   ├── ActionPickerModal.tsx    # "What would you like to do?" action modal
│   ├── AnalysisCard.tsx         # Card preview with key takeaway pills
│   ├── NotificationBanner.tsx   # Top gliding in-app HUD toast
│   └── TutorialViewer.tsx       # Markdown reader with code blocks & share
├── hooks/
│   └── useScreenshotDetector.ts # Screenshot capture & lifecycle hook
├── services/
│   ├── aiService.ts             # OpenAI GPT-4o Vision & smart generator
│   ├── mediaService.ts          # MediaLibrary querying
│   ├── notificationService.ts   # Interactive push notifications
│   └── storageService.ts        # AsyncStorage persistence
├── theme/
│   └── colors.ts                # Cyber-indigo dark theme
└── types/
    └── index.ts                 # TypeScript data contracts
```

---

## 📱 Running the App

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on Web
npx expo start --web

# Typecheck
npx tsc --noEmit

# Lint
npx expo lint

# Diagnose dependencies
npx expo-doctor
```
