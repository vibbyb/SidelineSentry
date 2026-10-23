# SidelineSentry

SidelineSentry is an offline-capable web application designed for high school and youth sports sidelines. When a full-time athletic trainer or medical professional isn't available on the field, SidelineSentry helps coaches, parents, and volunteer staff conduct a structured 3-minute concussion screening check directly on a mobile phone or tablet.

## Features

- **Red Flags & Immediate Symptoms Check**: Rapid triage checklist covering CDC red flags (loss of consciousness, neck pain, vomiting, worsening headache) and standard memory orientation questions (Maddock's score).
- **15-Second Balance & Sway Check**: Uses device motion sensors (accelerometer) with a real-time high-pass filter to measure postural sway in double-leg, single-leg, and tandem stances.
- **Visual Reaction Time Check**: Randomized visual stimulus test that measures motor response latency across multiple trials to detect acute neurological delays.
- **Rapid Number Reading Check**: Timed saccadic eye tracking test (based on the King-Devick protocol) where the athlete reads aloud number grids to assess visual processing speed.
- **Preseason Baselines & Athlete Roster**: Stores individual preseason baseline scores locally so sideline retests can be directly compared against an athlete's personal normal.
- **Printable Parent & Doctor Summary**: Generates an immediate, clear PDF/paper report with timestamps, score comparisons, and an on-screen signature pad to hand directly to parents and urgent care doctors.
- **Bilingual Interface (English / Spanish)**: One-tap `EN | ES` language toggle for all screening instructions, symptom questions, and discharge summaries.
- **100% Offline & Private**: Runs entirely in the device browser using local storage with zero server dependencies or external data tracking.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Sensor APIs**: Web Audio API (auditory cues), DeviceMotion API (accelerometer sway tracking)
- **Testing**: Vitest

## Running Locally

To run SidelineSentry locally on your computer or test on a mobile device on your local network:

1. Clone the repository:
   ```bash
   git clone https://github.com/vibhav/SidelineSentry.git
   cd SidelineSentry
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Run the automated test suite:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Disclaimer

SidelineSentry is an observational triage and screening aid developed for educational and athletic sideline awareness based on CDC HEADS UP guidance. It is not an FDA-cleared diagnostic device and does not replace evaluation by a qualified medical professional. If a concussion is suspected, the athlete must be removed from play immediately ("When in doubt, sit them out") and referred to a licensed healthcare provider.
