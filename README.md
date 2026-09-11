# 🛡️ Yatra Rakshaka (यात्रारक्षक)
### *Smart Cab Sentinel, Live GPS Radar, Real Nearby Police Scanner & Rapid SOS*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Technology](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)](https://developer.mozilla.org/)
[![Mapping](https://img.shields.io/badge/Maps-OpenStreetMap%20%2B%20Leaflet.js-emerald)](https://leafletjs.com/)
[![Geocoding](https://img.shields.io/badge/Geocoding-Nominatim%20API-orange)](https://nominatim.openstreetmap.org/)
[![Police Scanner](https://img.shields.io/badge/Police%20Radar-Overpass%20API-red)](https://overpass-turbo.eu/)
[![Web Audio](https://img.shields.io/badge/Audio-Web%20Audio%20API-purple)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## 📖 Overview

**Yatra Rakshaka (यात्रारक्षक)** is an advanced, privacy-first passenger transit safety web application. Designed for commuters travelling in taxis, auto-rickshaws, cabs (Ola/Uber/Rapido), and public transport, Yatra Rakshaka monitors transit telemetry in real time, scans for nearby police stations dynamically, and provides an instant emergency lifeline even in critical battery conditions.

Built with a responsive Cyber Glassmorphic UI, Yatra Rakshaka operates completely without expensive proprietary API keys by utilizing community-driven, privacy-respecting **OpenStreetMap**, **Nominatim**, and **Overpass API** services.

---

## ✨ Key Features & Real Integrations

### 1. 📍 Real Live Location & Street Geocoding
- **Hardware GPS Tracing**: Uses browser `navigator.geolocation.watchPosition` to trace passenger coordinates with real-time accuracy indicators.
- **Nominatim Reverse Geocoding**: Automatically queries OpenStreetMap Nominatim to resolve latitude & longitude into a human-readable street address, locality, and city name (e.g., *"Connaught Place, New Delhi"*).
- **Map Controls**: Cyber Dark Radar mode toggle, street view mode, and recenter navigation button.

### 2. 🚓 Real Nearby Police Stations (Overpass API Scanner)
- **10km Dynamic Radial Scan**: Runs dynamic OpenStreetMap Overpass API queries (`amenity=police` within 10,000 meters of the user's current GPS position).
- **Haversine Distance Calculation**: Automatically calculates the exact geodesic distance ($km$) from the user to each local police station.
- **Map Badge Pins**: Plots real police response hubs directly on the interactive map with blue shield markers.
- **1-Tap Direct Call & Directions**: Connect directly to nearby police control desks or launch Google Maps driving navigation.
- **24x7 Nationwide Fallback**: Guaranteed access to **112** (National Emergency), **100** (Police), and **1091** (Women Helpline).

### 3. 🚗 Dynamic Safe Ride Sentinel (Track Any Cab / Auto)
- **Custom Cab Monitoring**: Passengers can enter their actual ride's details:
  - Vehicle Plate Number (e.g. `DL 01 AB 7890`, `MH 02 CZ 4521`)
  - Driver Name & Driver Phone Number
  - Vehicle Type (Sedan, Auto-Rickshaw, Hatchback, Prime SUV, Bike Taxi)
  - Ride Status (`Waiting for Cab` ➔ `Ride in Progress` ➔ `Completed Safely`)
- **Live Ride Telemetry**: Calculates speed ($\approx 32-40\text{ km/h}$), route polyline, and remaining ETA.
- **Trip Lifecycle Control**: End rides safely to disengage tracking and log completion.

### 4. 📲 1-Click WhatsApp & SMS Safety Beacon
- **Direct WhatsApp Transmission**: Broadcasts live safety payload directly into WhatsApp with 1 tap:
  - Passenger status, driver name, vehicle plate, ride OTP, real street address, and live Google Maps coordinate tracking link.
- **Direct SMS Draft**: Native `sms:?body=...` support for areas with weak mobile internet.
- **Clipboard Copy**: Instant beacon copy with visual toast confirmation.

### 5. 🔋 5% Battery Auto Ultra Power Saving Mode
- **Hardware Battery Monitor**: Uses Web Battery API (`navigator.getBattery()`) with zero-crash defensive fallbacks.
- **Automatic $\le 5\%$ Trigger**: Transforms the screen into a pitch-black OLED power saver (`#000000`), shuts off heavy CSS backdrop filters, gradients, and animations to preserve critical device battery.
- **Interactive Simulator Slider**: Drag the header battery slider from 100% to 1% to demonstrate the auto-saver live during presentations.
- **Manual ⚡ Toggle**: Single-click button on the Diagnostics card to test the mode instantly.

### 6. 💬 In-App Messaging & Quick SOS Chips
- Built-in slide-over chat drawer with automated contextual driver responses.
- Sound effects synthesized via **Web Audio API** (incoming & outgoing chimes).
- Quick emergency templates: *"Where are you?"*, *"Please stop the cab immediately!"*, *"I am feeling unsafe"*.
- Unread message notification count badge.

### 7. 📞 Voice Call Simulator
- Simulated driver phone call modal with realistic ringtone frequencies, connected duration timer, microphone mute, speaker toggle, and hang-up controls.

### 8. 📱 Device Hardware & Telemetry Diagnostics
- Live readout of device specifications:
  - **OS & Architecture**: Detects Android, iOS, Windows, Linux, macOS.
  - **Screen Resolution & DPI**: Detects viewport dimensions and device pixel ratio.
  - **CPU & RAM**: Detects CPU cores (`navigator.hardwareConcurrency`) and memory (`navigator.deviceMemory`).
  - **Network Status**: Real-time Online/Offline indicator with latency RTT.
  - **Battery Health**: Estimated Li-ion capacity state.

---

## 🏗️ Tech Stack

- **Markup & Layout**: HTML5 (Semantic Structure)
- **Styling**: Vanilla CSS3 (Glassmorphism, Responsive Grid, OLED Ultra Saver Mode)
- **Application Logic**: Vanilla JavaScript (ES6+ with Defensive Error Handling)
- **Mapping**: Leaflet.js v1.9.4 + OpenStreetMap (Bundled locally in `assets/`)
- **Geocoding**: OpenStreetMap Nominatim API (Free & Keyless)
- **Police Scanner**: OpenStreetMap Overpass API (Free & Keyless)
- **Audio Synthesis**: HTML5 Web Audio API (`AudioContext` Oscillators - zero external MP3s)
- **Icons**: FontAwesome 6

---

## 📂 Project Structure

```bash
yatra-rakshaka/
│
├── index.html              # Main application DOM layout & modals
├── style.css               # Design system, glassmorphism & Ultra Saver styles
├── app.js                  # Application controller, Leaflet, Overpass & Nominatim logic
├── README.md               # Comprehensive documentation
├── LICENSE                 # MIT Open Source License
├── CONTRIBUTING.md         # Contribution guidelines
├── .gitignore              # Files ignored in Git
└── assets/
    ├── driver.png          # Cab driver portrait asset
    ├── leaflet.js          # Local Leaflet JavaScript library
    └── leaflet.css         # Local Leaflet stylesheet
```

---

## 🚀 Local Setup & Demo Guide

### 1. Clone the repository:
```bash
git clone https://github.com/AmanProBoy01/Raksha-Ride.git yatra-rakshaka
cd yatra-rakshaka
```

### 2. Launch with any HTTP server:

**Using Python:**
```bash
python3 -m http.server 8888
```

**Using Node:**
```bash
npx serve . -p 8888
```

### 3. Open in your browser:
Navigate to:
```
http://localhost:8888
```

---

## 🎯 Presentation Demonstration Checklist

1. **Test Dynamic Police Scanner**:
   - Allow location access or click **"Scan Again"** in the Nearby Police Stations card.
   - Watch the Overpass API fetch real police stations around your live position and plot blue police pins on the map!
2. **Test Custom Cab Entry**:
   - Click **"✏️ Change Cab"** in the Safe Ride Sentinel card.
   - Enter your actual auto/cab plate number, driver name, and phone. Click **"Save & Monitor"**.
   - Notice the driver card, chat header, and call dialog update instantly!
3. **Test WhatsApp / SMS Beacon**:
   - Click **"Share Beacon"** ➔ click **"Send via WhatsApp"**. Notice the complete live tracking text generated with exact address and Google Maps link!
4. **Test 5% Auto Ultra Saver**:
   - Drag the header **Battery Sim** slider to 5% or lower.
   - Experience the power-down sound effect, OLED black screen, and active saver banner!

---

## 🛡️ License

This project is open-sourced under the **MIT License** - see the [LICENSE](LICENSE) file for details.
