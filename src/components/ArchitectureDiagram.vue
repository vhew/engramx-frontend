<template>
  <!--
    ARCHITECTURE DIAGRAM — EngramX System Overview
    ===============================================

    Two layouts:
    1. DESKTOP (md+): Wide side-by-side layout (viewBox 720x560)
    2. MOBILE (<md): Vertical stacked layout (viewBox 300x580)

    Both use the same styling conventions:
    - Tier boundary:  fill=#111820  stroke=#2a2218  rx=12/16
    - Inner boxes:    fill=#111820  stroke=#1e2a3a  rx=8
    - Heading:        fill=#ffffff  font-size=12  font-weight=600
    - Subheading:     fill=#665e53  font-size=10
    - Body text:      fill=#9a9083  font-size=11
    - Accent:         #e8a317
    - Arrowheads:     <polygon> triangles (NOT SVG markers)
  -->

  <!-- ===== DESKTOP LAYOUT (md and up) ===== -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 720 560"
    class="w-full h-auto hidden md:block"
    role="img"
    aria-label="EngramX architecture diagram"
  >
    <!-- ===== TIER 1: ICP MAINNET ===== -->
    <g id="d-icp-mainnet">
      <rect
        x="0.5"
        y="0.5"
        width="719"
        height="378"
        rx="16"
        fill="#111820"
        stroke="#2a2218"
        stroke-width="1"
      />
      <text
        x="360"
        y="30"
        text-anchor="middle"
        fill="#e8a317"
        font-size="13"
        font-weight="700"
        letter-spacing="3px"
        font-family="'IBM Plex Mono', ui-monospace, monospace"
      >
        ICP MAINNET
      </text>

      <!-- Registry Canister -->
      <g>
        <rect
          x="140"
          y="48"
          width="192"
          height="130"
          rx="8"
          fill="#111820"
          stroke="#1e2a3a"
          stroke-width="1"
        />
        <text x="236" y="72" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="600">
          REGISTRY
        </text>
        <text x="236" y="87" text-anchor="middle" fill="#665e53" font-size="10">CANISTER</text>
        <line x1="156" y1="96" x2="316" y2="96" stroke="#1e2a3a" stroke-width="1" />
        <circle cx="162" cy="114" r="2" fill="#e8a317" opacity="0.6" />
        <text x="172" y="118" fill="#9a9083" font-size="11">Creates engrams for Owners</text>
        <circle cx="162" cy="134" r="2" fill="#e8a317" opacity="0.6" />
        <text x="172" y="138" fill="#9a9083" font-size="11">Tracks Owner principals</text>
        <circle cx="162" cy="154" r="2" fill="#e8a317" opacity="0.6" />
        <text x="172" y="158" fill="#9a9083" font-size="11">Manages cycles</text>
      </g>

      <!-- Frontend Canister -->
      <g>
        <rect
          x="388"
          y="48"
          width="216"
          height="130"
          rx="8"
          fill="#111820"
          stroke="#1e2a3a"
          stroke-width="1"
        />
        <text x="496" y="72" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="600">
          FRONTEND
        </text>
        <text x="496" y="87" text-anchor="middle" fill="#665e53" font-size="10">CANISTER</text>
        <line x1="404" y1="96" x2="588" y2="96" stroke="#1e2a3a" stroke-width="1" />
        <circle cx="410" cy="114" r="2" fill="#e8a317" opacity="0.6" />
        <text x="420" y="118" fill="#9a9083" font-size="11">Landing page</text>
        <circle cx="410" cy="134" r="2" fill="#e8a317" opacity="0.6" />
        <text x="420" y="138" fill="#9a9083" font-size="11">Owner dashboard</text>
      </g>

      <!-- Frontend → Registry (Owner creates) -->
      <g>
        <line
          x1="388"
          y1="113"
          x2="340"
          y2="113"
          stroke="#e8a317"
          stroke-width="1"
          stroke-dasharray="4,3"
          opacity="0.4"
        />
        <polygon points="334,113 344,108 344,118" fill="#e8a317" opacity="0.4" />
        <text x="361" y="105" fill="#665e53" font-size="9" text-anchor="middle">Owner creates</text>
      </g>

      <!-- Registry → Engram (spawns) — L-shaped -->
      <g>
        <path
          d="M 236,178 L 236,196 L 312,196 L 312,208"
          fill="none"
          stroke="#e8a317"
          stroke-width="1.5"
        />
        <polygon points="312,218 306,208 318,208" fill="#e8a317" />
        <text
          x="274"
          y="191"
          fill="#665e53"
          font-size="10"
          font-style="italic"
          text-anchor="middle"
        >
          spawns
        </text>
      </g>

      <!-- Frontend → Engram (Owner manages) — L-shaped -->
      <g>
        <path
          d="M 496,178 L 496,196 L 408,196 L 408,208"
          fill="none"
          stroke="#e8a317"
          stroke-width="1"
          stroke-dasharray="4,3"
          opacity="0.5"
        />
        <polygon points="408,218 402,208 414,208" fill="#e8a317" opacity="0.5" />
        <text x="452" y="191" fill="#665e53" font-size="9" font-style="italic" text-anchor="middle">
          Owner manages
        </text>
      </g>

      <!-- Engram Canister -->
      <g>
        <rect
          x="264"
          y="218"
          width="192"
          height="146"
          rx="8"
          fill="#111820"
          stroke="#e8a317"
          stroke-width="1"
          opacity="0.8"
        />
        <text x="360" y="238" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="600">
          ENGRAM
        </text>
        <text x="360" y="253" text-anchor="middle" fill="#665e53" font-size="10">CANISTER</text>
        <line x1="280" y1="260" x2="440" y2="260" stroke="#1e2a3a" stroke-width="1" />
        <circle cx="286" cy="274" r="2" fill="#e8a317" opacity="0.6" />
        <text x="296" y="278" fill="#9a9083" font-size="11">Memory (append-only)</text>
        <circle cx="286" cy="289" r="2" fill="#e8a317" opacity="0.6" />
        <text x="296" y="293" fill="#9a9083" font-size="11">Operator sessions</text>
        <circle cx="286" cy="304" r="2" fill="#e8a317" opacity="0.6" />
        <text x="296" y="308" fill="#9a9083" font-size="11">Guardian permissions</text>
        <circle cx="286" cy="319" r="2" fill="#e8a317" opacity="0.6" />
        <text x="296" y="323" fill="#9a9083" font-size="11">Audit log</text>
        <circle cx="286" cy="334" r="2" fill="#e8a317" opacity="0.6" />
        <text x="296" y="338" fill="#9a9083" font-size="11">Wallet</text>
      </g>

      <text x="488" y="298" fill="#665e53" font-size="20" font-weight="300">...</text>
    </g>

    <!-- Connection: @engramx/client -->
    <g>
      <line x1="360" y1="424" x2="360" y2="370" stroke="#e8a317" stroke-width="1.5" />
      <polygon points="360,364 354,374 366,374" fill="#e8a317" />
      <circle cx="360" cy="426" r="3" fill="#e8a317" />
      <text
        x="386"
        y="400"
        fill="#e8a317"
        font-size="11"
        font-weight="600"
        font-family="'IBM Plex Mono', ui-monospace, monospace"
      >
        @engramx/client (npm)
      </text>
      <text x="386" y="414" fill="#665e53" font-size="9">Operator reads/writes engram</text>
    </g>

    <!-- ===== TIER 2: AGENT HOST ===== -->
    <g>
      <rect
        x="0.5"
        y="432"
        width="719"
        height="127"
        rx="16"
        fill="#111820"
        stroke="#2a2218"
        stroke-width="1"
      />
      <text x="360" y="458" text-anchor="middle" fill="#ffffff" font-size="13" font-weight="700">
        AGENT HOST
        <tspan fill="#665e53" font-size="11" font-weight="400" font-style="italic">
          (disposable, runs as Operator)
        </tspan>
      </text>
      <text x="360" y="476" text-anchor="middle" fill="#665e53" font-size="10">
        e.g. OpenClaw, LangChain, custom agent
      </text>
      <line x1="28" y1="484" x2="692" y2="484" stroke="#1e2a3a" stroke-width="1" />
      <circle cx="200" cy="500" r="2" fill="#e8a317" opacity="0.6" />
      <text x="210" y="504" fill="#9a9083" font-size="11">
        Operator session key (Ed25519, revocable by Owner/Guardian)
      </text>
      <circle cx="200" cy="518" r="2" fill="#e8a317" opacity="0.6" />
      <text x="210" y="522" fill="#9a9083" font-size="11">Local engram cache</text>
      <circle cx="200" cy="536" r="2" fill="#e8a317" opacity="0.6" />
      <text x="210" y="540" fill="#9a9083" font-size="11">
        Channel adapters (Telegram, WhatsApp, etc.)
      </text>
    </g>
  </svg>

  <!-- ===== MOBILE LAYOUT (below md) ===== -->
  <!-- Vertical single-column stack: Frontend → Registry → Engram → Agent Host -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 300 580"
    class="w-full h-auto md:hidden"
    role="img"
    aria-label="EngramX architecture diagram"
  >
    <!-- ===== ICP MAINNET boundary ===== -->
    <rect
      x="0.5"
      y="0.5"
      width="299"
      height="410"
      rx="12"
      fill="#111820"
      stroke="#2a2218"
      stroke-width="1"
    />
    <text
      x="150"
      y="24"
      text-anchor="middle"
      fill="#e8a317"
      font-size="11"
      font-weight="700"
      letter-spacing="2px"
      font-family="'IBM Plex Mono', ui-monospace, monospace"
    >
      ICP MAINNET
    </text>

    <!-- Frontend Canister -->
    <g>
      <rect
        x="16"
        y="36"
        width="268"
        height="82"
        rx="6"
        fill="#111820"
        stroke="#1e2a3a"
        stroke-width="1"
      />
      <text x="150" y="54" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="600">
        FRONTEND
      </text>
      <text x="150" y="66" text-anchor="middle" fill="#665e53" font-size="9">CANISTER</text>
      <line x1="28" y1="72" x2="272" y2="72" stroke="#1e2a3a" stroke-width="1" />
      <circle cx="30" cy="84" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="88" fill="#9a9083" font-size="9">Landing page</text>
      <circle cx="108" cy="84" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="116" y="88" fill="#9a9083" font-size="9">Owner dashboard</text>
    </g>

    <!-- Arrow: Frontend → Registry (Owner creates) -->
    <g>
      <line
        x1="150"
        y1="118"
        x2="150"
        y2="136"
        stroke="#e8a317"
        stroke-width="1"
        stroke-dasharray="3,2"
        opacity="0.4"
      />
      <polygon points="150,142 145,134 155,134" fill="#e8a317" opacity="0.4" />
      <text x="164" y="133" fill="#665e53" font-size="8">Owner creates</text>
    </g>

    <!-- Owner manages (Frontend → Engram, right-side bypass) -->
    <g opacity="0.5">
      <path
        d="M 284,100 L 294,100 L 294,258 L 284,258"
        fill="none"
        stroke="#e8a317"
        stroke-width="0.75"
        stroke-dasharray="3,2"
      />
      <polygon points="284,258 292,254 292,262" fill="#e8a317" />
      <text
        x="294"
        y="180"
        fill="#665e53"
        font-size="7"
        transform="rotate(90 294 180)"
        text-anchor="middle"
      >
        Owner manages
      </text>
    </g>

    <!-- Registry Canister -->
    <g>
      <rect
        x="16"
        y="142"
        width="268"
        height="82"
        rx="6"
        fill="#111820"
        stroke="#1e2a3a"
        stroke-width="1"
      />
      <text x="150" y="160" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="600">
        REGISTRY
      </text>
      <text x="150" y="172" text-anchor="middle" fill="#665e53" font-size="9">CANISTER</text>
      <line x1="28" y1="178" x2="272" y2="178" stroke="#1e2a3a" stroke-width="1" />
      <circle cx="30" cy="192" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="196" fill="#9a9083" font-size="9">Creates engrams for Owners</text>
      <circle cx="30" cy="206" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="210" fill="#9a9083" font-size="9">Tracks Owner principals</text>
    </g>

    <!-- Arrow: Registry → Engram (spawns) -->
    <g>
      <line x1="150" y1="224" x2="150" y2="242" stroke="#e8a317" stroke-width="1.5" />
      <polygon points="150,250 145,240 155,240" fill="#e8a317" />
      <text x="164" y="239" fill="#665e53" font-size="8" font-style="italic">spawns</text>
    </g>

    <!-- Engram Canister -->
    <g>
      <rect
        x="16"
        y="250"
        width="268"
        height="106"
        rx="6"
        fill="#111820"
        stroke="#e8a317"
        stroke-width="1"
        opacity="0.8"
      />
      <text x="150" y="268" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="600">
        ENGRAM
      </text>
      <text x="150" y="280" text-anchor="middle" fill="#665e53" font-size="9">CANISTER</text>
      <line x1="28" y1="286" x2="272" y2="286" stroke="#1e2a3a" stroke-width="1" />
      <circle cx="30" cy="300" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="304" fill="#9a9083" font-size="9">Memory (append-only)</text>
      <circle cx="30" cy="314" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="318" fill="#9a9083" font-size="9">Operator sessions</text>
      <circle cx="30" cy="328" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="332" fill="#9a9083" font-size="9">Guardian permissions</text>
      <circle cx="30" cy="342" r="1.5" fill="#e8a317" opacity="0.6" />
      <text x="38" y="346" fill="#9a9083" font-size="9">Audit log / Wallet</text>
    </g>

    <!-- "..." more engrams -->
    <text x="240" y="380" text-anchor="middle" fill="#665e53" font-size="14" font-weight="300">
      ...
    </text>

    <!-- Arrow: @engramx/client connection -->
    <g>
      <line x1="150" y1="450" x2="150" y2="362" stroke="#e8a317" stroke-width="1.5" />
      <polygon points="150,356 145,366 155,366" fill="#e8a317" />
      <circle cx="150" cy="452" r="2.5" fill="#e8a317" />
      <text
        x="166"
        y="430"
        fill="#e8a317"
        font-size="9"
        font-weight="600"
        font-family="'IBM Plex Mono', ui-monospace, monospace"
      >
        @engramx/client
      </text>
      <text x="166" y="442" fill="#665e53" font-size="8">Operator reads/writes</text>
    </g>

    <!-- ===== AGENT HOST ===== -->
    <rect
      x="0.5"
      y="458"
      width="299"
      height="121"
      rx="12"
      fill="#111820"
      stroke="#2a2218"
      stroke-width="1"
    />
    <text x="150" y="478" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">
      AGENT HOST
    </text>
    <text x="150" y="492" text-anchor="middle" fill="#665e53" font-size="8" font-style="italic">
      disposable, runs as Operator
    </text>
    <line x1="16" y1="500" x2="284" y2="500" stroke="#1e2a3a" stroke-width="1" />
    <circle cx="26" cy="514" r="1.5" fill="#e8a317" opacity="0.6" />
    <text x="34" y="518" fill="#9a9083" font-size="9">Operator session key (Ed25519)</text>
    <circle cx="26" cy="530" r="1.5" fill="#e8a317" opacity="0.6" />
    <text x="34" y="534" fill="#9a9083" font-size="9">Local engram cache</text>
    <circle cx="26" cy="546" r="1.5" fill="#e8a317" opacity="0.6" />
    <text x="34" y="550" fill="#9a9083" font-size="9">
      Channel adapters (Telegram, WhatsApp, etc.)
    </text>
  </svg>
</template>
