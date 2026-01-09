// Lake of the Ozarks Tycoon - Main Game Engine
// Build your lakefront empire at Missouri's premier party lake!

// ==================== CANVAS POLYFILL ====================
// Polyfill for roundRect - older browsers don't support it
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (typeof r === 'number') {
            r = {tl: r, tr: r, br: r, bl: r};
        } else if (typeof r === 'object') {
            r = {tl: r[0] || 0, tr: r[1] || r[0] || 0, br: r[2] || r[0] || 0, bl: r[3] || r[1] || r[0] || 0};
        } else {
            r = {tl: 0, tr: 0, br: 0, bl: 0};
        }
        this.beginPath();
        this.moveTo(x + r.tl, y);
        this.lineTo(x + w - r.tr, y);
        this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
        this.lineTo(x + w, y + h - r.br);
        this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
        this.lineTo(x + r.bl, y + h);
        this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
        this.lineTo(x, y + r.tl);
        this.quadraticCurveTo(x, y, x + r.tl, y);
        this.closePath();
        return this;
    };
}

// ==================== GLOBAL MODAL & BOAT SELECTION ====================
// Track selected starter boat
let selectedStarterBoat = 'sundancer';

// Select a starter boat
function selectStarterBoat(boatId) {
    selectedStarterBoat = boatId;

    // Update UI to show selection
    document.querySelectorAll('.boat-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    const selectedOption = document.querySelector(`.boat-option[data-boat="${boatId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}
window.selectStarterBoat = selectStarterBoat;

// Start the game with selected boat
function startGameWithBoat() {
    const modal = document.getElementById('welcome-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.pointerEvents = 'none';
        modal.classList.add('hidden');
    }

    // Set player name
    const nameInput = document.getElementById('town-name-input');
    if (nameInput && nameInput.value.trim()) {
        gameState.playerName = nameInput.value.trim();
    } else {
        gameState.playerName = 'Rookie';
    }

    // Create starter boat from selection
    createStarterBoatFromSelection(selectedStarterBoat);

    // Update UI
    if (typeof updateUI === 'function') {
        updateUI();
    }

    // Add welcome events
    const boat = STARTER_BOATS[selectedStarterBoat];
    addEvent(`Welcome to the Shootout, ${gameState.playerName}!`, 'racing');
    addEvent(`Your boat: ${boat.name}`, 'positive');

    // Immediately launch the first Shootout race experience
    setTimeout(() => {
        showFirstShootoutRace();
    }, 500);
}
window.startGameWithBoat = startGameWithBoat;

// ==================== DRIVING SIMULATION ====================
// Racing simulation state
let raceState = {
    active: false,
    canvas: null,
    ctx: null,
    animationFrame: null,
    startTime: 0,
    currentSpeed: 0,
    maxSpeed: 0,
    throttle: 0,
    boatX: 0,
    boatY: 0,
    boatLane: 0,        // -1 left, 0 center, 1 right
    waterOffset: 0,
    wavePhase: 0,
    particles: [],
    countdown: 3,
    // Shootout phases: 'approach', 'speed_check', 'countdown', 'racing', 'finished'
    phase: 'approach',
    coursePosition: 0,   // Progress along the course (0-1000)
    startLinePos: 300,   // Where start line is
    finishLinePos: 800,  // Where finish line is
    peakSpeed: 0,        // Highest speed recorded
    crossedStart: false,
    crossedFinish: false,
    penalized: false,    // True if went over 40 before start
};

// Show the first Shootout race experience - real Shootout simulation!
function showFirstShootoutRace() {
    const boat = STARTER_BOATS[selectedStarterBoat];
    const activeBoat = gameState.garage.boats[0];

    // Create full-screen racing overlay
    const raceOverlay = document.createElement('div');
    raceOverlay.id = 'race-overlay';
    raceOverlay.innerHTML = `
        <canvas id="race-canvas"></canvas>
        <div id="race-hud">
            <div class="hud-speed">
                <span class="speed-value">0</span>
                <span class="speed-label">MPH</span>
            </div>
            <div class="hud-boat-name">${boat.nickname}</div>
            <div class="hud-status">APPROACH - Keep it under 40!</div>
        </div>
        <div id="race-sign"></div>
    `;
    document.body.appendChild(raceOverlay);

    // Setup canvas
    const canvas = document.getElementById('race-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    raceState.canvas = canvas;
    raceState.ctx = canvas.getContext('2d');

    // Initialize race state for Shootout
    raceState.active = true;
    raceState.currentSpeed = 0;
    raceState.maxSpeed = activeBoat.stats.topSpeed;
    raceState.throttle = 0;
    raceState.boatX = canvas.width / 2;
    raceState.boatY = canvas.height * 0.65;
    raceState.boatLane = 0;
    raceState.waterOffset = 0;
    raceState.wavePhase = 0;
    raceState.particles = [];
    raceState.phase = 'approach';  // Start in approach phase
    raceState.coursePosition = 0;
    raceState.startLinePos = 300;
    raceState.finishLinePos = 800;
    raceState.peakSpeed = 0;
    raceState.crossedStart = false;
    raceState.crossedFinish = false;
    raceState.penalized = false;
    raceState.startTime = 0;
    raceState.finalSpeed = 0;

    // Setup controls
    setupRaceControls();

    // Start approach phase - player controls speed
    raceState.phase = 'approach';
    updateRaceStatus('APPROACH - Stay under 40 MPH!');

    // Begin rendering
    renderRaceFrame();
}
window.showFirstShootoutRace = showFirstShootoutRace;

// Setup race controls
function setupRaceControls() {
    const handleThrottleStart = () => {
        // Can throttle during approach and racing phases
        if (raceState.phase === 'approach' || raceState.phase === 'racing') {
            raceState.throttle = 1;
        }
    };

    const handleThrottleEnd = () => {
        raceState.throttle = 0;
    };

    // Steering controls (left/right)
    const handleSteerLeft = () => {
        if (raceState.active) raceState.boatLane = Math.max(-1, raceState.boatLane - 0.05);
    };
    const handleSteerRight = () => {
        if (raceState.active) raceState.boatLane = Math.min(1, raceState.boatLane + 0.05);
    };

    // Keyboard
    document.addEventListener('keydown', function raceKeyDown(e) {
        if (!raceState.active) return;
        if (e.code === 'Space') {
            e.preventDefault();
            handleThrottleStart();
        }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') handleSteerLeft();
        if (e.code === 'ArrowRight' || e.code === 'KeyD') handleSteerRight();
    });

    document.addEventListener('keyup', function raceKeyUp(e) {
        if (e.code === 'Space' && raceState.active) {
            handleThrottleEnd();
        }
    });

    // Mouse/Touch
    const canvas = raceState.canvas;
    canvas.addEventListener('mousedown', handleThrottleStart);
    canvas.addEventListener('mouseup', handleThrottleEnd);
    canvas.addEventListener('mouseleave', handleThrottleEnd);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleThrottleStart(); });
    canvas.addEventListener('touchend', handleThrottleEnd);
}

// Update HUD status message
function updateRaceStatus(msg) {
    const statusEl = document.querySelector('.hud-status');
    if (statusEl) statusEl.textContent = msg;
}

// Show big sign on screen
function showRaceSign(text, color = '#FFD700', duration = 1500) {
    const signEl = document.getElementById('race-sign');
    if (signEl) {
        signEl.textContent = text;
        signEl.style.color = color;
        signEl.style.display = 'block';
        signEl.classList.add('race-sign-appear');
        setTimeout(() => {
            signEl.classList.remove('race-sign-appear');
            if (text !== 'GO!') signEl.style.display = 'none';
        }, duration);
    }
}

// Start countdown sequence (triggered when crossing start line)
function startRaceCountdown() {
    raceState.phase = 'racing';
    raceState.startTime = Date.now();
    showRaceSign('GO!', '#4CAF50', 1000);
    updateRaceStatus('FULL THROTTLE! Get your top speed!');
}

// Main race render loop
function renderRaceFrame() {
    if (!raceState.active) return;

    const ctx = raceState.ctx;
    const canvas = raceState.canvas;
    const w = canvas.width;
    const h = canvas.height;

    // Update physics
    updateRacePhysics();

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Draw State Park (left side - trees and hills)
    drawStateParkScenery(ctx, w, h);

    // Draw spectator boats (right side)
    drawSpectatorBoats(ctx, w, h);

    // Draw water
    drawRacingWater(ctx, w, h);

    // Draw course buoys
    drawCourseBuoys(ctx, w, h);

    // Draw signs based on course position
    drawCourseSigns(ctx, w, h);

    // Draw wake/spray particles
    drawWakeParticles(ctx);

    // Draw boat (from behind)
    drawRacingBoat(ctx, w, h);

    // Draw rooster tail spray
    if (raceState.currentSpeed > 5) {
        drawRoosterTail(ctx, w, h);
    }

    // Update HUD
    const speedEl = document.querySelector('.speed-value');
    if (speedEl) speedEl.textContent = Math.round(raceState.currentSpeed);

    // Check phase transitions
    checkRacePhases();

    // Continue loop
    if (raceState.active && raceState.phase !== 'finished') {
        raceState.animationFrame = requestAnimationFrame(renderRaceFrame);
    }
}

// Check and handle race phase transitions
function checkRacePhases() {
    const pos = raceState.coursePosition;

    // Approaching start line
    if (!raceState.crossedStart && pos >= raceState.startLinePos - 100 && pos < raceState.startLinePos) {
        // Show speed check
        if (raceState.currentSpeed > 40) {
            if (!raceState.penalized) {
                raceState.penalized = true;
                // Funny message if boat can't even reach 40
                if (raceState.maxSpeed < 40) {
                    showRaceSign("You're trying your best!", '#FFA500', 2000);
                    updateRaceStatus("LOL - your boat maxes out at " + raceState.maxSpeed + " MPH!");
                } else {
                    showRaceSign('TOO FAST! Under 40!', '#FF4444', 1500);
                    updateRaceStatus('PENALTY! You were over 40 before the start!');
                }
            }
        } else {
            updateRaceStatus('Good speed - stay under 40 until start line!');
        }
    }

    // Crossing start line
    if (!raceState.crossedStart && pos >= raceState.startLinePos) {
        raceState.crossedStart = true;
        startRaceCountdown();  // Shows "GO!" and starts racing phase
    }

    // During racing - track peak speed
    if (raceState.phase === 'racing') {
        if (raceState.currentSpeed > raceState.peakSpeed) {
            raceState.peakSpeed = raceState.currentSpeed;
        }

        // Special message for slow starter boat
        if (raceState.maxSpeed <= 28 && raceState.coursePosition > raceState.startLinePos + 50) {
            if (!raceState.slowBoatJoke) {
                raceState.slowBoatJoke = true;
                updateRaceStatus("FLOORING IT! This is " + Math.round(raceState.currentSpeed) + " MPH baby!");
            }
        }
    }

    // Crossing finish line
    if (!raceState.crossedFinish && pos >= raceState.finishLinePos) {
        raceState.crossedFinish = true;
        raceState.phase = 'finished';
        raceState.finalSpeed = raceState.peakSpeed;
        showRaceSign('FINISH!', '#FFD700', 2000);
        setTimeout(showRaceResults, 1500);
    }
}

// Update race physics
function updateRacePhysics() {
    // Physics runs during approach and racing phases
    if (raceState.phase !== 'approach' && raceState.phase !== 'racing') return;

    const acceleration = raceState.maxSpeed * 0.015; // Acceleration rate
    const deceleration = raceState.maxSpeed * 0.008; // Deceleration when not throttling

    if (raceState.throttle > 0) {
        // Accelerate towards max speed
        raceState.currentSpeed += acceleration * raceState.throttle;
        if (raceState.currentSpeed > raceState.maxSpeed) {
            raceState.currentSpeed = raceState.maxSpeed;
        }
    } else {
        // Slow down
        raceState.currentSpeed -= deceleration;
        if (raceState.currentSpeed < 0) raceState.currentSpeed = 0;
    }

    // Update course position based on speed
    raceState.coursePosition += raceState.currentSpeed * 0.15;

    // Update water scroll based on speed
    raceState.waterOffset += raceState.currentSpeed * 0.5;
    raceState.wavePhase += 0.1;

    // Update boat X position based on lane
    const targetX = raceState.canvas.width / 2 + raceState.boatLane * 100;
    raceState.boatX += (targetX - raceState.boatX) * 0.1;

    // Generate spray particles
    if (raceState.currentSpeed > 10 && Math.random() < raceState.currentSpeed / 50) {
        raceState.particles.push({
            x: raceState.boatX + (Math.random() - 0.5) * 60,
            y: raceState.boatY + 40,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 5 - 2,
            life: 1,
            size: Math.random() * 4 + 2
        });
    }

    // Update particles
    raceState.particles = raceState.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // gravity
        p.life -= 0.02;
        return p.life > 0;
    });
}

// Draw State Park scenery on the left side
function drawStateParkScenery(ctx, w, h) {
    const horizonY = h * 0.4;

    // Distant hills (State Park)
    ctx.fillStyle = '#2D5A3D';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x < w * 0.35; x += 15) {
        const hillY = horizonY - 20 - Math.sin(x * 0.015 + raceState.waterOffset * 0.001) * 25
                     - Math.sin(x * 0.008) * 15;
        ctx.lineTo(x, hillY);
    }
    ctx.lineTo(w * 0.35, horizonY);
    ctx.lineTo(0, horizonY);
    ctx.fill();

    // Trees silhouette
    ctx.fillStyle = '#1A4030';
    for (let x = 10; x < w * 0.30; x += 25) {
        const treeH = 30 + Math.sin(x * 0.1) * 15;
        const baseY = horizonY - 10;
        // Pine tree shape
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x - 12, baseY);
        ctx.lineTo(x, baseY - treeH);
        ctx.lineTo(x + 12, baseY);
        ctx.closePath();
        ctx.fill();
    }

    // "STATE PARK" sign on shore
    if (raceState.coursePosition > 50 && raceState.coursePosition < 400) {
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(50, horizonY - 40, 80, 8);
        ctx.fillRect(60, horizonY - 40, 8, 35);
        ctx.fillRect(110, horizonY - 40, 8, 35);
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(52, horizonY - 38, 76, 5);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6px Arial';
        ctx.fillText('STATE PARK', 58, horizonY - 34);
    }
}

// Draw spectator boats on the right side
function drawSpectatorBoats(ctx, w, h) {
    const horizonY = h * 0.4;

    // Right shore with docks
    ctx.fillStyle = '#4A6A5A';
    ctx.beginPath();
    ctx.moveTo(w * 0.7, horizonY);
    for (let x = w * 0.7; x < w; x += 12) {
        ctx.lineTo(x, horizonY - 5 - Math.sin(x * 0.02) * 8);
    }
    ctx.lineTo(w, horizonY);
    ctx.lineTo(w, horizonY + 10);
    ctx.lineTo(w * 0.7, horizonY + 10);
    ctx.fill();

    // Draw spectator boats (anchored, watching the race)
    const boatPositions = [
        { x: w * 0.78, y: horizonY + 30, type: 'pontoon' },
        { x: w * 0.85, y: horizonY + 50, type: 'cruiser' },
        { x: w * 0.92, y: horizonY + 35, type: 'speedboat' },
        { x: w * 0.75, y: horizonY + 60, type: 'pontoon' },
        { x: w * 0.88, y: horizonY + 70, type: 'yacht' },
    ];

    boatPositions.forEach(boat => {
        const bob = Math.sin(raceState.wavePhase + boat.x * 0.01) * 2;
        drawSpectatorBoat(ctx, boat.x, boat.y + bob, boat.type);
    });
}

// Draw a single spectator boat
function drawSpectatorBoat(ctx, x, y, type) {
    ctx.save();
    ctx.translate(x, y);

    if (type === 'pontoon') {
        // Small pontoon
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(-20, 5, 40, 6);
        ctx.fillStyle = '#E8DCC8';
        ctx.fillRect(-18, -5, 36, 12);
        ctx.fillStyle = '#722F37';
        ctx.fillRect(-18, 0, 36, 4);
    } else if (type === 'cruiser') {
        // Cabin cruiser
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-25, 8);
        ctx.lineTo(-20, -5);
        ctx.lineTo(20, -5);
        ctx.lineTo(25, 8);
        ctx.fill();
        ctx.fillStyle = '#1E3A5F';
        ctx.fillRect(-15, -12, 25, 8);
    } else if (type === 'speedboat') {
        // Small speedboat
        ctx.fillStyle = '#CC3333';
        ctx.beginPath();
        ctx.moveTo(-20, 5);
        ctx.lineTo(-15, -3);
        ctx.lineTo(18, -3);
        ctx.lineTo(20, 5);
        ctx.fill();
    } else if (type === 'yacht') {
        // Larger yacht
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-35, 10);
        ctx.lineTo(-25, -8);
        ctx.lineTo(30, -8);
        ctx.lineTo(35, 10);
        ctx.fill();
        ctx.fillStyle = '#1A3A5A';
        ctx.fillRect(-20, -18, 35, 12);
        // Upper deck
        ctx.fillStyle = '#2A4A6A';
        ctx.fillRect(-10, -25, 20, 8);
    }

    ctx.restore();
}

// Draw course buoys (yellow for start/finish)
function drawCourseBuoys(ctx, w, h) {
    const waterTop = h * 0.4;
    const coursePos = raceState.coursePosition;

    // Calculate relative positions of buoys
    const startLineRel = raceState.startLinePos - coursePos;
    const finishLineRel = raceState.finishLinePos - coursePos;

    // Draw start line buoys (yellow)
    if (startLineRel > -100 && startLineRel < 500) {
        const startY = waterTop + 80 + (500 - startLineRel) * 0.3;
        const scale = Math.max(0.3, 1 - (500 - startLineRel) / 600);

        // Left buoy
        drawBuoy(ctx, w * 0.25, startY, scale, '#FFD700', 'START');
        // Right buoy
        drawBuoy(ctx, w * 0.75, startY, scale, '#FFD700', 'START');

        // Start line on water
        if (scale > 0.5) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 3 * scale;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(w * 0.25, startY);
            ctx.lineTo(w * 0.75, startY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Draw finish line buoys (yellow)
    if (finishLineRel > -100 && finishLineRel < 500) {
        const finishY = waterTop + 80 + (500 - finishLineRel) * 0.3;
        const scale = Math.max(0.3, 1 - (500 - finishLineRel) / 600);

        // Left buoy
        drawBuoy(ctx, w * 0.25, finishY, scale, '#FFD700', 'FINISH');
        // Right buoy
        drawBuoy(ctx, w * 0.75, finishY, scale, '#FFD700', 'FINISH');

        // Finish line on water
        if (scale > 0.5) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 3 * scale;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(w * 0.25, finishY);
            ctx.lineTo(w * 0.75, finishY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Course boundary buoys (red on left, green on right)
    for (let i = 0; i < 8; i++) {
        const buoyPos = i * 100 + 50;
        const relPos = buoyPos - coursePos;

        if (relPos > -50 && relPos < 400) {
            const buoyY = waterTop + 100 + (400 - relPos) * 0.25;
            const scale = Math.max(0.2, 1 - (400 - relPos) / 500);

            // Left boundary (red)
            drawBuoy(ctx, w * 0.18 + Math.sin(buoyPos * 0.02) * 10, buoyY, scale * 0.6, '#FF4444');
            // Right boundary (green)
            drawBuoy(ctx, w * 0.82 - Math.sin(buoyPos * 0.02) * 10, buoyY, scale * 0.6, '#44FF44');
        }
    }
}

// Draw a single buoy
function drawBuoy(ctx, x, y, scale, color, label = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Buoy body
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#AA8800');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-5, -8, 5, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Top marker
    ctx.fillStyle = '#333';
    ctx.fillRect(-3, -25, 6, 10);

    // Flag
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(3, -25);
    ctx.lineTo(15, -20);
    ctx.lineTo(3, -15);
    ctx.fill();

    ctx.restore();
}

// Draw course signs
function drawCourseSigns(ctx, w, h) {
    const coursePos = raceState.coursePosition;
    const horizonY = h * 0.4;

    // "KEEP IT UNDER 40" sign before start
    const signPos = raceState.startLinePos - 150;
    const signRel = signPos - coursePos;

    if (signRel > -50 && signRel < 300) {
        const signY = horizonY + 20 + (300 - signRel) * 0.2;
        const scale = Math.max(0.4, 1 - (300 - signRel) / 400);

        ctx.save();
        ctx.translate(w * 0.5, signY);
        ctx.scale(scale, scale);

        // Sign background
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-80, -25, 160, 50);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(-80, -25, 160, 50);

        // Text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('KEEP IT UNDER', 0, -5);
        ctx.font = 'bold 24px Arial';
        ctx.fillText('40 MPH', 0, 20);

        ctx.restore();
    }
}

// Draw the racing water surface
function drawRacingWater(ctx, w, h) {
    const waterTop = h * 0.4;

    // Main water gradient
    const waterGrad = ctx.createLinearGradient(0, waterTop, 0, h);
    waterGrad.addColorStop(0, '#4A90A4');
    waterGrad.addColorStop(0.3, '#3D7A8C');
    waterGrad.addColorStop(1, '#2A5A6A');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterTop, w, h - waterTop);

    // Draw wave lines for motion effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;

    const speedFactor = raceState.currentSpeed / raceState.maxSpeed;

    for (let i = 0; i < 15; i++) {
        const baseY = waterTop + 50 + i * 40;
        const offset = (raceState.waterOffset + i * 100) % (w + 200) - 100;

        ctx.beginPath();
        ctx.moveTo(-100 + offset, baseY);

        for (let x = -100 + offset; x < w + 100; x += 50) {
            const waveY = baseY + Math.sin(x * 0.02 + raceState.wavePhase + i) * (5 + speedFactor * 10);
            ctx.lineTo(x, waveY);
        }
        ctx.stroke();
    }

    // Speed lines on water
    if (raceState.currentSpeed > 20) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${speedFactor * 0.5})`;
        ctx.lineWidth = 1;

        for (let i = 0; i < 20; i++) {
            const x = Math.random() * w;
            const y = waterTop + 100 + Math.random() * (h - waterTop - 150);
            const len = 20 + speedFactor * 80;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + len);
            ctx.stroke();
        }
    }
}

// Draw the boat from behind
function drawRacingBoat(ctx, w, h) {
    const boatX = raceState.boatX;
    const boatY = raceState.boatY;
    const bounce = Math.sin(raceState.wavePhase * 2) * (raceState.currentSpeed / raceState.maxSpeed) * 5;

    ctx.save();
    ctx.translate(boatX, boatY + bounce);

    const boatData = STARTER_BOATS[selectedStarterBoat];
    const colors = boatData.colors;

    if (selectedStarterBoat === 'sundancer') {
        // Pontoon from behind - wide and flat
        const pontoonWidth = 180;
        const pontoonHeight = 60;

        // Left pontoon
        ctx.fillStyle = '#707070';
        ctx.beginPath();
        ctx.ellipse(-pontoonWidth/2 + 25, 30, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Right pontoon
        ctx.beginPath();
        ctx.ellipse(pontoonWidth/2 - 25, 30, 25, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Deck
        ctx.fillStyle = colors.deck;
        ctx.fillRect(-pontoonWidth/2, -30, pontoonWidth, 50);

        // Maroon stripe
        ctx.fillStyle = colors.accent;
        ctx.fillRect(-pontoonWidth/2, -5, pontoonWidth, 15);

        // Back seats
        ctx.fillStyle = colors.furniture;
        ctx.fillRect(-60, -25, 120, 25);

        // Bimini top
        ctx.fillStyle = colors.biminiTop;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(-70, -60);
        ctx.quadraticCurveTo(0, -80, 70, -60);
        ctx.lineTo(60, -35);
        ctx.quadraticCurveTo(0, -50, -60, -35);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Motor
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(-15, 35, 30, 40);

        // Evinrude colors
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(-12, 40, 24, 8);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-12, 48, 24, 5);

    } else {
        // Ski Supreme from behind - sleek V shape
        const boatWidth = 120;

        // Hull - back view
        ctx.fillStyle = colors.hull;
        ctx.beginPath();
        ctx.moveTo(-boatWidth/2, 20);
        ctx.quadraticCurveTo(-boatWidth/2 - 10, -10, -30, -40);
        ctx.lineTo(30, -40);
        ctx.quadraticCurveTo(boatWidth/2 + 10, -10, boatWidth/2, 20);
        ctx.lineTo(boatWidth/2 - 10, 35);
        ctx.lineTo(-boatWidth/2 + 10, 35);
        ctx.closePath();
        ctx.fill();

        // White stripe
        ctx.fillStyle = colors.stripe;
        ctx.fillRect(-boatWidth/2 + 5, -15, boatWidth - 10, 10);

        // Deck/interior
        ctx.fillStyle = colors.deck;
        ctx.beginPath();
        ctx.moveTo(-40, -35);
        ctx.lineTo(40, -35);
        ctx.lineTo(35, -5);
        ctx.lineTo(-35, -5);
        ctx.closePath();
        ctx.fill();

        // Engine cover
        ctx.fillStyle = colors.hull;
        ctx.beginPath();
        ctx.ellipse(0, 5, 35, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Engine vents
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 8 - 5, 0);
            ctx.lineTo(i * 8 + 5, 0);
            ctx.stroke();
        }

        // Swim platform
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-30, 30, 60, 10);
    }

    ctx.restore();
}

// Draw rooster tail water spray
function drawRoosterTail(ctx, w, h) {
    const boatX = raceState.boatX;
    const boatY = raceState.boatY;
    const speedFactor = raceState.currentSpeed / raceState.maxSpeed;
    const sprayHeight = 30 + speedFactor * 100;

    ctx.save();
    ctx.translate(boatX, boatY + 50);

    // Main spray fan
    const grad = ctx.createRadialGradient(0, 0, 0, 0, sprayHeight/2, sprayHeight);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.5, 'rgba(200, 230, 255, 0.6)');
    grad.addColorStop(1, 'rgba(150, 200, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-sprayHeight * 0.8, sprayHeight * 0.5, -sprayHeight * 0.6, sprayHeight);
    ctx.lineTo(sprayHeight * 0.6, sprayHeight);
    ctx.quadraticCurveTo(sprayHeight * 0.8, sprayHeight * 0.5, 10, 0);
    ctx.fill();

    // Spray droplets
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < speedFactor * 30; i++) {
        const angle = (Math.random() - 0.5) * Math.PI * 0.6;
        const dist = Math.random() * sprayHeight;
        const x = Math.sin(angle) * dist;
        const y = Math.cos(angle) * dist * 0.8;
        const size = Math.random() * 3 + 1;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Draw wake particles
function drawWakeParticles(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    raceState.particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

// Show race results
function showRaceResults() {
    raceState.active = false;
    if (raceState.animationFrame) {
        cancelAnimationFrame(raceState.animationFrame);
    }

    const activeBoat = gameState.garage.boats[0];
    const finalSpeed = Math.round(raceState.finalSpeed * 10) / 10;
    const playerName = gameState.playerName || 'Super Dave';

    // Generate class competitors with speeds around the player
    // Player finishes 2nd from last in their class
    const boatClass = selectedStarterBoat === 'sundancer' ? 'Pontoon Class' : 'Ski Boat Class';
    const classCompetitors = generateClassRankings(finalSpeed, boatClass, playerName, activeBoat.name);

    // Find player position (should be 2nd from last)
    const playerPosition = classCompetitors.findIndex(c => c.isPlayer) + 1;
    const totalInClass = classCompetitors.length;

    // Determine message based on 2nd-to-last finish
    let message, reward;
    message = "Hey, you beat somebody! That's what counts.";
    reward = 75;

    // Update boat stats
    activeBoat.races = 1;
    activeBoat.bestSpeed = finalSpeed;
    activeBoat.totalEarnings = reward;

    // Give rewards
    gameState.resources.money += reward;
    gameState.resources.racingRep += 1;

    // Build class rankings HTML
    const rankingsHTML = classCompetitors.map((comp, idx) => `
        <div class="ranking-row ${comp.isPlayer ? 'player-row' : ''}">
            <span class="rank-num">${idx + 1}</span>
            <span class="rank-driver">${comp.driver}</span>
            <span class="rank-boat">${comp.boat}</span>
            <span class="rank-speed">${comp.speed} MPH</span>
        </div>
    `).join('');

    // Create results overlay
    const overlay = document.getElementById('race-overlay');
    overlay.innerHTML = `
        <div class="race-results-screen">
            <h2>SHOOTOUT COMPLETE!</h2>

            <div class="final-speed">
                <span class="big-speed">${finalSpeed}</span>
                <span class="mph">MPH</span>
            </div>

            <div class="class-results">
                <h3>${boatClass} Results</h3>
                <div class="rankings-list">
                    ${rankingsHTML}
                </div>
            </div>

            <div class="placement-badge">${playerPosition} of ${totalInClass}</div>
            <p class="result-msg">${message}</p>

            <div class="rewards-box">
                <div class="reward-row">
                    <span>Participation Prize:</span>
                    <span class="reward-amount">+$${reward}</span>
                </div>
                <div class="reward-row">
                    <span>Racing Rep:</span>
                    <span class="reward-amount">+1</span>
                </div>
            </div>

            <p class="next-tip">Build docks and marinas to earn money, then upgrade your boat for the next Shootout!</p>

            <button class="continue-btn" onclick="closeRaceOverlay()">Start Building Your Empire</button>
        </div>
    `;

    // Update UI
    updateUI();
    addEvent(`First Shootout: ${finalSpeed} MPH - ${playerPosition} of ${totalInClass} in ${boatClass}!`, 'racing');
}

// Generate class rankings with player finishing 2nd from last
function generateClassRankings(playerSpeed, boatClass, playerName, playerBoatName) {
    // Local Ozarks boat owners who compete
    const pontoonDrivers = [
        { driver: 'Big Mike', boat: '1989 SunTracker Party Barge' },
        { driver: 'Catfish Charlie', boat: '1991 Tracker Bass Buggy' },
        { driver: 'Dock Master Dan', boat: '1994 Bennington 22' },
        { driver: 'Two-Beer Tom', boat: '1990 Lowe 224' },
        { driver: 'Cooler King Kenny', boat: '1988 Sylvan 20' },
        { driver: 'Slow-Mo Joe', boat: '1985 Harris FloteBote' },
    ];

    const skiBoatDrivers = [
        { driver: 'Hotshot Harry', boat: '1984 MasterCraft Stars & Stripes' },
        { driver: 'Wake Wizard Willy', boat: '1986 Correct Craft Ski Nautique' },
        { driver: 'Slalom Steve', boat: '1983 Ski Supreme' },
        { driver: 'Rope Burn Randy', boat: '1987 Malibu Skier' },
        { driver: 'Full Throttle Fred', boat: '1985 Supra Comp' },
        { driver: 'Propwash Pete', boat: '1981 Ski Centurion' },
    ];

    const drivers = boatClass === 'Pontoon Class' ? pontoonDrivers : skiBoatDrivers;

    // Generate speeds - player is 2nd from last
    // Fastest competitor is about 15-20% faster than player
    // Slowest competitor is about 5% slower than player
    const competitors = [];
    const numCompetitors = drivers.length;

    // Generate spread of speeds
    const fastestSpeed = Math.round((playerSpeed * 1.18 + Math.random() * 3) * 10) / 10;
    const slowestSpeed = Math.round((playerSpeed * 0.92 - Math.random() * 2) * 10) / 10;

    drivers.forEach((d, idx) => {
        // Distribute speeds between fastest and slowest
        // Leave gaps for player to be 2nd from last
        let speed;
        if (idx < numCompetitors - 1) {
            // Faster boats
            const ratio = idx / (numCompetitors - 2);
            speed = Math.round((fastestSpeed - ratio * (fastestSpeed - playerSpeed - 0.5)) * 10) / 10;
        } else {
            // Slowest boat (last place)
            speed = slowestSpeed;
        }
        competitors.push({ ...d, speed, isPlayer: false });
    });

    // Add player
    competitors.push({
        driver: playerName,
        boat: playerBoatName,
        speed: playerSpeed,
        isPlayer: true
    });

    // Sort by speed descending
    competitors.sort((a, b) => b.speed - a.speed);

    return competitors;
}

// Close race overlay and show trailer scene
function closeRaceOverlay() {
    const overlay = document.getElementById('race-overlay');
    if (overlay) {
        // Transition to trailer scene instead of immediately closing
        showTrailerScene();
    }
}
window.closeRaceOverlay = closeRaceOverlay;

// Show the post-race trailer scene
function showTrailerScene() {
    const overlay = document.getElementById('race-overlay');
    if (!overlay) return;

    const boat = STARTER_BOATS[selectedStarterBoat];
    const activeBoat = gameState.garage.boats[0];
    const finalSpeed = activeBoat.bestSpeed || 0;

    overlay.innerHTML = `
        <div id="trailer-scene">
            <canvas id="trailer-canvas"></canvas>
            <div class="trailer-narrative">
                <div class="narrative-text" id="narrative-1">
                    The crowd cheers as you idle back to the staging area...
                </div>
                <div class="narrative-text hidden" id="narrative-2">
                    ${finalSpeed} MPH in the ${boat.nickname}. Not bad for a first run.
                </div>
                <div class="narrative-text hidden" id="narrative-3">
                    Back at the trailer, you crack open a cold one and think about the future...
                </div>
                <div class="narrative-text hidden" id="narrative-4">
                    This lake has potential. Time to build something special.
                </div>
            </div>
            <button class="skip-btn" onclick="skipToGame()">Skip</button>
        </div>
    `;

    // Setup trailer canvas
    const trailerCanvas = document.getElementById('trailer-canvas');
    if (trailerCanvas) {
        trailerCanvas.width = window.innerWidth;
        trailerCanvas.height = window.innerHeight;
        animateTrailerScene(trailerCanvas);
    }

    // Narrative sequence
    let narrativeIndex = 1;
    const narrativeInterval = setInterval(() => {
        narrativeIndex++;
        if (narrativeIndex <= 4) {
            // Hide previous
            const prev = document.getElementById(`narrative-${narrativeIndex - 1}`);
            if (prev) prev.classList.add('fade-out');

            // Show next
            setTimeout(() => {
                const next = document.getElementById(`narrative-${narrativeIndex}`);
                if (next) {
                    next.classList.remove('hidden');
                    next.classList.add('fade-in');
                }
            }, 500);
        } else {
            clearInterval(narrativeInterval);
            // Auto-transition to game after narrative
            setTimeout(skipToGame, 2000);
        }
    }, 3000);
}

// Animate the trailer scene
function animateTrailerScene(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    let frame = 0;

    function drawFrame() {
        frame++;

        // Evening sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.5);
        skyGrad.addColorStop(0, '#1a1a2e');
        skyGrad.addColorStop(0.3, '#16213e');
        skyGrad.addColorStop(0.6, '#e94560');
        skyGrad.addColorStop(1, '#ff9a3c');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.5);

        // Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 50; i++) {
            const sx = (i * 73 + frame * 0.01) % w;
            const sy = (i * 31) % (h * 0.3);
            const twinkle = Math.sin(frame * 0.05 + i) * 0.5 + 0.5;
            ctx.globalAlpha = twinkle * 0.8;
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Distant treeline
        ctx.fillStyle = '#0a0a15';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.48);
        for (let x = 0; x < w; x += 15) {
            const treeHeight = 20 + Math.sin(x * 0.05) * 15 + Math.cos(x * 0.03) * 10;
            ctx.lineTo(x, h * 0.48 - treeHeight);
        }
        ctx.lineTo(w, h * 0.5);
        ctx.lineTo(0, h * 0.5);
        ctx.fill();

        // Lake water with evening reflection
        const waterGrad = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.75);
        waterGrad.addColorStop(0, '#1a3a4a');
        waterGrad.addColorStop(0.5, '#0d2836');
        waterGrad.addColorStop(1, '#061621');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, h * 0.5, w, h * 0.25);

        // Water reflections
        ctx.strokeStyle = 'rgba(255, 150, 80, 0.2)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const ry = h * 0.52 + i * 15;
            ctx.beginPath();
            ctx.moveTo(w * 0.3, ry);
            for (let x = w * 0.3; x < w * 0.7; x += 20) {
                ctx.lineTo(x, ry + Math.sin((x + frame) * 0.02) * 3);
            }
            ctx.stroke();
        }

        // Boat ramp / parking area
        ctx.fillStyle = '#3a3530';
        ctx.fillRect(0, h * 0.72, w, h * 0.08);

        // Concrete ramp
        ctx.fillStyle = '#6a6560';
        ctx.beginPath();
        ctx.moveTo(w * 0.35, h * 0.72);
        ctx.lineTo(w * 0.65, h * 0.72);
        ctx.lineTo(w * 0.6, h * 0.5);
        ctx.lineTo(w * 0.4, h * 0.5);
        ctx.fill();

        // Ground/grass
        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(0, h * 0.8, w, h * 0.2);

        // Draw the truck and trailer
        drawTruckAndTrailer(ctx, w * 0.25, h * 0.65, frame);

        // Draw the player's boat on trailer
        drawBoatOnTrailer(ctx, w * 0.32, h * 0.58, frame);

        // Parking lot lights
        drawParkingLights(ctx, w, h, frame);

        // Other trucks/trailers in background
        ctx.globalAlpha = 0.6;
        drawTruckAndTrailer(ctx, w * 0.7, h * 0.68, frame, 0.7);
        drawTruckAndTrailer(ctx, w * 0.85, h * 0.66, frame, 0.5);
        ctx.globalAlpha = 1;

        // Continue animation
        if (document.getElementById('trailer-canvas')) {
            requestAnimationFrame(drawFrame);
        }
    }

    drawFrame();
}

// Draw truck and trailer
function drawTruckAndTrailer(ctx, x, y, frame, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Trailer
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(50, 30, 200, 10); // Frame
    ctx.fillRect(60, 35, 8, 15); // Front wheel
    ctx.fillRect(220, 35, 8, 15); // Back wheel

    // Trailer bunks
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(80, 20, 15, 15);
    ctx.fillRect(180, 20, 15, 15);

    // Truck body
    ctx.fillStyle = '#8B0000'; // Dark red truck
    // Bed
    ctx.fillRect(-60, 15, 100, 35);
    // Cab
    ctx.fillRect(-120, 5, 65, 45);

    // Truck windows
    ctx.fillStyle = '#1a3a4a';
    ctx.fillRect(-115, 10, 30, 20);
    ctx.fillRect(-80, 10, 20, 20);

    // Truck wheels
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-100, 50, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-30, 50, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, 50, 12, 0, Math.PI * 2);
    ctx.fill();

    // Hubcaps
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(-100, 50, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-30, 50, 5, 0, Math.PI * 2);
    ctx.fill();

    // Headlights glow
    ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
    ctx.beginPath();
    ctx.arc(-125, 35, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw boat on trailer
function drawBoatOnTrailer(ctx, x, y, frame) {
    ctx.save();
    ctx.translate(x, y);

    const boatData = STARTER_BOATS[selectedStarterBoat];
    const colors = boatData.colors;

    if (selectedStarterBoat === 'sundancer') {
        // Pontoon on trailer - side view
        // Pontoons
        ctx.fillStyle = '#606060';
        ctx.fillRect(0, 40, 180, 15);
        ctx.fillRect(0, 60, 180, 15);

        // Deck
        ctx.fillStyle = colors.deck;
        ctx.fillRect(10, 15, 160, 30);

        // Maroon stripe
        ctx.fillStyle = colors.accent;
        ctx.fillRect(10, 30, 160, 10);

        // Bimini frame (folded)
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 15);
        ctx.lineTo(50, 0);
        ctx.lineTo(130, 0);
        ctx.lineTo(140, 15);
        ctx.stroke();

        // Motor
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(165, 25, 25, 40);
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(168, 35, 19, 8);

    } else {
        // Ski boat on trailer - side view
        // Hull
        ctx.fillStyle = colors.hull;
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.quadraticCurveTo(10, 20, 40, 15);
        ctx.lineTo(150, 15);
        ctx.lineTo(170, 30);
        ctx.lineTo(170, 55);
        ctx.lineTo(0, 55);
        ctx.closePath();
        ctx.fill();

        // White stripe
        ctx.fillStyle = colors.stripe;
        ctx.fillRect(30, 30, 130, 8);

        // Windshield
        ctx.fillStyle = 'rgba(135, 206, 235, 0.6)';
        ctx.beginPath();
        ctx.moveTo(50, 15);
        ctx.lineTo(60, 0);
        ctx.lineTo(90, 0);
        ctx.lineTo(90, 15);
        ctx.fill();

        // Cover (boat covered for transport)
        ctx.fillStyle = 'rgba(50, 50, 60, 0.7)';
        ctx.beginPath();
        ctx.moveTo(40, 15);
        ctx.quadraticCurveTo(90, -10, 160, 15);
        ctx.lineTo(160, 20);
        ctx.lineTo(40, 20);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

// Draw parking lot lights
function drawParkingLights(ctx, w, h, frame) {
    const lightPositions = [w * 0.15, w * 0.5, w * 0.85];

    lightPositions.forEach((lx, i) => {
        // Pole
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(lx - 3, h * 0.6, 6, h * 0.2);

        // Light fixture
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(lx - 15, h * 0.58, 30, 8);

        // Light glow
        const glowIntensity = 0.15 + Math.sin(frame * 0.02 + i) * 0.05;
        const glow = ctx.createRadialGradient(lx, h * 0.65, 0, lx, h * 0.65, 100);
        glow.addColorStop(0, `rgba(255, 220, 150, ${glowIntensity})`);
        glow.addColorStop(1, 'rgba(255, 220, 150, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(lx - 100, h * 0.55, 200, 150);

        // Light bulb
        ctx.fillStyle = '#fff8e0';
        ctx.beginPath();
        ctx.arc(lx, h * 0.6, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Skip trailer scene and go to game
function skipToGame() {
    const overlay = document.getElementById('race-overlay');
    if (overlay) {
        overlay.remove();
    }

    // Re-render the map
    resizeCanvas();
    render();

    addEvent('Time to build your lakefront paradise!', 'neutral');
    addEvent('Tip: Start with a dock to earn boat rental income', 'positive');
}
window.skipToGame = skipToGame;

// Close race modal (legacy)
function closeRaceModal() {
    const raceModal = document.getElementById('race-modal');
    if (raceModal) {
        raceModal.classList.add('hidden');
        raceModal.style.display = 'none';
    }
    closeRaceOverlay();
}
window.closeRaceModal = closeRaceModal;

// Create the starter boat based on player selection
function createStarterBoatFromSelection(boatId) {
    const boatData = STARTER_BOATS[boatId];
    if (!boatData) return;

    const starterBoat = {
        id: 1,
        name: boatData.name,
        nickname: boatData.nickname,
        hull: boatId,
        engine: 'stock',
        propeller: 'stock',
        hullMod: 'none',
        weightMod: 'none',
        paint: 'stock',
        stats: {
            topSpeed: boatData.topSpeed,
            handling: boatData.handling,
            reliability: boatData.reliability,
            acceleration: boatData.engineType === 'inboard' ? 0.8 : 0.6,
            weight: boatData.length * 100
        },
        races: 0,
        wins: 0,
        bestSpeed: 0,
        totalEarnings: 0,
        isStarter: true,
        starterType: boatId,
        year: boatData.year,
        make: boatData.make,
        model: boatData.model,
        engine_name: boatData.engine
    };

    gameState.garage.boats = [starterBoat];
    gameState.garage.activeBoat = starterBoat.id;
    gameState.resources.speedBoats = 1;
}

// Legacy function for compatibility
function hideWelcomeModal() {
    startGameWithBoat();
}
window.hideWelcomeModal = hideWelcomeModal;

// Initialize boat preview canvases on welcome screen
function initBoatPreviews() {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        drawBoatPreview('sundancer');
        drawBoatPreview('skiSupreme');
    });
}

function drawBoatPreview(boatType) {
    const canvasId = boatType === 'sundancer' ? 'sundancer-preview' : 'skisupreme-preview';
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
        console.warn(`Canvas ${canvasId} not found, retrying...`);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear and draw water background
    ctx.clearRect(0, 0, w, h);

    // Sky gradient at top
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#5DA4B4');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.4);

    // Water gradient
    const waterGrad = ctx.createLinearGradient(0, h * 0.35, 0, h);
    waterGrad.addColorStop(0, '#4A8A7A');
    waterGrad.addColorStop(0.5, '#3A6A5A');
    waterGrad.addColorStop(1, '#2A4A42');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, h * 0.35, w, h * 0.65);

    // Water ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        const y = h * 0.5 + i * 15;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.25, y - 3, w * 0.5, y);
        ctx.quadraticCurveTo(w * 0.75, y + 3, w, y);
        ctx.stroke();
    }

    // Draw the appropriate boat
    if (boatType === 'sundancer') {
        drawSundancerPreview(ctx, w, h);
    } else {
        drawSkiSupremePreview(ctx, w, h);
    }
}

function drawSundancerPreview(ctx, w, h) {
    // 1992 Sundancer 24' Pontoon - "The Party Barge"
    const boatX = w * 0.1;
    const boatY = h * 0.25;
    const boatW = w * 0.8;
    const boatH = h * 0.55;

    // Shadow on water
    ctx.fillStyle = 'rgba(0, 40, 40, 0.3)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.85, boatW * 0.45, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // Left pontoon (aluminum)
    const pontoonGrad = ctx.createLinearGradient(0, boatY + boatH * 0.6, 0, boatY + boatH * 0.8);
    pontoonGrad.addColorStop(0, '#C0C0C0');
    pontoonGrad.addColorStop(0.5, '#909090');
    pontoonGrad.addColorStop(1, '#606060');
    ctx.fillStyle = pontoonGrad;
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.02, boatY + boatH * 0.55);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.65);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.78);
    ctx.lineTo(boatX, boatY + boatH * 0.78);
    ctx.lineTo(boatX, boatY + boatH * 0.65);
    ctx.closePath();
    ctx.fill();

    // Right pontoon (partially visible)
    ctx.fillStyle = '#707070';
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.05, boatY + boatH * 0.75);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.82);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.92);
    ctx.lineTo(boatX, boatY + boatH * 0.92);
    ctx.closePath();
    ctx.fill();

    // Deck
    const deckGrad = ctx.createLinearGradient(0, boatY, 0, boatY + boatH * 0.6);
    deckGrad.addColorStop(0, '#F5EDE0');
    deckGrad.addColorStop(1, '#E8DCC8');
    ctx.fillStyle = deckGrad;
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.03, boatY + boatH * 0.55);
    ctx.quadraticCurveTo(boatX, boatY + boatH * 0.2, boatX + boatW * 0.15, boatY + boatH * 0.1);
    ctx.lineTo(boatX + boatW * 0.92, boatY + boatH * 0.1);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#C0B0A0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // MAROON RACING STRIPE - the signature look
    ctx.fillStyle = '#722F37';
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.04, boatY + boatH * 0.42);
    ctx.lineTo(boatX + boatW * 0.02, boatY + boatH * 0.28);
    ctx.lineTo(boatX + boatW * 0.18, boatY + boatH * 0.22);
    ctx.lineTo(boatX + boatW * 0.90, boatY + boatH * 0.22);
    ctx.lineTo(boatX + boatW * 0.93, boatY + boatH * 0.32);
    ctx.lineTo(boatX + boatW * 0.93, boatY + boatH * 0.42);
    ctx.lineTo(boatX + boatW * 0.18, boatY + boatH * 0.42);
    ctx.closePath();
    ctx.fill();

    // Bimini top (canopy)
    ctx.fillStyle = '#3A3A4A';
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.35, boatY);
    ctx.quadraticCurveTo(boatX + boatW * 0.5, boatY - h * 0.05, boatX + boatW * 0.65, boatY);
    ctx.lineTo(boatX + boatW * 0.62, boatY + boatH * 0.08);
    ctx.lineTo(boatX + boatW * 0.38, boatY + boatH * 0.08);
    ctx.closePath();
    ctx.fill();

    // Canopy supports
    ctx.strokeStyle = '#505060';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.38, boatY + boatH * 0.08);
    ctx.lineTo(boatX + boatW * 0.35, boatY + boatH * 0.15);
    ctx.moveTo(boatX + boatW * 0.62, boatY + boatH * 0.08);
    ctx.lineTo(boatX + boatW * 0.65, boatY + boatH * 0.15);
    ctx.stroke();

    // Outboard motor (Evinrude 88hp)
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(boatX + boatW * 0.88, boatY + boatH * 0.48, boatW * 0.08, boatH * 0.25);
    ctx.fillStyle = '#1A3A6A';  // Evinrude blue
    ctx.fillRect(boatX + boatW * 0.885, boatY + boatH * 0.50, boatW * 0.07, boatH * 0.12);

    // Seats
    ctx.fillStyle = '#E8E0D8';
    ctx.fillRect(boatX + boatW * 0.70, boatY + boatH * 0.15, boatW * 0.15, boatH * 0.12);
    ctx.fillRect(boatX + boatW * 0.25, boatY + boatH * 0.15, boatW * 0.15, boatH * 0.12);
}

function drawSkiSupremePreview(ctx, w, h) {
    // 1982 Ski Supreme - "Red Rocket"
    const boatX = w * 0.08;
    const boatY = h * 0.30;
    const boatW = w * 0.84;
    const boatH = h * 0.50;

    // Shadow on water
    ctx.fillStyle = 'rgba(0, 40, 40, 0.3)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.82, boatW * 0.42, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hull - fiery red with gradient
    const hullGrad = ctx.createLinearGradient(0, boatY, 0, boatY + boatH);
    hullGrad.addColorStop(0, '#E83030');
    hullGrad.addColorStop(0.4, '#B22222');
    hullGrad.addColorStop(1, '#8B1A1A');
    ctx.fillStyle = hullGrad;

    // Sleek ski boat shape
    ctx.beginPath();
    ctx.moveTo(boatX, boatY + boatH * 0.5);  // Bow point
    ctx.quadraticCurveTo(boatX + boatW * 0.15, boatY + boatH * 0.1, boatX + boatW * 0.3, boatY + boatH * 0.15);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.20);
    ctx.lineTo(boatX + boatW, boatY + boatH * 0.45);
    ctx.lineTo(boatX + boatW * 0.95, boatY + boatH * 0.75);
    ctx.lineTo(boatX + boatW * 0.3, boatY + boatH * 0.80);
    ctx.quadraticCurveTo(boatX + boatW * 0.15, boatY + boatH * 0.85, boatX, boatY + boatH * 0.5);
    ctx.closePath();
    ctx.fill();

    // White accent stripe
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.05, boatY + boatH * 0.48);
    ctx.quadraticCurveTo(boatX + boatW * 0.15, boatY + boatH * 0.35, boatX + boatW * 0.3, boatY + boatH * 0.38);
    ctx.lineTo(boatX + boatW * 0.90, boatY + boatH * 0.40);
    ctx.lineTo(boatX + boatW * 0.90, boatY + boatH * 0.48);
    ctx.lineTo(boatX + boatW * 0.3, boatY + boatH * 0.46);
    ctx.quadraticCurveTo(boatX + boatW * 0.15, boatY + boatH * 0.43, boatX + boatW * 0.05, boatY + boatH * 0.52);
    ctx.closePath();
    ctx.fill();

    // Interior (tan)
    ctx.fillStyle = '#D4C4A0';
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.20, boatY + boatH * 0.25);
    ctx.lineTo(boatX + boatW * 0.85, boatY + boatH * 0.28);
    ctx.lineTo(boatX + boatW * 0.85, boatY + boatH * 0.60);
    ctx.lineTo(boatX + boatW * 0.20, boatY + boatH * 0.60);
    ctx.closePath();
    ctx.fill();

    // Windshield
    ctx.fillStyle = 'rgba(180, 220, 240, 0.6)';
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.35, boatY + boatH * 0.15);
    ctx.quadraticCurveTo(boatX + boatW * 0.45, boatY + boatH * 0.05, boatX + boatW * 0.55, boatY + boatH * 0.15);
    ctx.lineTo(boatX + boatW * 0.52, boatY + boatH * 0.25);
    ctx.lineTo(boatX + boatW * 0.38, boatY + boatH * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ski tower
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boatX + boatW * 0.50, boatY + boatH * 0.28);
    ctx.lineTo(boatX + boatW * 0.45, boatY - h * 0.02);
    ctx.lineTo(boatX + boatW * 0.55, boatY - h * 0.02);
    ctx.lineTo(boatX + boatW * 0.50, boatY + boatH * 0.28);
    ctx.stroke();

    // Inboard engine cover (Ford 351 V8!)
    ctx.fillStyle = '#C0B0A0';
    ctx.fillRect(boatX + boatW * 0.60, boatY + boatH * 0.32, boatW * 0.20, boatH * 0.25);
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(boatX + boatW * 0.62, boatY + boatH * 0.35, boatW * 0.16, boatH * 0.08);
}

window.initBoatPreviews = initBoatPreviews;
window.drawBoatPreview = drawBoatPreview;

// ==================== 8-BIT STORYTELLER CHARACTER ====================

// Draw the 8-bit storyteller character - a friendly Ozarks local
function drawStoryteller() {
    const canvas = document.getElementById('storyteller-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Scale factor (each "pixel" is 4x4 actual pixels)
    const px = 4;

    // Colors
    const skinColor = '#E8B887';
    const hairColor = '#4A3520';
    const shirtColor = '#1A4B6B';
    const pantsColor = '#3D5C42';
    const hatColor = '#C47238';
    const beltColor = '#654321';
    const eyeColor = '#2C1810';
    const smileColor = '#8B4513';

    // Helper function to draw a pixel block
    function drawPx(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * px, y * px, px, px);
    }

    // Draw the character - Ozarks local with cap and fishing shirt

    // Hat (trucker cap style)
    drawPx(5, 0, hatColor);
    drawPx(6, 0, hatColor);
    drawPx(7, 0, hatColor);
    drawPx(8, 0, hatColor);
    drawPx(9, 0, hatColor);
    drawPx(4, 1, hatColor);
    drawPx(5, 1, hatColor);
    drawPx(6, 1, hatColor);
    drawPx(7, 1, hatColor);
    drawPx(8, 1, hatColor);
    drawPx(9, 1, hatColor);
    drawPx(10, 1, hatColor);
    // Hat brim
    drawPx(3, 2, hatColor);
    drawPx(4, 2, hatColor);
    drawPx(5, 2, hatColor);
    drawPx(6, 2, hatColor);
    drawPx(7, 2, hatColor);

    // Hair visible under hat
    drawPx(8, 2, hairColor);
    drawPx(9, 2, hairColor);
    drawPx(10, 2, hairColor);

    // Face
    drawPx(5, 3, skinColor);
    drawPx(6, 3, skinColor);
    drawPx(7, 3, skinColor);
    drawPx(8, 3, skinColor);
    drawPx(9, 3, skinColor);
    drawPx(4, 4, hairColor);  // Sideburn
    drawPx(5, 4, skinColor);
    drawPx(6, 4, skinColor);
    drawPx(7, 4, skinColor);
    drawPx(8, 4, skinColor);
    drawPx(9, 4, skinColor);
    drawPx(10, 4, hairColor); // Sideburn

    // Eyes
    drawPx(6, 4, eyeColor);
    drawPx(8, 4, eyeColor);

    // Nose and smile
    drawPx(5, 5, skinColor);
    drawPx(6, 5, skinColor);
    drawPx(7, 5, skinColor);
    drawPx(8, 5, skinColor);
    drawPx(9, 5, skinColor);
    // Smile
    drawPx(6, 6, smileColor);
    drawPx(7, 6, skinColor);
    drawPx(8, 6, smileColor);
    drawPx(5, 6, skinColor);
    drawPx(9, 6, skinColor);

    // Neck
    drawPx(6, 7, skinColor);
    drawPx(7, 7, skinColor);
    drawPx(8, 7, skinColor);

    // Shirt (fishing/button-up style)
    drawPx(3, 8, shirtColor);
    drawPx(4, 8, shirtColor);
    drawPx(5, 8, shirtColor);
    drawPx(6, 8, shirtColor);
    drawPx(7, 8, '#FFFFFF');  // Collar
    drawPx(8, 8, shirtColor);
    drawPx(9, 8, shirtColor);
    drawPx(10, 8, shirtColor);
    drawPx(11, 8, shirtColor);

    // Body
    for (let y = 9; y <= 12; y++) {
        drawPx(3, y, shirtColor);
        drawPx(4, y, shirtColor);
        drawPx(5, y, shirtColor);
        drawPx(6, y, shirtColor);
        drawPx(7, y, shirtColor);
        drawPx(8, y, shirtColor);
        drawPx(9, y, shirtColor);
        drawPx(10, y, shirtColor);
        drawPx(11, y, shirtColor);
    }

    // Arms
    drawPx(2, 9, skinColor);
    drawPx(2, 10, skinColor);
    drawPx(12, 9, skinColor);
    drawPx(12, 10, skinColor);
    // Hands
    drawPx(2, 11, skinColor);
    drawPx(12, 11, skinColor);

    // Belt
    drawPx(4, 13, beltColor);
    drawPx(5, 13, beltColor);
    drawPx(6, 13, beltColor);
    drawPx(7, 13, '#D4A855'); // Buckle
    drawPx(8, 13, beltColor);
    drawPx(9, 13, beltColor);
    drawPx(10, 13, beltColor);

    // Pants
    for (let y = 14; y <= 17; y++) {
        drawPx(4, y, pantsColor);
        drawPx(5, y, pantsColor);
        drawPx(6, y, pantsColor);
        drawPx(7, y, y < 16 ? pantsColor : '#000');  // Gap between legs
        drawPx(8, y, pantsColor);
        drawPx(9, y, pantsColor);
        drawPx(10, y, pantsColor);
    }

    // Boots
    drawPx(3, 18, '#4A3520');
    drawPx(4, 18, '#4A3520');
    drawPx(5, 18, '#4A3520');
    drawPx(6, 18, '#4A3520');
    drawPx(8, 18, '#4A3520');
    drawPx(9, 18, '#4A3520');
    drawPx(10, 18, '#4A3520');
    drawPx(11, 18, '#4A3520');
}

// Initialize storyteller on welcome screen
function initStoryteller() {
    requestAnimationFrame(() => {
        drawStoryteller();
    });
}

window.drawStoryteller = drawStoryteller;
window.initStoryteller = initStoryteller;

// ==================== GAME CONFIGURATION ====================
const CONFIG = {
    GRID_WIDTH: 50,
    GRID_HEIGHT: 35,
    TILE_SIZE: 40,
    TICK_RATE: 1000,
    SEASONS: ['Spring', 'Summer', 'Summer', 'Fall'], // Double summer for lake life!
    TICKS_PER_SEASON: 25,
    LAKE_MILE_MARKERS: 92, // The real lake has mile markers 0-92
    SHOOTOUT_WEEK: 20, // Shootout happens late summer (tick 20 of summer)
};

// ==================== STARTER BOATS ====================
// These are the sentimental boats players can choose from
const STARTER_BOATS = {
    sundancer: {
        id: 'sundancer',
        name: "1992 Sundancer 24' Pontoon",
        nickname: 'The Party Barge',
        year: 1992,
        make: 'Sundancer Pontoons',
        model: '240D',
        length: 24,
        engine: 'Evinrude 88hp',
        engineType: 'outboard',
        topSpeed: 28,
        handling: 0.6,
        reliability: 0.75,
        description: 'A classic Lake of the Ozarks pontoon made right here in Lebanon, Missouri. Those maroon stripes have seen countless summer days, cold beers, and sunset cruises. She may not be fast, but she carries memories.',
        specs: {
            hull: 'Dual Aluminum Pontoons',
            capacity: '12 passengers',
            fuelTank: '24 gallons',
            features: 'Bimini top, wraparound seating, swim ladder'
        },
        // Color scheme
        colors: {
            pontoons: '#8A8A8A',      // Aluminum gray
            deck: '#E8DCC8',          // Tan/cream deck
            furniture: '#F5EDE0',      // Light tan seats
            accent: '#722F37',         // Maroon/burgundy stripes
            accentLight: '#8B3A42',    // Lighter maroon
            biminiTop: '#F0E8D8',      // Tan canvas
            railings: '#C0C0C0',       // Chrome/aluminum
            motor: '#1A1A1A'           // Black Evinrude
        }
    },
    skiSupreme: {
        id: 'skiSupreme',
        name: "1982 Ski Supreme",
        nickname: 'Red Rocket',
        year: 1982,
        make: 'Ski Supreme',
        model: 'Competition',
        length: 19,
        engine: 'Ford 351 V8',
        engineType: 'inboard',
        topSpeed: 45,
        handling: 0.85,
        reliability: 0.65,
        description: 'A California-born competition ski boat that found its way to the Ozarks. That flat hull throws a perfect slalom wake. The red fiberglass has faded a bit, but the V8 still roars like the day it left the factory.',
        specs: {
            hull: 'Modified Vee Fiberglass',
            capacity: '6 passengers',
            fuelTank: '32 gallons',
            features: 'Direct drive, swim platform, competition tower'
        },
        // Color scheme
        colors: {
            hull: '#B22222',           // Classic red
            hullDark: '#8B0000',       // Dark red for depth
            hullHighlight: '#CD5C5C',  // Lighter red highlight
            deck: '#F5F5F5',           // White/off-white deck
            interior: '#E8E0D0',       // Tan interior
            windshield: '#87CEEB',     // Light blue tint
            chrome: '#C0C0C0',         // Chrome accents
            stripe: '#FFFFFF'          // White racing stripe
        }
    }
};

// Draw the 1992 Sundancer 24' Pontoon - detailed rendering
function drawSundancerPontoon(ctx, x, y, width, height) {
    const w = width;
    const h = height;
    const colors = STARTER_BOATS.sundancer.colors;

    ctx.save();
    ctx.translate(x, y);

    // Water reflection/shadow
    ctx.fillStyle = 'rgba(0, 80, 80, 0.3)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.92, w * 0.45, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // === LEFT PONTOON (ALUMINUM LOG) ===
    const pontoonY = h * 0.72;
    const pontoonHeight = h * 0.12;
    const pontoonWidth = w * 0.85;
    const pontoonStartX = w * 0.08;

    // Left pontoon - gradient for 3D effect
    const leftPontoonGrad = ctx.createLinearGradient(0, pontoonY - pontoonHeight/2, 0, pontoonY + pontoonHeight/2);
    leftPontoonGrad.addColorStop(0, '#A0A0A0');
    leftPontoonGrad.addColorStop(0.3, colors.pontoons);
    leftPontoonGrad.addColorStop(0.7, '#707070');
    leftPontoonGrad.addColorStop(1, '#505050');

    ctx.fillStyle = leftPontoonGrad;
    ctx.beginPath();
    ctx.moveTo(pontoonStartX + pontoonWidth * 0.05, pontoonY - h * 0.12);  // Bow point
    ctx.lineTo(pontoonStartX + pontoonWidth, pontoonY - pontoonHeight/2);
    ctx.lineTo(pontoonStartX + pontoonWidth, pontoonY + pontoonHeight/2);
    ctx.lineTo(pontoonStartX, pontoonY + pontoonHeight/2);
    ctx.lineTo(pontoonStartX, pontoonY - pontoonHeight/2);
    ctx.closePath();
    ctx.fill();

    // Pontoon end cap (bow)
    ctx.fillStyle = '#909090';
    ctx.beginPath();
    ctx.ellipse(pontoonStartX + pontoonWidth * 0.02, pontoonY, pontoonHeight * 0.3, pontoonHeight/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right pontoon (slightly lower to show perspective)
    const rightPontoonY = pontoonY + h * 0.08;
    const rightPontoonGrad = ctx.createLinearGradient(0, rightPontoonY - pontoonHeight/2, 0, rightPontoonY + pontoonHeight/2);
    rightPontoonGrad.addColorStop(0, '#909090');
    rightPontoonGrad.addColorStop(0.3, '#787878');
    rightPontoonGrad.addColorStop(1, '#484848');

    ctx.fillStyle = rightPontoonGrad;
    ctx.beginPath();
    ctx.moveTo(pontoonStartX + pontoonWidth * 0.08, rightPontoonY - h * 0.10);
    ctx.lineTo(pontoonStartX + pontoonWidth, rightPontoonY - pontoonHeight/2);
    ctx.lineTo(pontoonStartX + pontoonWidth, rightPontoonY + pontoonHeight/2);
    ctx.lineTo(pontoonStartX, rightPontoonY + pontoonHeight/2);
    ctx.lineTo(pontoonStartX, rightPontoonY - pontoonHeight/2);
    ctx.closePath();
    ctx.fill();

    // === DECK ===
    const deckY = h * 0.35;
    const deckHeight = h * 0.42;

    // Main deck - tan/cream color
    const deckGrad = ctx.createLinearGradient(0, deckY, 0, deckY + deckHeight);
    deckGrad.addColorStop(0, colors.deck);
    deckGrad.addColorStop(1, '#D8CDB8');

    ctx.fillStyle = deckGrad;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, deckY + deckHeight);
    ctx.lineTo(w * 0.02, deckY + deckHeight * 0.3);  // Bow
    ctx.quadraticCurveTo(w * 0.08, deckY, w * 0.20, deckY);
    ctx.lineTo(w * 0.92, deckY);
    ctx.lineTo(w * 0.95, deckY + deckHeight);
    ctx.closePath();
    ctx.fill();

    // Deck edge/trim
    ctx.strokeStyle = '#B0A090';
    ctx.lineWidth = 2;
    ctx.stroke();

    // === MAROON STRIPE GRAPHICS ===
    ctx.fillStyle = colors.accent;

    // Main side stripe
    ctx.beginPath();
    ctx.moveTo(w * 0.05, deckY + deckHeight * 0.75);
    ctx.lineTo(w * 0.03, deckY + deckHeight * 0.45);
    ctx.lineTo(w * 0.15, deckY + deckHeight * 0.40);
    ctx.lineTo(w * 0.88, deckY + deckHeight * 0.40);
    ctx.lineTo(w * 0.92, deckY + deckHeight * 0.50);
    ctx.lineTo(w * 0.92, deckY + deckHeight * 0.65);
    ctx.lineTo(w * 0.88, deckY + deckHeight * 0.70);
    ctx.lineTo(w * 0.15, deckY + deckHeight * 0.70);
    ctx.closePath();
    ctx.fill();

    // Accent stripe (lighter maroon)
    ctx.fillStyle = colors.accentLight;
    ctx.fillRect(w * 0.15, deckY + deckHeight * 0.52, w * 0.73, h * 0.025);

    // === FURNITURE (WRAPAROUND SEATING) ===
    // Back bench
    ctx.fillStyle = colors.furniture;
    ctx.beginPath();
    ctx.roundRect(w * 0.55, deckY + h * 0.08, w * 0.35, h * 0.18, 5);
    ctx.fill();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Side seats (L-shape wraparound)
    ctx.fillStyle = colors.furniture;
    ctx.beginPath();
    ctx.roundRect(w * 0.12, deckY + h * 0.06, w * 0.15, h * 0.22, 5);
    ctx.fill();
    ctx.strokeStyle = colors.accent;
    ctx.stroke();

    // Front bow seats
    ctx.fillStyle = colors.furniture;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, deckY + h * 0.28);
    ctx.lineTo(w * 0.04, deckY + h * 0.15);
    ctx.quadraticCurveTo(w * 0.10, deckY + h * 0.05, w * 0.22, deckY + h * 0.06);
    ctx.lineTo(w * 0.22, deckY + h * 0.20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = colors.accent;
    ctx.stroke();

    // Captain's console
    ctx.fillStyle = '#D8D0C0';
    ctx.beginPath();
    ctx.roundRect(w * 0.32, deckY + h * 0.08, w * 0.18, h * 0.14, 3);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Steering wheel
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.41, deckY + h * 0.14, w * 0.035, 0, Math.PI * 2);
    ctx.stroke();

    // === BIMINI TOP ===
    ctx.fillStyle = colors.biminiTop;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(w * 0.25, deckY - h * 0.02);
    ctx.quadraticCurveTo(w * 0.50, deckY - h * 0.18, w * 0.85, deckY - h * 0.02);
    ctx.lineTo(w * 0.82, deckY + h * 0.02);
    ctx.quadraticCurveTo(w * 0.50, deckY - h * 0.10, w * 0.28, deckY + h * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bimini support poles
    ctx.strokeStyle = colors.railings;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.30, deckY + h * 0.08);
    ctx.lineTo(w * 0.28, deckY - h * 0.02);
    ctx.moveTo(w * 0.80, deckY + h * 0.08);
    ctx.lineTo(w * 0.82, deckY - h * 0.02);
    ctx.stroke();

    // === RAILINGS ===
    ctx.strokeStyle = colors.railings;
    ctx.lineWidth = 1.5;
    // Front railing
    ctx.beginPath();
    ctx.moveTo(w * 0.04, deckY + h * 0.15);
    ctx.lineTo(w * 0.02, deckY + h * 0.30);
    ctx.stroke();

    // === EVINRUDE 88HP OUTBOARD MOTOR ===
    const motorX = w * 0.88;
    const motorY = deckY + deckHeight * 0.5;

    // Motor head (cowling)
    const motorGrad = ctx.createLinearGradient(motorX, motorY - h * 0.15, motorX + w * 0.1, motorY - h * 0.15);
    motorGrad.addColorStop(0, '#2A2A2A');
    motorGrad.addColorStop(0.5, '#1A1A1A');
    motorGrad.addColorStop(1, '#0A0A0A');

    ctx.fillStyle = motorGrad;
    ctx.beginPath();
    ctx.moveTo(motorX, motorY - h * 0.08);
    ctx.lineTo(motorX + w * 0.06, motorY - h * 0.12);
    ctx.lineTo(motorX + w * 0.08, motorY - h * 0.05);
    ctx.lineTo(motorX + w * 0.08, motorY + h * 0.12);
    ctx.lineTo(motorX, motorY + h * 0.08);
    ctx.closePath();
    ctx.fill();

    // Evinrude logo stripe (blue/white)
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(motorX + w * 0.01, motorY - h * 0.06, w * 0.05, h * 0.02);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(motorX + w * 0.01, motorY - h * 0.04, w * 0.05, h * 0.015);

    // Motor shaft
    ctx.fillStyle = '#333';
    ctx.fillRect(motorX + w * 0.03, motorY + h * 0.08, w * 0.02, h * 0.18);

    // Propeller
    ctx.fillStyle = '#505050';
    ctx.beginPath();
    ctx.ellipse(motorX + w * 0.04, motorY + h * 0.28, w * 0.025, h * 0.04, Math.PI * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Draw the 1982 Ski Supreme - detailed rendering
function drawSkiSupreme(ctx, x, y, width, height) {
    const w = width;
    const h = height;
    const colors = STARTER_BOATS.skiSupreme.colors;

    ctx.save();
    ctx.translate(x, y);

    // Water reflection/shadow
    ctx.fillStyle = 'rgba(0, 80, 80, 0.3)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.88, w * 0.42, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // === HULL ===
    // Main hull body - red fiberglass with gradient for depth
    const hullGrad = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.85);
    hullGrad.addColorStop(0, colors.hullHighlight);
    hullGrad.addColorStop(0.3, colors.hull);
    hullGrad.addColorStop(0.7, colors.hullDark);
    hullGrad.addColorStop(1, '#5A0000');

    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    // Classic ski boat profile - pointed bow, flat bottom, squared stern
    ctx.moveTo(w * 0.02, h * 0.55);  // Bow point
    ctx.quadraticCurveTo(w * 0.01, h * 0.45, w * 0.05, h * 0.38);  // Bow curve up
    ctx.lineTo(w * 0.15, h * 0.32);  // Forward deck line
    ctx.lineTo(w * 0.92, h * 0.32);  // Top deck line
    ctx.lineTo(w * 0.96, h * 0.38);  // Stern top
    ctx.lineTo(w * 0.96, h * 0.78);  // Stern back
    ctx.lineTo(w * 0.92, h * 0.82);  // Stern bottom corner
    ctx.lineTo(w * 0.08, h * 0.82);  // Bottom of hull (flat)
    ctx.quadraticCurveTo(w * 0.03, h * 0.78, w * 0.02, h * 0.55);  // Back to bow
    ctx.closePath();
    ctx.fill();

    // Hull outline
    ctx.strokeStyle = colors.hullDark;
    ctx.lineWidth = 2;
    ctx.stroke();

    // === WHITE RACING STRIPE ===
    ctx.fillStyle = colors.stripe;
    ctx.beginPath();
    ctx.moveTo(w * 0.04, h * 0.52);
    ctx.lineTo(w * 0.10, h * 0.42);
    ctx.lineTo(w * 0.94, h * 0.42);
    ctx.lineTo(w * 0.94, h * 0.48);
    ctx.lineTo(w * 0.10, h * 0.48);
    ctx.lineTo(w * 0.05, h * 0.56);
    ctx.closePath();
    ctx.fill();

    // Secondary pinstripe
    ctx.strokeStyle = '#FFD700';  // Gold pinstripe
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.50);
    ctx.lineTo(w * 0.10, h * 0.44);
    ctx.lineTo(w * 0.94, h * 0.44);
    ctx.stroke();

    // === DECK (WHITE/OFF-WHITE) ===
    ctx.fillStyle = colors.deck;
    ctx.beginPath();
    ctx.moveTo(w * 0.06, h * 0.38);
    ctx.quadraticCurveTo(w * 0.03, h * 0.42, w * 0.05, h * 0.50);
    ctx.lineTo(w * 0.08, h * 0.45);
    ctx.lineTo(w * 0.15, h * 0.36);
    ctx.lineTo(w * 0.90, h * 0.36);
    ctx.lineTo(w * 0.93, h * 0.40);
    ctx.lineTo(w * 0.93, h * 0.36);
    ctx.lineTo(w * 0.15, h * 0.33);
    ctx.quadraticCurveTo(w * 0.08, h * 0.34, w * 0.06, h * 0.38);
    ctx.closePath();
    ctx.fill();

    // === INTERIOR (TAN) ===
    ctx.fillStyle = colors.interior;
    ctx.beginPath();
    ctx.moveTo(w * 0.12, h * 0.36);
    ctx.lineTo(w * 0.88, h * 0.36);
    ctx.lineTo(w * 0.88, h * 0.52);
    ctx.lineTo(w * 0.12, h * 0.52);
    ctx.quadraticCurveTo(w * 0.08, h * 0.48, w * 0.12, h * 0.36);
    ctx.closePath();
    ctx.fill();

    // === BOW SEATING ===
    ctx.fillStyle = '#DDD5C5';
    // Left bow seat
    ctx.beginPath();
    ctx.moveTo(w * 0.10, h * 0.42);
    ctx.quadraticCurveTo(w * 0.08, h * 0.38, w * 0.14, h * 0.36);
    ctx.lineTo(w * 0.22, h * 0.36);
    ctx.lineTo(w * 0.22, h * 0.46);
    ctx.lineTo(w * 0.12, h * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#AA9988';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Right bow seat
    ctx.beginPath();
    ctx.moveTo(w * 0.10, h * 0.48);
    ctx.quadraticCurveTo(w * 0.09, h * 0.52, w * 0.14, h * 0.52);
    ctx.lineTo(w * 0.22, h * 0.52);
    ctx.lineTo(w * 0.22, h * 0.46);
    ctx.lineTo(w * 0.12, h * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // === WINDSHIELD ===
    ctx.fillStyle = colors.windshield;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(w * 0.26, h * 0.36);
    ctx.quadraticCurveTo(w * 0.30, h * 0.22, w * 0.42, h * 0.22);
    ctx.lineTo(w * 0.48, h * 0.22);
    ctx.quadraticCurveTo(w * 0.52, h * 0.22, w * 0.54, h * 0.36);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Windshield frame
    ctx.strokeStyle = colors.chrome;
    ctx.lineWidth = 2;
    ctx.stroke();

    // === DRIVER'S AREA ===
    // Driver seat
    ctx.fillStyle = '#DDD5C5';
    ctx.beginPath();
    ctx.roundRect(w * 0.30, h * 0.38, w * 0.12, h * 0.12, 3);
    ctx.fill();
    ctx.strokeStyle = '#AA9988';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Seat back
    ctx.fillStyle = '#C8C0B0';
    ctx.fillRect(w * 0.30, h * 0.36, w * 0.12, h * 0.04);

    // Steering wheel
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * 0.36, h * 0.34, w * 0.03, 0, Math.PI * 2);
    ctx.stroke();

    // Dashboard
    ctx.fillStyle = '#333';
    ctx.fillRect(w * 0.28, h * 0.32, w * 0.20, h * 0.04);

    // Gauges
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(w * 0.32, h * 0.34, w * 0.015, 0, Math.PI * 2);
    ctx.arc(w * 0.38, h * 0.34, w * 0.015, 0, Math.PI * 2);
    ctx.arc(w * 0.44, h * 0.34, w * 0.015, 0, Math.PI * 2);
    ctx.fill();

    // === PASSENGER SEAT ===
    ctx.fillStyle = '#DDD5C5';
    ctx.beginPath();
    ctx.roundRect(w * 0.48, h * 0.38, w * 0.12, h * 0.12, 3);
    ctx.fill();
    ctx.strokeStyle = '#AA9988';
    ctx.stroke();

    // === ENGINE COVER (INBOARD) ===
    const engineGrad = ctx.createLinearGradient(w * 0.62, h * 0.36, w * 0.62, h * 0.50);
    engineGrad.addColorStop(0, '#E8E0D0');
    engineGrad.addColorStop(1, '#C8C0B0');

    ctx.fillStyle = engineGrad;
    ctx.beginPath();
    ctx.roundRect(w * 0.62, h * 0.38, w * 0.18, h * 0.12, 4);
    ctx.fill();
    ctx.strokeStyle = colors.chrome;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Engine vents
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.65 + i * w * 0.035, h * 0.40);
        ctx.lineTo(w * 0.65 + i * w * 0.035, h * 0.48);
        ctx.stroke();
    }

    // === REAR BENCH SEAT ===
    ctx.fillStyle = '#DDD5C5';
    ctx.beginPath();
    ctx.roundRect(w * 0.82, h * 0.38, w * 0.08, h * 0.12, 3);
    ctx.fill();
    ctx.strokeStyle = '#AA9988';
    ctx.stroke();

    // === SWIM PLATFORM ===
    ctx.fillStyle = '#A08060';  // Teak wood color
    ctx.fillRect(w * 0.92, h * 0.52, w * 0.06, h * 0.28);

    // Teak slats
    ctx.strokeStyle = '#806040';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.92, h * 0.54 + i * h * 0.05);
        ctx.lineTo(w * 0.98, h * 0.54 + i * h * 0.05);
        ctx.stroke();
    }

    // === PROP SHAFT AND RUDDER ===
    ctx.fillStyle = '#444';
    ctx.fillRect(w * 0.90, h * 0.75, w * 0.08, h * 0.02);

    // Propeller
    ctx.fillStyle = '#606060';
    ctx.beginPath();
    ctx.ellipse(w * 0.99, h * 0.76, w * 0.015, h * 0.05, Math.PI * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Rudder
    ctx.fillStyle = '#505050';
    ctx.beginPath();
    ctx.moveTo(w * 0.97, h * 0.78);
    ctx.lineTo(w * 0.99, h * 0.78);
    ctx.lineTo(w * 0.99, h * 0.86);
    ctx.lineTo(w * 0.96, h * 0.86);
    ctx.closePath();
    ctx.fill();

    // === CHROME ACCENTS ===
    // Bow cleat
    ctx.fillStyle = colors.chrome;
    ctx.beginPath();
    ctx.ellipse(w * 0.06, h * 0.42, w * 0.015, h * 0.01, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stern cleats
    ctx.beginPath();
    ctx.ellipse(w * 0.90, h * 0.50, w * 0.012, h * 0.008, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Make drawing functions globally available
window.drawSundancerPontoon = drawSundancerPontoon;
window.drawSkiSupreme = drawSkiSupreme;

// ==================== TERRAIN TYPES ====================
// Natural Ozark color palette
const TERRAIN = {
    LAND: { id: 'land', name: 'Shoreline', color: '#6b8c5a', buildable: true },
    FOREST: { id: 'forest', name: 'Woods', color: '#3a5a40', buildable: true },
    WATER: { id: 'water', name: 'Lake', color: '#4a7a6a', buildable: false, isWater: true },
    DEEP_WATER: { id: 'deep_water', name: 'Deep Channel', color: '#2a4a42', buildable: false, isWater: true },
    RACE_LANE: { id: 'race_lane', name: 'Race Lane', color: '#1a3a32', buildable: false, isWater: true, isRaceLane: true },
    COVE: { id: 'cove', name: 'Cove', color: '#5a8a7a', buildable: false, isWater: true, isCove: true },
    SHALLOW: { id: 'shallow', name: 'Shallow Water', color: '#7aaa9a', buildable: false, isWater: true },
    DOCK_ZONE: { id: 'dock_zone', name: 'Dock Area', color: '#5a9080', buildable: true, isWater: true },
    RACE_STAGING: { id: 'race_staging', name: 'Race Staging', color: '#3a6a5a', buildable: true, isWater: true, isRacing: true },
    DAM: { id: 'dam', name: 'Bagnell Dam', color: '#8a8a80', buildable: false },
    STRIP: { id: 'strip', name: 'The Strip', color: '#a89070', buildable: true, isStrip: true },
    PARKING: { id: 'parking', name: 'Parking Lot', color: '#605850', buildable: true },
    // Towns
    TOWN: { id: 'town', name: 'Town', color: '#c4a882', buildable: true, isTown: true },
    TOWN_CENTER: { id: 'town_center', name: 'Town Center', color: '#b89872', buildable: false, isTown: true },
    // State Parks
    STATE_PARK: { id: 'state_park', name: 'State Park', color: '#2d5a27', buildable: false, isPark: true },
    PARK_BEACH: { id: 'park_beach', name: 'Public Beach', color: '#d4c4a0', buildable: false, isPark: true },
    PARK_TRAIL: { id: 'park_trail', name: 'Hiking Trail', color: '#8b7355', buildable: false, isPark: true },
    // Job Locations
    PAINT_SHOP: { id: 'paint_shop', name: 'Paint Shop', color: '#c0a080', buildable: false, isJob: true, jobType: 'paint' },
    PROP_SHOP: { id: 'prop_shop', name: 'Prop Shop', color: '#808090', buildable: false, isJob: true, jobType: 'prop' },
};

// Lake of the Ozarks towns and landmarks
const LAKE_LOCATIONS = {
    towns: [
        { name: 'Lake Ozark', x: 0.92, y: 0.45, size: 3 },
        { name: 'Osage Beach', x: 0.78, y: 0.42, size: 4 },
        { name: 'Camdenton', x: 0.35, y: 0.25, size: 3 },
        { name: 'Sunrise Beach', x: 0.55, y: 0.65, size: 2 },
        { name: 'Gravois Mills', x: 0.25, y: 0.70, size: 2 },
        { name: 'Laurie', x: 0.40, y: 0.75, size: 2 },
        { name: 'Versailles', x: 0.15, y: 0.30, size: 2 },
    ],
    stateParks: [
        { name: 'Lake of the Ozarks State Park', x: 0.50, y: 0.55, width: 8, height: 6 },
        { name: 'Ha Ha Tonka State Park', x: 0.30, y: 0.20, width: 4, height: 4 },
    ],
    landmarks: [
        { name: 'Bagnell Dam', x: 0.96, y: 0.50, type: 'dam' },
        { name: 'The Strip', x: 0.90, y: 0.40, type: 'strip' },
        { name: "Captain Ron's", x: 0.60, y: 0.50, type: 'marina' },
        { name: 'Party Cove', x: 0.45, y: 0.60, type: 'cove' },
        { name: 'Dog Days', x: 0.52, y: 0.48, type: 'marina' },
    ],
    // Job locations - where player can work for money and discounts
    jobs: [
        { name: "Larry's Paint Shop", x: 0.88, y: 0.38, type: 'paint_shop',
          description: 'Custom boat paint and graphics',
          wage: 15, discount: 'paint', discountPercent: 40 },
        { name: "Ozark Prop Shop", x: 0.86, y: 0.36, type: 'prop_shop',
          description: 'Propellers, lower units, and performance parts',
          wage: 18, discount: 'performance', discountPercent: 35 },
    ],
    majorArms: [
        { name: 'Gravois Arm', startX: 0.35, startY: 0.50, endX: 0.20, endY: 0.75, curve: 0.3 },
        { name: 'Grand Glaize Arm', startX: 0.70, startY: 0.50, endX: 0.65, endY: 0.25, curve: -0.2 },
        { name: 'Niangua Arm', startX: 0.25, startY: 0.50, endX: 0.10, endY: 0.35, curve: -0.1 },
        { name: 'Lick Branch', startX: 0.55, startY: 0.50, endX: 0.50, endY: 0.70, curve: 0.15 },
    ]
};

// ==================== CUSTOM ICON DRAWING SYSTEM ====================
// Hand-drawn icons for a more authentic Ozark feel
const ICONS = {
    // Draw a pontoon/deck boat
    boat_dock: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Dock planks
        ctx.fillStyle = '#8B7355';
        ctx.fillRect(cx - s, cy - s*0.3, s*2, s*0.6);
        // Dock posts
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.8, cy + s*0.2, s*0.15, s*0.4);
        ctx.fillRect(cx + s*0.65, cy + s*0.2, s*0.15, s*0.4);
        // Boat
        ctx.fillStyle = '#E8E0D5';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.5, cy - s*0.1);
        ctx.lineTo(cx + s*0.6, cy - s*0.1);
        ctx.lineTo(cx + s*0.4, cy - s*0.4);
        ctx.lineTo(cx - s*0.4, cy - s*0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#6B5B4F';
        ctx.lineWidth = 1;
        ctx.stroke();
    },

    // Full service marina with fuel pump
    marina: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Main dock
        ctx.fillStyle = '#7A6B5A';
        ctx.fillRect(cx - s, cy - s*0.2, s*2, s*0.8);
        // Fuel pump
        ctx.fillStyle = '#CC4444';
        ctx.fillRect(cx - s*0.2, cy - s*0.6, s*0.4, s*0.5);
        ctx.fillStyle = '#333';
        ctx.fillRect(cx - s*0.1, cy - s*0.8, s*0.2, s*0.2);
        // Hose
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + s*0.1, cy - s*0.4);
        ctx.quadraticCurveTo(cx + s*0.5, cy - s*0.5, cx + s*0.4, cy - s*0.2);
        ctx.stroke();
        // Anchor symbol
        ctx.fillStyle = '#4A6B8A';
        ctx.beginPath();
        ctx.arc(cx, cy + s*0.4, s*0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    // Boat rental with multiple boats
    boat_rental: (ctx, cx, cy, size) => {
        const s = size * 0.35;
        // Draw 3 small boats
        for (let i = 0; i < 3; i++) {
            const bx = cx - s + i * s;
            const by = cy - s*0.3 + (i % 2) * s*0.4;
            ctx.fillStyle = ['#E74C3C', '#3498DB', '#F1C40F'][i];
            ctx.beginPath();
            ctx.ellipse(bx, by, s*0.4, s*0.2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        // Sign
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.6, cy + s*0.3, s*1.2, s*0.4);
        ctx.fillStyle = '#ECF0F1';
        ctx.font = `${s*0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('RENT', cx, cy + s*0.58);
    },

    // Yacht club with sailboat
    yacht_club: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#F5F5F0';
        ctx.fillRect(cx - s*0.8, cy - s*0.2, s*1.6, s*0.8);
        // Roof
        ctx.fillStyle = '#2C5F7C';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s*0.2);
        ctx.lineTo(cx, cy - s*0.7);
        ctx.lineTo(cx + s, cy - s*0.2);
        ctx.closePath();
        ctx.fill();
        // Sailboat flag
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx + s*0.5, cy - s*0.5);
        ctx.lineTo(cx + s*0.8, cy - s*0.4);
        ctx.lineTo(cx + s*0.5, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
    },

    // Boat dealership
    boat_dealer: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Showroom building
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(cx - s, cy - s*0.3, s*2, s*0.9);
        // Windows
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.8, cy - s*0.1, s*0.5, s*0.4);
        ctx.fillRect(cx + s*0.3, cy - s*0.1, s*0.5, s*0.4);
        // Sign
        ctx.fillStyle = '#1A5276';
        ctx.fillRect(cx - s*0.7, cy - s*0.6, s*1.4, s*0.25);
        // Display boat silhouette
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.4, cy + s*0.1);
        ctx.lineTo(cx + s*0.5, cy + s*0.1);
        ctx.lineTo(cx + s*0.3, cy - s*0.05);
        ctx.lineTo(cx - s*0.3, cy - s*0.05);
        ctx.closePath();
        ctx.fill();
    },

    // Lakefront resort
    resort: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Main building
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(cx - s*0.9, cy - s*0.4, s*1.8, s);
        // Roof
        ctx.fillStyle = '#6B4423';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s*0.4);
        ctx.lineTo(cx, cy - s*0.9);
        ctx.lineTo(cx + s, cy - s*0.4);
        ctx.closePath();
        ctx.fill();
        // Windows
        ctx.fillStyle = '#F7DC6F';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(cx - s*0.7 + i*s*0.5, cy - s*0.2, s*0.25, s*0.3);
        }
        // Door
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.1, cy + s*0.1, s*0.2, s*0.4);
    },

    // Lake condo
    condo: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Tall building
        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(cx - s*0.5, cy - s*0.8, s, s*1.4);
        // Windows grid
        ctx.fillStyle = '#5DADE2';
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 2; col++) {
                ctx.fillRect(cx - s*0.35 + col*s*0.4, cy - s*0.65 + row*s*0.35, s*0.2, s*0.2);
            }
        }
        // Balconies
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - s*0.45, cy - s*0.3, s*0.9, s*0.15);
        ctx.strokeRect(cx - s*0.45, cy + s*0.2, s*0.9, s*0.15);
    },

    // Cabin rentals
    cabin: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Log cabin body
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(cx - s*0.7, cy - s*0.2, s*1.4, s*0.7);
        // Log texture lines
        ctx.strokeStyle = '#5D4E37';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s*0.7, cy - s*0.1 + i*s*0.18);
            ctx.lineTo(cx + s*0.7, cy - s*0.1 + i*s*0.18);
            ctx.stroke();
        }
        // Roof
        ctx.fillStyle = '#4A4A4A';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.85, cy - s*0.2);
        ctx.lineTo(cx, cy - s*0.7);
        ctx.lineTo(cx + s*0.85, cy - s*0.2);
        ctx.closePath();
        ctx.fill();
        // Chimney
        ctx.fillStyle = '#7B7B7B';
        ctx.fillRect(cx + s*0.3, cy - s*0.8, s*0.2, s*0.35);
    },

    // RV park
    rv_park: (ctx, cx, cy, size) => {
        const s = size * 0.35;
        // RV body
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(cx - s*0.8, cy - s*0.3, s*1.6, s*0.7);
        // Windows
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(cx - s*0.6, cy - s*0.15, s*0.3, s*0.25);
        ctx.fillRect(cx + s*0.1, cy - s*0.15, s*0.4, s*0.25);
        // Wheels
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.arc(cx - s*0.4, cy + s*0.4, s*0.15, 0, Math.PI * 2);
        ctx.arc(cx + s*0.4, cy + s*0.4, s*0.15, 0, Math.PI * 2);
        ctx.fill();
        // Awning
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.8, cy - s*0.3);
        ctx.lineTo(cx - s*1.1, cy + s*0.1);
        ctx.lineTo(cx - s*0.8, cy + s*0.1);
        ctx.closePath();
        ctx.fill();
    },

    // Tiki bar
    tiki_bar: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Thatched roof
        ctx.fillStyle = '#C4A35A';
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s*0.3);
        ctx.lineTo(cx, cy - s*0.8);
        ctx.lineTo(cx + s, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
        // Thatch texture
        ctx.strokeStyle = '#8B7355';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s*0.8 + i*s*0.4, cy - s*0.2);
            ctx.lineTo(cx - s*0.4 + i*s*0.2, cy - s*0.6);
            ctx.stroke();
        }
        // Bar counter
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.7, cy - s*0.1, s*1.4, s*0.4);
        // Stools
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(cx - s*0.4, cy + s*0.5, s*0.12, 0, Math.PI * 2);
        ctx.arc(cx + s*0.4, cy + s*0.5, s*0.12, 0, Math.PI * 2);
        ctx.fill();
    },

    // Lakeside restaurant
    restaurant: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#E8D4B8';
        ctx.fillRect(cx - s*0.8, cy - s*0.3, s*1.6, s*0.9);
        // Roof
        ctx.fillStyle = '#922B21';
        ctx.fillRect(cx - s*0.9, cy - s*0.45, s*1.8, s*0.2);
        // Door
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.15, cy + s*0.15, s*0.3, s*0.45);
        // Windows
        ctx.fillStyle = '#F9E79F';
        ctx.fillRect(cx - s*0.6, cy - s*0.1, s*0.3, s*0.3);
        ctx.fillRect(cx + s*0.3, cy - s*0.1, s*0.3, s*0.3);
        // Sign
        ctx.fillStyle = '#1A5276';
        ctx.beginPath();
        ctx.arc(cx + s*0.6, cy - s*0.6, s*0.2, 0, Math.PI * 2);
        ctx.fill();
    },

    // Party cove float
    party_cove: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Large float/platform
        ctx.fillStyle = '#F39C12';
        ctx.beginPath();
        ctx.ellipse(cx, cy, s*0.9, s*0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D68910';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Party people (simple shapes)
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(cx - s*0.3, cy - s*0.1, s*0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.arc(cx + s*0.2, cy + s*0.1, s*0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2ECC71';
        ctx.beginPath();
        ctx.arc(cx, cy - s*0.25, s*0.12, 0, Math.PI * 2);
        ctx.fill();
        // Music notes
        ctx.fillStyle = '#333';
        ctx.font = `${s*0.4}px Arial`;
        ctx.fillText('♪', cx + s*0.5, cy - s*0.3);
    },

    // Mini golf
    mini_golf: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Green
        ctx.fillStyle = '#27AE60';
        ctx.beginPath();
        ctx.ellipse(cx, cy, s*0.8, s*0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Hole
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(cx + s*0.3, cy, s*0.1, 0, Math.PI * 2);
        ctx.fill();
        // Flag
        ctx.strokeStyle = '#ECF0F1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + s*0.3, cy);
        ctx.lineTo(cx + s*0.3, cy - s*0.6);
        ctx.stroke();
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx + s*0.3, cy - s*0.6);
        ctx.lineTo(cx + s*0.6, cy - s*0.45);
        ctx.lineTo(cx + s*0.3, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
        // Sand trap
        ctx.fillStyle = '#F5DEB3';
        ctx.beginPath();
        ctx.ellipse(cx - s*0.4, cy + s*0.2, s*0.2, s*0.1, 0, 0, Math.PI * 2);
        ctx.fill();
    },

    // Arcade
    arcade: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.8, cy - s*0.4, s*1.6, s);
        // Neon sign glow
        ctx.fillStyle = '#FF6B9D';
        ctx.fillRect(cx - s*0.6, cy - s*0.6, s*1.2, s*0.25);
        // Door
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(cx - s*0.2, cy + s*0.1, s*0.4, s*0.5);
        // Game screen
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(cx - s*0.55, cy - s*0.2, s*0.3, s*0.35);
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(cx + s*0.25, cy - s*0.2, s*0.3, s*0.35);
    },

    // Water park
    water_park: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Slide tower
        ctx.fillStyle = '#3498DB';
        ctx.fillRect(cx - s*0.3, cy - s*0.8, s*0.6, s*0.5);
        // Slide
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s*0.3);
        ctx.quadraticCurveTo(cx + s*0.6, cy, cx + s*0.8, cy + s*0.5);
        ctx.stroke();
        // Pool
        ctx.fillStyle = '#85C1E9';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s*0.3, s*0.7, s*0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2980B9';
        ctx.lineWidth = 2;
        ctx.stroke();
    },

    // Gas station
    gas_station: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Canopy
        ctx.fillStyle = '#ECF0F1';
        ctx.fillRect(cx - s*0.9, cy - s*0.6, s*1.8, s*0.15);
        // Canopy supports
        ctx.fillStyle = '#BDC3C7';
        ctx.fillRect(cx - s*0.8, cy - s*0.45, s*0.1, s*0.6);
        ctx.fillRect(cx + s*0.7, cy - s*0.45, s*0.1, s*0.6);
        // Pumps
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - s*0.4, cy - s*0.3, s*0.25, s*0.45);
        ctx.fillRect(cx + s*0.15, cy - s*0.3, s*0.25, s*0.45);
        // Store
        ctx.fillStyle = '#85929E';
        ctx.fillRect(cx - s*0.5, cy + s*0.2, s, s*0.4);
    },

    // Bait shop
    bait_shop: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Small shack
        ctx.fillStyle = '#A04000';
        ctx.fillRect(cx - s*0.6, cy - s*0.2, s*1.2, s*0.7);
        // Roof
        ctx.fillStyle = '#5D4E37';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.75, cy - s*0.2);
        ctx.lineTo(cx, cy - s*0.6);
        ctx.lineTo(cx + s*0.75, cy - s*0.2);
        ctx.closePath();
        ctx.fill();
        // Sign
        ctx.fillStyle = '#F4D03F';
        ctx.fillRect(cx - s*0.4, cy - s*0.05, s*0.8, s*0.25);
        ctx.fillStyle = '#1A1A1A';
        ctx.font = `${s*0.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('BAIT', cx, cy + s*0.12);
        // Bucket
        ctx.fillStyle = '#5DADE2';
        ctx.fillRect(cx + s*0.5, cy + s*0.25, s*0.2, s*0.2);
    },

    // Souvenir shop
    souvenir_shop: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#F1948A';
        ctx.fillRect(cx - s*0.7, cy - s*0.3, s*1.4, s*0.9);
        // Awning
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.7, cy - s*0.3);
        ctx.lineTo(cx - s*0.85, cy);
        ctx.lineTo(cx + s*0.85, cy);
        ctx.lineTo(cx + s*0.7, cy - s*0.3);
        ctx.closePath();
        ctx.fill();
        // Stripes on awning
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - s*0.6 + i*s*0.35, cy - s*0.25, s*0.1, s*0.3);
        }
        // Window
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.35, cy + s*0.1, s*0.7, s*0.35);
    },

    // Parking structure
    parking_structure: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Multi-level structure
        ctx.fillStyle = '#7F8C8D';
        ctx.fillRect(cx - s*0.8, cy - s*0.5, s*1.6, s*1.1);
        // Levels
        ctx.strokeStyle = '#566573';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cx - s*0.8, cy - s*0.3 + i*s*0.35);
            ctx.lineTo(cx + s*0.8, cy - s*0.3 + i*s*0.35);
            ctx.stroke();
        }
        // Entrance
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(cx - s*0.3, cy + s*0.25, s*0.6, s*0.35);
        // P sign
        ctx.fillStyle = '#3498DB';
        ctx.beginPath();
        ctx.arc(cx, cy - s*0.1, s*0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.font = `bold ${s*0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('P', cx, cy - s*0.03);
    },

    // Road
    road: (ctx, cx, cy, size) => {
        const s = size * 0.45;
        // Asphalt
        ctx.fillStyle = '#4A4A4A';
        ctx.fillRect(cx - s, cy - s*0.4, s*2, s*0.8);
        // Center line
        ctx.strokeStyle = '#F1C40F';
        ctx.lineWidth = 2;
        ctx.setLineDash([s*0.2, s*0.15]);
        ctx.beginPath();
        ctx.moveTo(cx - s, cy);
        ctx.lineTo(cx + s, cy);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    // === RACING BUILDINGS ===
    race_dock: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Heavy duty dock
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(cx - s*0.9, cy - s*0.2, s*1.8, s*0.6);
        // Metal reinforcement
        ctx.strokeStyle = '#7B7B7B';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - s*0.85, cy - s*0.15, s*1.7, s*0.5);
        // Speed boat
        ctx.fillStyle = '#C0392B';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.5, cy - s*0.3);
        ctx.lineTo(cx + s*0.6, cy - s*0.3);
        ctx.lineTo(cx + s*0.7, cy - s*0.5);
        ctx.lineTo(cx - s*0.3, cy - s*0.5);
        ctx.closePath();
        ctx.fill();
        // Racing stripe
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - s*0.4, cy - s*0.45, s*0.8, s*0.08);
    },

    timing_tower: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Tower structure
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.4, cy - s*0.8, s*0.8, s*1.4);
        // Windows
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.3, cy - s*0.65, s*0.6, s*0.35);
        // Clock/timer display
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - s*0.25, cy - s*0.2, s*0.5, s*0.25);
        ctx.fillStyle = '#FFF';
        ctx.font = `${s*0.2}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('00:00', cx, cy - s*0.02);
        // Antenna
        ctx.strokeStyle = '#7B7B7B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s*0.8);
        ctx.lineTo(cx, cy - s*1.1);
        ctx.stroke();
    },

    spectator_stands: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Bleacher rows
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#BDC3C7' : '#95A5A6';
            ctx.fillRect(cx - s*0.8, cy - s*0.4 + i*s*0.3, s*1.6, s*0.25);
        }
        // Support structure
        ctx.fillStyle = '#7B7B7B';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.9, cy + s*0.5);
        ctx.lineTo(cx - s*0.7, cy - s*0.5);
        ctx.lineTo(cx + s*0.7, cy - s*0.5);
        ctx.lineTo(cx + s*0.9, cy + s*0.5);
        ctx.closePath();
        ctx.fill();
        // People (colored dots)
        const colors = ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#9B59B6'];
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(cx - s*0.6 + (i % 4)*s*0.4, cy - s*0.25 + Math.floor(i/4)*s*0.3, s*0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    speed_boat_shop: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Building
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.8, cy - s*0.3, s*1.6, s*0.9);
        // Large window/showroom
        ctx.fillStyle = '#85C1E9';
        ctx.fillRect(cx - s*0.65, cy - s*0.15, s*1.3, s*0.5);
        // Display boat
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - s*0.4, cy + s*0.15);
        ctx.lineTo(cx + s*0.5, cy + s*0.15);
        ctx.lineTo(cx + s*0.6, cy);
        ctx.lineTo(cx - s*0.3, cy);
        ctx.closePath();
        ctx.fill();
        // Racing stripes
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - s*0.3, cy + s*0.03, s*0.6, s*0.05);
        // Sign
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(cx - s*0.5, cy - s*0.55, s, s*0.2);
    },

    race_fuel_station: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Canopy
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(cx - s*0.9, cy - s*0.5, s*1.8, s*0.15);
        // Pillars
        ctx.fillStyle = '#7B7B7B';
        ctx.fillRect(cx - s*0.8, cy - s*0.35, s*0.15, s*0.7);
        ctx.fillRect(cx + s*0.65, cy - s*0.35, s*0.15, s*0.7);
        // Racing fuel pumps
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(cx - s*0.35, cy - s*0.25, s*0.3, s*0.5);
        ctx.fillRect(cx + s*0.05, cy - s*0.25, s*0.3, s*0.5);
        // High octane label
        ctx.fillStyle = '#E74C3C';
        ctx.fillRect(cx - s*0.3, cy - s*0.15, s*0.2, s*0.15);
        ctx.fillRect(cx + s*0.1, cy - s*0.15, s*0.2, s*0.15);
    },

    vip_race_lounge: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Luxury building
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(cx - s*0.8, cy - s*0.4, s*1.6, s);
        // Gold trim
        ctx.strokeStyle = '#F1C40F';
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - s*0.75, cy - s*0.35, s*1.5, s*0.9);
        // Large tinted windows
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.6, cy - s*0.2, s*1.2, s*0.4);
        // VIP text
        ctx.fillStyle = '#F1C40F';
        ctx.font = `bold ${s*0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('VIP', cx, cy + s*0.45);
        // Stars
        ctx.font = `${s*0.2}px Arial`;
        ctx.fillText('★★★', cx, cy - s*0.55);
    },

    helicopter_pad: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Pad surface
        ctx.fillStyle = '#4A4A4A';
        ctx.beginPath();
        ctx.arc(cx, cy, s*0.9, 0, Math.PI * 2);
        ctx.fill();
        // H marking
        ctx.strokeStyle = '#F1C40F';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - s*0.4, cy - s*0.5);
        ctx.lineTo(cx - s*0.4, cy + s*0.5);
        ctx.moveTo(cx + s*0.4, cy - s*0.5);
        ctx.lineTo(cx + s*0.4, cy + s*0.5);
        ctx.moveTo(cx - s*0.4, cy);
        ctx.lineTo(cx + s*0.4, cy);
        ctx.stroke();
        // Circle marking
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, s*0.7, 0, Math.PI * 2);
        ctx.stroke();
    },

    race_team_hq: (ctx, cx, cy, size) => {
        const s = size * 0.4;
        // Main building
        ctx.fillStyle = '#2C3E50';
        ctx.fillRect(cx - s*0.8, cy - s*0.5, s*1.6, s*1.1);
        // Garage doors
        ctx.fillStyle = '#7B7B7B';
        ctx.fillRect(cx - s*0.65, cy, s*0.5, s*0.5);
        ctx.fillRect(cx + s*0.15, cy, s*0.5, s*0.5);
        // Racing logo
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(cx, cy - s*0.25, s*0.25, 0, Math.PI * 2);
        ctx.fill();
        // Checkered pattern
        ctx.fillStyle = '#FFF';
        ctx.fillRect(cx - s*0.15, cy - s*0.35, s*0.1, s*0.1);
        ctx.fillRect(cx + s*0.05, cy - s*0.25, s*0.1, s*0.1);
        ctx.fillRect(cx - s*0.15, cy - s*0.15, s*0.1, s*0.1);
        // Flag
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(cx + s*0.6, cy - s*0.5);
        ctx.lineTo(cx + s*0.6, cy - s*0.85);
        ctx.lineTo(cx + s*0.85, cy - s*0.7);
        ctx.lineTo(cx + s*0.6, cy - s*0.55);
        ctx.closePath();
        ctx.fill();
    },

    // Default fallback icon
    default: (ctx, cx, cy, size) => {
        const s = size * 0.35;
        ctx.fillStyle = '#95A5A6';
        ctx.fillRect(cx - s, cy - s, s*2, s*2);
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - s, cy - s, s*2, s*2);
        ctx.fillStyle = '#FFF';
        ctx.font = `${s}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy);
    }
};

// ==================== BOAT RACING SYSTEM ====================
// The Shootout is the heart of Lake of the Ozarks - like New Year's Eve!

// Boat Classes - Different categories for racing
const BOAT_CLASSES = {
    STOCK: { id: 'stock', name: 'Stock Outboard', minSpeed: 40, maxSpeed: 70 },
    MODIFIED: { id: 'modified', name: 'Modified', minSpeed: 70, maxSpeed: 120 },
    SUPERSTOCK: { id: 'superstock', name: 'Super Stock', minSpeed: 100, maxSpeed: 160 },
    PRO: { id: 'pro', name: 'Pro Class', minSpeed: 140, maxSpeed: 200 },
    UNLIMITED: { id: 'unlimited', name: 'Unlimited', minSpeed: 180, maxSpeed: 250 },
    TOP_SPEED: { id: 'top_speed', name: 'Top Speed', minSpeed: 200, maxSpeed: 300 },
};

// Boat Hulls - Base boat types you can buy
const BOAT_HULLS = {
    pontoon: {
        id: 'pontoon', name: 'Party Pontoon', price: 2000,
        baseSpeed: 25, handling: 40, durability: 90,
        description: 'Slow but steady. Great for learning.',
        maxClass: 'STOCK',
    },
    fishing: {
        id: 'fishing', name: 'Bass Boat', price: 8000,
        baseSpeed: 45, handling: 60, durability: 70,
        description: 'Nimble fishing boat with decent speed.',
        maxClass: 'STOCK',
    },
    bowrider: {
        id: 'bowrider', name: 'Bowrider', price: 25000,
        baseSpeed: 55, handling: 70, durability: 65,
        description: 'Popular family boat, can be modified.',
        maxClass: 'MODIFIED',
    },
    deckboat: {
        id: 'deckboat', name: 'Deck Boat', price: 35000,
        baseSpeed: 50, handling: 65, durability: 75,
        description: 'Spacious with room for upgrades.',
        maxClass: 'MODIFIED',
    },
    cigarette: {
        id: 'cigarette', name: 'Cigarette Boat', price: 150000,
        baseSpeed: 85, handling: 55, durability: 50,
        description: 'Classic offshore racer. Built for speed.',
        maxClass: 'PRO',
    },
    catamaran: {
        id: 'catamaran', name: 'Racing Catamaran', price: 300000,
        baseSpeed: 100, handling: 70, durability: 45,
        description: 'Twin-hull speed machine.',
        maxClass: 'UNLIMITED',
    },
    hydroplane: {
        id: 'hydroplane', name: 'Hydroplane', price: 500000,
        baseSpeed: 120, handling: 40, durability: 30,
        description: 'Skims the water at incredible speeds.',
        maxClass: 'TOP_SPEED',
    },
    custom: {
        id: 'custom', name: 'Custom Build', price: 1000000,
        baseSpeed: 80, handling: 80, durability: 60,
        description: 'Start from scratch. Unlimited potential.',
        maxClass: 'TOP_SPEED',
    },
};

// Engine Upgrades
const ENGINES = {
    stock: { id: 'stock', name: 'Stock Engine', price: 0, speedBonus: 0, reliability: 95 },
    tuned: { id: 'tuned', name: 'Tuned Engine', price: 5000, speedBonus: 15, reliability: 90 },
    performance: { id: 'performance', name: 'Performance', price: 15000, speedBonus: 30, reliability: 85 },
    racing: { id: 'racing', name: 'Racing Engine', price: 40000, speedBonus: 50, reliability: 75 },
    supercharged: { id: 'supercharged', name: 'Supercharged', price: 80000, speedBonus: 70, reliability: 65 },
    turbocharged: { id: 'turbocharged', name: 'Twin Turbo', price: 120000, speedBonus: 90, reliability: 55 },
    nitro: { id: 'nitro', name: 'Nitro Injected', price: 200000, speedBonus: 120, reliability: 40 },
};

// Propeller Upgrades
const PROPELLERS = {
    stock: { id: 'stock', name: 'Stock Prop', price: 0, speedBonus: 0, handling: 0 },
    stainless: { id: 'stainless', name: 'Stainless Steel', price: 2000, speedBonus: 5, handling: 5 },
    cleaver: { id: 'cleaver', name: 'Cleaver Prop', price: 8000, speedBonus: 12, handling: -5 },
    racing: { id: 'racing', name: 'Racing Prop', price: 15000, speedBonus: 20, handling: 0 },
    surface: { id: 'surface', name: 'Surface Drive', price: 35000, speedBonus: 35, handling: 10 },
};

// Hull Modifications
const HULL_MODS = {
    none: { id: 'none', name: 'Stock Hull', price: 0, speedBonus: 0, handling: 0 },
    gel_coat: { id: 'gel_coat', name: 'Gel Coat Polish', price: 3000, speedBonus: 3, handling: 0 },
    fiberglass: { id: 'fiberglass', name: 'Fiberglass Reinforced', price: 10000, speedBonus: 5, handling: 5 },
    carbon_fiber: { id: 'carbon_fiber', name: 'Carbon Fiber', price: 50000, speedBonus: 15, handling: 10 },
    kevlar: { id: 'kevlar', name: 'Kevlar Composite', price: 100000, speedBonus: 25, handling: 15 },
};

// Weight Reduction
const WEIGHT_MODS = {
    none: { id: 'none', name: 'Stock Weight', price: 0, speedBonus: 0 },
    light: { id: 'light', name: 'Lightweight Interior', price: 5000, speedBonus: 8 },
    stripped: { id: 'stripped', name: 'Stripped Down', price: 12000, speedBonus: 18 },
    racing: { id: 'racing', name: 'Racing Stripped', price: 30000, speedBonus: 30 },
    skeleton: { id: 'skeleton', name: 'Skeleton Build', price: 75000, speedBonus: 45 },
};

// Paint Jobs / Wraps
const PAINT_JOBS = {
    stock: { id: 'stock', name: 'Factory Paint', price: 0, style: 'basic' },
    metallic: { id: 'metallic', name: 'Metallic', price: 3000, style: 'shiny' },
    pearl: { id: 'pearl', name: 'Pearl White', price: 5000, style: 'elegant' },
    flames: { id: 'flames', name: 'Racing Flames', price: 8000, style: 'aggressive' },
    lightning: { id: 'lightning', name: 'Lightning Bolt', price: 8000, style: 'electric' },
    camo: { id: 'camo', name: 'Lake Camo', price: 6000, style: 'stealth' },
    custom_wrap: { id: 'custom_wrap', name: 'Custom Wrap', price: 15000, style: 'unique' },
    chrome: { id: 'chrome', name: 'Chrome Finish', price: 25000, style: 'flashy' },
    gold: { id: 'gold', name: 'Gold Plated', price: 100000, style: 'luxury' },
};

// Racing Calendar - Events throughout the year
const RACE_CALENDAR = [
    { week: 8, name: 'Spring Splash', type: 'circuit', purse: 5000, prestige: 10 },
    { week: 12, name: 'Gravois Arm GP', type: 'circuit', purse: 10000, prestige: 20 },
    { week: 16, name: 'Party Cove Classic', type: 'circuit', purse: 15000, prestige: 30 },
    { week: 20, name: 'Niangua Shootout Preview', type: 'circuit', purse: 25000, prestige: 50 },
    { week: 24, name: 'THE SHOOTOUT - Day 1', type: 'shootout', purse: 50000, prestige: 100 },
    { week: 25, name: 'THE SHOOTOUT - Day 2', type: 'shootout', purse: 75000, prestige: 150 },
    { week: 26, name: 'THE SHOOTOUT - Day 3', type: 'shootout', purse: 100000, prestige: 200 },
    { week: 27, name: 'THE SHOOTOUT - FINALS', type: 'shootout_finals', purse: 250000, prestige: 500 },
];

// Create a new boat
function createBoat(hullId, name) {
    const hull = BOAT_HULLS[hullId];
    return {
        id: Date.now(),
        name: name || `${hull.name} #${Math.floor(Math.random() * 999)}`,
        hull: hullId,
        engine: 'stock',
        propeller: 'stock',
        hullMod: 'none',
        weightMod: 'none',
        paint: 'stock',
        stats: calculateBoatStats(hullId, 'stock', 'stock', 'none', 'none'),
        races: 0,
        wins: 0,
        bestSpeed: 0,
        totalEarnings: 0,
    };
}

// Calculate boat's total stats based on parts
function calculateBoatStats(hullId, engineId, propId, hullModId, weightModId) {
    const hull = BOAT_HULLS[hullId];
    const engine = ENGINES[engineId];
    const prop = PROPELLERS[propId];
    const hullMod = HULL_MODS[hullModId];
    const weightMod = WEIGHT_MODS[weightModId];

    const speed = hull.baseSpeed + engine.speedBonus + prop.speedBonus + hullMod.speedBonus + weightMod.speedBonus;
    const handling = hull.handling + prop.handling + hullMod.handling;
    const reliability = Math.max(10, engine.reliability - (100 - hull.durability) / 5);

    return {
        speed: Math.round(speed),
        topSpeed: Math.round(speed * 1.15), // Top speed with perfect run
        handling: Math.max(10, Math.min(100, handling)),
        reliability: Math.round(reliability),
        class: determineBoatClass(speed),
    };
}

// Determine which racing class a boat qualifies for
function determineBoatClass(speed) {
    if (speed >= 200) return 'TOP_SPEED';
    if (speed >= 180) return 'UNLIMITED';
    if (speed >= 140) return 'PRO';
    if (speed >= 100) return 'SUPERSTOCK';
    if (speed >= 70) return 'MODIFIED';
    return 'STOCK';
}

// Calculate race result
function simulateRace(boat, raceType, weather = 'clear') {
    const stats = boat.stats;
    let baseSpeed = stats.speed;

    // Weather effects
    const weatherMods = {
        clear: 1.0,
        cloudy: 0.98,
        windy: 0.92,
        choppy: 0.85,
        stormy: 0.75,
    };
    baseSpeed *= weatherMods[weather] || 1.0;

    // Handling affects consistency
    const handlingFactor = stats.handling / 100;
    const variance = (1 - handlingFactor) * 15; // More handling = less variance

    // Reliability check - can break down!
    const breakdownRoll = Math.random() * 100;
    if (breakdownRoll > stats.reliability) {
        return {
            success: false,
            speed: 0,
            breakdown: true,
            message: 'Mechanical failure! DNF',
        };
    }

    // Calculate final speed with some randomness
    const randomFactor = 1 + (Math.random() - 0.5) * (variance / 100);
    const finalSpeed = Math.round(baseSpeed * randomFactor);

    // Determine placement based on speed and class
    const classInfo = BOAT_CLASSES[stats.class];
    const competitorSpeeds = [];
    const numCompetitors = raceType === 'shootout_finals' ? 15 : raceType === 'shootout' ? 10 : 6;

    for (let i = 0; i < numCompetitors; i++) {
        const compSpeed = classInfo.minSpeed + Math.random() * (classInfo.maxSpeed - classInfo.minSpeed);
        competitorSpeeds.push(compSpeed);
    }
    competitorSpeeds.sort((a, b) => b - a);

    let placement = 1;
    for (const compSpeed of competitorSpeeds) {
        if (compSpeed > finalSpeed) placement++;
    }

    return {
        success: true,
        speed: finalSpeed,
        placement: placement,
        totalRacers: numCompetitors + 1,
        breakdown: false,
    };
}

// Get value of a boat (for selling)
function getBoatValue(boat) {
    const hull = BOAT_HULLS[boat.hull];
    const engine = ENGINES[boat.engine];
    const prop = PROPELLERS[boat.propeller];
    const hullMod = HULL_MODS[boat.hullMod];
    const weightMod = WEIGHT_MODS[boat.weightMod];
    const paint = PAINT_JOBS[boat.paint];

    const totalValue = hull.price + engine.price + prop.price + hullMod.price + weightMod.price + paint.price;
    // Depreciation based on races
    const depreciation = Math.max(0.5, 1 - (boat.races * 0.02));
    // Wins add value
    const winBonus = boat.wins * 500;

    return Math.round(totalValue * depreciation * 0.7 + winBonus);
}

// Starter boat for Year 1
function createStarterBoat() {
    return {
        id: 1,
        name: 'Old Faithful',
        hull: 'fishing',
        engine: 'stock',
        propeller: 'stock',
        hullMod: 'none',
        weightMod: 'none',
        paint: 'stock',
        stats: calculateBoatStats('fishing', 'stock', 'stock', 'none', 'none'),
        races: 0,
        wins: 0,
        bestSpeed: 0,
        totalEarnings: 0,
        isStarter: true,
    };
}

// ==================== BUILDING DEFINITIONS ====================
const BUILDINGS = {
    // Marina Category
    boat_dock: {
        id: 'boat_dock',
        name: 'Boat Dock',
        icon: '[D]',
        category: 'marina',
        description: 'Basic dock for boat storage. Every lakefront empire starts here!',
        cost: { money: 500 },
        produces: { money: 10 },
        provides: { boats: 4 },
        upkeep: { money: 5 },
        requiresTerrain: ['dock_zone', 'shallow', 'cove'],
        size: 1,
    },
    marina: {
        id: 'marina',
        name: 'Full Service Marina',
        icon: '[M]',
        category: 'marina',
        description: 'Gas, repairs, and slip rentals. The backbone of lake business.',
        cost: { money: 2500 },
        produces: { money: 50, boats: 2 },
        provides: { boats: 12 },
        upkeep: { money: 20 },
        requiresTerrain: ['dock_zone', 'shallow', 'cove'],
        requiresWorkers: 3,
        size: 1,
    },
    boat_rental: {
        id: 'boat_rental',
        name: 'Boat Rental',
        icon: '[R]',
        category: 'marina',
        description: 'Rent pontoons and ski boats to tourists. Summer gold mine!',
        cost: { money: 3000 },
        produces: { money: 80, tourism: 5 },
        provides: { boats: 8 },
        upkeep: { money: 25 },
        requiresTerrain: ['dock_zone', 'shallow'],
        requiresWorkers: 2,
        size: 1,
    },
    yacht_club: {
        id: 'yacht_club',
        name: 'Yacht Club',
        icon: '[Y]',
        category: 'marina',
        description: 'Exclusive club for the lake elite. Major reputation boost.',
        cost: { money: 15000 },
        produces: { money: 200, reputation: 3 },
        provides: { boats: 20 },
        upkeep: { money: 80 },
        requiresTerrain: ['dock_zone', 'cove'],
        requiresWorkers: 5,
        size: 1,
    },
    boat_dealer: {
        id: 'boat_dealer',
        name: 'Boat Dealership',
        icon: '[BD]',
        category: 'marina',
        description: 'Sell new boats to lake lovers. Big profits, big reputation.',
        cost: { money: 8000 },
        produces: { money: 150, boats: 5 },
        upkeep: { money: 40 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 4,
        size: 1,
    },

    // Lodging Category
    lake_cabin: {
        id: 'lake_cabin',
        name: 'Lake Cabin',
        icon: '[C]',
        category: 'lodging',
        description: 'Cozy cabin rental. Attracts families and fishermen.',
        cost: { money: 800 },
        produces: { money: 15, tourism: 2 },
        provides: { population: 4 },
        upkeep: { money: 5 },
        requiresTerrain: ['land', 'forest'],
        size: 1,
    },
    condo: {
        id: 'condo',
        name: 'Lakefront Condo',
        icon: '[CO]',
        category: 'lodging',
        description: 'Modern condos with lake views. Popular with weekenders.',
        cost: { money: 5000 },
        produces: { money: 60, tourism: 8 },
        provides: { population: 12 },
        upkeep: { money: 25 },
        requiresAdjacent: ['water', 'cove', 'shallow', 'dock_zone'],
        requiresTerrain: ['land'],
        size: 1,
    },
    resort: {
        id: 'resort',
        name: 'Lake Resort',
        icon: '[RS]',
        category: 'lodging',
        description: 'Full-service resort with pools and amenities. Tourist magnet!',
        cost: { money: 20000 },
        produces: { money: 250, tourism: 25, reputation: 2 },
        provides: { population: 20 },
        upkeep: { money: 100 },
        requiresAdjacent: ['water', 'cove', 'shallow', 'dock_zone'],
        requiresTerrain: ['land'],
        requiresWorkers: 10,
        size: 1,
    },
    houseboat: {
        id: 'houseboat',
        name: 'Houseboat',
        icon: '[HB]',
        category: 'lodging',
        description: 'Live on the water! The ultimate lake lifestyle.',
        cost: { money: 3500 },
        produces: { money: 40, tourism: 5 },
        provides: { population: 6, boats: 1 },
        upkeep: { money: 15 },
        requiresTerrain: ['cove', 'dock_zone'],
        size: 1,
    },

    // Entertainment Category
    tiki_bar: {
        id: 'tiki_bar',
        name: 'Tiki Bar',
        icon: '[TB]',
        category: 'entertainment',
        description: 'Swim-up bar vibes! Party central on the water.',
        cost: { money: 2000 },
        produces: { money: 45, tourism: 8 },
        provides: { reputation: 5 },
        upkeep: { money: 15 },
        requiresTerrain: ['dock_zone', 'shallow', 'cove'],
        requiresWorkers: 3,
        size: 1,
    },
    party_cove: {
        id: 'party_cove',
        name: 'Party Cove',
        icon: '[PC]',
        category: 'entertainment',
        description: 'THE legendary party spot. Massive tourism but watch your reputation!',
        cost: { money: 5000 },
        produces: { money: 150, tourism: 50 },
        provides: { reputation: -5 },
        upkeep: { money: 30 },
        requiresTerrain: ['cove'],
        size: 1,
    },
    mini_golf: {
        id: 'mini_golf',
        name: 'Mini Golf',
        icon: '[MG]',
        category: 'entertainment',
        description: 'Family fun off the water. Good for rainy days.',
        cost: { money: 1500 },
        produces: { money: 25, tourism: 5 },
        provides: { reputation: 3 },
        upkeep: { money: 8 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 2,
        size: 1,
    },
    waterpark: {
        id: 'waterpark',
        name: 'Waterpark',
        icon: '[WP]',
        category: 'entertainment',
        description: 'Big Surf style! Major attraction for families.',
        cost: { money: 25000 },
        produces: { money: 300, tourism: 40, reputation: 5 },
        upkeep: { money: 120 },
        requiresTerrain: ['land'],
        requiresWorkers: 15,
        size: 1,
    },
    live_music: {
        id: 'live_music',
        name: 'Live Music Venue',
        icon: '[LM]',
        category: 'entertainment',
        description: 'Country and rock on the lake. Draws crowds every weekend.',
        cost: { money: 6000 },
        produces: { money: 80, tourism: 15 },
        provides: { reputation: 8 },
        upkeep: { money: 30 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 4,
        size: 1,
    },
    casino_boat: {
        id: 'casino_boat',
        name: 'Casino Boat',
        icon: '[CB]',
        category: 'entertainment',
        description: 'Floating casino! High risk, high reward.',
        cost: { money: 30000 },
        produces: { money: 400, tourism: 30 },
        provides: { reputation: -3 },
        upkeep: { money: 150 },
        requiresTerrain: ['deep_water', 'water'],
        requiresWorkers: 12,
        size: 1,
    },

    // Dining Category
    fish_shack: {
        id: 'fish_shack',
        name: 'Fish Shack',
        icon: '[FS]',
        category: 'dining',
        description: 'Fresh catfish and crappie. Lake tradition!',
        cost: { money: 600 },
        produces: { money: 20, tourism: 3 },
        upkeep: { money: 5 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 2,
        size: 1,
    },
    bbq_joint: {
        id: 'bbq_joint',
        name: 'BBQ Joint',
        icon: '[BBQ]',
        category: 'dining',
        description: 'Missouri BBQ at its finest. Smells bring em in!',
        cost: { money: 1200 },
        produces: { money: 35, tourism: 5 },
        provides: { reputation: 2 },
        upkeep: { money: 10 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 3,
        size: 1,
    },
    lakeside_grill: {
        id: 'lakeside_grill',
        name: 'Lakeside Grill',
        icon: '[LG]',
        category: 'dining',
        description: 'Upscale dining with sunset views. Date night destination.',
        cost: { money: 4000 },
        produces: { money: 70, tourism: 10 },
        provides: { reputation: 5 },
        upkeep: { money: 25 },
        requiresAdjacent: ['water', 'cove', 'dock_zone'],
        requiresTerrain: ['land'],
        requiresWorkers: 5,
        size: 1,
    },
    gas_station: {
        id: 'gas_station',
        name: 'Gas & Snacks',
        icon: '[GS]',
        category: 'dining',
        description: 'Fuel and quick bites. Every road trip needs one.',
        cost: { money: 1000 },
        produces: { money: 30 },
        upkeep: { money: 8 },
        requiresTerrain: ['land', 'strip', 'parking'],
        requiresWorkers: 2,
        size: 1,
    },

    // Infrastructure Category
    road: {
        id: 'road',
        name: 'Road',
        icon: '[RD]',
        category: 'infrastructure',
        description: 'Connect your properties. Essential for growth.',
        cost: { money: 50 },
        isRoad: true,
        requiresTerrain: ['land', 'strip', 'forest'],
        size: 1,
    },
    parking_lot: {
        id: 'parking_lot',
        name: 'Parking Lot',
        icon: '[PK]',
        category: 'infrastructure',
        description: 'Where the boats come from! Visitors need parking.',
        cost: { money: 200 },
        produces: { money: 5, tourism: 2 },
        requiresTerrain: ['land', 'strip'],
        size: 1,
    },
    boat_ramp: {
        id: 'boat_ramp',
        name: 'Boat Ramp',
        icon: '[BR]',
        category: 'infrastructure',
        description: 'Public launch = more boats on the water.',
        cost: { money: 800 },
        produces: { boats: 3, tourism: 5 },
        requiresTerrain: ['shallow', 'dock_zone'],
        size: 1,
    },
    bridge: {
        id: 'bridge',
        name: 'Bridge',
        icon: '[BG]',
        category: 'infrastructure',
        description: 'Cross the coves! Opens up new development areas.',
        cost: { money: 5000 },
        isRoad: true,
        requiresTerrain: ['water', 'shallow', 'cove'],
        size: 1,
    },

    // Racing Category - THE SHOOTOUT!
    race_dock: {
        id: 'race_dock',
        name: 'Race Dock',
        icon: '[RC]',
        category: 'racing',
        description: 'Launch point for speed boats. Essential for the Shootout!',
        cost: { money: 2000 },
        produces: { money: 20, speedBoats: 1 },
        provides: { racingRep: 5 },
        upkeep: { money: 15 },
        requiresTerrain: ['race_staging', 'dock_zone'],
        requiresWorkers: 2,
        size: 1,
    },
    timing_tower: {
        id: 'timing_tower',
        name: 'Timing Tower',
        icon: '[TT]',
        category: 'racing',
        description: 'Official race timing and control. Major Shootout infrastructure!',
        cost: { money: 8000 },
        produces: { money: 50, racingRep: 2 },
        provides: { racingRep: 15 },
        upkeep: { money: 40 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['race_lane', 'race_staging', 'deep_water'],
        requiresWorkers: 4,
        size: 1,
    },
    spectator_stands: {
        id: 'spectator_stands',
        name: 'Spectator Stands',
        icon: '[SS]',
        category: 'racing',
        description: 'Bleachers for race fans. Packed during the Shootout!',
        cost: { money: 3000 },
        produces: { money: 30, tourism: 10 },
        provides: { racingRep: 8 },
        upkeep: { money: 15 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['water', 'deep_water', 'race_lane', 'dock_zone'],
        size: 1,
    },
    speed_boat_shop: {
        id: 'speed_boat_shop',
        name: 'Speed Boat Shop',
        icon: '[SB]',
        category: 'racing',
        description: 'Performance parts and racing boat sales. Feed the need for speed!',
        cost: { money: 6000 },
        produces: { money: 100, speedBoats: 2 },
        provides: { racingRep: 10 },
        upkeep: { money: 35 },
        requiresTerrain: ['land', 'strip'],
        requiresWorkers: 3,
        size: 1,
    },
    race_fuel_station: {
        id: 'race_fuel_station',
        name: 'Race Fuel Station',
        icon: '[GS]',
        category: 'racing',
        description: 'High-octane fuel for racing boats. Required for serious racers.',
        cost: { money: 4000 },
        produces: { money: 60, speedBoats: 1 },
        provides: { racingRep: 5 },
        upkeep: { money: 25 },
        requiresTerrain: ['dock_zone', 'race_staging'],
        requiresWorkers: 2,
        size: 1,
    },
    vip_race_lounge: {
        id: 'vip_race_lounge',
        name: 'VIP Race Lounge',
        icon: '[VIP]',
        category: 'racing',
        description: 'Exclusive viewing for high rollers. Premium Shootout experience!',
        cost: { money: 15000 },
        produces: { money: 200, tourism: 20, racingRep: 3 },
        provides: { racingRep: 20, reputation: 10 },
        upkeep: { money: 80 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['race_lane', 'deep_water'],
        requiresWorkers: 6,
        size: 1,
    },
    helicopter_pad: {
        id: 'helicopter_pad',
        name: 'Helicopter Pad',
        icon: '🚁',
        category: 'racing',
        description: 'Aerial views and VIP transport. The ultimate race day experience!',
        cost: { money: 20000 },
        produces: { money: 150, tourism: 15, racingRep: 2 },
        provides: { racingRep: 15, reputation: 8 },
        upkeep: { money: 60 },
        requiresTerrain: ['land'],
        requiresWorkers: 3,
        size: 1,
    },
    race_team_hq: {
        id: 'race_team_hq',
        name: 'Race Team HQ',
        icon: '[W]',
        category: 'racing',
        description: 'Home base for a professional racing team. Boost your Shootout cred!',
        cost: { money: 25000 },
        produces: { money: 100, speedBoats: 5, racingRep: 5 },
        provides: { racingRep: 30, reputation: 15 },
        upkeep: { money: 100 },
        requiresTerrain: ['land'],
        requiresAdjacent: ['dock_zone', 'race_staging'],
        requiresWorkers: 8,
        size: 1,
    },
};

// ==================== GAME STATE ====================
let gameState = {
    playerName: 'Lake Boss',
    resources: {
        population: 0,
        money: 5000,
        boats: 0,
        speedBoats: 0,
        tourism: 0,
        power: 100,
        reputation: 50,
        racingRep: 0,
    },
    grid: [],
    buildings: [],
    mileMarkers: [],
    coves: [],
    selectedBuilding: null,
    demolishMode: false,
    gameSpeed: 1,
    paused: false,
    tick: 0,
    season: 0,
    year: 1,
    week: 24, // Start at Shootout week!
    events: [],
    camera: { x: 0, y: 0, zoom: 1 },
    workers: { total: 0, employed: 0 },
    lakeLevel: 660,
    weekendBonus: false,

    // ===== BOAT GARAGE & RACING =====
    garage: {
        boats: [], // Owned boats
        activeBoat: null, // Currently selected boat for racing
        maxSlots: 3, // Can expand with buildings
    },
    racing: {
        currentRace: null,
        upcomingRaces: [],
        completedRaces: [],
        seasonWins: 0,
        seasonEarnings: 0,
        careerWins: 0,
        careerEarnings: 0,
        bestSpeed: 0,
        shootoutWins: 0, // Career Shootout victories
    },
    shootout: {
        active: false,
        day: 0,
        qualified: false,
        results: [],
        currentYearBest: 0,
    },
    raceHistory: [], // All race results ever
    showingBoatShop: false,
    showingGarage: false,
    showingRaceEvent: false,

    // ===== STORYLINE & JOBS =====
    story: {
        chapter: 1,  // Current story chapter
        currentGoal: 'find_work', // Current objective
        completedGoals: [],
        milestones: [],
        intro: {
            watched: false,
            boatInherited: true, // Inherited grandpa's boat
        },
    },
    jobs: {
        currentJob: null,      // { name, type, wage, shift, hoursWorked }
        experience: {
            paint: 0,          // Hours worked at paint shop
            prop: 0,           // Hours worked at prop shop
        },
        discounts: {
            paint: 0,          // Percentage discount on paint jobs (max 40%)
            performance: 0,    // Percentage discount on performance parts (max 35%)
        },
        totalEarnings: 0,      // Career job earnings
        shiftsCompleted: 0,    // Total work shifts completed
    },
    // Track when player unlocks things
    unlocks: {
        canRace: true,         // Can enter local races
        canShootout: false,    // Can enter Shootout (need reputation)
        canBuild: true,        // Can build on land
        hasBusiness: false,    // Owns a business
    },
};

// Famous Lake of the Ozarks cove names
const COVE_NAMES = [
    'Party Cove', 'Millionaire\'s Cove', 'Gravois Arm', 'Glaize Arm',
    'Niangua Arm', 'Grand Glaize', 'Linn Creek Cove', 'Hurricane Deck',
    'Horseshoe Bend', 'Tan-Tar-A Cove', 'Ha Ha Tonka', 'Bagnel Dam Area'
];

// ==================== CANVAS & RENDERING ====================
let canvas, ctx;
let isDragging = false;
let lastMouse = { x: 0, y: 0 };
let hoverTile = null;

function initCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = document.getElementById('game-area');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const mapWidth = CONFIG.GRID_WIDTH * CONFIG.TILE_SIZE;
    const mapHeight = CONFIG.GRID_HEIGHT * CONFIG.TILE_SIZE;
    gameState.camera.x = (canvas.width - mapWidth * gameState.camera.zoom) / 2;
    gameState.camera.y = (canvas.height - mapHeight * gameState.camera.zoom) / 2;

    render();
}

function render() {
    // Sky/water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#1e5f8a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(gameState.camera.x, gameState.camera.y);
    ctx.scale(gameState.camera.zoom, gameState.camera.zoom);

    // Draw terrain
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const tile = gameState.grid[y][x];
            drawTile(x, y, tile);
        }
    }

    // Draw mile markers
    drawMileMarkers();

    // Draw buildings
    gameState.buildings.forEach(building => {
        drawBuilding(building);
    });

    // Draw hover highlight
    if (hoverTile && gameState.selectedBuilding) {
        const canPlace = canPlaceBuilding(gameState.selectedBuilding, hoverTile.x, hoverTile.y);
        ctx.fillStyle = canPlace ? 'rgba(0, 210, 106, 0.4)' : 'rgba(200, 50, 50, 0.4)';
        ctx.fillRect(
            hoverTile.x * CONFIG.TILE_SIZE,
            hoverTile.y * CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE
        );
    } else if (hoverTile && gameState.demolishMode) {
        ctx.fillStyle = 'rgba(200, 50, 50, 0.4)';
        ctx.fillRect(
            hoverTile.x * CONFIG.TILE_SIZE,
            hoverTile.y * CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE,
            CONFIG.TILE_SIZE
        );
    }

    // Draw location labels (towns, parks, landmarks)
    drawLocationLabels();

    ctx.restore();

    // Draw minimap
    drawMinimap();

    // Update mile marker display
    updateMileMarkerDisplay();
}

function drawTile(x, y, tile) {
    const terrain = TERRAIN[tile.terrain.toUpperCase()];
    const px = x * CONFIG.TILE_SIZE;
    const py = y * CONFIG.TILE_SIZE;
    const size = CONFIG.TILE_SIZE;

    // Create gradient for more natural look
    if (terrain.isWater) {
        const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
        gradient.addColorStop(0, terrain.color);
        gradient.addColorStop(0.5, lightenColor(terrain.color, 10));
        gradient.addColorStop(1, terrain.color);
        ctx.fillStyle = gradient;
    } else if (tile.terrain === 'land') {
        // Grass texture with variation
        ctx.fillStyle = terrain.color;
        ctx.fillRect(px, py, size, size);
        drawGrassDetail(px, py, x, y);
        return;
    } else {
        ctx.fillStyle = terrain.color;
    }
    ctx.fillRect(px, py, size, size);

    // Add terrain details
    if (tile.terrain === 'forest') {
        drawTreeDetail(px, py, x, y);
    } else if (terrain.isWater) {
        drawWaterDetail(px, py, tile.terrain, x, y);
    } else if (tile.terrain === 'dam') {
        drawDamDetail(px, py);
    } else if (tile.terrain === 'strip') {
        drawStripDetail(px, py);
    } else if (tile.terrain === 'parking') {
        drawParkingDetail(px, py);
    } else if (tile.terrain === 'town' || tile.terrain === 'town_center') {
        drawTownDetail(px, py, x, y, tile.terrain === 'town_center');
    } else if (tile.terrain === 'state_park') {
        drawStateParkDetail(px, py, x, y);
    } else if (tile.terrain === 'park_beach') {
        drawParkBeachDetail(px, py, x, y);
    } else if (tile.terrain === 'park_trail') {
        drawTrailDetail(px, py, x, y);
    } else if (tile.terrain === 'paint_shop') {
        drawPaintShopDetail(px, py, x, y);
    } else if (tile.terrain === 'prop_shop') {
        drawPropShopDetail(px, py, x, y);
    }
}

// Helper to lighten colors
function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function drawGrassDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    // Pseudo-random based on position for consistent look
    const seed = (tileX * 7 + tileY * 13) % 100;

    // Add grass texture variations
    ctx.fillStyle = 'rgba(90, 120, 70, 0.3)';
    for (let i = 0; i < 5; i++) {
        const gx = px + ((seed + i * 17) % size);
        const gy = py + ((seed + i * 23) % size);
        ctx.beginPath();
        ctx.moveTo(gx, gy + 6);
        ctx.lineTo(gx - 1, gy);
        ctx.lineTo(gx + 1, gy);
        ctx.closePath();
        ctx.fill();
    }

    // Add some darker patches
    ctx.fillStyle = 'rgba(50, 80, 40, 0.15)';
    ctx.beginPath();
    ctx.arc(px + (seed % 25) + 8, py + ((seed * 3) % 25) + 8, 6, 0, Math.PI * 2);
    ctx.fill();
}

function drawTreeDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 11 + tileY * 7) % 100;

    // Draw 2-4 trees per tile with variety
    const treeCount = 2 + (seed % 3);
    const treePositions = [
        [10 + (seed % 8), 12 + (seed % 6)],
        [28 - (seed % 6), 10 + (seed % 8)],
        [18 + (seed % 4), 26 - (seed % 5)],
        [8, 28]
    ];

    for (let i = 0; i < treeCount; i++) {
        const [ox, oy] = treePositions[i];
        const treeType = (seed + i) % 3; // Different tree types

        // Tree shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(px + ox + 3, py + oy + 8, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tree trunk
        ctx.fillStyle = '#5D4E37';
        ctx.fillRect(px + ox - 2, py + oy, 4, 8);

        if (treeType === 0) {
            // Oak tree - round canopy
            ctx.fillStyle = '#2d4a27';
            ctx.beginPath();
            ctx.arc(px + ox, py + oy - 4, 8, 0, Math.PI * 2);
            ctx.fill();
            // Highlight
            ctx.fillStyle = '#4a6b40';
            ctx.beginPath();
            ctx.arc(px + ox - 2, py + oy - 6, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (treeType === 1) {
            // Pine/Cedar tree - triangular
            ctx.fillStyle = '#1a4030';
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - 14);
            ctx.lineTo(px + ox + 8, py + oy + 2);
            ctx.lineTo(px + ox - 8, py + oy + 2);
            ctx.closePath();
            ctx.fill();
            // Second layer
            ctx.fillStyle = '#254a38';
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - 10);
            ctx.lineTo(px + ox + 6, py + oy - 2);
            ctx.lineTo(px + ox - 6, py + oy - 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // Hickory - oval canopy
            ctx.fillStyle = '#3a5a35';
            ctx.beginPath();
            ctx.ellipse(px + ox, py + oy - 5, 7, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a6a45';
            ctx.beginPath();
            ctx.ellipse(px + ox - 1, py + oy - 7, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawWaterDetail(px, py, terrainType, tileX, tileY) {
    const time = Date.now() / 1500;
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 13 + tileY * 17) % 100;

    if (terrainType === 'race_lane') {
        // Race lane buoy markers
        ctx.fillStyle = 'rgba(200, 80, 50, 0.4)';
        ctx.fillRect(px + 2, py + 2, size - 4, 3);
        ctx.fillRect(px + 2, py + size - 5, size - 4, 3);

        // Animated wake during Shootout
        if (gameState.shootout.active) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            const offset = (Date.now() / 30) % size;
            ctx.beginPath();
            ctx.moveTo(px + offset, py + 12);
            ctx.lineTo(px + offset + 15, py + 18);
            ctx.lineTo(px + offset, py + 24);
            ctx.closePath();
            ctx.fill();
        }
        return;
    } else if (terrainType === 'race_staging') {
        // Checkered buoy pattern
        ctx.fillStyle = 'rgba(200, 80, 50, 0.25)';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if ((i + j) % 2 === 0) {
                    ctx.fillRect(px + i * 10, py + j * 10, 10, 10);
                }
            }
        }
        return;
    }

    // Animated water ripples
    const waveOffset1 = Math.sin(time + tileX * 0.5 + tileY * 0.3) * 2;
    const waveOffset2 = Math.cos(time * 0.7 + tileX * 0.3 + tileY * 0.5) * 2;

    // Light reflection ripples
    ctx.fillStyle = terrainType === 'deep_water'
        ? 'rgba(100, 140, 130, 0.2)'
        : 'rgba(150, 200, 180, 0.25)';

    // Draw curved ripple lines
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 10 + waveOffset1);
    ctx.quadraticCurveTo(px + 20, py + 8 + waveOffset1, px + 35, py + 12 + waveOffset1);
    ctx.lineTo(px + 35, py + 14 + waveOffset1);
    ctx.quadraticCurveTo(px + 20, py + 10 + waveOffset1, px + 5, py + 12 + waveOffset1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(px + 8, py + 25 + waveOffset2);
    ctx.quadraticCurveTo(px + 22, py + 23 + waveOffset2, px + 32, py + 27 + waveOffset2);
    ctx.lineTo(px + 32, py + 29 + waveOffset2);
    ctx.quadraticCurveTo(px + 22, py + 25 + waveOffset2, px + 8, py + 27 + waveOffset2);
    ctx.closePath();
    ctx.fill();

    // Occasional sparkle effect on shallow water
    if (terrainType === 'shallow' || terrainType === 'cove') {
        const sparkle = (Date.now() / 200 + seed) % 20;
        if (sparkle < 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(px + (seed % 30) + 5, py + ((seed * 2) % 30) + 5, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawDamDetail(px, py) {
    const size = CONFIG.TILE_SIZE;

    // Concrete dam base
    const gradient = ctx.createLinearGradient(px, py, px, py + size);
    gradient.addColorStop(0, '#9a9a90');
    gradient.addColorStop(0.5, '#7a7a70');
    gradient.addColorStop(1, '#6a6a60');
    ctx.fillStyle = gradient;
    ctx.fillRect(px + 3, py + 3, size - 6, size - 6);

    // Dam texture - horizontal lines
    ctx.strokeStyle = '#5a5a50';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 5, py + 8 + i * 8);
        ctx.lineTo(px + size - 5, py + 8 + i * 8);
        ctx.stroke();
    }

    // Spillway detail
    ctx.fillStyle = '#4a6a5a';
    ctx.fillRect(px + 12, py + 12, 16, 16);

    // Water spray effect at base
    ctx.fillStyle = 'rgba(150, 200, 200, 0.4)';
    ctx.beginPath();
    ctx.ellipse(px + 20, py + size - 5, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawStripDetail(px, py) {
    const size = CONFIG.TILE_SIZE;

    // Asphalt road base
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

    // Road texture - cracks and patches
    ctx.strokeStyle = 'rgba(80, 70, 60, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 5);
    ctx.lineTo(px + 15, py + 20);
    ctx.lineTo(px + 12, py + 35);
    ctx.stroke();

    // Center line markings (dashed)
    ctx.fillStyle = '#d4a855';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(px + 17, py + 5 + i * 14, 6, 8);
    }

    // Sidewalk edge
    ctx.fillStyle = '#8a8070';
    ctx.fillRect(px + 2, py + 2, 4, size - 4);
    ctx.fillRect(px + size - 6, py + 2, 4, size - 4);
}

function drawParkingDetail(px, py) {
    const size = CONFIG.TILE_SIZE;

    // Gravel texture
    ctx.fillStyle = '#555550';
    ctx.fillRect(px, py, size, size);

    // Parking lines
    ctx.strokeStyle = '#888880';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 5);
    ctx.lineTo(px + 10, py + size - 5);
    ctx.moveTo(px + 30, py + 5);
    ctx.lineTo(px + 30, py + size - 5);
    ctx.stroke();

    // Gravel texture dots
    ctx.fillStyle = 'rgba(100, 100, 95, 0.5)';
    for (let i = 0; i < 8; i++) {
        const gx = px + (i * 5 + 3) % size;
        const gy = py + (i * 7 + 2) % size;
        ctx.beginPath();
        ctx.arc(gx, gy, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawTownDetail(px, py, tileX, tileY, isCenter) {
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 13 + tileY * 19) % 100;

    if (isCenter) {
        // Town center - more developed with buildings
        // Main building
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(px + 8, py + 8, 24, 20);

        // Roof
        ctx.fillStyle = '#5a4535';
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 8);
        ctx.lineTo(px + 20, py - 2);
        ctx.lineTo(px + 34, py + 8);
        ctx.closePath();
        ctx.fill();

        // Windows
        ctx.fillStyle = '#d4c4a0';
        ctx.fillRect(px + 12, py + 12, 5, 5);
        ctx.fillRect(px + 23, py + 12, 5, 5);

        // Door
        ctx.fillStyle = '#4a3525';
        ctx.fillRect(px + 17, py + 18, 6, 10);

        // Sign or awning
        ctx.fillStyle = '#c4553a';
        ctx.fillRect(px + 8, py + 6, 24, 3);
    } else {
        // Regular town area - mix of residential/commercial
        const buildingType = seed % 3;

        if (buildingType === 0) {
            // Small house
            ctx.fillStyle = '#a09080';
            ctx.fillRect(px + 10, py + 14, 20, 16);

            // Roof
            ctx.fillStyle = '#6a5545';
            ctx.beginPath();
            ctx.moveTo(px + 8, py + 14);
            ctx.lineTo(px + 20, py + 4);
            ctx.lineTo(px + 32, py + 14);
            ctx.closePath();
            ctx.fill();

            // Window
            ctx.fillStyle = '#b0d4e8';
            ctx.fillRect(px + 14, py + 18, 5, 5);

            // Door
            ctx.fillStyle = '#5a4535';
            ctx.fillRect(px + 22, py + 20, 5, 10);
        } else if (buildingType === 1) {
            // Shop/store
            ctx.fillStyle = '#c4b8a0';
            ctx.fillRect(px + 6, py + 10, 28, 22);

            // Storefront window
            ctx.fillStyle = '#8abcd0';
            ctx.fillRect(px + 8, py + 14, 24, 10);

            // Awning
            ctx.fillStyle = '#c44a30';
            ctx.fillRect(px + 6, py + 10, 28, 4);
        } else {
            // Parking/lot area
            ctx.fillStyle = '#606058';
            ctx.fillRect(px + 4, py + 4, size - 8, size - 8);

            // Parking lines
            ctx.strokeStyle = '#888880';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px + 12, py + 8);
            ctx.lineTo(px + 12, py + size - 8);
            ctx.moveTo(px + 28, py + 8);
            ctx.lineTo(px + 28, py + size - 8);
            ctx.stroke();
        }
    }
}

function drawStateParkDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 17 + tileY * 11) % 100;

    // Dense forest background - darker green for park areas
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(px, py, size, size);

    // Draw 3-4 dense trees
    const treeCount = 3 + (seed % 2);
    const positions = [
        [10, 12], [28, 8], [18, 26], [8, 22]
    ];

    for (let i = 0; i < treeCount; i++) {
        const [ox, oy] = positions[i];
        const treeSeed = (seed + i * 7) % 3;

        // Tree shadow
        ctx.fillStyle = 'rgba(0, 30, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(px + ox + 2, py + oy + 8, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tree trunk
        ctx.fillStyle = '#4a3a28';
        ctx.fillRect(px + ox - 2, py + oy, 4, 8);

        if (treeSeed === 0) {
            // Oak - large round canopy
            ctx.fillStyle = '#1e4420';
            ctx.beginPath();
            ctx.arc(px + ox, py + oy - 5, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2a5528';
            ctx.beginPath();
            ctx.arc(px + ox - 3, py + oy - 7, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (treeSeed === 1) {
            // Cedar/Pine - tall triangle
            ctx.fillStyle = '#143822';
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - 16);
            ctx.lineTo(px + ox + 10, py + oy + 2);
            ctx.lineTo(px + ox - 10, py + oy + 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // Dogwood - smaller flowering tree
            ctx.fillStyle = '#2a6030';
            ctx.beginPath();
            ctx.arc(px + ox, py + oy - 4, 7, 0, Math.PI * 2);
            ctx.fill();
            // Flowers/berries
            ctx.fillStyle = '#e8d0d0';
            ctx.beginPath();
            ctx.arc(px + ox - 3, py + oy - 6, 2, 0, Math.PI * 2);
            ctx.arc(px + ox + 4, py + oy - 3, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Occasional trail marker or sign
    if (seed % 10 === 0) {
        // Park sign post
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(px + 32, py + 20, 3, 12);
        ctx.fillStyle = '#3a6a40';
        ctx.fillRect(px + 28, py + 16, 11, 6);
    }
}

function drawParkBeachDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 23 + tileY * 7) % 100;

    // Sandy beach base
    ctx.fillStyle = '#d4c4a0';
    ctx.fillRect(px, py, size, size);

    // Sand texture - varying shades
    ctx.fillStyle = 'rgba(180, 160, 120, 0.4)';
    for (let i = 0; i < 6; i++) {
        const sx = px + ((seed + i * 11) % (size - 4)) + 2;
        const sy = py + ((seed + i * 17) % (size - 4)) + 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 3 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
    }

    // Wave line at water edge (bottom of tile typically)
    ctx.fillStyle = 'rgba(120, 180, 160, 0.3)';
    ctx.beginPath();
    ctx.moveTo(px, py + size - 4);
    ctx.quadraticCurveTo(px + size/2, py + size - 8, px + size, py + size - 4);
    ctx.lineTo(px + size, py + size);
    ctx.lineTo(px, py + size);
    ctx.closePath();
    ctx.fill();

    // Beach items
    if (seed % 4 === 0) {
        // Beach umbrella
        ctx.fillStyle = '#c44a40';
        ctx.beginPath();
        ctx.arc(px + 16, py + 12, 8, Math.PI, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#e8e0d0';
        ctx.beginPath();
        ctx.arc(px + 16, py + 12, 8, Math.PI, Math.PI + 0.5);
        ctx.arc(px + 16, py + 12, 8, Math.PI + 1, Math.PI + 1.5);
        ctx.fill();
        // Umbrella pole
        ctx.fillStyle = '#5a5048';
        ctx.fillRect(px + 15, py + 12, 2, 10);
    } else if (seed % 4 === 1) {
        // Driftwood
        ctx.fillStyle = '#8a7a6a';
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 20);
        ctx.quadraticCurveTo(px + 20, py + 16, px + 32, py + 22);
        ctx.lineTo(px + 32, py + 25);
        ctx.quadraticCurveTo(px + 20, py + 20, px + 8, py + 23);
        ctx.closePath();
        ctx.fill();
    }

    // Shells or pebbles
    ctx.fillStyle = 'rgba(255, 250, 240, 0.7)';
    for (let i = 0; i < 3; i++) {
        const shellX = px + ((seed * 3 + i * 13) % 28) + 4;
        const shellY = py + ((seed * 5 + i * 11) % 24) + 4;
        ctx.beginPath();
        ctx.ellipse(shellX, shellY, 2, 1.5, (seed + i) % 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawTrailDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;
    const seed = (tileX * 19 + tileY * 13) % 100;

    // Forest floor background
    ctx.fillStyle = '#5a6a48';
    ctx.fillRect(px, py, size, size);

    // Dirt trail path through middle
    const trailDir = seed % 2; // 0 = horizontal-ish, 1 = vertical-ish

    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    if (trailDir === 0) {
        // Horizontal meandering path
        ctx.moveTo(px, py + 14);
        ctx.quadraticCurveTo(px + 10, py + 12 + (seed % 6), px + 20, py + 16);
        ctx.quadraticCurveTo(px + 30, py + 18 - (seed % 4), px + size, py + 15);
        ctx.lineTo(px + size, py + 22);
        ctx.quadraticCurveTo(px + 30, py + 25 - (seed % 4), px + 20, py + 23);
        ctx.quadraticCurveTo(px + 10, py + 19 + (seed % 6), px, py + 21);
        ctx.closePath();
    } else {
        // Vertical meandering path
        ctx.moveTo(px + 14, py);
        ctx.quadraticCurveTo(px + 12 + (seed % 6), py + 10, px + 16, py + 20);
        ctx.quadraticCurveTo(px + 18 - (seed % 4), py + 30, px + 15, py + size);
        ctx.lineTo(px + 22, py + size);
        ctx.quadraticCurveTo(px + 25 - (seed % 4), py + 30, px + 23, py + 20);
        ctx.quadraticCurveTo(px + 19 + (seed % 6), py + 10, px + 21, py);
        ctx.closePath();
    }
    ctx.fill();

    // Trail texture - small rocks and roots
    ctx.fillStyle = 'rgba(100, 80, 60, 0.5)';
    for (let i = 0; i < 4; i++) {
        const rx = px + ((seed + i * 9) % 24) + 6;
        const ry = py + ((seed + i * 7) % 24) + 6;
        ctx.beginPath();
        ctx.arc(rx, ry, 1 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
    }

    // Occasional trail marker
    if (seed % 8 === 0) {
        // Trail blaze on tree
        ctx.fillStyle = '#4a3a28';
        ctx.fillRect(px + 30, py + 8, 4, 12);
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(px + 29, py + 10, 6, 4);
    }

    // Small plants along trail
    ctx.fillStyle = '#3a5a35';
    for (let i = 0; i < 2; i++) {
        const plantX = px + ((seed * 2 + i * 15) % 10) + 2;
        const plantY = py + ((seed * 3 + i * 11) % 28) + 4;
        ctx.beginPath();
        ctx.moveTo(plantX, plantY + 6);
        ctx.lineTo(plantX - 2, plantY);
        ctx.lineTo(plantX, plantY + 2);
        ctx.lineTo(plantX + 2, plantY);
        ctx.closePath();
        ctx.fill();
    }
}

function drawPaintShopDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;

    // Building base - warm tan color
    ctx.fillStyle = '#c0a080';
    ctx.fillRect(px + 2, py + 6, size - 4, size - 8);

    // Colorful paint splatter decoration on building
    const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6'];
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        const splashX = px + 6 + (i * 6);
        const splashY = py + 10 + ((i * 3) % 8);
        ctx.arc(splashX, splashY, 3 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
    }

    // Roof with colorful stripes
    ctx.fillStyle = '#8a6a50';
    ctx.beginPath();
    ctx.moveTo(px, py + 6);
    ctx.lineTo(px + size/2, py - 2);
    ctx.lineTo(px + size, py + 6);
    ctx.closePath();
    ctx.fill();

    // Rainbow stripe on roof
    const roofColors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = roofColors[i];
        ctx.fillRect(px + 4 + i * 5, py + 2, 5, 3);
    }

    // Door
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(px + 14, py + 18, 12, 14);

    // Paint bucket sign
    ctx.fillStyle = '#404040';
    ctx.fillRect(px + 28, py + 8, 8, 12);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(px + 29, py + 11, 6, 8);

    // "HIRING" banner
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(px + 4, py + size - 6, 20, 5);
    ctx.fillStyle = '#fff';
    ctx.font = '4px Arial';
    ctx.fillText('HIRING', px + 6, py + size - 2);
}

function drawPropShopDetail(px, py, tileX, tileY) {
    const size = CONFIG.TILE_SIZE;

    // Building base - industrial gray/blue
    ctx.fillStyle = '#707888';
    ctx.fillRect(px + 2, py + 6, size - 4, size - 8);

    // Metal siding texture - horizontal lines
    ctx.strokeStyle = '#606878';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 10 + i * 5);
        ctx.lineTo(px + size - 4, py + 10 + i * 5);
        ctx.stroke();
    }

    // Roof - industrial style
    ctx.fillStyle = '#505860';
    ctx.fillRect(px + 1, py + 2, size - 2, 6);

    // Large propeller logo on front
    ctx.fillStyle = '#c0c0c0';
    ctx.save();
    ctx.translate(px + size/2, py + 16);
    // Draw 3-blade propeller
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI / 3) + Date.now() / 2000);
        ctx.beginPath();
        ctx.ellipse(0, -6, 2, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    // Hub
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Roll-up garage door
    ctx.fillStyle = '#4a4a50';
    ctx.fillRect(px + 10, py + 20, 20, 12);
    // Door lines
    ctx.strokeStyle = '#3a3a40';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 11, py + 22 + i * 3);
        ctx.lineTo(px + 29, py + 22 + i * 3);
        ctx.stroke();
    }

    // "HIRING" banner
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(px + 4, py + size - 6, 20, 5);
    ctx.fillStyle = '#fff';
    ctx.font = '4px Arial';
    ctx.fillText('HIRING', px + 6, py + size - 2);
}

function drawMileMarkers() {
    gameState.mileMarkers.forEach(marker => {
        const px = marker.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const py = marker.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        // Buoy shadow in water
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(px + 2, py + 10, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Buoy body - cylindrical shape
        const gradient = ctx.createLinearGradient(px - 7, py, px + 7, py);
        gradient.addColorStop(0, '#d4a855');
        gradient.addColorStop(0.3, '#f4c862');
        gradient.addColorStop(0.7, '#f4c862');
        gradient.addColorStop(1, '#c49845');
        ctx.fillStyle = gradient;

        // Main buoy body
        ctx.beginPath();
        ctx.ellipse(px, py, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red stripe
        ctx.fillStyle = '#c44';
        ctx.fillRect(px - 8, py - 2, 16, 4);

        // Buoy top
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(px - 3, py - 10);
        ctx.lineTo(px + 3, py - 10);
        ctx.lineTo(px + 2, py - 6);
        ctx.lineTo(px - 2, py - 6);
        ctx.closePath();
        ctx.fill();

        // Mile number on white background
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(px, py + 3, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 8px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(marker.mile, px, py + 3);
    });
}

function drawLocationLabels() {
    if (!gameState.locationLabels) return;

    gameState.locationLabels.forEach(label => {
        const px = label.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const py = label.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;

        // Set style based on label type
        let bgColor, textColor, fontSize;
        switch (label.type) {
            case 'town':
                bgColor = 'rgba(196, 168, 130, 0.9)';
                textColor = '#3a2a1a';
                fontSize = 10;
                break;
            case 'park':
                bgColor = 'rgba(45, 90, 39, 0.9)';
                textColor = '#fff';
                fontSize = 9;
                break;
            case 'landmark':
                bgColor = 'rgba(212, 168, 85, 0.95)';
                textColor = '#2a2a1a';
                fontSize = 10;
                break;
            case 'race':
                bgColor = 'rgba(200, 60, 60, 0.95)';
                textColor = '#fff';
                fontSize = 11;
                break;
            case 'job':
                bgColor = 'rgba(39, 174, 96, 0.95)';
                textColor = '#fff';
                fontSize = 10;
                break;
            default:
                bgColor = 'rgba(100, 100, 100, 0.8)';
                textColor = '#fff';
                fontSize = 9;
        }

        ctx.font = `bold ${fontSize}px Cabin, sans-serif`;
        const textWidth = ctx.measureText(label.name).width;
        const padding = 4;

        // Draw background
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(
            px - textWidth / 2 - padding,
            py - fontSize / 2 - padding,
            textWidth + padding * 2,
            fontSize + padding * 2,
            3
        );
        ctx.fill();

        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.name, px, py);

        // Draw pointer for landmarks
        if (label.type === 'landmark' || label.type === 'race') {
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.moveTo(px - 5, py + fontSize / 2 + padding);
            ctx.lineTo(px, py + fontSize / 2 + padding + 6);
            ctx.lineTo(px + 5, py + fontSize / 2 + padding);
            ctx.fill();
        }
    });
}

function drawBuilding(building) {
    const def = BUILDINGS[building.type];
    const px = building.x * CONFIG.TILE_SIZE;
    const py = building.y * CONFIG.TILE_SIZE;
    const size = CONFIG.TILE_SIZE;
    const cx = px + size / 2;
    const cy = py + size / 2;

    // Building shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx + 3, py + size - 3, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw custom icon if available, otherwise use emoji fallback
    const iconDrawer = ICONS[building.type] || ICONS.default;

    ctx.save();

    // Dim if not working
    if (!building.working && def.requiresWorkers) {
        ctx.globalAlpha = 0.6;
    }

    // Draw the custom icon
    iconDrawer(ctx, cx, cy, size);

    ctx.restore();

    // Shootout glow effect for racing buildings during event
    if (def.category === 'racing' && gameState.shootout.active) {
        const glowIntensity = 0.3 + Math.sin(Date.now() / 200) * 0.2;
        ctx.strokeStyle = `rgba(200, 100, 50, ${glowIntensity})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 1, py + 1, size - 2, size - 2);
    }

    // Not working indicator - red overlay
    if (!building.working && def.requiresWorkers) {
        ctx.fillStyle = 'rgba(180, 80, 80, 0.3)';
        ctx.fillRect(px + 2, py + 2, size - 4, size - 4);

        // "Needs workers" icon
        ctx.fillStyle = '#c44';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', cx, cy - size * 0.3);
    }
}

function drawMinimap() {
    const minimapSize = 130;
    const margin = 10;
    const mx = canvas.width - minimapSize - margin;
    const my = margin;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(mx - 2, my - 2, minimapSize + 4, minimapSize + 4);

    const scaleX = minimapSize / CONFIG.GRID_WIDTH;
    const scaleY = minimapSize / CONFIG.GRID_HEIGHT;

    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            const tile = gameState.grid[y][x];
            const terrain = TERRAIN[tile.terrain.toUpperCase()];
            ctx.fillStyle = terrain.color;
            ctx.fillRect(mx + x * scaleX, my + y * scaleY, scaleX + 0.5, scaleY + 0.5);
        }
    }

    // Buildings
    ctx.fillStyle = '#f4b942';
    gameState.buildings.forEach(b => {
        ctx.fillRect(mx + b.x * scaleX - 1, my + b.y * scaleY - 1, 3, 3);
    });

    // Viewport
    const viewX = -gameState.camera.x / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewY = -gameState.camera.y / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewW = canvas.width / (CONFIG.TILE_SIZE * gameState.camera.zoom);
    const viewH = canvas.height / (CONFIG.TILE_SIZE * gameState.camera.zoom);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx + viewX * scaleX, my + viewY * scaleY, viewW * scaleX, viewH * scaleY);
}

function updateMileMarkerDisplay() {
    const display = document.getElementById('current-mile');
    if (hoverTile) {
        // Find nearest mile marker
        let nearest = null;
        let minDist = Infinity;
        gameState.mileMarkers.forEach(m => {
            const dist = Math.abs(m.x - hoverTile.x) + Math.abs(m.y - hoverTile.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = m;
            }
        });
        if (nearest && minDist < 10) {
            display.textContent = `Mile Marker: ${nearest.mile}`;
        } else {
            display.textContent = 'Mile Marker: --';
        }
    }
}

// ==================== MAP GENERATION ====================
function generateMap() {
    gameState.grid = [];
    gameState.mileMarkers = [];
    gameState.locationLabels = [];

    // Initialize with forest
    for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            gameState.grid[y][x] = {
                terrain: Math.random() < 0.65 ? 'land' : 'forest',
                building: null,
            };
        }
    }

    // Generate accurate Lake of the Ozarks
    generateAccurateLakeShape();

    // Add major arms (coves)
    generateMajorArms();

    // Add towns
    generateTowns();

    // Add state parks
    generateStateParks();

    // Add The Strip and Bagnell Dam
    generateLandmarks();

    // Add job locations (Paint Shop, Prop Shop)
    generateJobLocations();

    // Add dock zones along shoreline
    addDockZones();

    // Generate the Shootout race course
    generateRaceCourse();
}

function generateAccurateLakeShape() {
    // Lake of the Ozarks main channel - serpentine shape from dam heading southwest
    // The lake is approximately 92 miles long with 1,150 miles of shoreline

    const W = CONFIG.GRID_WIDTH;
    const H = CONFIG.GRID_HEIGHT;

    // Main channel path points (dam on east, snaking west/southwest)
    const channelPath = [
        { x: W - 3, y: H * 0.5 },      // Bagnell Dam (Mile 0)
        { x: W * 0.85, y: H * 0.48 },   // Mile ~10
        { x: W * 0.75, y: H * 0.45 },   // Mile ~20 (Osage Beach area)
        { x: W * 0.65, y: H * 0.50 },   // Mile ~30 (Grand Glaize)
        { x: W * 0.55, y: H * 0.48 },   // Mile ~40 (Dog Days area)
        { x: W * 0.45, y: H * 0.52 },   // Mile ~50 (Party Cove area)
        { x: W * 0.35, y: H * 0.48 },   // Mile ~60 (Gravois Arm junction)
        { x: W * 0.25, y: H * 0.45 },   // Mile ~70 (Niangua area)
        { x: W * 0.15, y: H * 0.42 },   // Mile ~80
        { x: W * 0.08, y: H * 0.40 },   // Mile ~92 (Truman Dam end)
    ];

    // Draw main channel by interpolating between points
    let mile = 0;
    for (let i = 0; i < channelPath.length - 1; i++) {
        const p1 = channelPath[i];
        const p2 = channelPath[i + 1];
        const steps = Math.ceil(Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y));

        for (let t = 0; t <= 1; t += 1 / steps) {
            const x = Math.round(p1.x + (p2.x - p1.x) * t);
            const y = Math.round(p1.y + (p2.y - p1.y) * t);

            // Carve channel (variable width)
            const channelWidth = 2 + Math.floor(Math.sin(mile * 0.2) + 1);
            carveWaterArea(x, y, channelWidth, 'deep_water', 'water');

            // Add mile markers
            if (mile % 10 === 0) {
                gameState.mileMarkers.push({ x, y, mile });
            }
            mile++;
        }
    }
}

function carveWaterArea(cx, cy, radius, centerTerrain, edgeTerrain) {
    for (let dy = -radius - 1; dy <= radius + 1; dy++) {
        for (let dx = -radius - 1; dx <= radius + 1; dx++) {
            const x = Math.round(cx + dx);
            const y = Math.round(cy + dy);
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (y >= 0 && y < CONFIG.GRID_HEIGHT && x >= 0 && x < CONFIG.GRID_WIDTH) {
                if (dist <= radius * 0.6) {
                    gameState.grid[y][x].terrain = centerTerrain;
                } else if (dist <= radius) {
                    if (gameState.grid[y][x].terrain !== 'deep_water') {
                        gameState.grid[y][x].terrain = edgeTerrain;
                    }
                } else if (dist <= radius + 1) {
                    if (gameState.grid[y][x].terrain === 'land' || gameState.grid[y][x].terrain === 'forest') {
                        if (Math.random() < 0.6) {
                            gameState.grid[y][x].terrain = 'shallow';
                        }
                    }
                }
            }
        }
    }
}

function generateMajorArms() {
    const W = CONFIG.GRID_WIDTH;
    const H = CONFIG.GRID_HEIGHT;

    // Gravois Arm - major arm going south
    generateArm(W * 0.38, H * 0.50, W * 0.25, H * 0.78, 'Gravois Arm', 15);

    // Grand Glaize Arm - going north
    generateArm(W * 0.72, H * 0.48, W * 0.68, H * 0.22, 'Grand Glaize', 12);

    // Niangua Arm - western arm
    generateArm(W * 0.28, H * 0.46, W * 0.12, H * 0.32, 'Niangua Arm', 10);

    // Lick Branch Cove
    generateArm(W * 0.52, H * 0.50, W * 0.48, H * 0.68, 'Lick Branch', 8);

    // Big Niangua
    generateArm(W * 0.22, H * 0.44, W * 0.08, H * 0.55, 'Big Niangua', 10);

    // Soap Creek
    generateArm(W * 0.60, H * 0.52, W * 0.58, H * 0.35, 'Soap Creek', 6);
}

function generateArm(startX, startY, endX, endY, name, length) {
    const steps = length * 3;
    let lastX = startX, lastY = startY;

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Add some curve
        const curve = Math.sin(t * Math.PI) * ((endX - startX) * 0.2);
        const x = Math.round(startX + (endX - startX) * t + curve);
        const y = Math.round(startY + (endY - startY) * t);

        // Width decreases towards the end
        const width = Math.max(1, Math.floor(2 * (1 - t * 0.7)));

        carveWaterArea(x, y, width, 'cove', 'shallow');
        lastX = x;
        lastY = y;
    }

    // Add dock zone at arm end
    if (lastY >= 0 && lastY < CONFIG.GRID_HEIGHT && lastX >= 0 && lastX < CONFIG.GRID_WIDTH) {
        gameState.grid[Math.round(lastY)][Math.round(lastX)].terrain = 'dock_zone';
    }
}

function generateTowns() {
    LAKE_LOCATIONS.towns.forEach(town => {
        const cx = Math.floor(town.x * CONFIG.GRID_WIDTH);
        const cy = Math.floor(town.y * CONFIG.GRID_HEIGHT);
        const size = town.size;

        // Create town area
        for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (y >= 0 && y < CONFIG.GRID_HEIGHT && x >= 0 && x < CONFIG.GRID_WIDTH) {
                    const tile = gameState.grid[y][x];
                    // Don't overwrite water
                    if (!tile.terrain.includes('water') && tile.terrain !== 'deep_water' &&
                        tile.terrain !== 'cove' && tile.terrain !== 'shallow') {
                        if (dx === 0 && dy === 0) {
                            tile.terrain = 'town_center';
                        } else if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
                            tile.terrain = 'town';
                        } else if (Math.random() < 0.5) {
                            tile.terrain = 'town';
                        }
                    }
                }
            }
        }

        // Add label
        gameState.locationLabels.push({ x: cx, y: cy - size - 1, name: town.name, type: 'town' });
    });
}

function generateStateParks() {
    LAKE_LOCATIONS.stateParks.forEach(park => {
        const cx = Math.floor(park.x * CONFIG.GRID_WIDTH);
        const cy = Math.floor(park.y * CONFIG.GRID_HEIGHT);
        const hw = Math.floor(park.width / 2);
        const hh = Math.floor(park.height / 2);

        // Create park area
        for (let dy = -hh; dy <= hh; dy++) {
            for (let dx = -hw; dx <= hw; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (y >= 0 && y < CONFIG.GRID_HEIGHT && x >= 0 && x < CONFIG.GRID_WIDTH) {
                    const tile = gameState.grid[y][x];
                    // Don't overwrite water or towns
                    if (!tile.terrain.includes('water') && tile.terrain !== 'deep_water' &&
                        tile.terrain !== 'cove' && !tile.terrain.includes('town')) {
                        // Park interior is dense forest
                        tile.terrain = 'state_park';

                        // Add trails randomly
                        if (Math.random() < 0.1) {
                            tile.terrain = 'park_trail';
                        }
                    }
                    // Add beach areas where park meets water
                    if (tile.terrain === 'shallow' && Math.random() < 0.4) {
                        tile.terrain = 'park_beach';
                    }
                }
            }
        }

        // Add label
        gameState.locationLabels.push({ x: cx, y: cy - hh - 1, name: park.name, type: 'park' });
    });
}

function generateLandmarks() {
    const W = CONFIG.GRID_WIDTH;
    const H = CONFIG.GRID_HEIGHT;

    // Bagnell Dam
    const damX = W - 3;
    const damY = Math.floor(H * 0.5);
    for (let dy = -3; dy <= 3; dy++) {
        const y = damY + dy;
        if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
            gameState.grid[y][damX].terrain = 'dam';
            gameState.grid[y][damX + 1].terrain = 'dam';
        }
    }
    gameState.locationLabels.push({ x: damX, y: damY - 4, name: 'Bagnell Dam', type: 'landmark' });
    gameState.mileMarkers.push({ x: damX - 2, y: damY, mile: 0 });

    // The Strip
    const stripX = Math.floor(W * 0.90);
    const stripY = Math.floor(H * 0.40);
    for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 6; dx++) {
            const x = stripX + dx;
            const y = stripY + dy;
            if (y >= 0 && y < CONFIG.GRID_HEIGHT && x >= 0 && x < CONFIG.GRID_WIDTH) {
                const tile = gameState.grid[y][x];
                if (!tile.terrain.includes('water') && tile.terrain !== 'dam') {
                    tile.terrain = 'strip';
                }
            }
        }
    }
    gameState.locationLabels.push({ x: stripX + 3, y: stripY - 1, name: 'The Strip', type: 'landmark' });

    // Party Cove marker
    const pcX = Math.floor(W * 0.45);
    const pcY = Math.floor(H * 0.60);
    gameState.locationLabels.push({ x: pcX, y: pcY - 2, name: 'Party Cove', type: 'landmark' });
}

function generateJobLocations() {
    const W = CONFIG.GRID_WIDTH;
    const H = CONFIG.GRID_HEIGHT;

    // Generate each job location from LAKE_LOCATIONS.jobs
    LAKE_LOCATIONS.jobs.forEach(job => {
        const cx = Math.floor(job.x * W);
        const cy = Math.floor(job.y * H);

        // Create a 2x2 building for the job location
        for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (y >= 0 && y < CONFIG.GRID_HEIGHT && x >= 0 && x < CONFIG.GRID_WIDTH) {
                    const tile = gameState.grid[y][x];
                    // Don't overwrite water
                    if (!tile.terrain.includes('water') && tile.terrain !== 'deep_water' &&
                        tile.terrain !== 'dam') {
                        tile.terrain = job.type; // paint_shop or prop_shop
                        tile.jobData = job;
                    }
                }
            }
        }

        // Add label with "HIRING!" indicator
        gameState.locationLabels.push({
            x: cx,
            y: cy - 1,
            name: job.name,
            type: 'job',
            jobData: job
        });
    });
}

function addDockZones() {
    // Add dock zones where water meets buildable land
    for (let y = 1; y < CONFIG.GRID_HEIGHT - 1; y++) {
        for (let x = 1; x < CONFIG.GRID_WIDTH - 1; x++) {
            const tile = gameState.grid[y][x];
            if (tile.terrain === 'shallow' || tile.terrain === 'cove') {
                const adjacent = getAdjacentTiles(x, y);
                const nearBuildable = adjacent.some(a =>
                    a.terrain === 'land' || a.terrain === 'forest' ||
                    a.terrain === 'strip' || a.terrain === 'town'
                );
                if (nearBuildable && Math.random() < 0.25) {
                    tile.terrain = 'dock_zone';
                }
            }
        }
    }
}

function generateRaceCourse() {
    // The Shootout race course - near Captain Ron's at mile marker 21
    const W = CONFIG.GRID_WIDTH;
    const H = CONFIG.GRID_HEIGHT;
    const raceStartX = Math.floor(W * 0.58);
    const raceEndX = raceStartX - 10;
    const raceY = Math.floor(H * 0.50);

    // Create straight race lane
    for (let x = raceEndX; x <= raceStartX; x++) {
        for (let dy = -2; dy <= 2; dy++) {
            const y = raceY + dy;
            if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
                if (Math.abs(dy) <= 1) {
                    gameState.grid[y][x].terrain = 'race_lane';
                } else {
                    gameState.grid[y][x].terrain = 'race_staging';
                }
            }
        }
    }

    // Add staging areas
    for (let dy = -3; dy <= 3; dy++) {
        const y = raceY + dy;
        if (y >= 0 && y < CONFIG.GRID_HEIGHT) {
            if (gameState.grid[y][raceStartX + 1]) {
                gameState.grid[y][raceStartX + 1].terrain = 'race_staging';
            }
            if (gameState.grid[y][raceEndX - 1]) {
                gameState.grid[y][raceEndX - 1].terrain = 'race_staging';
            }
        }
    }

    gameState.mileMarkers.push({ x: raceStartX, y: raceY, mile: 21 });
    gameState.locationLabels.push({ x: raceStartX - 5, y: raceY - 4, name: 'THE SHOOTOUT', type: 'race' });
}

// ==================== BUILDING SYSTEM ====================
function canPlaceBuilding(buildingType, x, y) {
    if (x < 0 || x >= CONFIG.GRID_WIDTH || y < 0 || y >= CONFIG.GRID_HEIGHT) {
        return false;
    }

    const tile = gameState.grid[y][x];
    const def = BUILDINGS[buildingType];

    if (tile.building) return false;

    // Check terrain requirements
    if (def.requiresTerrain) {
        if (!def.requiresTerrain.includes(tile.terrain)) {
            return false;
        }
    }

    // Check adjacent requirements
    if (def.requiresAdjacent) {
        const adjacent = getAdjacentTiles(x, y);
        const hasRequired = adjacent.some(adj =>
            def.requiresAdjacent.includes(adj.terrain)
        );
        if (!hasRequired) return false;
    }

    return canAfford(def.cost);
}

function canAfford(cost) {
    for (const [resource, amount] of Object.entries(cost)) {
        if ((gameState.resources[resource] || 0) < amount) {
            return false;
        }
    }
    return true;
}

function getAdjacentTiles(x, y) {
    const adjacent = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    dirs.forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < CONFIG.GRID_WIDTH && ny >= 0 && ny < CONFIG.GRID_HEIGHT) {
            adjacent.push(gameState.grid[ny][nx]);
        }
    });

    return adjacent;
}

function placeBuilding(buildingType, x, y) {
    if (!canPlaceBuilding(buildingType, x, y)) return false;

    const def = BUILDINGS[buildingType];

    // Deduct costs
    for (const [resource, amount] of Object.entries(def.cost)) {
        gameState.resources[resource] -= amount;
    }

    const building = {
        type: buildingType,
        x: x,
        y: y,
        working: true,
        level: 1,
    };

    // Check workers
    if (def.requiresWorkers) {
        const availableWorkers = gameState.workers.total - gameState.workers.employed;
        if (availableWorkers >= def.requiresWorkers) {
            gameState.workers.employed += def.requiresWorkers;
        } else {
            building.working = false;
        }
    }

    gameState.buildings.push(building);
    gameState.grid[y][x].building = building;

    // Apply immediate provides
    if (def.provides) {
        for (const [resource, amount] of Object.entries(def.provides)) {
            if (resource === 'population') {
                gameState.resources.population += amount;
                gameState.workers.total += Math.floor(amount * 0.7);
            } else {
                gameState.resources[resource] = (gameState.resources[resource] || 0) + amount;
            }
        }
    }

    addEvent(`Built ${def.name}!`, 'positive');
    updateUI();
    render();

    return true;
}

function demolishBuilding(x, y) {
    const tile = gameState.grid[y][x];
    if (!tile.building) return false;

    const building = tile.building;
    const def = BUILDINGS[building.type];

    const index = gameState.buildings.indexOf(building);
    if (index > -1) gameState.buildings.splice(index, 1);
    tile.building = null;

    if (def.provides) {
        for (const [resource, amount] of Object.entries(def.provides)) {
            if (resource === 'population') {
                gameState.resources.population -= amount;
                gameState.workers.total -= Math.floor(amount * 0.7);
            } else {
                gameState.resources[resource] -= amount;
            }
        }
    }

    if (def.requiresWorkers && building.working) {
        gameState.workers.employed -= def.requiresWorkers;
    }

    // Partial refund
    gameState.resources.money += Math.floor((def.cost.money || 0) * 0.3);

    addEvent(`Demolished ${def.name}`, 'neutral');
    updateUI();
    render();

    return true;
}

// ==================== GAME LOOP ====================
let gameLoop;

function startGameLoop() {
    gameLoop = setInterval(() => {
        if (!gameState.paused) {
            gameTick();
        }
    }, CONFIG.TICK_RATE / gameState.gameSpeed);
}

function gameTick() {
    gameState.tick++;

    // Weekend bonus (every 7 ticks)
    gameState.weekendBonus = (gameState.tick % 7 === 5 || gameState.tick % 7 === 6);

    // Season change
    if (gameState.tick % CONFIG.TICKS_PER_SEASON === 0) {
        gameState.season = (gameState.season + 1) % 4;
        if (gameState.season === 0) {
            gameState.year++;
            addEvent(`Year ${gameState.year} begins!`, 'neutral');
        }
        const seasonName = CONFIG.SEASONS[gameState.season];
        addEvent(`${seasonName} has arrived!`, 'neutral');

        // Lake level fluctuation
        if (seasonName === 'Spring') {
            gameState.lakeLevel = 660 + Math.floor(Math.random() * 5);
            addEvent('Spring rains fill the lake!', 'positive');
        } else if (seasonName === 'Fall') {
            gameState.lakeLevel = 656 + Math.floor(Math.random() * 4);
        }
    }

    // Check for Shootout event (late Summer - second summer season)
    const tickInSeason = gameState.tick % CONFIG.TICKS_PER_SEASON;
    const isSummer = CONFIG.SEASONS[gameState.season] === 'Summer';
    const isLateAugust = gameState.season === 2 && tickInSeason >= CONFIG.SHOOTOUT_WEEK;

    // Start Shootout
    if (isLateAugust && tickInSeason === CONFIG.SHOOTOUT_WEEK && !gameState.shootout.active) {
        startShootout();
    }

    // Process Shootout days
    if (gameState.shootout.active) {
        processShootoutDay();
    }

    // Calculate production
    let income = 0;
    let boatProduction = 0;
    let speedBoatProduction = 0;
    let tourismProduction = 0;
    let reputationChange = 0;
    let racingRepChange = 0;
    let expenses = 0;

    const seasonMultiplier = isSummer ? 2.0 : (CONFIG.SEASONS[gameState.season] === 'Spring' ? 1.2 : 0.6);
    const weekendMultiplier = gameState.weekendBonus ? 1.5 : 1.0;
    const shootoutMultiplier = gameState.shootout.active ? 3.0 : 1.0; // HUGE boost during Shootout!

    updateWorkerAssignments();

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];

        if (building.working && def.produces) {
            let multiplier = seasonMultiplier * weekendMultiplier;

            // Racing buildings get extra boost during Shootout
            if (def.category === 'racing' && gameState.shootout.active) {
                multiplier *= shootoutMultiplier;
            }

            if (def.produces.money) income += def.produces.money * multiplier;
            if (def.produces.boats) boatProduction += def.produces.boats;
            if (def.produces.speedBoats) speedBoatProduction += def.produces.speedBoats;
            if (def.produces.tourism) tourismProduction += def.produces.tourism * multiplier;
            if (def.produces.reputation) reputationChange += def.produces.reputation;
            if (def.produces.racingRep) racingRepChange += def.produces.racingRep;
        }

        if (def.upkeep?.money) expenses += def.upkeep.money;
    });

    // Tourism affects income
    income += gameState.resources.tourism * 2;

    // Shootout bonus income based on racing reputation
    if (gameState.shootout.active) {
        const racingBonus = gameState.resources.racingRep * 10;
        income += racingBonus;
        gameState.shootout.totalEarnings += racingBonus;
    }

    // Apply resources
    gameState.resources.money += Math.floor(income - expenses);
    gameState.resources.boats += boatProduction;
    gameState.resources.speedBoats += speedBoatProduction;
    gameState.resources.tourism = Math.floor(Math.max(0, gameState.resources.tourism * 0.95 + tourismProduction));
    gameState.resources.reputation = Math.max(0, Math.min(100,
        gameState.resources.reputation + reputationChange * 0.1
    ));
    gameState.resources.racingRep = Math.max(0, Math.min(100,
        gameState.resources.racingRep + racingRepChange * 0.1
    ));

    // Random events
    if (Math.random() < 0.03) {
        triggerRandomEvent();
    }

    // Weekend party event
    if (gameState.weekendBonus && isSummer && Math.random() < 0.1 && !gameState.shootout.active) {
        addEvent('Weekend warriors flood the lake! ', 'party');
        gameState.resources.tourism += 20;
        gameState.resources.money += 500;
    }

    document.getElementById('income').textContent = `+$${Math.floor(income - expenses)}/s`;
    document.getElementById('lake-level').textContent = gameState.shootout.active ?
        `SHOOTOUT DAY ${gameState.shootout.day + 1}!` : `${gameState.lakeLevel} ft`;

    updateUI();
    render();
}

// ==================== SHOOTOUT EVENT SYSTEM ====================
function startShootout() {
    gameState.shootout.active = true;
    gameState.shootout.day = 0;
    gameState.shootout.totalEarnings = 0;
    gameState.shootout.bestSpeed = 0;

    addEvent('THE SHOOTOUT BEGINS! ', 'racing');
    addEvent('Thousands of racing fans descend on the lake!', 'racing');

    // Massive tourism spike
    gameState.resources.tourism += 100;
}

function processShootoutDay() {
    const tickInSeason = gameState.tick % CONFIG.TICKS_PER_SEASON;
    const dayOfShootout = tickInSeason - CONFIG.SHOOTOUT_WEEK;

    if (dayOfShootout !== gameState.shootout.day) {
        gameState.shootout.day = dayOfShootout;

        if (dayOfShootout < 4) {
            // Each day of the Shootout
            const dayNames = ['Qualifying Day', 'Time Trials', 'Semi-Finals', 'FINALS DAY'];
            addEvent(`Shootout ${dayNames[dayOfShootout]}!`, 'racing');

            // Generate race results based on racing rep and speed boats
            const speed = 150 + Math.floor(Math.random() * 50) +
                (gameState.resources.racingRep / 2) +
                (gameState.resources.speedBoats * 2);

            if (speed > gameState.shootout.bestSpeed) {
                gameState.shootout.bestSpeed = speed;
                addEvent(`New top speed: ${speed} MPH! `, 'racing');
            }

            // Daily earnings based on infrastructure
            const racingBuildings = gameState.buildings.filter(b =>
                BUILDINGS[b.type].category === 'racing'
            ).length;
            const dailyBonus = 1000 * (racingBuildings + 1) * (1 + gameState.resources.racingRep / 50);
            gameState.resources.money += dailyBonus;
            gameState.shootout.totalEarnings += dailyBonus;

            // Tourism surge each day
            gameState.resources.tourism += 30;

        } else {
            // Shootout ends
            endShootout();
        }
    }
}

function endShootout() {
    gameState.shootout.active = false;

    const earnings = Math.floor(gameState.shootout.totalEarnings);
    const topSpeed = Math.floor(gameState.shootout.bestSpeed);

    addEvent(`SHOOTOUT COMPLETE! `, 'racing');
    addEvent(`Total Shootout earnings: $${earnings.toLocaleString()}`, 'positive');
    addEvent(`Top recorded speed: ${topSpeed} MPH`, 'racing');

    // Store results
    gameState.raceResults.push({
        year: gameState.year,
        earnings: earnings,
        topSpeed: topSpeed,
        racingRep: gameState.resources.racingRep,
    });

    // Reputation boost from successful Shootout
    if (earnings > gameState.shootout.lastYearEarnings) {
        gameState.resources.reputation += 5;
        gameState.resources.racingRep += 5;
        addEvent('Your Shootout was bigger than last year!', 'positive');
    }

    gameState.shootout.lastYearEarnings = earnings;

    // Cool down tourism after event
    gameState.resources.tourism = Math.floor(gameState.resources.tourism * 0.7);
}

function updateWorkerAssignments() {
    const available = gameState.workers.total - gameState.workers.employed;

    gameState.buildings.forEach(building => {
        const def = BUILDINGS[building.type];
        if (def.requiresWorkers && !building.working && available >= def.requiresWorkers) {
            building.working = true;
            gameState.workers.employed += def.requiresWorkers;
        }
    });
}

function triggerRandomEvent() {
    const isSummer = CONFIG.SEASONS[gameState.season] === 'Summer';
    const hasRacingInfra = gameState.buildings.some(b => BUILDINGS[b.type].category === 'racing');

    const events = [
        {
            text: 'Bass tournament brings anglers from KC and STL!',
            effect: () => { gameState.resources.money += 300; gameState.resources.tourism += 15; },
            type: 'positive'
        },
        {
            text: 'Boat parade on the main channel!',
            effect: () => { gameState.resources.tourism += 25; gameState.resources.reputation += 2; },
            type: 'party',
            requiresSummer: true
        },
        {
            text: 'Celebrity spotted at the lake! Social media buzzing!',
            effect: () => { gameState.resources.tourism += 40; gameState.resources.reputation += 5; },
            type: 'positive'
        },
        {
            text: 'Storm rolls through - some dock damage',
            effect: () => { gameState.resources.money -= 200; },
            type: 'negative'
        },
        {
            text: 'Aquapalooza draws huge crowds!',
            effect: () => { gameState.resources.money += 800; gameState.resources.tourism += 50; },
            type: 'party',
            requiresSummer: true
        },
        {
            text: 'Gas prices up - more boaters staying local!',
            effect: () => { gameState.resources.tourism += 20; },
            type: 'positive'
        },
        {
            text: 'Lake featured on travel show!',
            effect: () => { gameState.resources.reputation += 8; gameState.resources.tourism += 30; },
            type: 'positive'
        },
        {
            text: 'Poker run brings high rollers!',
            effect: () => { gameState.resources.money += 600; },
            type: 'positive',
            requiresSummer: true
        },
        // Racing Events
        {
            text: 'Speed boat test run hits 180 MPH!',
            effect: () => { gameState.resources.racingRep += 8; gameState.resources.tourism += 20; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Racing team chooses your marina for practice!',
            effect: () => { gameState.resources.money += 500; gameState.resources.racingRep += 5; gameState.resources.speedBoats += 2; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Cigarette boat rally passes through!',
            effect: () => { gameState.resources.tourism += 35; gameState.resources.racingRep += 3; },
            type: 'racing',
            requiresSummer: true
        },
        {
            text: 'Racing documentary crew filming at the lake!',
            effect: () => { gameState.resources.reputation += 10; gameState.resources.racingRep += 10; gameState.resources.tourism += 25; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Pro racer buys property on your stretch!',
            effect: () => { gameState.resources.money += 1000; gameState.resources.racingRep += 8; gameState.resources.reputation += 5; },
            type: 'racing',
            requiresRacing: true
        },
        {
            text: 'Mini boat race draws a crowd!',
            effect: () => { gameState.resources.money += 300; gameState.resources.tourism += 15; },
            type: 'racing',
            requiresSummer: true
        },
        {
            text: 'Speed record attempt announced for your area!',
            effect: () => { gameState.resources.tourism += 50; gameState.resources.racingRep += 12; },
            type: 'racing',
            requiresRacing: true,
            requiresSummer: true
        },
        {
            text: 'Boat engine explosion - thankfully no injuries!',
            effect: () => { gameState.resources.money -= 300; gameState.resources.speedBoats -= 1; },
            type: 'negative',
            requiresRacing: true
        },
    ];

    // Filter events based on requirements
    const validEvents = events.filter(e => {
        if (e.requiresSummer && !isSummer) return false;
        if (e.requiresRacing && !hasRacingInfra) return false;
        return true;
    });

    const event = validEvents[Math.floor(Math.random() * validEvents.length)];
    event.effect();
    addEvent(event.text, event.type);
}

// ==================== UI FUNCTIONS ====================
function updateUI() {
    document.getElementById('population').textContent = gameState.resources.population;
    document.getElementById('money').textContent = Math.floor(gameState.resources.money);
    document.getElementById('boats').textContent = gameState.resources.boats;
    document.getElementById('speedBoats').textContent = gameState.resources.speedBoats;
    document.getElementById('tourism').textContent = Math.floor(gameState.resources.tourism);
    document.getElementById('racingRep').textContent = Math.floor(gameState.resources.racingRep);
    document.getElementById('reputation').textContent = Math.floor(gameState.resources.reputation);

    let seasonText = CONFIG.SEASONS[gameState.season];
    if (gameState.shootout.active) {
        seasonText = 'SHOOTOUT!';
    } else if (gameState.weekendBonus) {
        seasonText += ' (Weekend!)';
    }
    document.getElementById('season').textContent = seasonText;
    document.getElementById('year').textContent = gameState.year;
    document.getElementById('town-name').textContent = gameState.playerName;

    updateBuildingList();
}

function updateBuildingList() {
    const list = document.getElementById('building-list');
    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'marina';

    list.innerHTML = '';

    Object.values(BUILDINGS).filter(b => b.category === activeCategory).forEach(building => {
        const canAffordIt = canAfford(building.cost);

        const div = document.createElement('div');
        div.className = `building-item ${!canAffordIt ? 'disabled' : ''} ${gameState.selectedBuilding === building.id ? 'selected' : ''}`;
        div.dataset.building = building.id;

        const costText = `$${building.cost.money || 0}`;

        div.innerHTML = `
            <div class="building-header">
                <span class="building-icon">${building.icon}</span>
                <span class="building-name">${building.name}</span>
            </div>
            <div class="building-cost">${costText}</div>
        `;

        div.addEventListener('click', () => selectBuilding(building.id));
        list.appendChild(div);
    });
}

function selectBuilding(buildingId) {
    gameState.selectedBuilding = gameState.selectedBuilding === buildingId ? null : buildingId;
    gameState.demolishMode = false;
    document.getElementById('btn-demolish').classList.remove('active');

    updateBuildingList();
    updateBuildingInfo();
    render();
}

function updateBuildingInfo() {
    const info = document.getElementById('building-info');

    if (!gameState.selectedBuilding) {
        info.innerHTML = '<p>Select a building to see details</p>';
        return;
    }

    const building = BUILDINGS[gameState.selectedBuilding];
    let html = `<p><strong>${building.icon} ${building.name}</strong></p>`;
    html += `<p style="font-size:0.8rem">${building.description}</p>`;

    if (building.produces) {
        const prods = Object.entries(building.produces).map(([r,a]) => `+${a} ${r}`).join(', ');
        html += `<p><em>Produces: ${prods}</em></p>`;
    }
    if (building.requiresWorkers) {
        html += `<p><em>Workers: ${building.requiresWorkers}</em></p>`;
    }

    info.innerHTML = html;
}

function addEvent(text, type = 'neutral') {
    gameState.events.unshift({ text, type, tick: gameState.tick });
    if (gameState.events.length > 15) gameState.events.pop();

    const log = document.getElementById('event-log');
    log.innerHTML = gameState.events.map(e =>
        `<div class="event-item ${e.type}">${e.text}</div>`
    ).join('');
}

// ==================== INPUT HANDLING ====================
function initInput() {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('mouseleave', () => { hoverTile = null; render(); });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameState.selectedBuilding = null;
            updateBuildingList();
            updateBuildingInfo();
        });
    });

    document.getElementById('btn-demolish').addEventListener('click', () => {
        gameState.demolishMode = !gameState.demolishMode;
        gameState.selectedBuilding = null;
        document.getElementById('btn-demolish').classList.toggle('active', gameState.demolishMode);
        updateBuildingList();
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        gameState.camera.zoom = Math.min(2, gameState.camera.zoom + 0.2);
        render();
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        gameState.camera.zoom = Math.max(0.4, gameState.camera.zoom - 0.2);
        render();
    });

    document.getElementById('btn-speed').addEventListener('click', () => {
        const speeds = [1, 2, 3];
        const current = speeds.indexOf(gameState.gameSpeed);
        gameState.gameSpeed = speeds[(current + 1) % speeds.length];
        document.getElementById('btn-speed').textContent = `${gameState.gameSpeed}x`;
        clearInterval(gameLoop);
        startGameLoop();
    });

    // Dock/Boat Shop button
    const dockBtn = document.getElementById('btn-dock');
    if (dockBtn) {
        dockBtn.addEventListener('click', () => {
            openBoatShop();
        });
    }

    function startGame() {
        try {
            // Hide modal FIRST
            const modal = document.getElementById('welcome-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.add('hidden');
            }

            // Then set player name
            const nameInput = document.getElementById('town-name-input');
            gameState.playerName = (nameInput && nameInput.value) ? nameInput.value : 'Lake Boss';

            // Update UI
            updateUI();
        } catch (err) {
            console.error('Error starting game:', err);
            // Still hide modal even if there's an error
            const modal = document.getElementById('welcome-modal');
            if (modal) modal.style.display = 'none';
        }
    }

    const startBtn = document.getElementById('start-game');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startGame();
        });
        startBtn.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startGame();
        });
        // Also handle mousedown for Brave browser
        startBtn.addEventListener('mousedown', function(e) {
            e.preventDefault();
            startGame();
        });
    }

    // Allow Enter key to start game
    const nameInput = document.getElementById('town-name-input');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                startGame();
            }
        });
    }
}

function onMouseDown(e) {
    if (e.button === 0) {
        const tile = getTileAtMouse(e);
        if (tile) {
            if (gameState.selectedBuilding) {
                placeBuilding(gameState.selectedBuilding, tile.x, tile.y);
            } else if (gameState.demolishMode) {
                demolishBuilding(tile.x, tile.y);
            }
        }
    } else {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
    }
    e.preventDefault();
}

function onMouseMove(e) {
    if (isDragging) {
        gameState.camera.x += e.clientX - lastMouse.x;
        gameState.camera.y += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        render();
    } else {
        hoverTile = getTileAtMouse(e);
        render();
        updateTooltip(e);
    }
}

function onWheel(e) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const oldZoom = gameState.camera.zoom;
    gameState.camera.zoom = Math.max(0.4, Math.min(2, gameState.camera.zoom + delta));

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zoomRatio = gameState.camera.zoom / oldZoom;

    gameState.camera.x = mx - (mx - gameState.camera.x) * zoomRatio;
    gameState.camera.y = my - (my - gameState.camera.y) * zoomRatio;

    render();
    e.preventDefault();
}

function getTileAtMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldX = (mx - gameState.camera.x) / gameState.camera.zoom;
    const worldY = (my - gameState.camera.y) / gameState.camera.zoom;

    const tileX = Math.floor(worldX / CONFIG.TILE_SIZE);
    const tileY = Math.floor(worldY / CONFIG.TILE_SIZE);

    if (tileX >= 0 && tileX < CONFIG.GRID_WIDTH && tileY >= 0 && tileY < CONFIG.GRID_HEIGHT) {
        return { x: tileX, y: tileY };
    }
    return null;
}

function updateTooltip(e) {
    const tooltip = document.getElementById('tooltip');

    if (!hoverTile) {
        tooltip.classList.add('hidden');
        return;
    }

    const tile = gameState.grid[hoverTile.y][hoverTile.x];
    const terrain = TERRAIN[tile.terrain.toUpperCase()];

    let text = `<strong>${terrain.name}</strong>`;

    if (tile.building) {
        const def = BUILDINGS[tile.building.type];
        text = `<strong>${def.icon} ${def.name}</strong>`;
        if (!tile.building.working && def.requiresWorkers) {
            text += '<br><span style="color:#ff8888">Needs workers!</span>';
        }
    }

    if (gameState.selectedBuilding) {
        const canPlace = canPlaceBuilding(gameState.selectedBuilding, hoverTile.x, hoverTile.y);
        text += canPlace ?
            '<br><span style="color:#88ff88">Click to build</span>' :
            '<br><span style="color:#ff8888">Cannot build here</span>';
    }

    tooltip.innerHTML = text;
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY + 15) + 'px';
    tooltip.classList.remove('hidden');
}

// ==================== BOAT SHOP UI ====================
function openBoatShop() {
    const modal = document.getElementById('boat-shop-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        updateShopMoney();
        renderShopContent('buy');

        // Set up tab listeners
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                renderShopContent(tab.dataset.tab);
            });
        });
    }
}

function closeBoatShop() {
    const modal = document.getElementById('boat-shop-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// Make closeBoatShop available globally for onclick
window.closeBoatShop = closeBoatShop;

function updateShopMoney() {
    const shopMoney = document.getElementById('shop-money');
    if (shopMoney) {
        shopMoney.textContent = Math.floor(gameState.resources.money);
    }
}

function renderShopContent(tab) {
    const content = document.getElementById('shop-content');
    if (!content) return;

    switch(tab) {
        case 'buy':
            renderBuyBoats(content);
            break;
        case 'upgrade':
            renderUpgrades(content);
            break;
        case 'dock':
        case 'garage':
            renderGarage(content);
            break;
        case 'paint':
            renderPaintShop(content);
            break;
    }
}

function renderBuyBoats(container) {
    let html = '<div class="boat-grid">';

    Object.entries(BOAT_HULLS).forEach(([id, hull]) => {
        const canAfford = gameState.resources.money >= hull.basePrice;
        const stats = calculateBoatStats(id, 'stock', 'stock', 'none', 'none');

        html += `
            <div class="boat-card ${!canAfford ? 'disabled' : ''}">
                <div class="boat-image"></div>
                <h3>${hull.name}</h3>
                <div class="boat-stats">
                    <span>${stats.topSpeed} MPH</span>
                    <span>${Math.round(stats.handling * 100)}%</span>
                    <span>${Math.round(stats.reliability * 100)}%</span>
                </div>
                <div class="boat-price">$${hull.basePrice.toLocaleString()}</div>
                <button class="buy-btn" onclick="buyBoat('${id}')" ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? 'Buy' : 'Too Expensive'}
                </button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderUpgrades(container) {
    const activeBoat = gameState.garage.boats.find(b => b.id === gameState.garage.activeBoat);

    if (!activeBoat) {
        container.innerHTML = '<div class="no-boat"><p>Select a boat in your garage first!</p></div>';
        return;
    }

    let html = `<div class="active-boat-header">
        <h3>Upgrading: ${activeBoat.name}</h3>
        <span class="current-speed">Current Speed: ${activeBoat.stats.topSpeed} MPH</span>
    </div>`;

    // Engines
    html += '<div class="upgrade-section"><h4>Engines</h4><div class="upgrade-grid">';
    Object.entries(ENGINES).forEach(([id, engine]) => {
        const isOwned = activeBoat.engine === id;
        const canAfford = gameState.resources.money >= engine.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${engine.name}</h5>
                <span class="stat">+${engine.speedBonus} MPH</span>
                <span class="stat"> +${engine.weight} lbs</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('engine', '${id}')" ${!canAfford ? 'disabled' : ''}>$${engine.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    // Propellers
    html += '<div class="upgrade-section"><h4>⚙️ Propellers</h4><div class="upgrade-grid">';
    Object.entries(PROPELLERS).forEach(([id, prop]) => {
        const isOwned = activeBoat.propeller === id;
        const canAfford = gameState.resources.money >= prop.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${prop.name}</h5>
                <span class="stat">+${prop.speedBonus} MPH</span>
                <span class="stat">${prop.handlingMod > 0 ? '+' : ''}${Math.round(prop.handlingMod * 100)}%</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('propeller', '${id}')" ${!canAfford ? 'disabled' : ''}>$${prop.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    // Hull Mods
    html += '<div class="upgrade-section"><h4>🛥️ Hull Modifications</h4><div class="upgrade-grid">';
    Object.entries(HULL_MODS).forEach(([id, mod]) => {
        const isOwned = activeBoat.hullMod === id;
        const canAfford = gameState.resources.money >= mod.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${mod.name}</h5>
                <span class="stat">+${mod.speedBonus} MPH</span>
                <span class="stat">${mod.handlingMod > 0 ? '+' : ''}${Math.round(mod.handlingMod * 100)}%</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('hullMod', '${id}')" ${!canAfford ? 'disabled' : ''}>$${mod.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    // Weight Mods
    html += '<div class="upgrade-section"><h4> Weight Reduction</h4><div class="upgrade-grid">';
    Object.entries(WEIGHT_MODS).forEach(([id, mod]) => {
        const isOwned = activeBoat.weightMod === id;
        const canAfford = gameState.resources.money >= mod.price;
        html += `
            <div class="upgrade-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <h5>${mod.name}</h5>
                <span class="stat">${mod.speedBonus > 0 ? '+' : ''}${mod.speedBonus} MPH</span>
                <span class="stat">${mod.reliabilityMod > 0 ? '+' : ''}${Math.round(mod.reliabilityMod * 100)}%</span>
                ${isOwned ?
                    '<span class="badge">Installed</span>' :
                    `<button onclick="purchaseUpgrade('weightMod', '${id}')" ${!canAfford ? 'disabled' : ''}>$${mod.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div></div>';

    container.innerHTML = html;
}

function renderGarage(container) {
    const boats = gameState.garage.boats;

    if (boats.length === 0) {
        container.innerHTML = '<div class="empty-garage"><p>Your garage is empty! Buy a boat to get started.</p></div>';
        return;
    }

    let html = '<div class="garage-grid">';

    boats.forEach(boat => {
        const isActive = boat.id === gameState.garage.activeBoat;
        const boatClass = determineBoatClass(boat.stats.topSpeed);
        const boatValue = getBoatValue(boat);

        html += `
            <div class="garage-boat ${isActive ? 'active-boat' : ''}">
                <div class="boat-header">
                    <h3>${boat.name}</h3>
                    ${isActive ? '<span class="active-badge">Racing</span>' : ''}
                </div>
                <div class="boat-image large"></div>
                <div class="boat-details">
                    <div class="stat-row"><span>Class:</span><span>${boatClass.name}</span></div>
                    <div class="stat-row"><span>Top Speed:</span><span>${boat.stats.topSpeed} MPH</span></div>
                    <div class="stat-row"><span>Handling:</span><span>${Math.round(boat.stats.handling * 100)}%</span></div>
                    <div class="stat-row"><span>Reliability:</span><span>${Math.round(boat.stats.reliability * 100)}%</span></div>
                    <div class="stat-row"><span>Value:</span><span>$${boatValue.toLocaleString()}</span></div>
                </div>
                <div class="boat-record">
                    <span>Races: ${boat.races}</span>
                    <span>Wins: ${boat.wins}</span>
                    <span>Best: ${boat.bestSpeed || '--'} MPH</span>
                </div>
                <div class="boat-actions">
                    ${!isActive ? `<button onclick="selectActiveBoat(${boat.id})">Select for Racing</button>` : ''}
                    ${!boat.isStarter ? `<button class="sell-btn" onclick="sellBoat(${boat.id})">Sell ($${Math.floor(boatValue * 0.7).toLocaleString()})</button>` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

function renderPaintShop(container) {
    const activeBoat = gameState.garage.boats.find(b => b.id === gameState.garage.activeBoat);

    if (!activeBoat) {
        container.innerHTML = '<div class="no-boat"><p>Select a boat in your garage first!</p></div>';
        return;
    }

    let html = `<div class="paint-header">
        <h3>Paint Shop - ${activeBoat.name}</h3>
    </div>`;

    html += '<div class="paint-grid">';
    Object.entries(PAINT_JOBS).forEach(([id, paint]) => {
        const isOwned = activeBoat.paint === id;
        const canAfford = gameState.resources.money >= paint.price;
        html += `
            <div class="paint-card ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'disabled' : ''}">
                <div class="paint-preview" style="background: ${paint.primary}; border: 3px solid ${paint.secondary || paint.primary};">
                    
                </div>
                <h4>${paint.name}</h4>
                ${isOwned ?
                    '<span class="badge">Applied</span>' :
                    `<button onclick="purchaseUpgrade('paint', '${id}')" ${!canAfford ? 'disabled' : ''}>$${paint.price.toLocaleString()}</button>`
                }
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

function buyBoat(hullId) {
    const hull = BOAT_HULLS[hullId];
    if (!hull || gameState.resources.money < hull.basePrice) return;

    if (gameState.garage.boats.length >= gameState.garage.maxSlots) {
        addEvent('Garage is full! Sell a boat first.', 'negative');
        return;
    }

    gameState.resources.money -= hull.basePrice;

    const newBoat = createBoat(hullId, hull.name);
    gameState.garage.boats.push(newBoat);

    // Set as active if it's the only boat
    if (gameState.garage.boats.length === 1) {
        gameState.garage.activeBoat = newBoat.id;
    }

    addEvent(`Bought new boat: ${hull.name}! `, 'positive');
    updateShopMoney();
    updateUI();
    renderShopContent('garage');
}

// Make buyBoat available globally
window.buyBoat = buyBoat;

function purchaseUpgrade(type, itemId) {
    const activeBoat = gameState.garage.boats.find(b => b.id === gameState.garage.activeBoat);
    if (!activeBoat) return;

    let item, price;

    switch(type) {
        case 'engine':
            item = ENGINES[itemId];
            price = item?.price || 0;
            break;
        case 'propeller':
            item = PROPELLERS[itemId];
            price = item?.price || 0;
            break;
        case 'hullMod':
            item = HULL_MODS[itemId];
            price = item?.price || 0;
            break;
        case 'weightMod':
            item = WEIGHT_MODS[itemId];
            price = item?.price || 0;
            break;
        case 'paint':
            item = PAINT_JOBS[itemId];
            price = item?.price || 0;
            break;
        default:
            return;
    }

    if (!item || gameState.resources.money < price) return;

    gameState.resources.money -= price;
    activeBoat[type] = itemId;

    // Recalculate boat stats
    activeBoat.stats = calculateBoatStats(
        activeBoat.hull,
        activeBoat.engine,
        activeBoat.propeller,
        activeBoat.hullMod,
        activeBoat.weightMod
    );

    addEvent(`Installed ${item.name}! ${activeBoat.stats.topSpeed} MPH`, 'positive');
    updateShopMoney();
    updateUI();

    // Refresh the current tab
    const activeTab = document.querySelector('.shop-tab.active');
    if (activeTab) {
        renderShopContent(activeTab.dataset.tab);
    }
}

// Make purchaseUpgrade available globally
window.purchaseUpgrade = purchaseUpgrade;

function selectActiveBoat(boatId) {
    const boat = gameState.garage.boats.find(b => b.id === boatId);
    if (boat) {
        gameState.garage.activeBoat = boatId;
        addEvent(`Selected ${boat.name} for racing!`, 'racing');
        renderShopContent('garage');
    }
}

// Make selectActiveBoat available globally
window.selectActiveBoat = selectActiveBoat;

function sellBoat(boatId) {
    const boatIndex = gameState.garage.boats.findIndex(b => b.id === boatId);
    if (boatIndex === -1) return;

    const boat = gameState.garage.boats[boatIndex];
    if (boat.isStarter) {
        addEvent("Can't sell your starter boat!", 'negative');
        return;
    }

    const sellPrice = Math.floor(getBoatValue(boat) * 0.7);
    gameState.resources.money += sellPrice;
    gameState.garage.boats.splice(boatIndex, 1);

    // If we sold the active boat, select another
    if (gameState.garage.activeBoat === boatId && gameState.garage.boats.length > 0) {
        gameState.garage.activeBoat = gameState.garage.boats[0].id;
    }

    addEvent(`Sold ${boat.name} for $${sellPrice.toLocaleString()}!`, 'positive');
    updateShopMoney();
    updateUI();
    renderShopContent('garage');
}

// Make sellBoat available globally
window.sellBoat = sellBoat;

function initializeStarterBoat() {
    // Give player their starter boat
    const starterBoat = createStarterBoat();
    gameState.garage.boats.push(starterBoat);
    gameState.garage.activeBoat = starterBoat.id;
    gameState.resources.speedBoats = 1;
}

// ==================== INITIALIZATION ====================
function init() {
    initCanvas();
    generateMap();
    initInput();
    updateUI();
    render();
    startGameLoop();

    // Initialize boat preview canvases on welcome screen with delay to ensure DOM ready
    setTimeout(() => {
        initBoatPreviews();
        initStoryteller();
    }, 100);

    // Retry in case first attempt failed
    setTimeout(() => {
        initBoatPreviews();
        initStoryteller();
    }, 500);
}

window.addEventListener('load', init);
