# PulseForge AI Music Studio

PulseForge is a professional-grade cloud music production platform for EDM, powered by AI.

## Features

- **AI Sound Generation**: Generate studio-quality drums, bass, and synths using natural language prompts via MusicGen.
- **Voice-to-Instrument**: Hum a melody and let the AI transform it into a massive techno bassline or ethereal pad.
- **Natural Language Control**: Tweak your sound using producer terminology (e.g., "make it punchier", "darker reverb").
- **Visual Composition**: Clip-based launcher for arranging your AI-generated stems.
- **Premium Aesthetics**: Cyberpunk design with dynamic visualizers and glassmorphism.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure AI Tokens**:
   Create a `.env.local` file in the root directory and add your tokens:
   ```env
   HUGGINGFACE_TOKEN=your_hf_token_here
   OPENAI_API_KEY=your_openai_key_here (optional for advanced NLU)
   ```
   *Note: You can get a free token from [huggingface.co](https://huggingface.co/settings/tokens).*

3. **Run the Studio**:
   ```bash
   npm run dev
   ```

4. **Start Forging**:
   Open [http://localhost:3000](http://localhost:3000) and start creating.
