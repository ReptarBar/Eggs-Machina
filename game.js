import { createEngine } from "../engine/engine-adapter.js";
import { saveLevel, loadLevel } from "../storage/saves.js";

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const engineLabel = document.getElementById("engine").querySelector("em");

const GRID = 32;
let running = false;
let last = performance.now();

// Editor state
let parts = []; // [{type:"ramp", x1,y1,x2,y2, id}]
let staticObjects = []; // [{type:"wall", x,y,width,height, id}]

let engine = createEngine();
engineLabel.textContent = engine.using;
// Initialize static objects in engine
engine.staticObjects = staticObjects;
let selectedId = null;
let particles = []; // For visual effects
let eggCrackFrames = 0;
let eggEmoji = null; // The emoji the egg is carrying
let celebrationEmojis = ['🎉', '🌟', '✨', '🎊', '💫', '🎈', '🌈', '🦄', '🎭', '🎪', '🎨', '🎵', '🎸', '🎹', '🎺', '🎻', '🥳', '😊', '😄', '🤩', '🥰', '😍', '🤗', '🎁', '🍀', '⭐', '💎', '🔥', '💖', '🎯'];
let journeyProgress = 0; // Track how far the egg has traveled
let maxJourney = 0; // Record the furthest distance reached
let achievements = []; // User's unlocked achievements
let leaderboardData = []; // Community leaderboard data

// Thunderbird-themed achievements
const thunderbirdAchievements = [
  { id: 'first_journey', name: '🚀 First Flight', description: 'Complete your first journey', emoji: '🚀', unlocked: false },
  { id: 'distance_master', name: '📏 Distance Master', description: 'Travel 500px in a single journey', emoji: '📏', unlocked: false },
  { id: 'thunderbird_champion', name: '⚡ Thunderbird Champion', description: 'Reach the goal 10 times', emoji: '⚡', unlocked: false },
  { id: 'contraption_builder', name: '🏗️ Contraption Builder', description: 'Use 20+ parts in a single contraption', emoji: '🏗️', unlocked: false },
  { id: 'emoji_collector', name: '🎭 Emoji Collector', description: 'See 10 different emojis in your journeys', emoji: '🎭', unlocked: false },
  { id: 'newsletter_reader', name: '📧 Newsletter Reader', description: 'Check out the Thunderbird newsletter', emoji: '📧', unlocked: false },
  { id: 'community_contributor', name: '👥 Community Contributor', description: 'Share your first contraption', emoji: '👥', unlocked: false },
  { id: 'thunderbird_fan', name: '🦅 Thunderbird Fan', description: 'Play for 30 minutes total', emoji: '🦅', unlocked: false }
];

let totalPlayTime = 0;
let goalReaches = 0;
let emojisSeen = new Set();
let partsUsed = 0;

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += GRID) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for (let y = 0; y < canvas.height; y += GRID) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
}
function drawWorldSnap() {
  const snap = engine.snapshot();
  // Magical goal area
  drawMagicalGoal();
  
  // Static objects
  for (const obj of staticObjects) {
    drawStaticObject(obj);
  }
  
  // Ramps
  ctx.strokeStyle = "#8bd0ff"; ctx.lineWidth = 6; ctx.lineCap = "round";
  for (const r of snap.ramps) { ctx.beginPath(); ctx.moveTo(r.x1,r.y1); ctx.lineTo(r.x2,r.y2); ctx.stroke(); }
  
  // Egg with enhanced visuals
  if (snap.egg) { 
    drawEgg(snap.egg);
  }
  
  // Particles
  drawParticles();
  
  // Show hints if no parts placed
  drawHints();
}

function drawMagicalGoal() {
  const goalX = canvas.width - 120;
  const goalY = canvas.height - 120;
  const goalW = 100;
  const goalH = 100;
  
  // Animated pulsing effect
  const time = performance.now() * 0.003;
  const pulse = 0.3 + 0.2 * Math.sin(time);
  
  // Outer glow
  const gradient = ctx.createRadialGradient(goalX + goalW/2, goalY + goalH/2, 0, goalX + goalW/2, goalY + goalH/2, 60);
  gradient.addColorStop(0, `rgba(0, 200, 120, ${0.1 * pulse})`);
  gradient.addColorStop(1, `rgba(0, 200, 120, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(goalX - 20, goalY - 20, goalW + 40, goalH + 40);
  
  // Main goal area
  ctx.fillStyle = `rgba(0, 200, 120, ${0.4 * pulse})`;
  ctx.fillRect(goalX, goalY, goalW, goalH);
  
  // Sparkly border
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * pulse})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 4]);
  ctx.strokeRect(goalX, goalY, goalW, goalH);
  ctx.setLineDash([]);
  
  // Floating sparkles around goal
  for (let i = 0; i < 8; i++) {
    const angle = time + (i * Math.PI / 4);
    const radius = 30 + 10 * Math.sin(time * 2 + i);
    const sparkleX = goalX + goalW/2 + Math.cos(angle) * radius;
    const sparkleY = goalY + goalH/2 + Math.sin(angle) * radius;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
    ctx.fillRect(sparkleX - 1, sparkleY - 1, 3, 3);
  }
  
  // Goal text
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * pulse})`;
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("🎯 GOAL", goalX + goalW/2, goalY + goalH/2);
}

function drawStaticObject(obj) {
  ctx.save();
  
  // Add subtle bouncy animation
  const time = performance.now() * 0.005;
  const bounce = Math.sin(time + obj.id.charCodeAt(0)) * 0.5;
  
  // Apply rotation for tiltable objects
  if (obj.type === 'tiltable') {
    ctx.translate(obj.x + obj.width/2, obj.y + obj.height/2);
    ctx.rotate(obj.angle);
    ctx.translate(-obj.width/2, -obj.height/2);
  }
  
  switch(obj.type) {
    case 'wall':
      ctx.fillStyle = "#666";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#999";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.fillStyle = "#999";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🧱", obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      break;
    case 'platform':
      ctx.fillStyle = "#8a4";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#9b5";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.fillStyle = "#9b5";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🌱", obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      break;
    case 'block':
      ctx.fillStyle = "#a86";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#b97";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.fillStyle = "#b97";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("📦", obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      break;
    case 'spring':
      ctx.fillStyle = "#f84";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      // Draw spring coils with animation
      ctx.strokeStyle = "#fa5";
      ctx.lineWidth = 3;
      for(let i = 0; i < 4; i++) {
        const y = obj.y + (obj.height / 4) * i + bounce;
        ctx.beginPath();
        ctx.moveTo(obj.x, y);
        ctx.lineTo(obj.x + obj.width, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#fa5";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🦘", obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      break;
    case 'lever':
      ctx.fillStyle = "#48f";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#59f";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.fillStyle = "#59f";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⚖️", obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      break;
    case 'fan':
      ctx.fillStyle = "#4af";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#5bf";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      // Animated fan blades
      ctx.save();
      ctx.translate(obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      ctx.rotate(time * 2);
      ctx.fillStyle = "#5bf";
      ctx.font = "24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🌀", 0, 0);
      ctx.restore();
      break;
    case 'pendulum':
      ctx.fillStyle = "#8f4";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#9f5";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      // Animated pendulum
      const pendulumAngle = Math.sin(time * 3) * 0.3;
      ctx.save();
      ctx.translate(obj.x + obj.width/2, obj.y + bounce);
      ctx.rotate(pendulumAngle);
      ctx.fillStyle = "#9f5";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("⏰", 0, 0);
      ctx.restore();
      break;
    case 'motor':
      ctx.fillStyle = "#f84";
      ctx.fillRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.strokeStyle = "#fa5";
      ctx.lineWidth = 2;
      ctx.strokeRect(obj.x, obj.y + bounce, obj.width, obj.height);
      ctx.fillStyle = "#fa5";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🔋", obj.x + obj.width/2, obj.y + obj.height/2 + bounce);
      break;
    case 'tiltable':
      ctx.fillStyle = "#a4f";
      ctx.fillRect(0, 0, obj.width, obj.height);
      ctx.strokeStyle = "#b5f";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, obj.width, obj.height);
      ctx.fillStyle = "#b5f";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText("🎚️", obj.width/2, obj.height/2);
      break;
  }
  ctx.restore();
}

function drawEgg(egg) {
  // Egg shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(egg.x + 2, egg.y + 2, egg.r, egg.r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Main egg
  ctx.fillStyle = "#f7df6e";
  ctx.beginPath();
  ctx.ellipse(egg.x, egg.y, egg.r, egg.r * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Egg highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(egg.x - egg.r * 0.3, egg.y - egg.r * 0.3, egg.r * 0.3, egg.r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw the emoji the egg is carrying
  if (eggEmoji) {
    ctx.font = `${egg.r * 0.8}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(eggEmoji, egg.x, egg.y);
  }
  
  // Journey trail effect
  drawJourneyTrail(egg);
  
  // Crack effect if falling
  if (eggCrackFrames > 0) {
    drawEggCrack(egg);
  }
}

function drawJourneyTrail(egg) {
  // Draw a subtle trail behind the egg
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(80, 80); // Starting position
  ctx.lineTo(egg.x, egg.y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawEggCrack(egg) {
  ctx.strokeStyle = "rgba(100,50,0,0.8)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + eggCrackFrames * 0.1;
    const radius = 8 + Math.random() * 8;
    ctx.beginPath();
    ctx.moveTo(egg.x, egg.y);
    ctx.lineTo(egg.x + Math.cos(angle) * radius, egg.y + Math.sin(angle) * radius);
    ctx.stroke();
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    ctx.save();
    ctx.globalAlpha = p.alpha;
    
    if (p.isEmoji) {
      // Draw emoji particles
      ctx.font = `${p.size}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.color, p.x, p.y);
    } else {
      // Draw regular particles
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    
    ctx.restore();
    
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.5; // gravity
    p.alpha -= 0.015; // Slower fade for emojis
    
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

function addParticle(x, y, color = "#ff6") {
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 4,
    vy: -Math.random() * 3 - 1,
    size: 2 + Math.random() * 3,
    color,
    alpha: 1
  });
}

function createWinEffect(x, y) {
  // Epic confetti explosion with emojis
  for (let i = 0; i < 80; i++) {
    const color = `hsl(${Math.random() * 360}, 70%, 60%)`;
    addParticle(x, y, color);
  }
  
  // Emoji celebration
  for (let i = 0; i < 20; i++) {
    addEmojiParticle(x, y, celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)]);
  }
  
  // Sparkle effect
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 80;
    ctx.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r, 4, 4);
  }
  
  // Show the egg's emoji in celebration
  if (eggEmoji) {
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText(eggEmoji, x, y - 50);
  }
}

function createFailEffect() {
  eggCrackFrames = 30; // Show crack animation for 30 frames
  
  // Even failures are celebrated! Random emoji appears
  const randomEmoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
  
  // Crack particles with emoji
  for (let i = 0; i < 30; i++) {
    addParticle(canvas.width/2, canvas.height-60, "#8a4");
  }
  
  // Emoji celebration even for "failure"
  for (let i = 0; i < 15; i++) {
    addEmojiParticle(canvas.width/2, canvas.height-60, randomEmoji);
  }
  
  // Show the random emoji that appeared from the "failure"
  ctx.font = "36px Arial";
  ctx.textAlign = "center";
  ctx.fillText(randomEmoji, canvas.width/2, canvas.height-100);
  
  // Crack lines
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 20 + Math.random() * 40;
    ctx.beginPath();
    ctx.moveTo(canvas.width/2, canvas.height-60);
    ctx.lineTo(canvas.width/2 + Math.cos(a) * r, canvas.height-60 + Math.sin(a) * r);
    ctx.stroke();
  }
}

function addEmojiParticle(x, y, emoji) {
  particles.push({
    x, y,
    vx: (Math.random() - 0.5) * 6,
    vy: -Math.random() * 4 - 2,
    size: 20 + Math.random() * 10,
    color: emoji,
    alpha: 1,
    isEmoji: true
  });
}

function drawJourneyHUD() {
  if (!running && !eggEmoji) return;
  
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(10, 10, 350, 100);
  ctx.strokeStyle = "#8bd0ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 350, 100);
  
  ctx.fillStyle = "#e6e9ee";
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Journey Progress: ${Math.round(journeyProgress)}px`, 20, 35);
  ctx.fillText(`Best Distance: ${Math.round(maxJourney)}px`, 20, 55);
  ctx.fillText(`Goals Reached: ${goalReaches}`, 20, 75);
  
  if (eggEmoji) {
    ctx.font = "24px Arial";
    ctx.fillText(`Carrying: ${eggEmoji}`, 20, 95);
  }
  
  ctx.restore();
}

// Achievement system
function checkAchievements() {
  thunderbirdAchievements.forEach(achievement => {
    if (achievement.unlocked) return;
    
    let shouldUnlock = false;
    switch(achievement.id) {
      case 'first_journey':
        shouldUnlock = goalReaches > 0 || journeyProgress > 100;
        break;
      case 'distance_master':
        shouldUnlock = journeyProgress >= 500;
        break;
      case 'thunderbird_champion':
        shouldUnlock = goalReaches >= 10;
        break;
      case 'contraption_builder':
        shouldUnlock = partsUsed >= 20;
        break;
      case 'emoji_collector':
        shouldUnlock = emojisSeen.size >= 10;
        break;
    }
    
    if (shouldUnlock) {
      unlockAchievement(achievement);
    }
  });
}

function unlockAchievement(achievement) {
  achievement.unlocked = true;
  achievements.push(achievement);
  
  // Show achievement notification
  showAchievementNotification(achievement);
  
  // Save to storage
  saveAchievements();
}

function showAchievementNotification(achievement) {
  // Create floating achievement notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: linear-gradient(45deg, #8bd0ff, #ffd700);
    color: #000;
    padding: 15px 20px;
    border-radius: 10px;
    font-weight: bold;
    font-size: 16px;
    z-index: 1000;
    animation: slideIn 0.5s ease-out;
    box-shadow: 0 4px 20px rgba(139, 208, 255, 0.5);
  `;
  notification.innerHTML = `🏆 Achievement Unlocked!<br>${achievement.emoji} ${achievement.name}`;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.5s ease-in forwards';
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Leaderboard functions
function showLeaderboard() {
  const modal = document.getElementById('leaderboardModal');
  modal.style.display = 'block';
  loadLeaderboardData();
  updateLeaderboardDisplay();
}

function loadLeaderboardData() {
  // Load from local storage or create mock data
  const saved = localStorage.getItem('thunderbirdLeaderboard');
  if (saved) {
    leaderboardData = JSON.parse(saved);
  } else {
    // Create some mock community data
    leaderboardData = [
      { name: 'Thunderbird Dev', distance: 1250, achievements: 8, isYou: false },
      { name: 'Email Master', distance: 1100, achievements: 6, isYou: false },
      { name: 'Rube Goldberg Pro', distance: 980, achievements: 5, isYou: false },
      { name: 'You', distance: maxJourney, achievements: achievements.length, isYou: true }
    ];
  }
}

function updateLeaderboardDisplay() {
  const distanceList = document.getElementById('distanceLeaderboard');
  const achievementsList = document.getElementById('achievementsList');
  
  // Update distance leaderboard
  distanceList.innerHTML = '';
  leaderboardData
    .sort((a, b) => b.distance - a.distance)
    .forEach((entry, index) => {
      const div = document.createElement('div');
      div.className = `leaderboard-entry ${entry.isYou ? 'you' : ''}`;
      div.innerHTML = `
        <span>${index + 1}. ${entry.name}</span>
        <span>${entry.distance}px</span>
      `;
      distanceList.appendChild(div);
    });
  
  // Update achievements display
  achievementsList.innerHTML = '';
  thunderbirdAchievements.forEach(achievement => {
    const div = document.createElement('div');
    div.className = `achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`;
    div.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 8px;">${achievement.emoji}</div>
      <div style="font-weight: bold; margin-bottom: 4px;">${achievement.name}</div>
      <div style="font-size: 12px; opacity: 0.8;">${achievement.description}</div>
    `;
    achievementsList.appendChild(div);
  });
}

function saveAchievements() {
  localStorage.setItem('thunderbirdAchievements', JSON.stringify(achievements));
}

function loadAchievements() {
  const saved = localStorage.getItem('thunderbirdAchievements');
  if (saved) {
    achievements = JSON.parse(saved);
    // Update achievement states
    achievements.forEach(savedAchievement => {
      const achievement = thunderbirdAchievements.find(a => a.id === savedAchievement.id);
      if (achievement) {
        achievement.unlocked = true;
      }
    });
  }
}
function drawSelection() {
  if (!selectedId) return;
  
  // Check if it's a ramp
  const p = parts.find(q => q.id === selectedId);
  if (p) {
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
  ctx.beginPath(); ctx.moveTo(p.x1,p.y1); ctx.lineTo(p.x2,p.y2); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  
  // Check if it's a static object
  const obj = staticObjects.find(q => q.id === selectedId);
  if (obj) {
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    ctx.setLineDash([]);
    
    // Show controls for interactive objects
    if (obj.type === 'tiltable') {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("← → to tilt", obj.x + obj.width/2, obj.y - 10);
    } else if (obj.type === 'fan' || obj.type === 'motor') {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("SPACE to toggle", obj.x + obj.width/2, obj.y - 10);
    }
  }
}

function rebuildEngine() {
  const newEngine = createEngine();
  engine = newEngine;
  engineLabel.textContent = engine.using;
  for (const r of parts) engine.addRamp(r.x1,r.y1,r.x2,r.y2);
  // Pass static objects to physics engine
  engine.staticObjects = [...staticObjects]; // Create a copy
}

function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  if (running) engine.step(dt, canvas.width, canvas.height);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawGrid(); drawWorldSnap(); drawSelection();

  const snap = engine.snapshot();
  if (snap.egg) {
    // Track journey progress
    const distance = Math.hypot(snap.egg.x - 80, snap.egg.y - 80);
    journeyProgress = Math.max(journeyProgress, distance);
    maxJourney = Math.max(maxJourney, journeyProgress);
    
    if (snap.egg.x > canvas.width-120 && snap.egg.y > canvas.height-120) {
      running = false; // WIN!
      goalReaches++;
      createWinEffect(snap.egg.x, snap.egg.y);
      checkAchievements();
    }
    if (snap.egg.y > canvas.height + 40) {
      running = false; // FAIL!
      createFailEffect();
      checkAchievements();
    }
    
    // Update egg crack animation
    if (eggCrackFrames > 0) {
      eggCrackFrames--;
    }
  }
  
  // Draw journey progress
  drawJourneyHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Drag/drop
document.querySelectorAll(".toolbox .part").forEach(img => {
  img.addEventListener("dragstart", e => e.dataTransfer.setData("text/plain", img.dataset.kind));
});
canvas.addEventListener("dragover", e => e.preventDefault());
canvas.addEventListener("drop", e => {
  e.preventDefault();
  const kind = e.dataTransfer.getData("text/plain");
  const rect = canvas.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left)/GRID)*GRID;
  const y = Math.round((e.clientY - rect.top)/GRID)*GRID;
  
  if (kind === "ramp" || kind === "plank" || kind === "domino" || kind === "wheel" || kind === "hinge") {
    const part = { type: "ramp", x1: x-64, y1: y, x2: x+64, y2: y, id: crypto.randomUUID() };
    parts.push(part);
    engine.addRamp(part.x1, part.y1, part.x2, part.y2);
  } else if (kind === "wall" || kind === "platform" || kind === "block" || kind === "spring" || kind === "lever" || 
             kind === "fan" || kind === "pendulum" || kind === "motor" || kind === "tiltable") {
    const obj = { 
      type: kind, 
      x: x - 32, 
      y: y - 16, 
      width: 64, 
      height: 32, 
      id: crypto.randomUUID(),
      angle: 0,
      active: false
    };
    staticObjects.push(obj);
    // Update engine immediately
    engine.staticObjects = [...staticObjects];
  }
});

// Selection
canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect(); 
  const x = e.clientX-rect.left, y = e.clientY-rect.top;
  selectedId = hitTestObject(x,y);
});

function hitTestObject(x,y){
  // Check static objects first
  for (const obj of staticObjects) {
    if (x >= obj.x && x <= obj.x + obj.width && 
        y >= obj.y && y <= obj.y + obj.height) {
      return obj.id;
    }
  }
  
  // Then check ramps
  for (const p of parts) {
    const vx=p.x2-p.x1, vy=p.y2-p.y1; 
    const wx=x-p.x1, wy=y-p.y1; 
    const len2=vx*vx+vy*vy; 
    if (!len2) continue;
    let t=(wx*vx+wy*vy)/len2; 
    t=Math.max(0,Math.min(1,t));
    const px=p.x1+t*vx, py=p.y1+t*vy; 
    const dx=x-px, dy=y-py; 
    if (dx*dx+dy*dy<100) return p.id;
  } 
  return null;
}

// Keyboard
canvas.addEventListener("keydown", e => {
  if (!selectedId) return;
  
  // Handle ramp rotation
  const p = parts.find(q => q.id === selectedId);
  if (p && e.key.toLowerCase()==="r") {
    const cx=(p.x1+p.x2)/2, cy=(p.y1+p.y2)/2;
    const angle=Math.atan2(p.y2-p.y1,p.x2-p.x1)+Math.PI/12;
    const half=Math.hypot(p.x2-p.x1,p.y2-p.y1)/2;
    p.x1=cx-Math.cos(angle)*half; p.y1=cy-Math.sin(angle)*half;
    p.x2=cx+Math.cos(angle)*half; p.y2=cy+Math.sin(angle)*half;
    rebuildEngine();
  } else if (e.key==="Delete" || e.key==="Backspace") {
    // Delete selected object
    parts = parts.filter(q => q.id !== selectedId);
    staticObjects = staticObjects.filter(q => q.id !== selectedId);
    selectedId=null; 
    rebuildEngine();
  }
  
  // Handle static object controls
  const obj = staticObjects.find(q => q.id === selectedId);
  if (obj) {
    switch(obj.type) {
      case 'tiltable':
        if (e.key === 'ArrowLeft') {
          obj.angle = Math.max(-Math.PI/4, obj.angle - 0.1);
        } else if (e.key === 'ArrowRight') {
          obj.angle = Math.min(Math.PI/4, obj.angle + 0.1);
        }
        break;
      case 'fan':
      case 'motor':
        if (e.key === ' ') { // Spacebar to toggle
          obj.active = !obj.active;
        }
        break;
    }
  }
});

// Buttons
document.getElementById("play").addEventListener("click", () => { 
  // Select a random emoji for this journey
  eggEmoji = celebrationEmojis[Math.floor(Math.random() * celebrationEmojis.length)];
  emojisSeen.add(eggEmoji);
  journeyProgress = 0;
  partsUsed = parts.length + staticObjects.length;
  engine.spawnEgg(); 
  running = true; 
});
document.getElementById("pause").addEventListener("click", () => running = false);
document.getElementById("reset").addEventListener("click", () => { 
  engine.resetEgg(); 
  running = false; 
  eggEmoji = null;
  journeyProgress = 0;
});

// Leaderboard functionality
document.getElementById("leaderboard").addEventListener("click", () => {
  showLeaderboard();
});

// Help functionality
document.getElementById("help").addEventListener("click", () => {
  showHelp();
});

// Save/Load
["1","2","3"].forEach(n => {
  document.getElementById("save"+n).addEventListener("click", async () => {
    const level = { 
      version: 1, 
      parts, 
      staticObjects,
      goal: { x: canvas.width-120, y: canvas.height-120, w: 100, h: 100 } 
    };
    await saveLevel(n, level);
  });
  document.getElementById("load"+n).addEventListener("click", async () => {
    const level = await loadLevel(n);
    if (level) { 
      parts = level.parts || [];
      staticObjects = level.staticObjects || [];
      rebuildEngine(); 
    }
  });
});

// Help functions
function showHelp() {
  const modal = document.getElementById('helpModal');
  modal.style.display = 'block';
}

// Modal event listeners
document.querySelectorAll('.close').forEach(closeBtn => {
  closeBtn.addEventListener('click', (e) => {
    const modal = e.target.closest('.modal');
    if (modal) {
      modal.style.display = 'none';
    }
  });
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    // Remove active class from all buttons and content
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Show corresponding content
    const tabId = button.dataset.tab + 'Tab';
    document.getElementById(tabId).classList.add('active');
  });
});

// Community features
document.getElementById('shareContraption').addEventListener('click', () => {
  const contraption = {
    parts: parts,
    staticObjects: staticObjects,
    timestamp: Date.now(),
    player: 'You'
  };
  
  // Create shareable link (simplified for demo)
  const shareData = btoa(JSON.stringify(contraption));
  const shareUrl = `thunderbird://eggs-machina/share/${shareData}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl).then(() => {
    alert('🎉 Contraption shared! Link copied to clipboard.\n\nThis would normally open Thunderbird to share with the community!');
  });
  
  // Unlock community contributor achievement
  const achievement = thunderbirdAchievements.find(a => a.id === 'community_contributor');
  if (achievement && !achievement.unlocked) {
    unlockAchievement(achievement);
  }
});

document.getElementById('viewNewsletter').addEventListener('click', () => {
  window.open('https://blog.thunderbird.net/newsletter/', '_blank');
  
  // Unlock newsletter reader achievement
  const achievement = thunderbirdAchievements.find(a => a.id === 'newsletter_reader');
  if (achievement && !achievement.unlocked) {
    unlockAchievement(achievement);
  }
});

document.getElementById('viewStateOfThunder').addEventListener('click', () => {
  window.open('https://blog.thunderbird.net/2024/12/state-of-thunder-2024/', '_blank');
});

// Initialize achievements on load
loadAchievements();

// Show welcome message for first-time players
function showWelcomeMessage() {
  const hasSeenWelcome = localStorage.getItem('thunderbirdEggsMachinaWelcome');
  if (!hasSeenWelcome) {
    setTimeout(() => {
      showHelp();
      localStorage.setItem('thunderbirdEggsMachinaWelcome', 'true');
    }, 1000);
  }
}

// Add tooltips to parts
function addTooltips() {
  document.querySelectorAll('.part').forEach(part => {
    const kind = part.dataset.kind;
    const tooltips = {
      'ramp': '🛤️ Ramp - Drag to place, R to rotate',
      'plank': '📏 Plank - Basic building element',
      'wheel': '⚙️ Wheel - Rotating mechanism',
      'hinge': '🔗 Hinge - Joint connection',
      'domino': '🎲 Domino - Chain reaction starter',
      'wall': '🧱 Wall - Blocks and redirects the egg',
      'platform': '🌱 Platform - Landing spot for the egg',
      'block': '📦 Block - Solid building material',
      'spring': '🦘 Spring - Bounces the egg upward!',
      'lever': '⚖️ Lever - Mechanical advantage',
      'fan': '🌀 Fan - Pushes egg with wind (SPACE to toggle)',
      'pendulum': '⏰ Pendulum - Swinging momentum',
      'motor': '🔋 Motor - Continuous propulsion (SPACE to toggle)',
      'tiltable': '🎚️ Tiltable Platform - Use ← → arrows to tilt'
    };
    
    part.title = tooltips[kind] || 'Tool';
  });
}

// Add helpful hints overlay
function drawHints() {
  if (parts.length === 0 && staticObjects.length === 0) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#8bd0ff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🎪 Welcome to Thunderbird Eggs Machina! 🥚", canvas.width/2, canvas.height/2 - 100);
    
    ctx.fillStyle = "#e6e9ee";
    ctx.font = "18px Arial";
    ctx.fillText("Drag parts from the toolbox to build your contraption", canvas.width/2, canvas.height/2 - 50);
    ctx.fillText("Click ❓ Help for detailed instructions", canvas.width/2, canvas.height/2 - 20);
    ctx.fillText("Press 🚀 Start Journey when ready!", canvas.width/2, canvas.height/2 + 10);
    
    ctx.restore();
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  addTooltips();
  showWelcomeMessage();
});

