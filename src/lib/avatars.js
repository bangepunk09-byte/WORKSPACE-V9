// 6 Soft Mesh-Gradient Doodle Face Avatars (SVG Data URIs)
function createMeshAvatarSvg({ id, bg, blobs, hair, eyes, mouth }) {
  const defs = blobs
    .map(
      (b, idx) => `
    <radialGradient id="g_${id}_${idx}" cx="${b.cx}" cy="${b.cy}" r="${b.r}">
      <stop offset="0%" stop-color="${b.color}" stop-opacity="${b.opacity ?? 0.9}" />
      <stop offset="55%" stop-color="${b.color}" stop-opacity="${(b.opacity ?? 0.9) * 0.45}" />
      <stop offset="100%" stop-color="${b.color}" stop-opacity="0" />
    </radialGradient>`
    )
    .join("");

  const circles = blobs
    .map((_, idx) => `<circle cx="60" cy="60" r="60" fill="url(#g_${id}_${idx})" />`)
    .join("");

  const hairPaths = {
    singleLoop: `<path d="M 49 3 C 46 15, 58 22, 61 12 C 63 6, 55 5, 55 13 C 55 21, 66 22, 70 14" fill="none" stroke="#18181B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`,
    doubleLoop: `<path d="M 44 4 C 42 15, 53 19, 55 11 C 56 6, 50 6, 51 13 C 52 20, 63 20, 64 12 C 65 7, 59 7, 60 14 C 61 20, 71 19, 74 11" fill="none" stroke="#18181B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`,
    tripleLoop: `<path d="M 40 5 C 39 14, 48 18, 50 11 C 51 6, 46 7, 47 13 C 48 19, 57 19, 59 12 C 60 7, 55 7, 56 13 C 57 19, 66 19, 68 12 C 69 7, 64 8, 66 14 C 68 19, 75 17, 78 10" fill="none" stroke="#18181B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`,
    wavyCurl: `<path d="M 45 4 C 47 14, 54 16, 57 9 C 60 16, 67 16, 71 7" fill="none" stroke="#18181B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`,
    sideCurl: `<path d="M 52 2 C 48 12, 57 19, 63 13 C 66 9, 60 6, 58 12 C 56 18, 65 23, 73 17" fill="none" stroke="#18181B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />`,
  };

  const eyePaths = {
    dots: `
      <circle cx="43" cy="54" r="3.4" fill="#18181B" />
      <circle cx="77" cy="54" r="3.4" fill="#18181B" />
    `,
    dotsWide: `
      <circle cx="41" cy="55" r="3.5" fill="#18181B" />
      <circle cx="79" cy="55" r="3.5" fill="#18181B" />
    `,
    happyArcs: `
      <path d="M 38 56 Q 43 49 48 56" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />
      <path d="M 72 56 Q 77 49 82 56" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />
    `,
    wink: `
      <circle cx="43" cy="54" r="3.4" fill="#18181B" />
      <path d="M 72 55 Q 77 49 82 55" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />
    `,
  };

  const mouthPaths = {
    smile: `<path d="M 47 67 Q 60 79 73 67" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />`,
    bigSmile: `<path d="M 44 65 C 49 80, 71 80, 76 65" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />`,
    tongueRight: `
      <path d="M 46 66 Q 60 78 74 65" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />
      <path d="M 62 71 C 63 80, 72 79, 71 69 Z" fill="#FB7185" stroke="#18181B" stroke-width="2.2" stroke-linejoin="round" />
    `,
    tongueCenter: `
      <path d="M 46 66 Q 60 77 74 66" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />
      <path d="M 55 71 C 55 80, 65 80, 65 71 Z" fill="#FB7185" stroke="#18181B" stroke-width="2.2" stroke-linejoin="round" />
    `,
    cuteGrin: `<path d="M 49 68 Q 60 76 71 68" fill="none" stroke="#18181B" stroke-width="2.8" stroke-linecap="round" />`,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
    <defs>
      <clipPath id="clip_${id}">
        <circle cx="60" cy="60" r="60" />
      </clipPath>
      ${defs}
    </defs>
    <g clip-path="url(#clip_${id})">
      <circle cx="60" cy="60" r="60" fill="${bg}" />
      ${circles}
      ${hairPaths[hair] || hairPaths.singleLoop}
      ${eyePaths[eyes] || eyePaths.dots}
      ${mouthPaths[mouth] || mouthPaths.smile}
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS = [
  // 1. Lime-Yellow-Pink Mesh
  createMeshAvatarSvg({
    id: "m1",
    bg: "#FEF08A",
    blobs: [
      { cx: "25%", cy: "25%", r: "75%", color: "#A3E635", opacity: 0.9 },
      { cx: "80%", cy: "75%", r: "75%", color: "#FDA4AF", opacity: 0.95 },
      { cx: "55%", cy: "50%", r: "65%", color: "#FDE047", opacity: 0.85 },
    ],
    hair: "singleLoop",
    eyes: "dots",
    mouth: "smile",
  }),
  // 2. Periwinkle-Blue-Peach Mesh
  createMeshAvatarSvg({
    id: "m2",
    bg: "#93C5FD",
    blobs: [
      { cx: "20%", cy: "20%", r: "80%", color: "#60A5FA", opacity: 0.95 },
      { cx: "65%", cy: "65%", r: "70%", color: "#FDBA74", opacity: 0.9 },
      { cx: "80%", cy: "30%", r: "65%", color: "#818CF8", opacity: 0.85 },
    ],
    hair: "doubleLoop",
    eyes: "dots",
    mouth: "bigSmile",
  }),
  // 3. Rose-Lavender-Sky Mesh with Tongue
  createMeshAvatarSvg({
    id: "m3",
    bg: "#F472B6",
    blobs: [
      { cx: "30%", cy: "25%", r: "75%", color: "#FB7185", opacity: 0.95 },
      { cx: "75%", cy: "80%", r: "75%", color: "#93C5FD", opacity: 0.95 },
      { cx: "55%", cy: "55%", r: "65%", color: "#E879F9", opacity: 0.85 },
    ],
    hair: "wavyCurl",
    eyes: "dotsWide",
    mouth: "tongueRight",
  }),
  // 4. Peach-Lavender-Mint Mesh
  createMeshAvatarSvg({
    id: "m4",
    bg: "#FDBA74",
    blobs: [
      { cx: "25%", cy: "30%", r: "75%", color: "#FB7185", opacity: 0.9 },
      { cx: "75%", cy: "75%", r: "80%", color: "#A7F3D0", opacity: 0.95 },
      { cx: "60%", cy: "40%", r: "65%", color: "#C4B5FD", opacity: 0.9 },
    ],
    hair: "doubleLoop",
    eyes: "dots",
    mouth: "smile",
  }),
  // 5. Violet-Coral-Indigo Happy Arcs
  createMeshAvatarSvg({
    id: "m5",
    bg: "#A855F7",
    blobs: [
      { cx: "25%", cy: "20%", r: "75%", color: "#FB923C", opacity: 0.92 },
      { cx: "75%", cy: "75%", r: "80%", color: "#6366F1", opacity: 0.95 },
      { cx: "50%", cy: "55%", r: "65%", color: "#E879F9", opacity: 0.85 },
    ],
    hair: "singleLoop",
    eyes: "happyArcs",
    mouth: "bigSmile",
  }),
  // 6. Aqua-Yellow-Pink Mesh with Tongue
  createMeshAvatarSvg({
    id: "m6",
    bg: "#67E8F9",
    blobs: [
      { cx: "25%", cy: "25%", r: "75%", color: "#22D3EE", opacity: 0.9 },
      { cx: "55%", cy: "55%", r: "65%", color: "#FDE047", opacity: 0.9 },
      { cx: "80%", cy: "80%", r: "75%", color: "#F472B6", opacity: 0.95 },
    ],
    hair: "tripleLoop",
    eyes: "dots",
    mouth: "tongueCenter",
  }),
];
