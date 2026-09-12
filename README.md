# 🛡️ Yatri Rakshaka (यात्रारक्षक)
### *Smart Cab Sentinel, Live GPS Radar, Real Nearby Police Scanner & Rapid SOS Protocol*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Technology](https://img.shields.io/badge/Frontend-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)](https://developer.mozilla.org/)
[![PWA](https://img.shields.io/badge/PWA-Installable%20App-purple)](https://web.dev/progressive-web-apps/)
[![Mapping](https://img.shields.io/badge/Maps-OpenStreetMap%20%2B%20Leaflet.js-emerald)](https://leafletjs.com/)
[![Geocoding](https://img.shields.io/badge/Geocoding-Nominatim%20API-orange)](https://nominatim.openstreetmap.org/)
[![Police Scanner](https://img.shields.io/badge/Police%20Radar-Overpass%20API-red)](https://overpass-turbo.eu/)

---

## 📖 Overview

**Yatri Rakshaka (यात्रारक्षक)** is an open-source, privacy-focused passenger transit safety Progressive Web Application (PWA). Designed for commuters travelling in taxis, auto-rickshaws, rideshares, and public transport, Yatri Rakshaka acts as an in-pocket safety sentinel: tracking live GPS coordinates, scanning nearby police stations dynamically, providing rapid emergency communication channels, and conserving device power with an automatic 5% battery OLED ultra-saver mode.

> [!NOTE]
> **Architecture & Honesty Statement**:
> Yatri Rakshaka operates as a client-side Progressive Web App (PWA). Emergency actions connect directly through native device protocols (direct `tel:112` dialing, `sms:?body=...` distress beacons, and WhatsApp sharing). Simulated components (such as cab movement and driver chat) are clearly labeled as demonstrations and do not claim automated external police control room dispatch without an authorized backend integration.

---

## ✨ Features & Architecture

### 1. 📍 Live GPS Tracking & Honest Status States
- **Real-Time GPS Watch**: Queries browser `navigator.geolocation` with continuous positional accuracy indicators (`±Xm`).
- **Transparent Status Lifecycles**:
  - `GPS: Acquiring...` ➔ `GPS: Live Active (±Xm)`
  - `GPS: Permission Denied` | `GPS: Unavailable`
  - `GPS: Demo Mode` (Clearly labeled simulation mode for desktop testing).
- **Throttled Reverse Geocoding**: Queries OpenStreetMap Nominatim with 5-second request throttling and abort timeouts to resolve coordinates into human-readable street names without API spamming.

### 2. 🚓 Resilient Nearby Police Scanner
- **Multi-Endpoint Overpass API**: Scans for `amenity=police` within an 8km radius across redundant endpoints (`overpass-api.de` and `overpass.kumi.systems`).
- **Instant Verified Emergency Hubs**: Automatically renders verified 24x7 Emergency Hubs (**112** National Command, Central HQ, **1091** Women Safety Cell, **103** Traffic Patrol) upon initial load to ensure the user is never left with an empty screen or hanging spinner.
- **Geodesic Distance**: Uses Leaflet's native `L.latLng().distanceTo()` to accurately calculate distances to each response station.

### 3. 🚨 Truthful Emergency SOS Action Hub
- **No False Claims**: Replaces simulated "police dispatch alert" modals with an actionable **Emergency Action Center**.
- **Immediate Direct Actions**:
  - 📞 **Direct Call 112**: 1-tap call directly initiating the National Emergency helpline (`tel:112`).
  - ✉️ **Pre-Drafted Distress SMS**: Opens device SMS app (`sms:?body=...`) with current GPS coordinates, Google Maps link, driver name, vehicle plate, and ride status.
  - 📲 **WhatsApp Safety Beacon**: Broadcasts encrypted distress beacon text to family groups.

### 4. 🚗 Safe Ride Sentinel (Separated Type & Model)
- **Granular Vehicle Details**:
  - Vehicle Plate Number (e.g. `DL 01 AB 7890`)
  - Vehicle Type (`Sedan`, `Auto-Rickshaw`, `Hatchback`, `SUV`, `Bike Taxi`)
  - Vehicle Model / Description (e.g. `White Maruti Suzuki Dzire`)
  - Driver Name & Strictly Validated Driver Contact (`pattern="^\+?[0-9 ()-]{8,20}$"`)
- **Simulated Driver Telemetry**: Visualizes transit motion and ETA estimation toward the pickup location.

### 5. 🔋 5% Battery Auto Ultra Power Saving Mode
- **Hardware Battery Diagnostics**: Monitors device battery level and charging state via Web Battery API.
- **Automatic $\le 5\%$ Trigger**: Immediately shifts the app into pure OLED pitch-black (`#000000`), disabling heavy animations and filters to keep emergency lines open.
- **Dedicated Simulation & Reset**: Drag the battery slider to test the mode, or click **"Device"** to immediately restore real phone battery tracking.

### 6. 📱 Installable PWA & Android Deployment
- **Installable PWA**: Includes `manifest.json`, high-resolution app icons (`icon-192.png`, `icon-512.png`), and a **Network-First** Service Worker (`sw.js`).
- **Android Native Project Wrapper**: Complete Android project in `android/` with hardware-accelerated `WebView` and runtime location permission handling.
- **Automated GitHub Actions CI/CD**: `.github/workflows/build-apk.yml` automatically compiles `YatraRakshaka.apk` on every push!

---

## 🏗️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Cyber Glassmorphism, OLED Ultra Saver), Modern JavaScript (ES6+).
- **Mapping**: Leaflet.js v1.9.4 + OpenStreetMap (Bundled locally in `assets/`).
- **PWA & Offline**: Web App Manifest + Service Worker with Network-First caching strategy.
- **Audio Engine**: HTML5 Web Audio API (`AudioContext` oscillators - zero external sound files).
- **Android**: Standalone WebView project + Gradle v8.2.2 build scripts.
- **CI/CD**: GitHub Actions (`build-apk.yml`).

---

## 📂 Project Structure

```bash
yatri-rakshaka/
│
├── index.html                  # Accessible UI structure & truthful emergency modals
├── style.css                   # Cyber dark design system & OLED ultra-saver styles
├── app.js                      # Hardened application controller & XSS-safe DOM handlers
├── manifest.json               # Web App Manifest for mobile installation
├── sw.js                       # Service Worker (Network-First caching & offline fallback)
├── README.md                   # Comprehensive documentation
├── LICENSE                     # MIT Open Source License
├── CONTRIBUTING.md             # Contribution guidelines
│
├── .github/
│   └── workflows/
│       └── build-apk.yml       # Automated GitHub Actions Android APK builder
│
├── android/                    # Native Android Studio project wrapper
│   ├── app/
│   │   ├── build.gradle        # App Gradle configuration
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/yatrarakshaka/app/MainActivity.java
│   │       └── res/
│   ├── build.gradle            # Root Gradle configuration
│   └── settings.gradle
│
└── assets/
    ├── driver.png              # Driver avatar asset
    ├── icon-192.png            # PWA & Android launcher icon (192x192)
    ├── icon-512.png            # PWA & Android launcher icon (512x512)
    ├── leaflet.js              # Local Leaflet JavaScript library
    └── leaflet.css             # Local Leaflet stylesheet
```

---

## 🚀 Local Setup & Installation

### 1. Clone the repository:
```bash
git clone https://github.com/AmanProBoy01/Yatri-Rakshaka.git
cd Yatri-Rakshaka
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

## 📲 How to Install on Android

1. Open `http://<your-ip>:8888` (or your deployed HTTPS URL) in Chrome on your Android device.
2. Tap the **"📲 Install App"** button in the header, or tap Chrome's 3 dots (⋮) ➔ **"Install app" / "Add to Home screen"**.
3. Yatri Rakshaka will install as a standalone native-like app on your home screen.

---

## 🛡️ License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
