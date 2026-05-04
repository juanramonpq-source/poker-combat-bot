(function registerPoCoBOTPlayerVisual(global) {
  const SIDE_FRAME_VERTICAL_OFFSETS = [0, -55, -124, -134, -127];
  const ASSET_VERSION = "20260504-idle-fire";
  const audioState = {
    context: null,
    movementGain: null,
    tone: null,
    overtone: null,
    filter: null,
    noiseGain: null,
    unlocked: false,
  };
  let movementAudioListenersReady = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function damp(current, target, smoothing, dt) {
    return current + (target - current) * (1 - Math.exp(-smoothing * dt));
  }

  function createNoiseBuffer(context) {
    const length = Math.floor(context.sampleRate * 1.6);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let smoothed = 0;

    for (let index = 0; index < length; index += 1) {
      smoothed = smoothed * 0.96 + (Math.random() * 2 - 1) * 0.04;
      data[index] = smoothed;
    }

    return buffer;
  }

  function ensureMovementAudio() {
    if (audioState.context) return;

    const AudioContextClass = global.AudioContext || global.webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const master = context.createGain();
    const movementGain = context.createGain();
    const toneGain = context.createGain();
    const overtoneGain = context.createGain();
    const noiseGain = context.createGain();
    const filter = context.createBiquadFilter();
    const tone = context.createOscillator();
    const overtone = context.createOscillator();
    const noise = context.createBufferSource();

    master.gain.value = 0.28;
    movementGain.gain.value = 0;
    toneGain.gain.value = 0.24;
    overtoneGain.gain.value = 0.055;
    noiseGain.gain.value = 0.12;

    tone.type = "sawtooth";
    overtone.type = "triangle";
    filter.type = "bandpass";
    filter.frequency.value = 1180;
    filter.Q.value = 0.72;
    tone.frequency.value = 54;
    overtone.frequency.value = 121;
    noise.buffer = createNoiseBuffer(context);
    noise.loop = true;

    tone.connect(toneGain).connect(movementGain);
    overtone.connect(overtoneGain).connect(movementGain);
    noise.connect(filter).connect(noiseGain).connect(movementGain);
    movementGain.connect(master).connect(context.destination);

    tone.start();
    overtone.start();
    noise.start();

    audioState.context = context;
    audioState.movementGain = movementGain;
    audioState.tone = tone;
    audioState.overtone = overtone;
    audioState.filter = filter;
    audioState.noiseGain = noiseGain;
  }

  function unlockMovementAudio() {
    ensureMovementAudio();

    if (audioState.context?.state === "suspended") {
      audioState.context.resume();
    }

    audioState.unlocked = Boolean(audioState.context);
  }

  function updateMovementSound(player, speedRatio, sceneClamp) {
    if (!audioState.context || !audioState.movementGain) return;

    const speed = Math.hypot(player.vx || 0, player.vy || 0);
    const maxSpeed = player.maxSpeed || 1;
    const moving = speed > 18;
    const lateralPush = sceneClamp(Math.abs(player.vx || 0) / maxSpeed, 0, 1);
    const normalizedSpeed = sceneClamp(speedRatio, 0, 1);
    const now = audioState.context.currentTime;
    const targetGain = moving ? 0.012 + normalizedSpeed * 0.04 : 0;

    audioState.movementGain.gain.setTargetAtTime(targetGain, now, moving ? 0.14 : 0.24);
    audioState.tone.frequency.setTargetAtTime(52 + normalizedSpeed * 22 + lateralPush * 4, now, 0.08);
    audioState.overtone.frequency.setTargetAtTime(118 + normalizedSpeed * 30 + player.thrustPower * 8, now, 0.08);
    audioState.filter.frequency.setTargetAtTime(900 + normalizedSpeed * 680 + lateralPush * 180, now, 0.1);
    audioState.noiseGain.gain.setTargetAtTime(0.065 + normalizedSpeed * 0.085, now, 0.12);
  }

  function silenceMovementAudio() {
    if (!audioState.context || !audioState.movementGain) return;

    audioState.movementGain.gain.setTargetAtTime(0, audioState.context.currentTime, 0.16);
  }

  function installMovementAudioUnlockListeners() {
    if (movementAudioListenersReady) return;
    movementAudioListenersReady = true;

    global.addEventListener("pointerdown", unlockMovementAudio, { passive: true });
    global.addEventListener("keydown", unlockMovementAudio, { passive: true });
    global.addEventListener("pagehide", silenceMovementAudio, { passive: true });
    global.addEventListener("blur", silenceMovementAudio, { passive: true });
    global.document?.addEventListener("visibilitychange", () => {
      if (global.document.hidden) {
        silenceMovementAudio();
      }
    });
  }

  function assetSources(basePath) {
    const versioned = (source) => `${source}?v=${ASSET_VERSION}`;
    return {
      back: versioned(`${basePath}/mecha-back.png`),
      side: [
        versioned(`${basePath}/pocobot-mecha-side-left-aero-00.png`),
        versioned(`${basePath}/pocobot-mecha-side-left-aero-01.png`),
        versioned(`${basePath}/pocobot-mecha-side-left-aero-02.png`),
        versioned(`${basePath}/pocobot-mecha-side-left-aero-03.png`),
        versioned(`${basePath}/pocobot-mecha-side-left-aero-04.png`),
      ],
      hover: [
        versioned(`${basePath}/pocobot-mecha-idle-hover-00.png`),
        versioned(`${basePath}/pocobot-mecha-idle-hover-02.png`),
        versioned(`${basePath}/pocobot-mecha-idle-hover-03.png`),
        versioned(`${basePath}/pocobot-mecha-idle-hover-04.png`),
        versioned(`${basePath}/pocobot-mecha-idle-hover-05.png`),
        versioned(`${basePath}/pocobot-mecha-idle-hover-01.png`),
      ],
      sideFrameVerticalOffsets: SIDE_FRAME_VERTICAL_OFFSETS,
    };
  }

  function create(options) {
    const ctx = options.ctx;
    const player = options.player;
    const assets = options.assets;
    const particles = [];
    const scale = (options.baseSize || player.spriteWidth || 190) / 178;
    const frontSize = options.baseSize || player.spriteWidth || 190;
    const sideSize = frontSize * (184 / 178);
    const backSize = frontSize * (196 / 178);
    const hoverSize = frontSize;
    const sceneDamp = options.damp || damp;
    const sceneClamp = options.clamp || clamp;
    const drawSoftShadow = options.drawSoftShadow || drawDefaultShadow;
    const sideFrameVerticalOffsets = options.sideFrameVerticalOffsets || SIDE_FRAME_VERTICAL_OFFSETS;
    const rearThrusters = [
      { side: -39 * scale, rear: 42 * scale, width: 16 * scale, phase: 0.1 },
      { side: 39 * scale, rear: 42 * scale, width: 16 * scale, phase: 1.7 },
    ];
    const lateralThrusters = [
      { side: 0, rear: 28 * scale, width: 20 * scale, phase: 0.9 },
    ];

    ensurePlayerState();

    function ensurePlayerState() {
      if (!player.facing) player.facing = "down";
      if (!Number.isFinite(player.bob)) player.bob = 0;
      if (!Number.isFinite(player.sideBlend)) player.sideBlend = 0;
      if (!Number.isFinite(player.thrustPower)) player.thrustPower = 0;
      if (!Number.isFinite(player.thrustCycle)) player.thrustCycle = 0;
      if (!Number.isFinite(player.leanAmount)) player.leanAmount = 0;
      if (!Number.isFinite(player.leanSide)) player.leanSide = 0;
      if (!Number.isFinite(player.flameSkewX)) player.flameSkewX = 0;
      if (!Number.isFinite(player.flameSkewY)) player.flameSkewY = 0;
      if (!Number.isFinite(player.particleDebt)) player.particleDebt = 0;
    }

    function getFacingVector() {
      if (player.facing === "up") return { x: 0, y: -1 };
      if (player.facing === "left") return { x: -1, y: 0 };
      if (player.facing === "right") return { x: 1, y: 0 };
      return { x: 0, y: 1 };
    }

    function updateFacing() {
      const speed = Math.hypot(player.vx, player.vy);
      if (speed < 16) return;

      const nx = player.vx / speed;
      const ny = player.vy / speed;

      if (ny < -0.48 && Math.abs(ny) >= Math.abs(nx) * 0.72) {
        player.facing = "up";
        return;
      }

      if (nx > 0.16) {
        player.facing = "right";
        return;
      }

      if (nx < -0.16) {
        player.facing = "left";
        return;
      }

      if (ny > 0.22) {
        player.facing = "down";
      }
    }

    function getThrustBasis() {
      const speed = Math.hypot(player.vx, player.vy);
      const facingVector = getFacingVector();
      const forwardX = speed > 10 ? player.vx / speed : facingVector.x;
      const forwardY = speed > 10 ? player.vy / speed : facingVector.y;
      const absX = Math.abs(forwardX);
      const absY = Math.abs(forwardY);
      let mode = "diagonal";

      if (absX > absY * 1.1) {
        mode = "horizontal";
      } else if (forwardY < -0.35) {
        mode = "up";
      } else if (forwardY > 0.35) {
        mode = "down";
      }

      return {
        forwardX,
        forwardY,
        tailX: -forwardX,
        tailY: -forwardY,
        sideX: -forwardY,
        sideY: forwardX,
        tailAngle: Math.atan2(-forwardY, -forwardX),
        mode,
      };
    }

    function getThrusterOrigin(thruster) {
      const basis = getThrustBasis();
      let rear = thruster.rear + player.leanAmount * 8 * scale + player.thrustPower * 5 * scale;
      let sideScale = 1 - player.leanAmount * 0.04;
      let hoverOffsetY = (24 + player.leanAmount * 4) * scale;

      if (basis.mode === "horizontal") {
        rear = thruster.rear + player.leanAmount * 7 * scale + player.thrustPower * 4 * scale;
        sideScale = 0.48;
        hoverOffsetY = (-38 + player.leanAmount * 1.5) * scale;
      } else if (basis.mode === "up") {
        rear = (23 + player.leanAmount * 7 + player.thrustPower * 4) * scale;
        sideScale = 0.82;
        hoverOffsetY = (17 + player.leanAmount * 3) * scale;
      } else if (basis.mode === "diagonal") {
        rear = (32 + player.leanAmount * 7 + player.thrustPower * 4) * scale;
        sideScale = 0.72;
        hoverOffsetY = (8 + player.leanAmount * 3) * scale;
      }

      const side = thruster.side * sideScale;

      return {
        basis,
        x: player.x + basis.tailX * rear + basis.sideX * side,
        y: player.y + basis.tailY * rear + basis.sideY * side + hoverOffsetY,
      };
    }

    function getActiveThrusters() {
      return getThrustBasis().mode === "horizontal" ? lateralThrusters : rearThrusters;
    }

    function emitExhaustParticle(thruster, power) {
      const origin = getThrusterOrigin(thruster);
      const scatterWidth = origin.basis.mode === "horizontal" ? 0.46 : 0.34;
      const scatter = player.leanSide * 0.04 + (Math.random() - 0.5) * scatterWidth;
      const directionX = origin.basis.tailX + origin.basis.sideX * scatter;
      const directionY = origin.basis.tailY + origin.basis.sideY * scatter;
      const directionLength = Math.hypot(directionX, directionY) || 1;
      const backwardX = directionX / directionLength;
      const backwardY = directionY / directionLength;
      const speed = 72 * scale + power * 104 * scale + Math.random() * 36 * scale;

      particles.push({
        x: origin.x + backwardX * 10 * scale,
        y: origin.y + backwardY * 10 * scale,
        vx: backwardX * speed - player.vx * 0.22,
        vy: backwardY * speed - player.vy * 0.22,
        age: 0,
        life: 0.28 + Math.random() * 0.18,
        size: 2.2 * scale + Math.random() * 4 * scale + power * 2.6 * scale,
      });

      if (particles.length > 90) {
        particles.splice(0, particles.length - 90);
      }
    }

    function updateParticles(dt, hasInput, speedRatio) {
      const power = player.thrustPower * (hasInput ? 1 : 0.45 + speedRatio * 0.4);
      player.particleDebt += power * dt * 18;
      const activeThrusters = getActiveThrusters();

      while (player.particleDebt >= 1) {
        const thruster = activeThrusters[Math.floor(Math.random() * activeThrusters.length)];
        emitExhaustParticle(thruster, power);
        player.particleDebt -= 1;
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];
        particle.age += dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 1 - Math.min(0.9, dt * 1.8);
        particle.vy *= 1 - Math.min(0.9, dt * 1.8);

        if (particle.age >= particle.life) {
          particles.splice(i, 1);
        }
      }
    }

    function update(dt, hasInput, speedRatio) {
      ensurePlayerState();

      const sideSlip = sceneClamp(player.vx / player.maxSpeed, -1, 1);
      const forwardSlip = sceneClamp(player.vy / player.maxSpeed, -1, 1);
      const desiredLean = hasInput ? sceneClamp(0.58 + speedRatio * 0.44, 0, 1) : speedRatio * 0.36;
      const desiredThrust = hasInput ? 0.56 + speedRatio * 0.5 : speedRatio * 0.3;
      const lateralIntent = Math.abs(player.vx) > Math.abs(player.vy) * 0.55
        ? sceneClamp((Math.abs(player.vx) / player.maxSpeed - 0.04) / 0.34, 0, 1)
        : 0;

      player.leanAmount = sceneDamp(player.leanAmount, desiredLean, hasInput ? 8.4 : 4.2, dt);
      player.leanSide = sceneDamp(player.leanSide, sideSlip, 6.8, dt);
      player.sideBlend = sceneDamp(player.sideBlend, lateralIntent, lateralIntent > player.sideBlend ? 3.2 : 6.2, dt);
      player.thrustPower = sceneDamp(player.thrustPower, desiredThrust, hasInput ? 11 : 5, dt);
      player.flameSkewX = sceneDamp(player.flameSkewX, -sideSlip * 22, 10, dt);
      player.flameSkewY = sceneDamp(player.flameSkewY, -forwardSlip * 12, 10, dt);
      player.thrustCycle += dt * (8 + Math.hypot(player.vx, player.vy) * 0.035);
      player.bob += dt * (3.8 + player.thrustPower * 5.2);
      player.glow += dt * 3.2;
      updateFacing();
      updateParticles(dt, hasInput, speedRatio);
      updateMovementSound(player, speedRatio, sceneClamp);
    }

    function drawDefaultShadow(x, y, width, height, alpha) {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 0.5);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawShadow() {
      const speedRatio = sceneClamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1);
      const lift = player.thrustPower * 0.3;
      drawSoftShadow(
        player.x,
        player.y + 82 * scale,
        96 * scale + speedRatio * 34 * scale,
        29 * scale - lift * 8 * scale,
        0.34 - lift * 0.12,
      );
    }

    function drawExhaustParticles() {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      particles.forEach((particle) => {
        const fade = 1 - particle.age / particle.life;
        const radius = particle.size * (0.55 + fade * 0.75);
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, radius);

        gradient.addColorStop(0, `rgba(230, 255, 255, ${0.55 * fade})`);
        gradient.addColorStop(0.32, `rgba(45, 230, 255, ${0.42 * fade})`);
        gradient.addColorStop(1, "rgba(0, 60, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    function drawFlameJet(thruster, power) {
      const origin = getThrusterOrigin(thruster);
      const speed = Math.hypot(player.vx, player.vy);
      const speedRatio = sceneClamp(speed / player.maxSpeed, 0, 1);
      const pulse = 0.82 + Math.sin(player.thrustCycle + thruster.phase) * 0.18;
      const directionalBoost = origin.basis.mode === "horizontal" ? 1.12 : origin.basis.mode === "up" ? 0.96 : 1;
      const length = (16 * scale + power * 44 * scale + speedRatio * 16 * scale) * pulse * directionalBoost;
      const width = thruster.width * (origin.basis.mode === "horizontal" ? 0.9 + power * 0.42 : 0.72 + power * 0.48);
      const lick = Math.sin(player.thrustCycle * 1.7 + thruster.phase) * width * 0.18;
      const sideBend = (origin.basis.mode === "horizontal" ? player.leanSide * 7 * scale : player.flameSkewX * scale) * (0.55 + power * 0.45);
      const tailBend = player.flameSkewY * scale * (origin.basis.mode === "up" ? 0.42 : 0.64);
      const tipX = sideBend + lick;
      const tipY = -length + tailBend;
      const midSkew = sideBend * 0.38;

      ctx.save();
      ctx.translate(origin.x, origin.y);
      ctx.rotate(origin.basis.tailAngle + Math.PI / 2);
      ctx.globalCompositeOperation = "lighter";

      const outer = ctx.createLinearGradient(tipX, tipY, 0, 8 * scale);
      outer.addColorStop(0, "rgba(0, 54, 255, 0)");
      outer.addColorStop(0.32, `rgba(0, 148, 255, ${0.16 + power * 0.22})`);
      outer.addColorStop(0.78, `rgba(30, 236, 255, ${0.24 + power * 0.42})`);
      outer.addColorStop(1, "rgba(255, 255, 255, 0.78)");

      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.moveTo(-width * 0.55, 5 * scale);
      ctx.bezierCurveTo(-width * 0.95 + midSkew, -length * 0.28, -width * 0.35 + midSkew, -length * 0.74, tipX, tipY);
      ctx.bezierCurveTo(width * 0.34 + midSkew, -length * 0.72, width * 0.9 + midSkew, -length * 0.25, width * 0.55, 5 * scale);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(230, 255, 255, ${0.18 + power * 0.34})`;
      ctx.beginPath();
      ctx.moveTo(-width * 0.23, 2 * scale);
      ctx.bezierCurveTo(-width * 0.3 + midSkew * 0.5, -length * 0.28, -width * 0.1 + midSkew * 0.7, -length * 0.62, tipX * 0.62, tipY * 0.78);
      ctx.bezierCurveTo(width * 0.18 + midSkew * 0.6, -length * 0.58, width * 0.28, -length * 0.2, width * 0.2, 2 * scale);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function drawThrusterGroundGlow(thruster, power) {
      const origin = getThrusterOrigin(thruster);
      const glowX = origin.x + origin.basis.tailX * (30 * scale + power * 16 * scale);
      const glowY = origin.y + origin.basis.tailY * (30 * scale + power * 16 * scale);
      const radius = 18 * scale + power * 24 * scale;
      const gradient = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, radius);

      gradient.addColorStop(0, `rgba(160, 250, 255, ${0.24 * power})`);
      gradient.addColorStop(0.42, `rgba(18, 210, 255, ${0.18 * power})`);
      gradient.addColorStop(1, "rgba(0, 120, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(glowX, glowY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawThrusterEffects() {
      const speedRatio = sceneClamp(Math.hypot(player.vx, player.vy) / player.maxSpeed, 0, 1);
      const power = player.thrustPower * (0.55 + speedRatio * 0.45);

      if (power < 0.04) return;

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      getActiveThrusters().forEach((thruster) => drawThrusterGroundGlow(thruster, power));
      ctx.restore();

      getActiveThrusters().forEach((thruster) => drawFlameJet(thruster, power));
    }

    function drawImageFrame(frame, size, offsetY = 0) {
      if (!frame) return;
      ctx.drawImage(frame, -size / 2, -size / 2 + offsetY, size, size);
    }

    function drawFrontLeanSprite(size, leanOverride = player.leanAmount) {
      const frames = assets.frontFrames && assets.frontFrames.length ? assets.frontFrames : assets.botFrames;
      if (!frames || !frames.length) return;
      const framePosition = sceneClamp(leanOverride, 0, 1) * (frames.length - 1);
      const frameIndex = sceneClamp(Math.round(framePosition), 0, frames.length - 1);

      drawImageFrame(frames[frameIndex], size);
    }

    function drawHoverSprite(size) {
      const frames = assets.hoverFrames && assets.hoverFrames.length ? assets.hoverFrames : assets.botFrames;
      if (!frames || !frames.length) return;

      if (frames.length === 1) {
        drawImageFrame(frames[0], size);
        return;
      }

      const cycle = ((player.thrustCycle * 0.16) % 1 + 1) % 1;
      const progress = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
      const frameIndex = sceneClamp(Math.round(progress * (frames.length - 1)), 0, frames.length - 1);

      drawImageFrame(frames[frameIndex], size);
    }

    function drawSideLeanSprite(size) {
      const frames = assets.sideFrames && assets.sideFrames.length ? assets.sideFrames : assets.botFrames;
      if (!frames || !frames.length) return;
      const framePosition = sceneClamp(player.sideBlend, 0, 1) * (frames.length - 1);
      const frameIndex = sceneClamp(Math.round(framePosition), 0, frames.length - 1);
      const offsetY = (sideFrameVerticalOffsets[frameIndex] || 0) * (size / 768);

      ctx.drawImage(frames[frameIndex], -size / 2, -size / 2 + offsetY, size, size);
    }

    function drawBackRetractedSprite(size) {
      const image = assets.backFrame;
      if (!image) {
        drawFrontLeanSprite(size, 0.24);
        return;
      }

      const upperRatio = 0.58;
      const sourceUpperHeight = image.height * upperRatio;
      const lowerSourceHeight = image.height - sourceUpperHeight;
      const retract = player.leanAmount * 15 * scale;
      const lowerScaleX = 1 - player.leanAmount * 0.08;
      const lowerScaleY = 0.99 - player.leanAmount * 0.06;

      ctx.drawImage(
        image,
        0,
        0,
        image.width,
        sourceUpperHeight,
        -size / 2,
        -size / 2,
        size,
        size * upperRatio,
      );

      ctx.drawImage(
        image,
        0,
        sourceUpperHeight,
        image.width,
        lowerSourceHeight,
        -(size * lowerScaleX) / 2,
        -size / 2 + size * upperRatio - retract,
        size * lowerScaleX,
        size * (1 - upperRatio) * lowerScaleY,
      );
    }

    function draw() {
      const speed = Math.hypot(player.vx, player.vy);
      const idleHover = speed < 18;
      const goingUp = !idleHover && player.facing === "up";
      const goingSide = !idleHover && (player.facing === "left" || player.facing === "right");
      const mirrorRight = player.facing === "right";
      const sideMix = goingSide ? sceneClamp(player.sideBlend, 0, 1) : 0;
      const sidePose = sideMix * sideMix * (3 - 2 * sideMix);
      const speedRatio = sceneClamp(speed / player.maxSpeed, 0, 1);
      const bob = Math.sin(player.bob) * (1.4 * scale + player.thrustPower * 3.2 * scale);
      const bodyLift = goingSide ? 0 : player.thrustPower * 8 * scale;
      const sideOffset = player.leanSide * (3 * scale + sidePose * 3.5 * scale);
      const flightStretch = 1 + speedRatio * 0.025;
      const sideBank = goingSide ? -(0.05 + player.leanAmount * 0.11 + speedRatio * 0.04) : 0;

      drawShadow();
      drawExhaustParticles();
      if (!idleHover) {
        drawThrusterEffects();
      }

      ctx.save();
      ctx.translate(player.x + sideOffset, player.y + bob - bodyLift);

      if (mirrorRight) {
        ctx.scale(-1, 1);
      }

      if (goingSide) {
        ctx.rotate(sideBank * sidePose);
        ctx.transform(1, 0, -0.045 * player.leanAmount * sidePose, 1, 0, 0);
      }

      ctx.scale(flightStretch, 1);

      if (idleHover) {
        drawHoverSprite(hoverSize);
      } else if (goingUp) {
        drawBackRetractedSprite(backSize);
      } else if (goingSide) {
        drawSideLeanSprite(sideSize);
      } else {
        drawFrontLeanSprite(frontSize);
      }

      ctx.restore();
    }

    return { update, draw };
  }

  global.PoCoBOTPlayerVisual = {
    assetSources,
    create,
    audioState,
    createNoiseBuffer,
    ensureMovementAudio,
    unlockMovementAudio,
    updateMovementSound,
    silenceMovementAudio,
    sideFrameVerticalOffsets: SIDE_FRAME_VERTICAL_OFFSETS,
  };

  installMovementAudioUnlockListeners();
})(window);
