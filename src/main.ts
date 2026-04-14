import './style.css';
import { Game } from './game/Game.js';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
if (!canvas) {
  const newCanvas = document.createElement('canvas');
  newCanvas.id = 'game-canvas';
  document.body.appendChild(newCanvas);
}

const gameCanvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const game = new Game(gameCanvas);

// Controls overlay
const overlay = document.createElement('div');
overlay.id = 'controls-overlay';
overlay.innerHTML = `
  <div style="
    position: fixed;
    bottom: 20px;
    left: 20px;
    color: #6688aa;
    font-family: monospace;
    font-size: 13px;
    line-height: 1.6;
    pointer-events: none;
    user-select: none;
  ">
    <div style="color: #aaccff; font-size: 16px; margin-bottom: 8px;">UNIVERSE</div>
    <div>W — Thrust Forward</div>
    <div>A/D — Strafe Left/Right</div>
    <div>Mouse — Aim (click to capture)</div>
    <div>Left Click — Fire Weapons</div>
    <div>ESC — Release Mouse</div>
  </div>
`;
document.body.appendChild(overlay);

game.start();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  game.dispose();
});
