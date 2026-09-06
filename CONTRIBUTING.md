# Contributing to Rakhsha Ride 🛡️

Thank you for your interest in contributing to **Rakhsha Ride**! We welcome improvements, feature suggestions, accessibility enhancements, and bug fixes.

---

## 🚀 How to Contribute

### 1. Fork and Clone
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/rakhsha-ride.git
   cd rakhsha-ride
   ```

### 2. Create a Feature Branch
```bash
git checkout -b feature/amazing-safety-feature
```

### 3. Make Your Changes
- Keep HTML semantic and accessible.
- Maintain CSS design system tokens in `:root` inside `style.css`.
- Keep JavaScript modular and defend against unhandled exceptions.
- Test your changes across both desktop and mobile viewports.

### 4. Test Locally
Run a local server and test all interactive features (Live location, Chat, Call, Battery Saver, SOS):
```bash
python3 -m http.server 8888
```

### 5. Commit and Push
```bash
git add .
git commit -m "Add: [Brief description of your feature or fix]"
git push origin feature/amazing-safety-feature
```

### 6. Open a Pull Request
Go to the original repository and click **"New Pull Request"**. Provide a clear explanation of what was added or resolved.

---

## 💬 Code Style Guidelines

- Use 4 spaces for indentation.
- Write clear, descriptive commit messages.
- Avoid external runtime libraries unless strictly necessary; keep the app lightweight and zero-build.

Thank you for helping make transit safer for everyone! 🛡️
