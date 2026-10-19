type P = { size?: number };
const s = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Pause = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 6.5v11M15 6.5v11" /></svg>;
export const Back = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M14.5 5.5 8 12l6.5 6.5" /></svg>;
export const Next = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9.5 5.5 16 12l-6.5 6.5" /></svg>;
export const Restart = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" /><path d="M4 4.5v3.5h3.5" /></svg>;
export const Undo = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9a5 5 0 0 1 0 10h-2" /></svg>;
export const Lamp = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>;
export const Gear = ({ size }: P) => (
  <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" /></svg>
);
/** A thread of light joining three stars. */
export const Thread = ({ size }: P) => <svg {...s(size)} aria-hidden><path d="M5 17.5 11 7l8 6.5" /><circle cx="5" cy="17.5" r="1.8" fill="currentColor" /><circle cx="11" cy="7" r="1.8" fill="currentColor" /><circle cx="19" cy="13.5" r="1.8" fill="currentColor" /></svg>;
/** A star chart. */
export const Sky = ({ size }: P) => <svg {...s(size)} aria-hidden><circle cx="12" cy="12" r="9" opacity=".5" /><path d="M7 14.5 10.5 9l5 2.5L17 16" strokeDasharray="1.5 2" /><circle cx="7" cy="14.5" r="1.2" fill="currentColor" /><circle cx="10.5" cy="9" r="1.2" fill="currentColor" /><circle cx="15.5" cy="11.5" r="1.2" fill="currentColor" /><circle cx="17" cy="16" r="1.2" fill="currentColor" /></svg>;
/** Stars are four-pointed sparkles, lit when earned. */
export const Star = ({ size = 22, on = true }: P & { on?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    {on && <circle cx="12" cy="12" r="10.5" fill="url(#st-g)" />}
    <defs><radialGradient id="st-g"><stop offset="0" stopColor="#fff6dc" stopOpacity=".9" /><stop offset=".35" stopColor="#ffd98a" stopOpacity=".35" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient></defs>
    <path d="M12 2.8c.6 4.6 2.6 6.6 7.2 7.2-4.6.6-6.6 2.6-7.2 7.2-.6-4.6-2.6-6.6-7.2-7.2 4.6-.6 6.6-2.6 7.2-7.2z" transform="translate(0 2)" fill={on ? '#fff3cf' : 'none'} stroke={on ? '#ffe4a0' : 'rgba(232,236,255,.5)'} strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
