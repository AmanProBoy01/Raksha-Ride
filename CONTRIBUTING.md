# Contributing to Yatra Rakshaka 🛡️

Thank you for your interest in contributing to **Yatra Rakshaka (यात्रारक्षक)**! We welcome contributions, accessibility suggestions, bug fixes, and safety protocol enhancements.

---

## 🚀 How to Contribute

### 1. Fork and Clone
1. Fork the repository on GitHub (`https://github.com/AmanProBoy01/Raksha-Ride`).
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/Raksha-Ride.git yatra-rakshaka
   cd yatra-rakshaka
   ```

### 2. Create a Feature Branch
```bash
git checkout -b feature/improved-police-routing
```

### 3. Make Your Changes
- Keep HTML semantic and accessible.
- Maintain CSS design system tokens in `:root` inside `style.css`.
- Keep JavaScript modular and defend against unhandled exceptions.
- Test across desktop and mobile viewports.

### 4. Test Locally
Run a local HTTP server and test all interactive features (Live Overpass scanner, Nominatim geocoding, Chat, Call, Battery Saver, SOS):
```bash
python3 -m http.server 8888
```

### 5. Commit and Push
```bash
git add .
git commit -m "Add: [Brief description of your feature or fix]"
git push origin feature/improved-police-routing
```

### 6. Open a Pull Request
Go to the original repository and click **"New Pull Request"**.

---

## 💬 Code Style Guidelines

- Use 4 spaces for indentation.
- Write clear, descriptive commit messages.
- Avoid external runtime libraries; keep the application lightweight, zero-build, and keyless.

Thank you for helping keep passengers safe! 🛡️
