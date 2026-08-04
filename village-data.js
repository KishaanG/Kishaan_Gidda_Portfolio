/* ============================================================
   Village data — map layout, hitboxes, dialogue script, font.
   All coordinates are in internal canvas pixels (480 x 320).
   ============================================================ */

const VILLAGE = {
  // 3x5 micro pixel font for in-world signs (canvas-drawn).
  FONT: {
    A: ["010", "101", "111", "101", "101"],
    C: ["011", "100", "100", "100", "011"],
    D: ["110", "101", "101", "101", "110"],
    E: ["111", "100", "110", "100", "111"],
    F: ["111", "100", "110", "100", "100"],
    H: ["101", "101", "111", "101", "101"],
    I: ["111", "010", "010", "010", "111"],
    M: ["101", "111", "111", "101", "101"],
    N: ["110", "101", "101", "101", "101"],
    O: ["010", "101", "101", "101", "010"],
    R: ["110", "101", "110", "101", "101"],
    S: ["011", "100", "010", "001", "110"],
    T: ["111", "010", "010", "010", "010"],
    Y: ["101", "101", "010", "010", "010"],
    "1": ["010", "110", "010", "010", "111"],
  },

  // Palette (from the design spec)
  C: {
    grass: "#5DB85C",
    grassAlt: "#57AE56",
    grassDark: "#4A9D49",
    pitch: "#6BC86A",
    pitchAlt: "#63BE62",
    path: "#C2B280",
    pathDark: "#A89868",
    sky: "#B8D4F0",
    gold: "#FFD700",
    wood: "#A0714F",
    woodDark: "#7A5439",
    techBlue: "#4A9EDB",
    purple: "#8B5CF6",
    stone: "#9AA3B0",
    stoneDark: "#6E7682",
    ink: "#14142A",
    white: "#F5F5F7",
  },

  // Cobblestone path segments {x, y, w, h}
  PATHS: [
    { x: 72, y: 132, w: 328, h: 16 },   // main street (east-west)
    { x: 80, y: 96, w: 16, h: 36 },     // up to Ciena door
    { x: 352, y: 96, w: 16, h: 36 },    // up to Hydro door
    { x: 120, y: 148, w: 16, h: 88 },   // down TrendAI's east side...
    { x: 80, y: 224, w: 56, h: 14 },    // ...and around to its front (south) door
    { x: 336, y: 148, w: 16, h: 82 },   // down Workshop's west side...
    { x: 352, y: 216, w: 36, h: 14 },   // ...and around to its front (south) door
    { x: 232, y: 148, w: 16, h: 124 },  // south spine from fountain
    { x: 176, y: 256, w: 56, h: 16 },   // branch to cell tower
    { x: 248, y: 256, w: 32, h: 16 },   // branch to soccer field
    { x: 400, y: 132, w: 52, h: 16 },   // main street extends east toward the F1 sign
    { x: 444, y: 148, w: 16, h: 20 },   // spur south to the F1 track sign
  ],

  // Fountain plaza (stone square under the fountain)
  PLAZA: { x: 214, y: 114, w: 52, h: 52 },

  FOUNTAIN: { cx: 240, cy: 140 },

  // Building anchor points (top-left of each draw routine)
  SPOTS: {
    ciena: { x: 64, y: 32 },
    hydro: { x: 320, y: 48 },
    trendai: { x: 64, y: 176 },
    workshop: { x: 352, y: 176 },
    tower: { x: 152, y: 198 },
    field: { x: 272, y: 240, w: 128, h: 56 },
    f1track: { x: 438, y: 164, w: 34, h: 20 },
  },

  // Clickable hitboxes + tooltip labels
  HOTSPOTS: [
    { id: "ciena", label: "CIENA HQ", x: 58, y: 26, w: 60, h: 74 },
    { id: "hydro", label: "HYDRO HQ", x: 304, y: 42, w: 100, h: 60 },
    { id: "trendai", label: "TRENDAI LABS", x: 58, y: 164, w: 68, h: 66 },
    { id: "workshop", label: "THE WORKSHOP", x: 344, y: 168, w: 72, h: 56 },
    { id: "tower", label: "CELL TOWER", x: 146, y: 192, w: 56, h: 88 },
    { id: "fountain", label: "VILLAGE FOUNTAIN", x: 220, y: 118, w: 40, h: 42 },
    { id: "field", label: "SOCCER FIELD", x: 272, y: 240, w: 128, h: 56 },
    { id: "f1track", label: "F1 TRACK · COMING SOON", x: 438, y: 164, w: 34, h: 20 },
  ],

  // Decorative trees {x, y of trunk base} and bushes
  TREES: [
    { x: 44, y: 78 }, { x: 206, y: 50 }, { x: 36, y: 156 },
    { x: 50, y: 268 }, { x: 144, y: 194 },
    { x: 310, y: 196 }, { x: 426, y: 262 }, { x: 122, y: 300 },
  ],
  BUSHES: [
    { x: 70, y: 118 }, { x: 280, y: 70 },
    { x: 150, y: 240 }, { x: 256, y: 200 }, { x: 416, y: 232 },
    { x: 96, y: 248 }, { x: 340, y: 110 },
  ],

  // Player-controlled character: spawn point + outfit (kept visually
  // distinct from every NPC palette below).
  PLAYER: { x: 240, y: 180, shirt: "#F5D742", hat: "#1A1A30", speed: 62 },

  // Solid collision pieces (building walls minus their door gap, plus the
  // cell tower pad and fountain core). The world edge is handled separately
  // via the island tile test already used to paint the ground.
  SOLID: [
    // Buildings are FULLY solid so the player can never stand on top of one.
    // Each building's trigger (see TRIGGERS) sits just in front of its door, on
    // the approach, so you walk up to the door instead of onto the building.
    { x: 64, y: 32, w: 48, h: 64 },     // Ciena
    { x: 320, y: 48, w: 80, h: 48 },    // Hydro
    { x: 64, y: 176, w: 56, h: 48 },    // TrendAI
    { x: 348, y: 172, w: 64, h: 44 },   // Workshop (incl. roof overhang)

    // Cell tower concrete pad
    { x: 154, y: 270, w: 28, h: 8 },

    // Fountain core
    { x: 232, y: 132, w: 16, h: 16 },
  ],

  // Obstacles the wandering villagers steer around. Unlike SOLID (which the
  // player uses and which leaves a door gap in each building), these are the
  // full building footprints plus the whole fountain basin and the tower pad —
  // NPCs have no reason to enter, so they simply path around the outside.
  NPC_SOLID: [
    { x: 62, y: 30, w: 52, h: 68 },     // Ciena
    { x: 318, y: 46, w: 84, h: 52 },    // Hydro
    { x: 62, y: 174, w: 60, h: 52 },    // TrendAI
    { x: 350, y: 174, w: 60, h: 44 },   // Workshop
    { x: 150, y: 262, w: 36, h: 18 },   // cell-tower pad
    { x: 224, y: 124, w: 32, h: 32 },   // fountain basin
  ],

  // Walk-in trigger zones — entering one auto-opens its dialogue (or the
  // SMS popup for the cell tower). These line up with the door gaps above
  // so the player physically steps up to the door before it fires.
  TRIGGERS: [
    { id: "ciena", x: 80, y: 96, w: 16, h: 18 },      // on the path in front of the door
    { id: "hydro", x: 352, y: 96, w: 16, h: 18 },     // on the path in front of the door
    { id: "trendai", x: 80, y: 224, w: 16, h: 14 },   // on the path in front of the door
    { id: "workshop", x: 372, y: 216, w: 16, h: 14 }, // on the path in front of the door
    { id: "tower", x: 183, y: 252, w: 18, h: 14 },
    { id: "fountain", x: 214, y: 114, w: 52, h: 52 },
    { id: "field", x: 272, y: 240, w: 128, h: 56 },
    { id: "f1track", x: 438, y: 164, w: 34, h: 20 },
  ],

  // Wandering villager routes (waypoint loops) + outfit colors
  NPCS: [
    {
      // main-street stroll that arcs south around the fountain instead of
      // cutting straight across it
      route: [ [120, 138], [214, 138], [214, 160], [266, 160], [266, 138], [356, 138] ],
      speed: 14, shirt: "#D9534F", hat: "#8E2B28", pingpong: true,
    },
    {
      route: [ [240, 158], [240, 262], [196, 262], [240, 262] ],
      speed: 12, shirt: "#4A9EDB", hat: "#2B5E8E", pingpong: false,
    },
    {
      route: [ [88, 112], [88, 138], [208, 138], [208, 112] ],
      speed: 10, shirt: "#8B5CF6", hat: "#5B3CA6", pingpong: true,
    },
    {
      route: [ [376, 156], [376, 138], [300, 138], [300, 156] ],
      speed: 11, shirt: "#E8A33D", hat: "#A66B1E", pingpong: true,
    },
  ],

  // NPC standing by the cell tower, waiting for a message
  WAITER: { x: 196, y: 254, shirt: "#5DB85C", hat: "#3A7A39" },

  // Soccer players (positions on the pitch) — ball passes between them
  PLAYERS: [
    { x: 300, y: 264, shirt: "#C8102E", hat: "#8E0B20" },  // Liverpool red
    { x: 372, y: 254, shirt: "#FFFFFF", hat: "#CCCCCC" },
    { x: 336, y: 284, shirt: "#C8102E", hat: "#8E0B20" },
  ],

  // ---------- dialogue script ----------
  DIALOGUE: {
    ciena: {
      name: "CIENA HQ",
      pages: [
        "CIENA. SOFTWARE DEVELOPER CO-OP, FEB-AUG 2023. MY FIRST CO-OP, DEEP IN THE TELECOM WORLD.",
        "AUTOMATED DAILY TEST-RESULT REPORTS WITH A CRON-SCHEDULED PYTHON TOOL, WRITING SQL AGAINST ORACLE. STILL RUNNING TODAY.",
        "BUILT THE ANGULAR + TYPESCRIPT FRONT END OF AN INTERNAL IAM PERMISSION TOOL, AND LEARNED DEVOPS THE AGILE WAY.",
      ],
      links: [],
    },
    hydro: {
      name: "HYDRO HQ",
      pages: [
        "HYDRO OTTAWA. CYBERSECURITY ANALYST INTERN, MAY-AUG 2025. KEEPING THE CITY'S GRID SECURE.",
        "WROTE FOUR INCIDENT-RESPONSE PLAYBOOKS, 20-30 PAGES EACH: AI DATA LEAKS, WEB EXPLOITS, RANSOMWARE, INSIDER THREATS. VALIDATED ALL FOUR END TO END.",
        "CHAINED 10-25 MITRE ATT&CK ABILITIES IN CALDERA TO EMULATE LIVING-OFF-THE-LAND ATTACKS. THAT IS WHERE I LEARNED HOW QUIET A REAL INTRUSION LOOKS.",
        "DEPLOYED AWS GUARDDUTY WITH TERRAFORM, BUILT A LAMBDA PIPELINE THAT AUTO-QUARANTINES MALICIOUS S3 FILES, AND SCORED THIRD-PARTY APP RISK WITH GEMINI'S REST API.",
      ],
      links: [],
    },
    trendai: {
      name: "TRENDAI LABS",
      pages: [
        "TRENDAI. PRODUCT TEAM, AVTD. CURRENT ROLE, AND THE NEWEST BUILDING IN THE VILLAGE.",
        "BUILT A READ-ONLY SOC ALERT-TRIAGE AGENT ON THE CLAUDE AGENT SDK, CHAINING TOOL CALLS ACROSS SIX CUSTOM MCP TOOLS TO CORRELATE CLOUD-ASSET CVES.",
        "SHIPPED AWS REGION EU-SOUTH-2 END TO END, KILLED A TWO-REGION ZOMBIE-VM INCIDENT, AND REMEDIATED 270+ CRITICAL AND HIGH SCA/SAST FINDINGS ACROSS 23 REPOS.",
        "WHERE AI MEETS SECURITY. EXACTLY THE INTERSECTION I WANT TO LIVE AT.",
      ],
      links: [],
    },
    workshop: {
      name: "THE WORKSHOP",
      pages: [
        "WELCOME TO THE WORKSHOP, WHERE THE SIDE PROJECTS GET BUILT.",
        "RACING LINE APP: A MINIMUM-LAP-TIME SOLVER OVER 360 COLLOCATION NODES WITH IPOPT, PLUS AN IN-BROWSER RL TRAINER. 15K+ LINES, 590+ TESTS.",
        "CAREROUTER: AI MENTAL-HEALTH TRIAGE. GEMINI SCORES SEVERITY FROM A 6-QUESTION INTAKE, AND CRISIS CASES ROUTE STRAIGHT PAST THE MODEL TO 9-1-1 OR 9-8-8.",
        "CLASSNAP: TRANSCRIBES SPEECH AND ANSWERS QUESTIONS ABOUT IT. MAZE SOLVER: A C++ CONSOLE ADVENTURE WITH AN AUTO-SOLVER.",
        "CYBERSCI OTTAWA CTF: PLACED 1ST OF 13 TEAMS WITH 'THE OFF-BY-ONES'. TROPHY'S ON THE SHELF.",
      ],
      links: [
        { label: "CAREROUTER", href: "https://github.com/KishaanG/CareRouter" },
        { label: "CLASSNAP", href: "https://github.com/charifbahloul/classnap" },
        { label: "MAZE SOLVER", href: "https://github.com/KishaanG/Maze-solver-game/tree/main/Maze%20Final%20Project" },
      ],
    },
    fountain: {
      name: "VILLAGE FOUNTAIN",
      pages: [
        "KISHAAN GIDDA. COMPUTER SCIENCE CO-OP STUDENT AT CARLETON UNIVERSITY, AI/ML STREAM, 3.6 GPA.",
        "OBSESSED WITH THE INTERSECTION OF AI AND CYBERSECURITY. BUILDS THINGS THAT ACTUALLY GET USED, THEN TRIES TO BREAK THEM.",
        "TOOLKIT: PYTHON, GO, C++, TYPESCRIPT, CLAUDE AGENT SDK, MCP, AWS, TERRAFORM, MITRE ATT&CK, LINUX.",
      ],
      links: [],
    },
    field: {
      name: "SOCCER FIELD",
      pages: [
        "OFF THE KEYBOARD: SOCCER. PLAYING IT, WATCHING IT, ARGUING ABOUT IT.",
        "FAVOURITE TEAM: LIVERPOOL. YOU'LL NEVER WALK ALONE.",
        "ALSO FOUND AT THE GYM, OR READING ABOUT WHATEVER AI SHIPPED THIS WEEK.",
      ],
      links: [],
    },
    f1track: {
      name: "F1 TRACK",
      pages: [
        "A CIRCUIT DRIFTS JUST BEYOND THE MAP, STILL WRAPPED IN CLOUD.",
        "AN F1-INSPIRED PROJECT, CURRENTLY IN THE GARAGE. COMING SOON.",
      ],
      links: [],
    },
  },

  SMS_TEXT:
    "LOOKING FOR MY NEXT CO-OP IN AI/ML AND SECURITY. HAVE AN OPPORTUNITY, A QUESTION, OR JUST WANT TO TALK AI X SECURITY? MY INBOX IS OPEN.",
};
