# 🎶 Music Madness – Song Bracket Generator

An interactive web app that generates head-to-head tournament brackets from an artist’s discography, letting users pick winners until a champion song is crowned.

## 🚀 Live Demo
👉 [music-madness.vercel.app](https://music-madness.vercel.app)

## ✨ Features
- Search any artist and auto-generate their songs into a bracket
- Progress through rounds by selecting winners
- Handles auto-advancing when matchups are empty
- Case-insensitive duplicate merging (e.g., “True Love” vs “TRUE LOVE”)
- Clean UI with sticky headers and dynamic tab names

## 🛠️ Tech Stack
- **Frontend:** React, Next.js, JavaScript (ES6+)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **Version Control:** Git + GitHub

## 📸 Screenshots
![Home Page](./assets/homepage.png)
![Sample Bracket](./assets/homepage.png)

## 🔮 Future Improvements
- Add ability to restart without refreshing
- Save/share completed brackets
- Mobile-optimized bracket view

## 📦 Getting Started (For Developers)
```bash
# Clone the repo
git clone https://github.com/andrewkdawson/music-madness.git

# Install dependencies
npm install

# Run locally
npm run dev