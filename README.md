# 🛡️ Rakhsha Ride (रक्षा राइड)
### *Smart Cab Sentinel, Live Location Tracking & Rapid Emergency SOS Web Application*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Technology](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)](https://developer.mozilla.org/)
[![Mapping](https://img.shields.io/badge/Maps-OpenStreetMap%20%2B%20Leaflet.js-emerald)](https://leafletjs.com/)
[![Web Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-purple)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Status](https://img.shields.io/badge/Status-Prototype%20Ready-brightgreen)](https://github.com/)

---

## 📖 Overview

**Rakhsha Ride** is a passenger safety web application prototype designed to bridge the gap between daily cab transit and emergency protection. Built with a modern dark cyber glassmorphic UI, it combines live GPS vehicle tracking, automated emergency protocols, device hardware telemetry, in-app driver communication, and a **Critical 5% Battery Auto Ultra Saving Mode**.

Whether dealing with transit distress or critical low battery, Rakhsha Ride ensures passengers stay tracked, protected, and connected to nearby police control rooms.

---

## ✨ Key Features

### 1. 📍 Real-Time Map & Route Tracking
- Powered by **OpenStreetMap** and local **Leaflet.js** (100% free, keyless, zero-watermark).
- Real-time GPS location pin with accuracy radius (`navigator.geolocation`).
- Animated cab driver marker moving along an active route with dynamic speed ($\approx 36\text{ km/h}$) and remaining ETA.
- Interactive controls: Center on Me, Cyber Dark Mode toggle, and Street View.

### 2. 🔋 5% Battery Auto Ultra Power Saving Mode
- Continuously monitors device battery status using `navigator.getBattery()`.
- **Auto Trigger**: When battery drops to **$\le 5\%$**, the app automatically engages **Ultra Power Saver Mode**:
  - Turns display to pitch-black OLED background (`#000000`).
  - Disables GPU-heavy blur backdrops, radial gradients, animations, and shadows.
  - Activates high-contrast warning banner and power-saving red badges.
- **Interactive Battery Simulator Slider**: Easily drag from 100% to 1% in real time to demo the feature during presentations.
- **Manual Toggle**: 1-click test button to activate/deactivate instantly.

### 3. 🚗 Cab Driver Profile & Trip Telemetry
- Verified driver card displaying driver portrait, name (Rajesh Kumar), vehicle registration (`DL 01 AB 7890`), star rating (⭐ 4.9), trip ID (`#RR-9082`), and secure ride OTP (`4892`).
- 1-Click **Share Trip** button to instantly copy the safety tracking beacon to the clipboard.

### 4. 💬 In-App Messaging & Quick SOS Chips
- Built-in chat drawer with realistic automated driver responses.
- Sound effects for incoming and outgoing messages synthesized via the **Web Audio API**.
- Quick distress chips: *"Where are you?"*, *"Stop cab immediately!"*, *"I feel unsafe"*.
- Unread message notification badge on the chat icon.

### 5. 📞 Voice Call Simulator
- Realistic in-app driver phone call modal with dialing ringtones, connected timer, microphone mute, speaker toggle, and hang-up controls.

### 6. 📱 Device Hardware & Telemetry Diagnostics
- Live readout of device specifications:
  - **OS & Architecture**: Detects Android, iOS, Windows, Linux, macOS.
  - **Screen Resolution & DPI**: Detects viewport dimensions and device pixel ratio.
  - **CPU & RAM**: Detects CPU cores (`navigator.hardwareConcurrency`) and estimated RAM (`navigator.deviceMemory`).
  - **Network Status**: Real-time Online/Offline detector with 4G/5G connection type and ping RTT latency.
  - **Battery Health**: Good (Li-ion estimated capacity).

### 7. 🚓 Nearby Police Stations & SOS Dispatch
- Displays the 4 closest emergency response centers (Central Police Station HQ, Parliament Street PS, Women Safety Cell 1091, National Emergency 112).
- Direct **Emergency Call Modal** simulating police dispatcher connection and live coordinate transmission.
- Direct **Google Maps Navigation** button to open driving directions in a single tap.

### 8. 🚨 5-Second Emergency Siren Countdown
- High-priority header SOS button triggering an audible 2-tone pulsating police siren.
- 5-second countdown with visual cancellation option.
- Automatic dispatch beacon broadcasting location to police control rooms upon expiration.

---

## 🏗️ Tech Stack

- **Markup & Layout**: HTML5 (Semantic Structure)
- **Styling**: Vanilla CSS3 (Custom Properties, Glassmorphism, Responsive Grid, OLED Ultra Saver Mode)
- **Application Logic**: Vanilla JavaScript (ES6+)
- **Mapping**: Leaflet.js v1.9.4 + OpenStreetMap (Bundled locally)
- **Audio**: HTML5 Web Audio API (`AudioContext` Oscillators - zero external audio files)
- **Icons**: FontAwesome 6

---

## 📂 Project Structure

```bash
rakhsha-ride/
│
├── index.html              # Main application structure & semantic layout
├── style.css               # Design system, glassmorphism & Ultra Saver overrides
├── app.js                  # Application controller, Leaflet logic & audio engine
├── README.md               # Comprehensive project documentation
├── LICENSE                 # MIT Open Source License
├── CONTRIBUTING.md         # Contribution guidelines
├── .gitignore              # Files to ignore in Git
└── assets/
    ├── driver.png          # High-resolution cab driver profile portrait
    ├── leaflet.js          # Local Leaflet JavaScript library
    └── leaflet.css         # Local Leaflet stylesheet
```

---

## 🚀 Quick Start / Local Setup

No external package managers, NPM builds, or API keys are required!

### 1. Clone the repository:
```bash
git clone https://github.com/your-username/rakhsha-ride.git
cd rakhsha-ride
```

### 2. Run with any local HTTP server:

**Using Python (Recommended):**
```bash
python3 -m http.server 8888
```

**Using Node (`npx serve`):**
```bash
npx serve . -p 8888
```

**Using VS Code Live Server:**
Right click `index.html` and select **"Open with Live Server"**.

### 3. Open in your browser:
Navigate to:
```
http://localhost:8888
```

---

## 🎯 Presentation & Demo Tips

1. **Demonstrate 5% Battery Saver**:
   - In the header, grab the **Battery Sim** slider and drag it down past 5%.
   - Notice the sound effect, the instant shift to pitch-black OLED mode, and the top warning banner.
2. **Demonstrate Live Map & Cab Movement**:
   - Watch the green cab marker move dynamically along the route toward the user's pickup point.
   - Click the **🌙 / ☀️** toggle in the top-right of the map to switch between Cyber Dark mode and standard OpenStreetMap.
3. **Demonstrate Communication**:
   - Click **Message** to open the chat, send a custom message or click an SOS chip to view automated replies.
   - Click **Call Driver** to listen to the synthesized phone ringtone and live timer.
4. **Demonstrate Police & SOS**:
   - Click the red **SOS** button in the header to activate the 5-second countdown siren.
   - In the Nearby Police Stations list, click the 📞 button on any station to launch the Emergency Dispatch modal.

---

## 🛡️ License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, feature suggestions, and pull requests are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.
