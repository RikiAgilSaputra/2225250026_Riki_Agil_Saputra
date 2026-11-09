/** Hero illustration: "Kiko", an original owl mascot on math blocks (inspired by the mockup's mood). */
export function HeroArt() {
  return (
    <svg viewBox="0 0 400 300" role="img" aria-label="Kiko si burung hantu belajar matematika">
      <defs>
        <linearGradient id="blk" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8EC5FF" />
          <stop offset="1" stopColor="#4D8FD8" />
        </linearGradient>
        <linearGradient id="blk2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6FAAF0" />
          <stop offset="1" stopColor="#3570BC" />
        </linearGradient>
        <linearGradient id="gold" x1="0" x2="1">
          <stop offset="0" stopColor="#FFD27A" />
          <stop offset="1" stopColor="#E9A23B" />
        </linearGradient>
        <radialGradient id="ball" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#CFE6FF" />
          <stop offset="1" stopColor="#3B7BD0" />
        </radialGradient>
      </defs>
      {/* floating formulas */}
      <g fill="#CFE2FF" fontFamily="Georgia, serif" fontStyle="italic" opacity="0.9">
        <text x="285" y="58" fontSize="20">x + y = 5</text>
        <text x="20" y="128" fontSize="18">2x − y = 1</text>
        <text x="342" y="112" fontSize="34" fill="#9CC4FF">π</text>
        <text x="40" y="232" fontSize="30" fill="#FFC86B">x</text>
        <text x="300" y="268" fontSize="16">(3, 2)</text>
      </g>
      {/* graph card */}
      <g transform="translate(118 40) rotate(-4)">
        <rect width="86" height="68" rx="8" fill="#F5FAFF" stroke="#BBD6F7" strokeWidth="2" />
        <path d="M12 56V12M12 56h64" stroke="#7E9CC4" strokeWidth="2" />
        <path d="M16 50 40 30l12 8 20-24" stroke="#2F7FE0" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M16 20 70 52" stroke="#F08A24" strokeWidth="3" strokeLinecap="round" />
        <circle cx="45" cy="35" r="4" fill="#16243A" />
      </g>
      {/* blocks */}
      <path d="M150 300V200l60-26 60 26v100z" fill="url(#blk)" />
      <path d="M150 200l60-26 60 26-60 26z" fill="#B9DBFF" />
      <path d="M210 226v74" stroke="#3A78C8" strokeWidth="2" />
      <path d="M70 300v-60l45-18 45 18v60z" fill="url(#blk2)" />
      <path d="M70 240l45-18 45 18-45 18z" fill="#A6CCF6" />
      <path d="M262 300v-78l40-16 40 16v78z" fill="url(#blk2)" />
      <path d="M262 222l40-16 40 16-40 16z" fill="#A6CCF6" />
      {/* pyramid & ball */}
      <path d="M300 206l-26 -64 -22 64z" fill="url(#gold)" />
      <path d="M300 206l-26-64 10 64z" fill="#C98623" opacity="0.6" />
      <circle cx="100" cy="212" r="16" fill="url(#ball)" />
      {/* owl */}
      <g transform="translate(160 76)">
        <ellipse cx="50" cy="96" rx="44" ry="10" fill="#1B3A66" opacity="0.35" />
        <path d="M10 60c0-34 18-50 40-50s40 16 40 50c0 26-18 40-40 40S10 86 10 60z" fill="#A8743F" />
        <path d="M24 72c0-14 12-22 26-22s26 8 26 22c0 16-12 24-26 24S24 88 24 72z" fill="#F3D9B1" />
        <path d="M30 70h40M32 80h36" stroke="#D9B98A" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 42 4 18l20 14zM90 42l6-24-20 14z" fill="#8A5A2B" />
        <circle cx="35" cy="42" r="15" fill="#FFF" />
        <circle cx="65" cy="42" r="15" fill="#FFF" />
        <circle cx="37" cy="44" r="7" fill="#16243A" />
        <circle cx="63" cy="44" r="7" fill="#16243A" />
        <circle cx="39" cy="41" r="2.2" fill="#FFF" />
        <circle cx="65" cy="41" r="2.2" fill="#FFF" />
        <path d="M45 54l5 8 5-8z" fill="#F0A030" />
        {/* cap */}
        <path d="M16 18 50 4l34 14-34 14z" fill="#1E2B3F" />
        <path d="M30 22v10c6 4 34 4 40 0V22" fill="#2B3B55" />
        <path d="M84 18v20" stroke="#F2B544" strokeWidth="3" />
        <circle cx="84" cy="40" r="4" fill="#F2B544" />
        {/* wing pointing to the graph */}
        <path d="M14 66c-14-6-22-22-18-40 6 6 14 18 22 26z" fill="#8A5A2B" />
        {/* pencil */}
        <g transform="translate(70 70) rotate(30)">
          <rect width="34" height="7" rx="2" fill="#F2B544" />
          <path d="M34 0l8 3.5-8 3.5z" fill="#F3D9B1" />
        </g>
      </g>
    </svg>
  )
}

export function GiftArt() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 28h44v28a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#7B6CF0" />
      <path d="M6 20h52v10H6z" fill="#9A8CFF" />
      <path d="M28 20h8v39h-8z" fill="#F2B544" />
      <path d="M32 20c-4-8-14-10-14-4s10 4 14 4c4 0 14 2 14-4s-10-4-14 4z" fill="#F2B544" />
      <circle cx="54" cy="10" r="2" fill="#9CC4FF" />
      <circle cx="8" cy="12" r="1.6" fill="#9CC4FF" />
    </svg>
  )
}
