"use strict";

const canvas = document.getElementById("battlefield");
const ctx = canvas.getContext("2d");

const ui = {
  role: document.getElementById("role"),
  difficulty: document.getElementById("difficulty"),
  startBtn: document.getElementById("startBtn"),
  nextWaveBtn: document.getElementById("nextWaveBtn"),
  attackerPanel: document.getElementById("attackerPanel"),
  defenderPanel: document.getElementById("defenderPanel"),
  weaponType: document.getElementById("weaponType"),
  targetType: document.getElementById("targetType"),
  qty: document.getElementById("qty"),
  addAttack: document.getElementById("addAttack"),
  massAttack: document.getElementById("massAttack"),
  queueInfo: document.getElementById("queueInfo"),
  lr: document.getElementById("lr"),
  mr: document.getElementById("mr"),
  cr: document.getElementById("cr"),
  fighterTarget: document.getElementById("fighterTarget"),
  aaTarget: document.getElementById("aaTarget"),
  priorityTarget: document.getElementById("priorityTarget"),
  waveStat: document.getElementById("waveStat"),
  budgetStat: document.getElementById("budgetStat"),
  radarStat: document.getElementById("radarStat"),
  ammoStat: document.getElementById("ammoStat"),
  hpRow: document.getElementById("hpRow"),
  log: document.getElementById("log"),
  headline: document.getElementById("headline"),
  statusLine: document.getElementById("statusLine"),
  modePill: document.getElementById("modePill")
};

const DIFFICULTIES = {
  easy: {
    attackerScale: 0.85,
    defenseScale: 1.08,
    detectionBonus: 0.1,
    jammer: 0
  },
  medium: {
    attackerScale: 1,
    defenseScale: 1,
    detectionBonus: 0,
    jammer: 0.04
  },
  hard: {
    attackerScale: 1.18,
    defenseScale: 0.94,
    detectionBonus: -0.06,
    jammer: 0.08
  }
};

const WEAPONS = {
  ballistic: {
    label: "Ballistic Missile",
    speed: 0.18,
    hp: 1,
    damage: 16,
    stealth: 0.04,
    jitter: 0.02,
    altitude: 1,
    size: 1,
    threat: 1.1,
    color: "#ff9d5f"
  },
  hypersonic: {
    label: "Hypersonic Glide",
    speed: 0.28,
    hp: 1,
    damage: 28,
    stealth: 0.16,
    jitter: 0.12,
    altitude: 0.85,
    size: 1.2,
    threat: 1.7,
    color: "#ff5f5f"
  },
  cruise: {
    label: "Cruise Missile",
    speed: 0.12,
    hp: 1,
    damage: 15,
    stealth: 0.18,
    jitter: 0.06,
    altitude: 0.3,
    size: 0.92,
    threat: 1.15,
    color: "#ffd972"
  },
  drone: {
    label: "Attack Drone",
    speed: 0.085,
    hp: 1,
    damage: 7,
    stealth: 0.12,
    jitter: 0.08,
    altitude: 0.18,
    size: 0.78,
    threat: 0.6,
    color: "#7be0ff"
  },
  swarm: {
    label: "Drone Swarm",
    speed: 0.075,
    hp: 5,
    damage: 18,
    stealth: 0.24,
    jitter: 0.18,
    altitude: 0.12,
    size: 1.5,
    threat: 1.5,
    color: "#a5f5ff"
  }
};

const DEFENSES = {
  long: {
    label: "Long",
    success: 0.72,
    range: 0.68,
    cooldown: 520,
    color: "#90e0ff",
    targets: new Set(["ballistic", "hypersonic", "cruise"])
  },
  medium: {
    label: "Medium",
    success: 0.61,
    range: 0.46,
    cooldown: 360,
    color: "#8df9a6",
    targets: new Set(["ballistic", "cruise", "drone", "swarm"])
  },
  close: {
    label: "Close",
    success: 0.43,
    range: 0.18,
    cooldown: 220,
    color: "#ffe27c",
    targets: new Set(["ballistic", "cruise", "drone", "swarm", "hypersonic"])
  }
};

const TARGETS_BLUEPRINT = [
  { id: "capital", name: "Aster Capital", kind: "capital", x: 640, y: 646, hp: 100, major: true, ally: false },
  { id: "airbase", name: "Skylance Airbase", kind: "airbase", x: 420, y: 612, hp: 82, major: false, ally: false },
  { id: "radar", name: "Northwatch Radar", kind: "radar", x: 860, y: 565, hp: 72, major: false, ally: false },
  { id: "cityA", name: "Helios City", kind: "city", x: 298, y: 514, hp: 78, major: true, ally: false },
  { id: "cityB", name: "Vela Harbor", kind: "city", x: 980, y: 500, hp: 76, major: true, ally: false },
  { id: "ally", name: "Cindrel Port", kind: "ally", x: 720, y: 448, hp: 64, major: false, ally: true }
];

const LAUNCH_ZONES = [
  { x: 210, y: 118 },
  { x: 630, y: 90 },
  { x: 1080, y: 130 }
];

const state = {
  playerRole: "defender",
  difficulty: "medium",
  wave: 0,
  maxWaves: 10,
  readiness: 100,
  campaignOver: false,
  message: "Choose a side and begin the first wave.",
  logs: [],
  queuedAttacks: [],
  projectiles: [],
  intercepts: [],
  particles: [],
  defenders: null,
  targets: [],
  animation: {
    running: false,
    startedAt: 0,
    duration: 15000,
    time: 0
  },
  lastFrame: 0,
  pulse: 0
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chance(value) {
  return Math.random() < value;
}

function cloneTarget(target) {
  return {
    ...target,
    maxHp: target.hp,
    hpCurrent: target.hp,
    destroyed: false,
    glow: 0,
    damageFlash: 0
  };
}

function resetCampaign() {
  state.playerRole = ui.role.value;
  state.difficulty = ui.difficulty.value;
  state.wave = 0;
  state.readiness = 100;
  state.campaignOver = false;
  state.message = "Campaign ready. Launch the opening wave.";
  state.logs = [];
  state.queuedAttacks = [];
  state.projectiles = [];
  state.intercepts = [];
  state.particles = [];
  state.targets = TARGETS_BLUEPRINT.map(cloneTarget);
  state.defenders = makeDefenders();
  state.animation.running = false;
  state.animation.time = 0;
  state.lastFrame = 0;

  populateSelects();
  addLog("Theater initialized. Skyshield and Crimson Tide enter open conflict.");
  addLog(state.playerRole === "defender"
    ? "You command Alliance A. Preserve the capital and keep three major sites alive."
    : "You command Alliance B. Break the shield with mixed salvos and drone exhaustion.");
  updatePanels();
  render();
}

function makeDefenders() {
  return {
    stock: {
      long: 18,
      medium: 24,
      close: 30
    },
    fighters: 6,
    fighterFuel: 6,
    aaIntegrity: 100,
    aiCooldowns: {
      long: 0,
      medium: 0,
      close: 0
    },
    currentPlan: null
  };
}

function populateSelects() {
  ui.weaponType.innerHTML = Object.entries(WEAPONS)
    .map(([id, weapon]) => `<option value="${id}">${weapon.label}</option>`)
    .join("");

  const targetOptions = state.targets
    .map((target) => `<option value="${target.id}">${target.name}</option>`)
    .join("");

  ui.targetType.innerHTML = targetOptions;
  ui.fighterTarget.innerHTML = `<option value="none">No Patrol</option>${targetOptions}`;
  ui.aaTarget.innerHTML = `<option value="auto">Auto Screen</option>${targetOptions}`;
  ui.priorityTarget.innerHTML = targetOptions;

  ui.fighterTarget.value = "capital";
  ui.aaTarget.value = "auto";
  ui.priorityTarget.value = "capital";
}

function addLog(text) {
  const timestamp = `${String(new Date().getMinutes()).padStart(2, "0")}:${String(new Date().getSeconds()).padStart(2, "0")}`;
  state.logs.unshift({ text, timestamp });
  state.logs = state.logs.slice(0, 18);
  ui.log.innerHTML = state.logs.map((entry) => `<div class="log-entry"><strong>${entry.timestamp}</strong> ${entry.text}</div>`).join("");
}

function getTargetById(id) {
  return state.targets.find((target) => target.id === id);
}

function livingTargets() {
  return state.targets.filter((target) => !target.destroyed);
}

function currentRadarStrength() {
  const radar = getTargetById("radar");
  const base = radar && !radar.destroyed ? radar.hpCurrent / radar.maxHp : 0;
  const difficulty = DIFFICULTIES[state.difficulty];
  return clamp(0.34 + base * 0.5 + difficulty.detectionBonus, 0.08, 0.96);
}

function currentReadiness() {
  const capital = getTargetById("capital");
  const airbase = getTargetById("airbase");
  const radar = getTargetById("radar");
  const capitalFactor = capital.hpCurrent / capital.maxHp;
  const airbaseFactor = airbase.hpCurrent / airbase.maxHp;
  const radarFactor = radar.hpCurrent / radar.maxHp;
  return Math.round((capitalFactor * 45 + airbaseFactor * 25 + radarFactor * 30) * 100 / 100);
}

function queueAttack(type, targetId, qty) {
  const target = getTargetById(targetId);
  if (!target || target.destroyed) {
    return;
  }
  state.queuedAttacks.push({ type, targetId, qty });
  updateQueueInfo();
}

function updateQueueInfo() {
  if (!state.queuedAttacks.length) {
    ui.queueInfo.textContent = "No strikes queued.";
    return;
  }

  ui.queueInfo.textContent = state.queuedAttacks
    .map((attack) => `${attack.qty} ${WEAPONS[attack.type].label}${attack.qty > 1 ? "s" : ""} -> ${getTargetById(attack.targetId)?.name ?? attack.targetId}`)
    .join(" | ");
}

function buildPlayerDefensePlan() {
  const long = clamp(parseInt(ui.lr.value, 10) || 0, 0, state.defenders.stock.long);
  const medium = clamp(parseInt(ui.mr.value, 10) || 0, 0, state.defenders.stock.medium);
  const close = clamp(parseInt(ui.cr.value, 10) || 0, 0, state.defenders.stock.close);
  return {
    long,
    medium,
    close,
    fighterTarget: ui.fighterTarget.value,
    aaTarget: ui.aaTarget.value,
    priorityTarget: ui.priorityTarget.value
  };
}

function buildAIDefensePlan(attackPlan) {
  const priorityOrder = ["capital", "radar", "airbase", "cityB", "cityA", "ally"];
  const pressure = {};
  for (const entry of attackPlan) {
    pressure[entry.targetId] = (pressure[entry.targetId] || 0) + entry.qty * WEAPONS[entry.type].threat;
  }

  const priorityTarget = priorityOrder
    .map((id) => ({ id, score: pressure[id] || 0 }))
    .sort((a, b) => b.score - a.score)[0].id;

  const waveFactor = 1 + state.wave * 0.15;
  const scale = DIFFICULTIES[state.difficulty].defenseScale;
  const totalThreat = attackPlan.reduce((sum, entry) => sum + entry.qty * WEAPONS[entry.type].threat, 0);
  const desired = totalThreat * 1.1 * scale;

  return {
    long: Math.min(state.defenders.stock.long, Math.round(clamp(desired * 0.18 / waveFactor, 2, 8))),
    medium: Math.min(state.defenders.stock.medium, Math.round(clamp(desired * 0.26 / waveFactor, 3, 9))),
    close: Math.min(state.defenders.stock.close, Math.round(clamp(desired * 0.3 / waveFactor, 4, 11))),
    fighterTarget: getTargetById("airbase").destroyed ? "none" : priorityTarget,
    aaTarget: pressure.radar > pressure.capital ? "radar" : "auto",
    priorityTarget
  };
}

function buildAIAttackPlan() {
  const factor = DIFFICULTIES[state.difficulty].attackerScale;
  const living = livingTargets();
  const radar = getTargetById("radar");
  const airbase = getTargetById("airbase");
  const capital = getTargetById("capital");
  const plan = [];
  const waveWeight = state.wave + 1;

  const targetBias = [];
  if (!radar.destroyed) {
    targetBias.push("radar", "radar");
  }
  if (!airbase.destroyed) {
    targetBias.push("airbase", "airbase");
  }
  if (!capital.destroyed) {
    targetBias.push("capital", "capital", "capital");
  }

  for (const target of living) {
    if (target.kind === "city" || target.kind === "ally") {
      targetBias.push(target.id);
    }
  }

  const totalPackets = clamp(Math.round((2 + waveWeight * 0.45) * factor), 2, 6);
  for (let i = 0; i < totalPackets; i += 1) {
    const targetId = choose(targetBias);
    let type = "ballistic";
    const roll = Math.random();
    if (waveWeight > 1 && roll > 0.72) {
      type = "cruise";
    }
    if (waveWeight > 3 && roll > 0.85) {
      type = "hypersonic";
    }
    if (roll < 0.2 + waveWeight * 0.02) {
      type = chance(0.55) ? "drone" : "swarm";
    }

    const baseQty = {
      ballistic: rand(2, 5),
      hypersonic: rand(1, 2.8),
      cruise: rand(2, 4),
      drone: rand(4, 10),
      swarm: rand(1, 2.2)
    }[type];

    plan.push({
      type,
      targetId,
      qty: Math.max(1, Math.round(baseQty * factor))
    });
  }

  if (waveWeight >= 4 && !radar.destroyed) {
    plan.push({ type: "swarm", targetId: "radar", qty: Math.min(2 + Math.floor(waveWeight / 4), 3) });
  }

  if (waveWeight >= 6 && !capital.destroyed) {
    plan.push({ type: "hypersonic", targetId: "capital", qty: 1 + (state.difficulty === "hard" ? 1 : 0) });
  }

  return mergeAttackPlan(plan);
}

function mergeAttackPlan(plan) {
  const grouped = new Map();
  for (const entry of plan) {
    const key = `${entry.type}:${entry.targetId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += entry.qty;
    } else {
      grouped.set(key, { ...entry });
    }
  }
  return Array.from(grouped.values());
}

function makeProjectile(type, target, launchIndex, spawnDelay) {
  const weapon = WEAPONS[type];
  const from = LAUNCH_ZONES[launchIndex % LAUNCH_ZONES.length];
  const pathArc = rand(50, 180) * weapon.altitude;
  const id = `${type}-${performance.now()}-${Math.random()}`;

  return {
    id,
    type,
    targetId: target.id,
    targetName: target.name,
    fromX: from.x + rand(-40, 40),
    fromY: from.y + rand(-16, 16),
    toX: target.x + rand(-18, 18),
    toY: target.y + rand(-14, 14),
    x: from.x,
    y: from.y,
    progress: 0,
    speed: weapon.speed * rand(0.92, 1.14),
    hp: weapon.hp,
    maxHp: weapon.hp,
    damage: weapon.damage,
    stealth: weapon.stealth,
    altitude: weapon.altitude,
    arcHeight: pathArc,
    jitterSeed: rand(0, 1000),
    visible: false,
    destroyed: false,
    arrived: false,
    spawnDelay,
    launchIndex,
    trail: [],
    lastThreat: 0,
    label: weapon.label
  };
}

function buildWaveProjectiles(attackPlan) {
  const projectiles = [];
  let launchIndex = 0;
  for (const entry of attackPlan) {
    const target = getTargetById(entry.targetId);
    if (!target || target.destroyed) {
      continue;
    }
    for (let i = 0; i < entry.qty; i += 1) {
      projectiles.push(makeProjectile(entry.type, target, launchIndex, rand(0, 2800)));
      launchIndex += 1;
    }
  }
  return projectiles;
}

function runNextWave() {
  if (state.animation.running || state.campaignOver) {
    return;
  }

  if (state.wave >= state.maxWaves) {
    endCampaign(true, "Skyshield holds through the final wave.");
    return;
  }

  const attackPlan = state.playerRole === "attacker"
    ? mergeAttackPlan(state.queuedAttacks.length ? state.queuedAttacks : [{ type: "ballistic", targetId: "capital", qty: 2 }])
    : buildAIAttackPlan();
  const defensePlan = state.playerRole === "defender"
    ? buildPlayerDefensePlan()
    : buildAIDefensePlan(attackPlan);

  state.wave += 1;
  state.projectiles = buildWaveProjectiles(attackPlan);
  state.intercepts = [];
  state.particles = [];
  state.defenders.currentPlan = {
    ...defensePlan,
    remaining: {
      long: defensePlan.long,
      medium: defensePlan.medium,
      close: defensePlan.close
    },
    fightersAssigned: defensePlan.fighterTarget !== "none" && !getTargetById("airbase").destroyed && state.defenders.fighterFuel > 0
  };
  state.queuedAttacks = [];
  updateQueueInfo();

  addLog(`Wave ${state.wave} begins. ${describeAttackPlan(attackPlan)}`);
  addLog(`Defense posture: ${describeDefensePlan(state.defenders.currentPlan)}`);

  state.animation.running = true;
  state.animation.startedAt = performance.now();
  state.animation.duration = 14000 + state.projectiles.length * 110;
  state.animation.time = 0;
  ui.nextWaveBtn.disabled = true;
  ui.startBtn.disabled = true;
  ui.modePill.textContent = "Simulation Running";
  ui.statusLine.textContent = `Wave ${state.wave} is active. Defensive and strike systems are engaging in real time.`;
}

function describeAttackPlan(plan) {
  return plan.map((entry) => `${entry.qty} ${WEAPONS[entry.type].label}${entry.qty > 1 ? "s" : ""} toward ${getTargetById(entry.targetId)?.name ?? entry.targetId}`).join("; ");
}

function describeDefensePlan(plan) {
  const fighterText = plan.fightersAssigned ? `fighters on ${getTargetById(plan.fighterTarget)?.name ?? plan.fighterTarget}` : "fighters grounded";
  return `${plan.long} long, ${plan.medium} medium, ${plan.close} close interceptors, ${fighterText}, AA ${plan.aaTarget === "auto" ? "auto-screen" : `focused on ${getTargetById(plan.aaTarget)?.name ?? plan.aaTarget}`}`;
}

function endCampaign(defenderWon, reason) {
  state.campaignOver = true;
  state.animation.running = false;
  ui.nextWaveBtn.disabled = true;
  ui.startBtn.disabled = false;
  ui.modePill.textContent = defenderWon ? "Skyshield Victory" : "Crimson Tide Victory";
  ui.statusLine.textContent = reason;
  addLog(reason);
}

function applyDamage(targetId, amount, sourceType) {
  const target = getTargetById(targetId);
  if (!target || target.destroyed) {
    return;
  }

  target.hpCurrent = clamp(target.hpCurrent - amount, 0, target.maxHp);
  target.damageFlash = 1;
  target.glow = 1;
  createExplosion(target.x, target.y, amount > 18 ? 24 : 16, sourceType === "swarm" ? "#9df3ff" : "#ff9b75");

  if (target.hpCurrent <= 0) {
    target.destroyed = true;
    addLog(`${target.name} has been destroyed.`);
    if (target.kind === "capital") {
      endCampaign(false, "The capital has fallen. Crimson Tide breaks the coalition.");
      return;
    }
    if (target.kind === "airbase") {
      addLog("Fighter operations are lost with the airbase.");
    }
    if (target.kind === "radar") {
      addLog("Radar coverage collapses. Detection will be badly degraded.");
    }
  } else {
    addLog(`${target.name} suffers ${Math.round(amount)} damage from ${WEAPONS[sourceType].label}.`);
  }

  const ruinedMajors = state.targets.filter((targetEntry) => targetEntry.major && targetEntry.destroyed).length;
  if (ruinedMajors >= 3) {
    endCampaign(false, "Three major sites are gone. Crimson Tide overwhelms the defense grid.");
  }
}

function createExplosion(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      vx: rand(-2.8, 2.8),
      vy: rand(-2.2, 2.6),
      life: rand(340, 820),
      maxLife: rand(340, 820),
      color,
      size: rand(1.5, 4.5)
    });
  }
}

function resolveInterception(projectile, defenseType, plan) {
  if (projectile.destroyed || projectile.arrived) {
    return false;
  }

  const defense = DEFENSES[defenseType];
  if (!defense.targets.has(projectile.type)) {
    return false;
  }

  if (plan.remaining[defenseType] <= 0 || state.defenders.stock[defenseType] <= 0) {
    return false;
  }

  const effectiveRange = defense.range;
  if (projectile.progress < 1 - effectiveRange || projectile.spawnDelay > state.animation.time) {
    return false;
  }

  const target = getTargetById(projectile.targetId);
  const priorityBoost = plan.priorityTarget === projectile.targetId ? 0.14 : 0;
  const stealthPenalty = projectile.stealth * 0.55;
  const randomSwing = rand(-0.08, 0.08);
  const success = clamp(defense.success + priorityBoost - stealthPenalty + randomSwing, 0.12, 0.94);

  plan.remaining[defenseType] -= 1;
  state.defenders.stock[defenseType] -= 1;
  spawnIntercept(projectile, defenseType);

  if (chance(success)) {
    projectile.hp -= 1;
    if (projectile.hp <= 0) {
      projectile.destroyed = true;
      projectile.visible = true;
      createExplosion(projectile.x, projectile.y, projectile.type === "swarm" ? 18 : 10, defense.color);
      addLog(`${defense.label} interceptor kills ${projectile.label} headed for ${target.name}.`);
    } else {
      createExplosion(projectile.x, projectile.y, 8, defense.color);
      addLog(`${defense.label} interceptor fragments a swarm over ${target.name}.`);
    }
    return true;
  }

  createExplosion(projectile.x, projectile.y, 5, "#ffffff");
  addLog(`${defense.label} interceptor misses ${projectile.label} near ${target.name}.`);
  return true;
}

function spawnIntercept(projectile, defenseType) {
  const target = getTargetById(projectile.targetId);
  state.intercepts.push({
    type: defenseType,
    x: target.x,
    y: target.y + 10,
    toX: projectile.x,
    toY: projectile.y,
    life: 0,
    maxLife: defenseType === "long" ? 520 : defenseType === "medium" ? 400 : 300,
    color: DEFENSES[defenseType].color
  });
}

function resolveFighters(projectile, plan) {
  const airbase = getTargetById("airbase");
  if (!plan.fightersAssigned || airbase.destroyed || state.defenders.fighterFuel <= 0) {
    return false;
  }

  if (!(projectile.type === "drone" || projectile.type === "swarm" || projectile.type === "cruise")) {
    return false;
  }

  if (plan.fighterTarget !== projectile.targetId) {
    return false;
  }

  if (projectile.progress < 0.28 || projectile.progress > 0.76) {
    return false;
  }

  const success = projectile.type === "cruise" ? 0.58 : projectile.type === "swarm" ? 0.52 : 0.72;
  state.defenders.fighterFuel = Math.max(0, state.defenders.fighterFuel - 0.012);
  if (chance(success)) {
    projectile.hp -= projectile.type === "swarm" ? 1 : 999;
    createExplosion(projectile.x, projectile.y, projectile.type === "swarm" ? 10 : 8, "#b6f8ff");
    if (projectile.hp <= 0) {
      projectile.destroyed = true;
      addLog(`Fighter patrol destroys ${projectile.label} near ${getTargetById(projectile.targetId).name}.`);
    }
  }
  return true;
}

function resolveAAGuns(projectile, plan) {
  if (!(projectile.type === "drone" || projectile.type === "swarm")) {
    return false;
  }

  const aaFocus = plan.aaTarget;
  if (aaFocus !== "auto" && aaFocus !== projectile.targetId) {
    return false;
  }

  if (projectile.progress < 0.72) {
    return false;
  }

  const success = projectile.type === "swarm" ? 0.42 : 0.71;
  if (chance(success)) {
    projectile.hp -= 1;
    createExplosion(projectile.x, projectile.y, 6, "#ffd96b");
    if (projectile.hp <= 0) {
      projectile.destroyed = true;
      addLog(`AA guns cut down ${projectile.label} near ${getTargetById(projectile.targetId).name}.`);
    }
    return true;
  }
  return false;
}

function resolveDefenses() {
  const plan = state.defenders.currentPlan;
  if (!plan) {
    return;
  }

  const visiblePressure = state.projectiles.filter((projectile) => {
    if (projectile.destroyed || projectile.arrived || projectile.spawnDelay > state.animation.time) {
      return false;
    }
    if (!projectile.visible) {
      return false;
    }
    return true;
  });

  visiblePressure.sort((a, b) => {
    const aPriority = (plan.priorityTarget === a.targetId ? 3 : 0) + a.progress + WEAPONS[a.type].threat;
    const bPriority = (plan.priorityTarget === b.targetId ? 3 : 0) + b.progress + WEAPONS[b.type].threat;
    return bPriority - aPriority;
  });

  for (const projectile of visiblePressure) {
    resolveFighters(projectile, plan);
    resolveAAGuns(projectile, plan);
    resolveInterception(projectile, "long", plan);
    resolveInterception(projectile, "medium", plan);
    resolveInterception(projectile, "close", plan);
  }
}

function updateProjectiles(deltaMs) {
  const radarStrength = currentRadarStrength();
  const jammerPenalty = DIFFICULTIES[state.difficulty].jammer;
  const totalDrones = state.projectiles.filter((projectile) => !projectile.destroyed && !projectile.arrived && (projectile.type === "drone" || projectile.type === "swarm")).length;
  const saturationPenalty = totalDrones >= 20 ? 0.18 : totalDrones >= 12 ? 0.08 : 0;

  for (const projectile of state.projectiles) {
    if (projectile.destroyed || projectile.arrived) {
      continue;
    }

    if (projectile.spawnDelay > state.animation.time) {
      continue;
    }

    const effectiveDetection = clamp(radarStrength - projectile.stealth - jammerPenalty - saturationPenalty, 0.05, 0.96);
    if (!projectile.visible && chance(effectiveDetection * 0.06 + projectile.progress * 0.08)) {
      projectile.visible = true;
    }

    projectile.progress = clamp(projectile.progress + projectile.speed * (deltaMs / 1000), 0, 1);
    const t = projectile.progress;
    const curveX = projectile.fromX + (projectile.toX - projectile.fromX) * t;
    const curveY = projectile.fromY + (projectile.toY - projectile.fromY) * t;
    const arc = Math.sin(t * Math.PI) * projectile.arcHeight;
    const sway = Math.sin(projectile.jitterSeed + t * 14) * projectile.altitude * 14 * WEAPONS[projectile.type].jitter;
    projectile.x = curveX + sway;
    projectile.y = curveY - arc + Math.cos(projectile.jitterSeed + t * 20) * projectile.altitude * 8 * WEAPONS[projectile.type].jitter;
    projectile.trail.push({ x: projectile.x, y: projectile.y, alpha: 1 });
    if (projectile.trail.length > 18) {
      projectile.trail.shift();
    }

    if (projectile.progress >= 1) {
      projectile.arrived = true;
      projectile.visible = true;
      applyDamage(projectile.targetId, projectile.damage, projectile.type);
    }
  }
}

function updateIntercepts(deltaMs) {
  for (const trail of state.intercepts) {
    trail.life += deltaMs;
  }
  state.intercepts = state.intercepts.filter((trail) => trail.life < trail.maxLife);

  for (const particle of state.particles) {
    particle.life -= deltaMs;
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.03;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function finishWave() {
  state.animation.running = false;
  ui.nextWaveBtn.disabled = false;
  ui.startBtn.disabled = false;
  ui.modePill.textContent = "Simulation Idle";

  state.readiness = currentReadiness();
  state.defenders.fighterFuel = clamp(state.defenders.fighterFuel + 1.2, 0, 6);

  const survivingThreats = state.projectiles.filter((projectile) => !projectile.destroyed && !projectile.arrived);
  if (survivingThreats.length) {
    for (const projectile of survivingThreats) {
      applyDamage(projectile.targetId, projectile.damage * 0.35, projectile.type);
      projectile.destroyed = true;
    }
  }

  if (state.campaignOver) {
    return;
  }

  if (state.wave >= state.maxWaves) {
    endCampaign(true, "Skyshield survives all ten waves and stabilizes the Orion Gulf.");
    return;
  }

  ui.statusLine.textContent = `Wave ${state.wave} complete. Re-arm and choose the next posture.`;
  addLog(`Wave ${state.wave} ends. Readiness stands at ${state.readiness}.`);
}

function updateSimulation(now) {
  const deltaMs = clamp(now - (state.lastFrame || now), 16, 40);
  state.lastFrame = now;
  state.pulse += deltaMs * 0.0015;

  if (state.animation.running) {
    state.animation.time = now - state.animation.startedAt;
    updateProjectiles(deltaMs);
    resolveDefenses();
    updateIntercepts(deltaMs);

    const latestSpawn = state.projectiles.reduce((max, projectile) => Math.max(max, projectile.spawnDelay), 0);
    const allResolved = state.projectiles.every((projectile) => projectile.destroyed || projectile.arrived);
    if (state.animation.time >= state.animation.duration || (state.animation.time > latestSpawn + 1200 && allResolved)) {
      finishWave();
    }
  } else {
    updateIntercepts(deltaMs);
  }

  for (const target of state.targets) {
    target.glow = Math.max(0, target.glow - 0.02);
    target.damageFlash = Math.max(0, target.damageFlash - 0.035);
  }

  render();
  requestAnimationFrame(updateSimulation);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0b1827");
  gradient.addColorStop(0.5, "#163452");
  gradient.addColorStop(0.5001, "#1e455f");
  gradient.addColorStop(0.67, "#254e44");
  gradient.addColorStop(1, "#10231c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let i = 0; i < 60; i += 1) {
    ctx.fillRect(i * 28, 0, 1, canvas.height);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 196);
  ctx.lineTo(canvas.width, 196);
  ctx.moveTo(0, 404);
  ctx.lineTo(canvas.width, 404);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "13px 'Avenir Next Condensed', 'Trebuchet MS', sans-serif";
  ctx.fillText("Enemy Territory", 24, 50);
  ctx.fillText("Neutral / Allied Belt", 24, 236);
  ctx.fillText("Alliance A Territory", 24, 442);

  drawTerrainBands();
  drawLaunchZones();
}

function drawTerrainBands() {
  ctx.fillStyle = "rgba(255, 202, 104, 0.08)";
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.bezierCurveTo(180, 330, 320, 436, 560, 370);
  ctx.bezierCurveTo(800, 304, 940, 420, 1280, 350);
  ctx.lineTo(1280, 800);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(25, 68, 96, 0.24)";
  ctx.beginPath();
  ctx.moveTo(0, 472);
  ctx.bezierCurveTo(170, 540, 360, 460, 580, 520);
  ctx.bezierCurveTo(790, 575, 1040, 500, 1280, 560);
  ctx.lineTo(1280, 800);
  ctx.lineTo(0, 800);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(140 + i * 320, 130 + (i % 2) * 18, 1.2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLaunchZones() {
  for (const zone of LAUNCH_ZONES) {
    ctx.save();
    ctx.translate(zone.x, zone.y);
    ctx.fillStyle = "rgba(255, 103, 89, 0.11)";
    ctx.beginPath();
    ctx.arc(0, 0, 40 + Math.sin(state.pulse * 2) * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 129, 112, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 22);
    ctx.lineTo(0, -26);
    ctx.lineTo(18, 22);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 223, 194, 0.85)";
    ctx.fillRect(-3, -2, 6, 24);
    ctx.restore();
  }
}

function drawTarget(target) {
  const pulse = 1 + Math.sin(state.pulse * 2.5 + target.x * 0.01) * 0.04;
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.scale(pulse, pulse);

  if (target.kind === "capital" || target.kind === "city" || target.kind === "ally") {
    drawCitySprite(target);
  } else if (target.kind === "airbase") {
    drawAirbaseSprite(target);
  } else if (target.kind === "radar") {
    drawRadarSprite(target);
  }

  if (!target.destroyed) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = "12px 'Avenir Next Condensed', 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(target.name, 0, 46);
  } else {
    ctx.fillStyle = "rgba(255, 121, 102, 0.95)";
    ctx.font = "12px 'Avenir Next Condensed', 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Destroyed", 0, 46);
  }

  if (target.glow > 0) {
    ctx.fillStyle = `rgba(255, 162, 126, ${target.glow * 0.18})`;
    ctx.beginPath();
    ctx.arc(0, 0, 42 * target.glow + 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCitySprite(target) {
  ctx.save();
  const baseColor = target.kind === "ally" ? "#8dd0ff" : target.kind === "capital" ? "#ffcb77" : "#9cc5ff";
  const shadow = target.destroyed ? "rgba(255, 89, 70, 0.3)" : "rgba(76, 159, 255, 0.18)";
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(0, 18, 34, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = -2; i <= 2; i += 1) {
    const height = target.kind === "capital" && i === 0 ? 42 : 18 + ((i + 2) % 3) * 8;
    ctx.fillStyle = target.destroyed ? "#5b312e" : baseColor;
    ctx.fillRect(i * 10 - 4, 16 - height, 8, height);
    ctx.fillStyle = target.destroyed ? "#7c463f" : "#dff3ff";
    ctx.fillRect(i * 10 - 2, 20 - height, 4, Math.max(4, height - 10));
  }

  if (target.destroyed) {
    ctx.strokeStyle = "rgba(255, 146, 93, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -8);
    ctx.lineTo(-6, -26);
    ctx.lineTo(2, -12);
    ctx.lineTo(12, -32);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAirbaseSprite(target) {
  ctx.save();
  ctx.fillStyle = target.destroyed ? "rgba(112, 56, 48, 0.86)" : "rgba(106, 173, 220, 0.16)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 40, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = target.destroyed ? "#593630" : "#d5e9f5";
  ctx.fillRect(-30, 8, 60, 10);
  ctx.fillRect(-5, -18, 10, 42);
  ctx.fillStyle = target.destroyed ? "#7c4a3e" : "#94c7f0";
  ctx.fillRect(-18, -10, 36, 9);
  ctx.fillRect(-12, 20, 24, 8);

  if (!target.destroyed) {
    ctx.strokeStyle = "rgba(125, 208, 255, 0.72)";
    ctx.beginPath();
    ctx.moveTo(-42, 24);
    ctx.lineTo(42, 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRadarSprite(target) {
  ctx.save();
  ctx.fillStyle = target.destroyed ? "rgba(112, 56, 48, 0.86)" : "rgba(82, 223, 203, 0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = target.destroyed ? "#78453a" : "#9ee7ff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -2, 20, Math.PI, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-18, 16);
  ctx.lineTo(0, -18);
  ctx.lineTo(18, 16);
  ctx.stroke();

  if (!target.destroyed) {
    const sweep = (state.pulse * 1.8) % (Math.PI * 2);
    ctx.fillStyle = "rgba(124, 255, 220, 0.16)";
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.arc(0, -2, 54, sweep, sweep + 0.52);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawProjectile(projectile) {
  if (projectile.spawnDelay > state.animation.time || projectile.destroyed) {
    return;
  }

  const weapon = WEAPONS[projectile.type];
  const alpha = projectile.visible ? 1 : 0.2;

  for (let i = 0; i < projectile.trail.length; i += 1) {
    const trail = projectile.trail[i];
    const strength = i / projectile.trail.length;
    ctx.fillStyle = projectile.type === "drone" || projectile.type === "swarm"
      ? `rgba(123, 224, 255, ${strength * 0.3})`
      : `rgba(255, 196, 128, ${strength * 0.25})`;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, 1.5 + strength * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  const angle = Math.atan2(projectile.toY - projectile.fromY, projectile.toX - projectile.fromX);
  ctx.rotate(angle + Math.PI / 2);
  ctx.globalAlpha = alpha;

  if (projectile.type === "ballistic" || projectile.type === "hypersonic" || projectile.type === "cruise") {
    drawMissileSprite(weapon.color, weapon.size, projectile.type === "hypersonic");
  } else {
    drawDroneSprite(weapon.color, weapon.size, projectile.type === "swarm", projectile.hp / projectile.maxHp);
  }
  ctx.restore();
}

function drawMissileSprite(color, size, sharp) {
  ctx.save();
  ctx.scale(size, size);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(7, 8);
  ctx.lineTo(0, 5);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f8fbff";
  ctx.fillRect(-2.2, -4, 4.4, 11);
  ctx.fillStyle = sharp ? "#ffd0d0" : "#ffdca8";
  ctx.beginPath();
  ctx.moveTo(-3, 7);
  ctx.lineTo(0, 15);
  ctx.lineTo(3, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDroneSprite(color, size, swarm, hpRatio) {
  ctx.save();
  ctx.scale(size, size);
  if (swarm) {
    for (let i = 0; i < 5; i += 1) {
      const ox = Math.cos(i * 1.3 + state.pulse * 3) * 8;
      const oy = Math.sin(i * 1.1 + state.pulse * 4) * 6;
      ctx.fillStyle = `rgba(165, 245, 255, ${0.45 + hpRatio * 0.08})`;
      ctx.beginPath();
      ctx.arc(ox, oy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(12, 0);
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.stroke();
  ctx.fillStyle = "#ecfbff";
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawIntercept(intercept) {
  const t = intercept.life / intercept.maxLife;
  const x = intercept.x + (intercept.toX - intercept.x) * t;
  const y = intercept.y + (intercept.toY - intercept.y) * t;
  ctx.strokeStyle = intercept.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(intercept.x, intercept.y);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.fillStyle = intercept.color;
  ctx.beginPath();
  ctx.arc(x, y, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFighterPatrol() {
  const plan = state.defenders.currentPlan;
  const airbase = getTargetById("airbase");
  if (!plan || !plan.fightersAssigned || airbase.destroyed) {
    return;
  }

  const target = getTargetById(plan.fighterTarget);
  if (!target) {
    return;
  }

  const orbit = state.pulse * 2.4;
  const fuelFactor = clamp(state.defenders.fighterFuel / 6, 0.2, 1);
  const x = target.x + Math.cos(orbit) * 76;
  const y = target.y - 64 + Math.sin(orbit) * 20;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(orbit) * 0.25);
  ctx.scale(1.1, 1.1);
  ctx.fillStyle = `rgba(191, 247, 255, ${0.6 + fuelFactor * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(8, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-18, 4, 36, 3);
  ctx.restore();
}

function drawHUDLines() {
  const radar = currentRadarStrength();
  ctx.fillStyle = "rgba(5, 12, 18, 0.72)";
  ctx.fillRect(18, 708, 360, 76);
  ctx.strokeStyle = "rgba(136, 193, 244, 0.2)";
  ctx.strokeRect(18, 708, 360, 76);

  ctx.fillStyle = "#dceeff";
  ctx.font = "13px 'Avenir Next Condensed', 'Trebuchet MS', sans-serif";
  ctx.fillText(`Radar Net: ${Math.round(radar * 100)}%`, 34, 736);
  ctx.fillText(`Fighters: ${getTargetById("airbase").destroyed ? "Grounded" : state.defenders.fighters}`, 34, 756);
  ctx.fillText(`Fuel: ${state.defenders.fighterFuel.toFixed(1)} sorties`, 180, 756);
  ctx.fillText(`Stock: L ${state.defenders.stock.long} / M ${state.defenders.stock.medium} / C ${state.defenders.stock.close}`, 34, 776);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(180, 722, 154, 10);
  ctx.fillStyle = "rgba(108, 231, 172, 0.82)";
  ctx.fillRect(180, 722, 154 * radar, 10);
}

function render() {
  drawBackground();
  for (const target of state.targets) {
    drawTarget(target);
  }
  drawFighterPatrol();
  for (const intercept of state.intercepts) {
    drawIntercept(intercept);
  }
  for (const projectile of state.projectiles) {
    drawProjectile(projectile);
  }
  drawParticles();
  drawHUDLines();
  updateHud();
}

function updateHud() {
  ui.waveStat.textContent = `${state.wave} / ${state.maxWaves}`;
  ui.budgetStat.textContent = `${state.readiness}`;
  ui.radarStat.textContent = `${Math.round(currentRadarStrength() * 100)}%`;
  ui.ammoStat.textContent = `${state.defenders.stock.long + state.defenders.stock.medium + state.defenders.stock.close}`;

  ui.headline.textContent = state.playerRole === "defender"
    ? "Skyshield Defensive Map"
    : "Crimson Tide Strike Map";

  ui.hpRow.innerHTML = state.targets.map((target) => {
    const hp = Math.round((target.hpCurrent / target.maxHp) * 100);
    return `
      <div class="health-card">
        <strong>${target.name}</strong>
        <span>${target.destroyed ? "Destroyed" : `${hp}% integrity`}</span>
        <div class="bar"><div class="fill" style="width:${hp}%;"></div></div>
      </div>
    `;
  }).join("");
}

function updatePanels() {
  const attacker = state.playerRole === "attacker";
  ui.attackerPanel.classList.toggle("hidden", !attacker);
  ui.defenderPanel.classList.toggle("hidden", attacker);
  ui.statusLine.textContent = state.message;
  ui.modePill.textContent = state.campaignOver ? ui.modePill.textContent : "Simulation Idle";
  ui.nextWaveBtn.disabled = state.campaignOver;
  ui.startBtn.disabled = false;
  updateHud();
}

ui.startBtn.addEventListener("click", resetCampaign);
ui.role.addEventListener("change", () => {
  state.playerRole = ui.role.value;
  updatePanels();
});
ui.difficulty.addEventListener("change", () => {
  state.difficulty = ui.difficulty.value;
});
ui.nextWaveBtn.addEventListener("click", runNextWave);
ui.addAttack.addEventListener("click", () => {
  const qty = clamp(parseInt(ui.qty.value, 10) || 1, 1, 30);
  queueAttack(ui.weaponType.value, ui.targetType.value, qty);
});
ui.massAttack.addEventListener("click", () => {
  const liveTargetIds = livingTargets().map((target) => target.id);
  if (!liveTargetIds.length) {
    return;
  }
  queueAttack("drone", choose(liveTargetIds), 10);
  queueAttack("ballistic", choose(liveTargetIds), 5);
  if (state.wave >= 2) {
    queueAttack("cruise", choose(liveTargetIds), 3);
  }
  if (state.wave >= 4) {
    queueAttack("hypersonic", "capital", 1);
  }
});

resetCampaign();
requestAnimationFrame(updateSimulation);
