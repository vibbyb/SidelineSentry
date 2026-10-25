# SidelineSentry

SidelineSentry is an offline concussion screening web app designed for high school and youth sports sidelines. At many middle school, freshman, and community games, teams cannot afford a certified athletic trainer on every field. According to the national ATLAS study, 34% of U.S. high schools operate without an athletic trainer. SidelineSentry gives coaches, parents, and volunteers a structured three-minute screening checkup based on CDC guidelines to help them make safe, informed decisions when an athlete takes a hard hit.

## How It Works

SidelineSentry walks the screener through four main checks before generating an incident report:

### 1. CDC Red Flags and Memory Questions
The screener first checks for emergency red flags like loss of consciousness, neck pain, repeated vomiting, seizures, or worsening headache. If any red flag is selected, the app locks down physical testing and displays an emergency button to call 911 immediately. If there are no urgent red flags, the screener asks three memory questions to test orientation: the current venue, the current period or half, and the game score.

### 2. 15-Second Balance Sway Check
The athlete holds the phone flat against their chest for 15 seconds. The app reads accelerometer data from the DeviceMotionEvent API and runs it through a 0.5 Hz high-pass filter (GravityFilter.ts) to remove static gravity acceleration. It computes planar sway from the horizontal axes, pushes readings into a 256-sample ring buffer, and calculates the stability index. If the phone slips or the athlete stumbles abruptly, the test flags a motion artifact and asks for a restart. On laptops or desktop computers without motion hardware, the app switches automatically to simulated sensor profiles with healthy and concussed sway options.

### 3. Visual Reaction Time
To check motor response speed, the screen changes color after a randomized delay between 1.5 and 3.5 seconds. The athlete taps the screen as fast as possible across three successive trials. Tapping before the color changes records a false start. The app records the fastest, slowest, and average response times in milliseconds and compares them against any saved preseason baseline.

### 4. Rapid Number Reading Check
The athlete reads three 5x5 number cards aloud as quickly as possible. The first card includes guide lines between numbers, the second uses an open grid, and the third uses a compact grid. The screener uses on-screen plus and minus buttons to track reading mistakes while the timer runs. This tests visual processing speed and eye movement coordination without requiring specialized eye-tracking hardware.

## Sideline and Recovery Features

- Local Baselines: Preseason baseline times and balance measurements can be saved for each athlete on the roster. During a sideline test, the app compares the new numbers against the player's personal baseline rather than generic population averages.
- Voice Instructions: Screeners can toggle on spoken voice instructions in English or Spanish using the browser Web Speech API. This lets coaches keep their eyes and hands on the athlete instead of staring at the screen.
- Sunlight Mode: A high-contrast display toggle in the header switches the theme for bright midday stadium sunlight and glare.
- Hierarchical Saved Reports: Saved checkup reports are grouped hierarchically by Sport, then by Player, and then by individual report date with scores, recommendation badges, and warning counts. A sport filter bar lets coaches view all sports or filter to a single sport.
- Printable Summary Report: Formats an incident summary using clean CSS print styles (window.print()). Screeners can capture a digital signature directly on screen and print physical copies or export a PDF with a tamper-evident SHA-256 session hash.
- CDC 6-Step Return-to-Play Tracker: Inside each athlete's history drawer, screeners track the six graduated CDC recovery stages with 24-hour spacing warnings and medical provider sign-off before full contact.
- Daily Symptom Log: Tracks seven concussion symptoms on a 0 to 6 scale (42 points total) with an SVG recovery trend line over time.
- Bilingual Support: A header toggle switches all prompts, test instructions, and printed reports between English and Spanish.
- Offline Reliability: Works offline after the first visit via a registered service worker (sw.js). All data stays in browser localStorage with zero tracking or remote database requirements.

## Tech Stack

- React 18 and TypeScript (Strict)
- Tailwind CSS with PostCSS
- Vite for bundling
- Vitest unit tests
- Web APIs: DeviceMotionEvent, Web Audio API, Web Crypto API, Web Speech API, and HTML5 Canvas

## Running the Project

To run SidelineSentry locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/vibbyb/SidelineSentry.git
   cd SidelineSentry
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Medical Disclaimer

SidelineSentry is an observational screening aid designed for youth athletic safety awareness and education based on CDC HEADS UP materials. It is not an FDA-cleared diagnostic medical device and cannot diagnose concussions or traumatic brain injuries. Any athlete with a suspected concussion must be removed from practice or competition immediately ("When in doubt, sit them out") and seen in person by a licensed healthcare professional before returning to play.
