/**
 * Original simplified illustration of the Knysna estuary — drawn for this site.
 * It is a schematic orientation aid, not a navigational chart, and it is
 * deliberately not derived from any third-party map.
 */
export function LagoonMap({ className = '' }: { className?: string }) {
  return (
    <figure className={className}>
      <svg
        viewBox="0 0 760 520"
        role="img"
        aria-label="Simplified illustration of the Knysna estuary showing the Heads, Featherbed, Leisure Isle, Thesen Islands, Belvidere and the moorings"
        className="w-full bg-navy-deep"
      >
        <defs>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f3a5c" />
            <stop offset="100%" stopColor="#16293f" />
          </linearGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16293f" />
            <stop offset="100%" stopColor="#0d1a2c" />
          </linearGradient>
        </defs>

        <rect width="760" height="520" fill="#0e1c30" />

        {/* Open sea, bottom right */}
        <path d="M470 520 L760 520 L760 300 Q640 340 560 420 Q510 470 470 520 Z" fill="url(#sea)" />

        {/* Estuary body */}
        <path
          d="M150 150
             Q120 210 150 268
             Q186 330 268 356
             Q356 384 430 372
             Q486 362 520 396
             Q548 424 566 452
             L610 428
             Q580 380 552 344
             Q520 302 520 262
             Q520 214 470 190
             Q404 158 330 150
             Q236 140 150 150 Z"
          fill="url(#water)"
          stroke="#2b4568"
        />

        {/* River, top left towards Belvidere */}
        <path
          d="M150 150 Q104 132 74 96 L96 74 Q132 112 168 132 Z"
          fill="url(#water)"
        />

        {/* Sandbanks */}
        <path
          d="M232 300 Q290 282 348 300 Q292 322 232 300 Z"
          fill="#ecd7a6"
          opacity="0.22"
        />
        <path
          d="M400 250 Q446 236 486 254 Q444 272 400 250 Z"
          fill="#ecd7a6"
          opacity="0.16"
        />

        {/* Thesen Islands */}
        <circle cx="318" cy="238" r="26" fill="#0e1c30" stroke="#ecd7a6" strokeOpacity="0.4" />
        <text x="318" y="242" textAnchor="middle" fontSize="10" fill="#ecd7a6" fontFamily="Georgia, serif">
          Thesen
        </text>

        {/* Leisure Isle */}
        <ellipse cx="452" cy="330" rx="42" ry="26" fill="#0e1c30" stroke="#ecd7a6" strokeOpacity="0.4" />
        <text x="452" y="334" textAnchor="middle" fontSize="10" fill="#ecd7a6" fontFamily="Georgia, serif">
          Leisure Isle
        </text>

        {/* The Heads — two headlands with the channel between */}
        <path d="M512 392 Q540 372 566 386 L586 424 Q548 408 522 420 Z" fill="#14273f" stroke="#ecd7a6" strokeOpacity="0.55" />
        <path d="M600 436 Q634 420 668 440 L672 486 Q630 462 598 470 Z" fill="#14273f" stroke="#ecd7a6" strokeOpacity="0.55" />
        <text x="600" y="380" textAnchor="middle" fontSize="12" fill="#ecd7a6" fontFamily="Georgia, serif" letterSpacing="2">
          THE HEADS
        </text>
        <path
          d="M566 452 L622 470"
          stroke="#b07c2e"
          strokeWidth="2"
          strokeDasharray="5 5"
        />

        {/* Featherbed, western shore */}
        <text x="228" y="196" fontSize="11" fill="#ecd7a6" fontFamily="Georgia, serif">
          Featherbed
        </text>
        <path d="M196 204 Q252 216 300 210" stroke="#ecd7a6" strokeOpacity="0.35" fill="none" />

        {/* Belvidere */}
        <text x="76" y="62" fontSize="11" fill="#ecd7a6" fontFamily="Georgia, serif">
          Belvidere
        </text>

        {/* Knysna town / moorings */}
        <circle cx="372" cy="200" r="5" fill="#b07c2e" />
        <text x="386" y="204" fontSize="11" fill="#ffffff" fontFamily="Georgia, serif">
          Moorings — Knysna Waterfront
        </text>

        {/* Self-drive limit */}
        <path
          d="M500 300 Q520 360 540 410"
          stroke="#b07c2e"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          fill="none"
        />
        <text x="466" y="290" fontSize="9.5" fill="#b07c2e" fontFamily="Georgia, serif" letterSpacing="1.5">
          SELF-DRIVE LIMIT
        </text>

        <text x="690" y="330" fontSize="10" fill="#ffffff" opacity="0.5" fontFamily="Georgia, serif">
          Indian
        </text>
        <text x="690" y="346" fontSize="10" fill="#ffffff" opacity="0.5" fontFamily="Georgia, serif">
          Ocean
        </text>

        {/* Compass */}
        <g transform="translate(700 60)">
          <path d="M0 -22 L7 6 L0 0 L-7 6 Z" fill="#ecd7a6" />
          <text x="0" y="24" textAnchor="middle" fontSize="10" fill="#ecd7a6" fontFamily="Georgia, serif">
            N
          </text>
        </g>
      </svg>

      <figcaption className="mt-3 text-xs leading-5 text-navy-mute">
        Schematic illustration for orientation only. Not for navigation — carry a chart and use the
        marked channel.
      </figcaption>
    </figure>
  );
}
