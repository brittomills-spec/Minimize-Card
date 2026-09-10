import React from 'react';

interface AvatarProps {
  id?: string;
  size?: number;
  className?: string;
}

// 10 Sleek Human Gamer Face SVG Portraits
const AVATAR_SVGS: Record<string, (size: number) => React.ReactNode> = {
  // 1: Cyber Sam - Cyan futuristic visor & gamer headset
  'human-1': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#0f172a" stroke="#00f0ff" strokeWidth="2.5"/>
      <path d="M16 46C16 38 23 35 32 35C41 35 48 38 48 46V54H16V46Z" fill="#1e293b"/>
      <circle cx="32" cy="27" r="11" fill="#f8fafc"/>
      {/* Hair */}
      <path d="M21 24C21 17 26 15 32 15C38 15 43 17 43 24H21Z" fill="#00f0ff"/>
      {/* Cyber Visor */}
      <rect x="22" y="23" width="20" height="7" rx="3.5" fill="#00f0ff"/>
      <line x1="24" y1="26.5" x2="40" y2="26.5" stroke="#ffffff" strokeWidth="1.5"/>
      {/* Gamer Headset */}
      <path d="M18 22C18 16 24 13 32 13C40 13 46 16 46 22" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round"/>
      <rect x="16" y="21" width="5" height="10" rx="2" fill="#00f0ff"/>
      <rect x="43" y="21" width="5" height="10" rx="2" fill="#00f0ff"/>
      <path d="M44 28L47 34H41" stroke="#00f0ff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  // 2: Neon Maya - Purple / Magenta cyber hair & glasses
  'human-2': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#180e29" stroke="#d946ef" strokeWidth="2.5"/>
      <path d="M16 47C16 39 23 36 32 36C41 36 48 39 48 47V54H16V47Z" fill="#2e1065"/>
      <circle cx="32" cy="28" r="11" fill="#fbcfe8"/>
      {/* Magenta Hair */}
      <path d="M19 26C18 16 25 14 32 14C39 14 46 16 45 26C45 23 41 21 38 21C34 21 33 24 32 24C31 24 30 21 26 21C23 21 19 23 19 26Z" fill="#d946ef"/>
      {/* Goggles */}
      <rect x="23" y="24" width="8" height="6" rx="2" fill="#d946ef"/>
      <rect x="33" y="24" width="8" height="6" rx="2" fill="#d946ef"/>
      <line x1="31" y1="27" x2="33" y2="27" stroke="#d946ef" strokeWidth="2"/>
      {/* Headphones */}
      <rect x="17" y="22" width="4" height="10" rx="2" fill="#f472b6"/>
      <rect x="43" y="22" width="4" height="10" rx="2" fill="#f472b6"/>
    </svg>
  ),

  // 3: Titan Alex - Crimson gamer hoodie & glasses
  'human-3': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#1c0a0a" stroke="#ff3366" strokeWidth="2.5"/>
      {/* Hoodie */}
      <path d="M15 48C15 37 22 33 32 33C42 33 49 37 49 48V54H15V48Z" fill="#991b1b"/>
      <path d="M22 34C22 25 25 21 32 21C39 21 42 25 42 34V37H22V34Z" fill="#7f1d1d"/>
      <circle cx="32" cy="28" r="10" fill="#fed7aa"/>
      {/* Glasses */}
      <rect x="24" y="25" width="7" height="5" rx="1.5" fill="#111827" stroke="#ff3366" strokeWidth="1.5"/>
      <rect x="33" y="25" width="7" height="5" rx="1.5" fill="#111827" stroke="#ff3366" strokeWidth="1.5"/>
      <line x1="31" y1="27.5" x2="33" y2="27.5" stroke="#ff3366" strokeWidth="1.5"/>
      {/* Headset */}
      <rect x="18" y="23" width="4" height="9" rx="2" fill="#ff3366"/>
      <rect x="42" y="23" width="4" height="9" rx="2" fill="#ff3366"/>
    </svg>
  ),

  // 4: Shadow Kai - Dark helmet with glowing gold visor
  'human-4': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#0f1117" stroke="#ffd700" strokeWidth="2.5"/>
      <path d="M16 46C16 38 23 35 32 35C41 35 48 38 48 46V54H16V46Z" fill="#1e293b"/>
      {/* Tactical Mask & Helmet */}
      <path d="M20 30C20 20 25 15 32 15C39 15 44 20 44 30C44 35 39 39 32 39C25 39 20 35 20 30Z" fill="#1e293b"/>
      {/* Golden Glowing Visor */}
      <path d="M23 24C23 22.5 27 21 32 21C37 21 41 22.5 41 24V28C41 29.5 37 31 32 31C27 31 23 29.5 23 28V24Z" fill="#ffd700"/>
      <line x1="25" y1="26" x2="39" y2="26" stroke="#ffffff" strokeWidth="2"/>
    </svg>
  ),

  // 5: Volt Leo - Emerald cap & VR glasses
  'human-5': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#062016" stroke="#10b981" strokeWidth="2.5"/>
      <path d="M16 46C16 38 23 35 32 35C41 35 48 38 48 46V54H16V46Z" fill="#064e3b"/>
      <circle cx="32" cy="28" r="10" fill="#ffe4e6"/>
      {/* Emerald Cap */}
      <path d="M21 23C21 17 26 14 32 14C38 14 43 17 43 23H21Z" fill="#059669"/>
      <path d="M20 23L36 21V24H20V23Z" fill="#10b981"/>
      {/* VR Visor */}
      <rect x="22" y="24" width="20" height="7" rx="2" fill="#10b981"/>
      <circle cx="27" cy="27.5" r="1.5" fill="#ffffff"/>
      <circle cx="37" cy="27.5" r="1.5" fill="#ffffff"/>
    </svg>
  ),

  // 6: Phoenix Zoe - Gold Crown Hair & Shades
  'human-6': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#1c1606" stroke="#f59e0b" strokeWidth="2.5"/>
      <path d="M16 47C16 39 23 36 32 36C41 36 48 39 48 47V54H16V47Z" fill="#78350f"/>
      <circle cx="32" cy="28" r="10.5" fill="#fed7aa"/>
      {/* Golden Hair */}
      <path d="M20 25C19 16 24 13 32 13C40 13 45 16 44 25C42 21 38 19 32 19C26 19 22 21 20 25Z" fill="#f59e0b"/>
      {/* Dark Aviators */}
      <path d="M23 25H41L38 31H26L23 25Z" fill="#0f172a"/>
      <line x1="23" y1="25" x2="41" y2="25" stroke="#f59e0b" strokeWidth="1.5"/>
    </svg>
  ),

  // 7: Viper Jin - Purple Bandana & Headset
  'human-7': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#190e24" stroke="#8b5cf6" strokeWidth="2.5"/>
      <path d="M16 46C16 38 23 35 32 35C41 35 48 38 48 46V54H16V46Z" fill="#4c1d95"/>
      <circle cx="32" cy="28" r="10" fill="#fde047"/>
      {/* Headband */}
      <rect x="21" y="20" width="22" height="5" fill="#8b5cf6"/>
      {/* Headset */}
      <rect x="17" y="22" width="4" height="10" rx="2" fill="#c4b5fd"/>
      <rect x="43" y="22" width="4" height="10" rx="2" fill="#c4b5fd"/>
      {/* Eyes */}
      <circle cx="27" cy="28" r="1.5" fill="#0f172a"/>
      <circle cx="37" cy="28" r="1.5" fill="#0f172a"/>
    </svg>
  ),

  // 8: Blaze Dan - Amber Beanie & Tech Specs
  'human-8': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#1e1208" stroke="#f97316" strokeWidth="2.5"/>
      <path d="M16 47C16 39 23 36 32 36C41 36 48 39 48 47V54H16V47Z" fill="#7c2d12"/>
      <circle cx="32" cy="29" r="10" fill="#ffedd5"/>
      {/* Beanie */}
      <path d="M21 24C21 16 26 13 32 13C38 13 43 16 43 24H21Z" fill="#f97316"/>
      <rect x="20" y="22" width="24" height="4" rx="1" fill="#c2410c"/>
      {/* Specs */}
      <rect x="24" y="26" width="7" height="5" rx="1.5" fill="#0f172a" stroke="#fdba74" strokeWidth="1.2"/>
      <rect x="33" y="26" width="7" height="5" rx="1.5" fill="#0f172a" stroke="#fdba74" strokeWidth="1.2"/>
      <line x1="31" y1="28.5" x2="33" y2="28.5" stroke="#fdba74" strokeWidth="1.2"/>
    </svg>
  ),

  // 9: Frost Iris - Silver Blue Hair & Neon Headset
  'human-9': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#091b26" stroke="#38bdf8" strokeWidth="2.5"/>
      <path d="M16 47C16 39 23 36 32 36C41 36 48 39 48 47V54H16V47Z" fill="#0c4a6e"/>
      <circle cx="32" cy="28" r="10" fill="#e0f2fe"/>
      {/* Silver Hair */}
      <path d="M19 25C18 16 25 13 32 13C39 13 46 16 45 25C41 21 38 19 32 19C26 19 23 21 19 25Z" fill="#94a3b8"/>
      {/* Cyber Eyes */}
      <rect x="23" y="25" width="7" height="4" rx="1" fill="#38bdf8"/>
      <rect x="34" y="25" width="7" height="4" rx="1" fill="#38bdf8"/>
      {/* Headset */}
      <rect x="17" y="22" width="4" height="10" rx="2" fill="#38bdf8"/>
      <rect x="43" y="22" width="4" height="10" rx="2" fill="#38bdf8"/>
    </svg>
  ),

  // 10: Apex Ray - Gamer Cap & Dark Shades
  'human-10': (s) => (
    <svg width={s} height={s} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="30" fill="#170c18" stroke="#a855f7" strokeWidth="2.5"/>
      <path d="M16 46C16 38 23 35 32 35C41 35 48 38 48 46V54H16V46Z" fill="#581c87"/>
      <circle cx="32" cy="28" r="10" fill="#f3e8ff"/>
      {/* Cap */}
      <path d="M21 22C21 16 26 14 32 14C38 14 43 16 43 22H21Z" fill="#a855f7"/>
      <path d="M21 22L36 20V23H21V22Z" fill="#7e22ce"/>
      {/* Shades */}
      <path d="M23 25H41L38 30H26L23 25Z" fill="#1e1b4b"/>
      <line x1="23" y1="25" x2="41" y2="25" stroke="#a855f7" strokeWidth="1.2"/>
    </svg>
  ),
};

export const Avatar: React.FC<AvatarProps> = ({ id = 'human-1', size = 36, className = '' }) => {
  // Map legacy emoji avatars to human face IDs seamlessly
  let key = id;
  if (!AVATAR_SVGS[key]) {
    const legacyIndex = Math.abs((id.charCodeAt(0) || 0) % 10) + 1;
    key = `human-${legacyIndex}`;
  }

  const renderSvg = AVATAR_SVGS[key] || AVATAR_SVGS['human-1'];

  return (
    <div 
      className={`avatar-face ${className}`} 
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      {renderSvg(size)}
    </div>
  );
};
