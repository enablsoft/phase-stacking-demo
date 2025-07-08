 # 🌲 Wood Stacker - Phaser Game

A fun and engaging stacking game built with Phaser 3 where players collect wood logs and deliver them to houses across multiple levels.

## 🎮 Game Features

- **Multiple Levels**: Progressive difficulty with 5 unique levels
- **Level System**: Each level has different map sizes, house counts, and log requirements
- **Local Storage**: Progress is automatically saved between sessions
- **Mobile Friendly**: Responsive design with touch controls
- **Statistics Tracking**: View your progress and achievements
- **Level Selection**: Replay completed levels or jump to unlocked ones

## 🎯 How to Play

1. **Movement**: Use arrow keys, arrow buttons, or tap anywhere on the map to move
2. **Collect Logs**: Press SPACEBAR or the COLLECT button when near logs
3. **Deliver Logs**: Press ENTER or the DELIVER button when near houses
4. **Complete Levels**: Deliver all required logs to finish a level
5. **Progress**: Complete levels to unlock new ones

## 🎮 Controls

- **Arrow Keys/Buttons**: Move character
- **SPACEBAR/COLLECT**: Pick up logs
- **ENTER/DELIVER**: Unload logs at houses
- **ESCAPE**: Open in-game menu
- **Tap/Touch**: Click anywhere to move there automatically

## 🏗️ Technical Details

- **Framework**: Phaser 3.60.0
- **Language**: JavaScript (ES6+)
- **Styling**: CSS3 with responsive design
- **Storage**: Local Storage for game progress
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites
- A modern web browser
- No additional dependencies required

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/wood-stacker.git
   cd wood-stacker
   ```

2. Open `index.html` in your browser or serve it locally:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   ```

3. Visit `http://localhost:8000` in your browser

## 📁 Project Structure

```
wood-stacker/
├── index.html          # Main HTML file
├── index.css           # Styles and responsive design
├── game.js             # Main game logic
├── assets.js           # Asset loading configuration
├── assets/             # Game assets
│   ├── player.png      # Player character sprite
│   ├── log.png         # Wood log sprite
│   ├── house.png       # House sprite
│   ├── tree.png        # Tree sprite
│   ├── ground.png      # Ground texture
│   └── arrow_*.png     # Control arrow sprites
└── README.md           # This file
```

## 🎨 Game Mechanics

### Level Progression
- **Level 1**: 800×800 map, 1 house, 8 logs required
- **Level 2**: 1000×1000 map, 2 houses, 22 logs total
- **Level 3**: 1200×1200 map, 3 houses, 45 logs total
- **Level 4**: 1400×1400 map, 4 houses, 78 logs total
- **Level 5**: 1600×1600 map, 5 houses, 128 logs total

### Game Features
- **Log Respawning**: Logs automatically respawn in the forest
- **Carry Limit**: Maximum 5 logs at once
- **First-Person Camera**: Follows the player character
- **Tap-to-Move**: Click anywhere to automatically navigate
- **Progress Saving**: Automatic save/load functionality

## 🌐 Deployment

This project is configured for easy deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Phaser 3](https://phaser.io/)
- Icons and sprites created for this project
- Inspired by classic stacking and delivery games

## 📊 Game Statistics

The game tracks:
- Current level
- Highest level reached
- Total logs delivered
- Games played

## 🐛 Known Issues

- None currently reported

## 🔮 Future Features

- Sound effects and background music
- More levels and difficulty modes
- Power-ups and special abilities
- Multiplayer support
- Leaderboards

---

**Enjoy playing Wood Stacker! 🌲📦**