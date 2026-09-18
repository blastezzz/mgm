type P = { size?: number; className?: string };
const s = (n: number) => ({ width: n, height: n, viewBox: "0 0 16 16", fill: "none" as const, "aria-hidden": true });

export const IconSearch = ({ size = 15 }: P) => (
  <svg {...s(size)}><circle cx="7" cy="7" r="4.6" stroke="currentColor" strokeWidth="1.4" /><path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
);

export const IconX = ({ size = 15 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
);

export const IconTelegram = ({ size = 15 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.94 4.3 18.9 19.1c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.95.46l.34-4.8 8.73-7.89c.38-.34-.08-.53-.59-.19l-10.79 6.8-4.65-1.45c-1.01-.32-1.03-1.01.21-1.5l18.18-7c.84-.31 1.58.2 1.3 1.46z" /></svg>
);

export const IconMenu = ({ size = 16 }: P) => (
  <svg {...s(size)}><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
);

export const IconGrid = ({ size = 14 }: P) => (
  <svg {...s(size)}><rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" /><rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" /><rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" /><rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" /></svg>
);

export const IconList = ({ size = 14 }: P) => (
  <svg {...s(size)}><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

export const IconUpload = ({ size = 22 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M3.5 15v3.2A2.3 2.3 0 0 0 5.8 20.5h12.4a2.3 2.3 0 0 0 2.3-2.3V15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);

export const IconClose = ({ size = 12 }: P) => (
  <svg {...s(size)}><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);

export const IconCopy = ({ size = 12 }: P) => (
  <svg {...s(size)}><rect x="5.5" y="5.5" width="8" height="8" rx="1.4" stroke="currentColor" strokeWidth="1.3" /><path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1.3" /></svg>
);

export const IconCheck = ({ size = 12 }: P) => (
  <svg {...s(size)}><path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const IconShield = ({ size = 15 }: P) => (
  <svg {...s(size)}><path d="M8 1.6l5 2v4.1c0 3.2-2 5.6-5 6.7-3-1.1-5-3.5-5-6.7V3.6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M5.8 7.9l1.6 1.6 3-3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const IconArrowUp = ({ size = 14 }: P) => (
  <svg {...s(size)}><path d="M8 13V3.5M8 3.5L4 7.5M8 3.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const IconSpinner = ({ size = 14 }: P) => (
  <svg {...s(size)} className="spin"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" /><path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
