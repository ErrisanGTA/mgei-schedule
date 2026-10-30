// ============================================================
// ISEU BSU Animated SVG Sprout + Atomic Orbitals Logo
// Ecological Sprout with Nuclear/Radioecological Orbitals
// ============================================================

export function renderAnimatedLogo(size: number = 44): string {
  return `
    <svg 
      class="iseu-svg-logo iseu-sprout-atom-logo" 
      width="${size}" 
      height="${size}" 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      role="img" 
      aria-label="Экологический росток с орбиталями атомов — символ МГЭИ им. А.Д. Сахарова"
    >
      <defs>
        <!-- Radial glow in center core -->
        <radialGradient id="atomCoreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--accent-light)" stop-opacity="0.45" />
          <stop offset="60%" stop-color="var(--accent)" stop-opacity="0.15" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </radialGradient>

        <!-- Stem gradient -->
        <linearGradient id="sproutStemGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="#059669" />
          <stop offset="60%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#34d399" />
        </linearGradient>

        <!-- Leaf 1 (Left) gradient -->
        <linearGradient id="sproutLeafGrad1" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stop-color="#047857" />
          <stop offset="50%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#6ee7b7" />
        </linearGradient>

        <!-- Leaf 2 (Right) gradient -->
        <linearGradient id="sproutLeafGrad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#34d399" />
          <stop offset="60%" stop-color="#059669" />
          <stop offset="100%" stop-color="#065f46" />
        </linearGradient>

        <!-- Filter for glowing electrons -->
        <filter id="electronGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Central energy aura -->
      <circle cx="60" cy="60" r="34" fill="url(#atomCoreGlow)" class="sprout-aura" />

      <!-- ── 1. ATOMIC ORBITALS (3D Tilted Perspective Ellipses) ── -->
      <g class="atom-orbitals">
        <!-- Orbital Ring 1: tilted -35 degrees -->
        <g transform="translate(60, 60) rotate(-35)">
          <ellipse cx="0" cy="0" rx="46" ry="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" class="orbital-path ring-1" opacity="0.45" />
          <!-- Orbiting Electron 1 (Sky Cyan) -->
          <circle r="3.2" fill="#38bdf8" filter="url(#electronGlow)" class="orbiting-electron electron-1">
            <animateMotion path="M -46 0 a 46 16 0 1 0 92 0 a 46 16 0 1 0 -92 0" dur="4.2s" repeatCount="indefinite" />
          </circle>
        </g>

        <!-- Orbital Ring 2: tilted +35 degrees -->
        <g transform="translate(60, 60) rotate(35)">
          <ellipse cx="0" cy="0" rx="46" ry="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" class="orbital-path ring-2" opacity="0.45" />
          <!-- Orbiting Electron 2 (Emerald) -->
          <circle r="3.2" fill="#34d399" filter="url(#electronGlow)" class="orbiting-electron electron-2">
            <animateMotion path="M 46 0 a 46 16 0 1 0 -92 0 a 46 16 0 1 0 92 0" dur="5.0s" repeatCount="indefinite" />
          </circle>
        </g>

        <!-- Orbital Ring 3: tilted +90 degrees (Vertical) -->
        <g transform="translate(60, 60) rotate(90)">
          <ellipse cx="0" cy="0" rx="46" ry="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3" class="orbital-path ring-3" opacity="0.45" />
          <!-- Orbiting Electron 3 (Warm Amber) -->
          <circle r="3.2" fill="#fbbf24" filter="url(#electronGlow)" class="orbiting-electron electron-3">
            <animateMotion path="M -46 0 a 46 15 0 1 0 92 0 a 46 15 0 1 0 -92 0" dur="3.6s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>

      <!-- ── 2. BOTANICAL SPROUT (Emerging from core) ── -->
      <g class="sprout-organism">
        <!-- Seed / Base nodule -->
        <ellipse cx="60" cy="85" rx="5" ry="3.5" fill="#047857" opacity="0.9" />
        <circle cx="60" cy="84" r="2" fill="#34d399" />

        <!-- Organic Stem curving upward -->
        <path 
          d="M60 84 C60 70, 57 56, 60 36" 
          stroke="url(#sproutStemGrad)" 
          stroke-width="3.8" 
          stroke-linecap="round" 
          class="sprout-stem"
        />

        <!-- Left Leaf (Flourishing) -->
        <path 
          class="sprout-leaf leaf-left" 
          d="M59 62 C46 60 32 50 34 37 C47 37 56 47 59 62 Z" 
          fill="url(#sproutLeafGrad1)" 
          stroke="#10b981" 
          stroke-width="1.8" 
          stroke-linejoin="round"
        />
        <!-- Left Leaf Vein -->
        <path 
          d="M57 60 C50 54 44 48 37 42" 
          stroke="#6ee7b7" 
          stroke-width="1.2" 
          stroke-linecap="round" 
          opacity="0.8" 
          class="leaf-vein"
        />

        <!-- Right Leaf (Flourishing) -->
        <path 
          class="sprout-leaf leaf-right" 
          d="M61 52 C74 50 87 40 85 27 C72 27 63 37 61 52 Z" 
          fill="url(#sproutLeafGrad2)" 
          stroke="#059669" 
          stroke-width="1.8" 
          stroke-linejoin="round"
        />
        <!-- Right Leaf Vein -->
        <path 
          d="M63 50 C70 44 76 38 82 32" 
          stroke="#a7f3d0" 
          stroke-width="1.2" 
          stroke-linecap="round" 
          opacity="0.8" 
          class="leaf-vein"
        />

        <!-- Top Bud / Sprouting Tip -->
        <path 
          class="sprout-leaf leaf-top" 
          d="M60 38 C55 30 57 23 60 20 C63 23 65 30 60 38 Z" 
          fill="#34d399" 
          stroke="#10b981" 
          stroke-width="1.6" 
          stroke-linejoin="round"
        />

        <!-- Nucleus Center Energy Spark / Core Quantum Light -->
        <circle cx="60" cy="60" r="3.2" fill="#ffffff" class="sprout-core-spark" filter="url(#electronGlow)" />
      </g>
    </svg>
  `
}
