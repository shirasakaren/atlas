/**
 * Generated sticker art (SVG data URIs): simple, colourful, sticker-style
 * (thick white outline). Pure; no browser globals.
 */
import { svgDataUri } from '../assets';

const OUT = 'stroke="#fff" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"';
const INK = '#2b2d42';

const wrap = (inner: string) =>
  svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">` +
      `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".25"/></filter></defs>` +
      `<g filter="url(#s)">${inner}</g></svg>`,
  );

const face = (fill: string, eyes: string, mouth: string, extra = '') =>
  wrap(
    `<circle cx="80" cy="80" r="56" fill="${fill}" ${OUT}/>${eyes}${mouth}${extra}`,
  );

const dotEyes = `<circle cx="60" cy="72" r="6" fill="${INK}"/><circle cx="100" cy="72" r="6" fill="${INK}"/>`;
const smile = `<path d="M54 94 Q80 120 106 94" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`;

const badge = (text: string, bg: string, fg = '#fff', size = 34, rot = -6) =>
  wrap(
    `<g transform="rotate(${rot} 80 80)"><rect x="14" y="44" width="132" height="72" rx="20" fill="${bg}" ${OUT}/>` +
      `<text x="80" y="80" dy=".35em" text-anchor="middle" font-family="Inter,Segoe UI,Arial,sans-serif" font-weight="800" font-size="${size}" fill="${fg}">${text}</text></g>`,
  );

export interface StickerDef {
  name: string;
  keywords: string[];
  url: string;
}
export interface PackDef {
  name: string;
  description: string;
  stickers: StickerDef[];
}

export function stickerPacks(): PackDef[] {
  return [
    {
      name: 'Halcyon Reactions',
      description: 'Faces for every stand-up, incident and Friday deploy.',
      stickers: [
        { name: 'Happy', keywords: ['happy', 'smile', 'good', 'nice'], url: face('#ffd23f', dotEyes, smile) },
        {
          name: 'Laughing',
          keywords: ['lol', 'haha', 'funny', 'laugh'],
          url: face(
            '#ffd23f',
            `<path d="M50 72 Q60 62 70 72" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><path d="M90 72 Q100 62 110 72" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
            `<path d="M52 90 Q80 128 108 90 Z" fill="${INK}"/><path d="M62 104 Q80 114 98 104" fill="#ff6b6b"/>`,
            `<path d="M44 84 q-8 12 0 18 q8 -6 0 -18" fill="#4cc9f0"/>`,
          ),
        },
        {
          name: 'Wow',
          keywords: ['wow', 'surprised', 'omg', 'whoa'],
          url: face('#ffd23f', `<circle cx="60" cy="70" r="8" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="100" cy="70" r="8" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="60" cy="70" r="3" fill="${INK}"/><circle cx="100" cy="70" r="3" fill="${INK}"/>`, `<ellipse cx="80" cy="104" rx="10" ry="13" fill="${INK}"/>`),
        },
        {
          name: 'Love it',
          keywords: ['love', 'heart', 'adore', 'great'],
          url: face('#ffd23f', `<path d="M60 80 l-10 -10 a6 6 0 0 1 10 -8 a6 6 0 0 1 10 8 z" fill="#e63946"/><path d="M100 80 l-10 -10 a6 6 0 0 1 10 -8 a6 6 0 0 1 10 8 z" fill="#e63946"/>`, smile),
        },
        {
          name: 'Cool',
          keywords: ['cool', 'sunglasses', 'boss', 'smooth'],
          url: face('#ffd23f', `<rect x="40" y="62" width="34" height="20" rx="8" fill="${INK}"/><rect x="86" y="62" width="34" height="20" rx="8" fill="${INK}"/><rect x="72" y="68" width="16" height="5" fill="${INK}"/>`, `<path d="M58 98 Q80 112 104 96" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`),
        },
        {
          name: 'Thinking',
          keywords: ['thinking', 'hmm', 'consider', 'wonder'],
          url: face('#ffd23f', `<circle cx="60" cy="74" r="6" fill="${INK}"/><circle cx="100" cy="74" r="6" fill="${INK}"/><path d="M50 58 l20 -4" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`, `<path d="M62 104 h34" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`, `<text x="124" y="40" font-size="30" font-weight="800" fill="#4361ee" font-family="Arial">?</text>`),
        },
        {
          name: 'Sleepy',
          keywords: ['sleepy', 'tired', 'zzz', 'monday'],
          url: face('#a9c4ff', `<path d="M50 74 h20 M90 74 h20" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`, `<ellipse cx="80" cy="104" rx="9" ry="6" fill="${INK}"/>`, `<text x="112" y="46" font-size="26" font-weight="800" fill="#4361ee" font-family="Arial">z</text><text x="126" y="30" font-size="20" font-weight="800" fill="#4361ee" font-family="Arial">z</text>`),
        },
        {
          name: 'Party',
          keywords: ['party', 'celebrate', 'birthday', 'hooray'],
          url: face('#ffd23f', dotEyes, smile, `<path d="M52 36 L80 -4 L108 36 Z" transform="translate(0 12)" fill="#f72585" ${OUT}/><circle cx="80" cy="8" r="7" fill="#4cc9f0"/>`),
        },
        {
          name: 'Sweating',
          keywords: ['nervous', 'sweat', 'oops', 'deadline'],
          url: face('#ffd23f', dotEyes, `<path d="M56 104 q12 -10 24 0 t24 0" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`, `<path d="M122 52 q-10 16 0 22 q10 -6 0 -22" fill="#4cc9f0"/>`),
        },
        { name: 'LGTM', keywords: ['lgtm', 'approve', 'review', 'looks good'], url: badge('LGTM', '#2a9d8f', '#fff', 38) },
        { name: 'Nice!', keywords: ['nice', 'good job', 'well done', 'great'], url: badge('NICE!', '#f77f00', '#fff', 38, 5) },
        { name: 'Thanks', keywords: ['thanks', 'thank you', 'ty', 'appreciate'], url: badge('THANKS', '#4361ee', '#fff', 30, -4) },
      ],
    },
    {
      name: 'Ship It',
      description: 'For launches, fixes and the occasional fire.',
      stickers: [
        {
          name: 'Rocket',
          keywords: ['rocket', 'launch', 'ship', 'deploy', 'release'],
          url: wrap(`<g transform="rotate(35 80 80)"><path d="M80 18 C108 40 108 92 96 118 H64 C52 92 52 40 80 18 Z" fill="#f1f1f1" ${OUT}/><circle cx="80" cy="64" r="13" fill="#4cc9f0" stroke="${INK}" stroke-width="5"/><path d="M64 100 L42 124 L66 118 Z M96 100 L118 124 L94 118 Z" fill="#e63946" ${OUT}/><path d="M70 120 Q80 152 90 120 Z" fill="#ffb703"/></g>`),
        },
        { name: 'Check', keywords: ['done', 'check', 'complete', 'resolved'], url: wrap(`<circle cx="80" cy="80" r="56" fill="#2a9d8f" ${OUT}/><path d="M52 82 L72 102 L110 58" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`) },
        {
          name: 'Bug',
          keywords: ['bug', 'defect', 'issue', 'glitch'],
          url: wrap(`<ellipse cx="80" cy="90" rx="34" ry="40" fill="#e63946" ${OUT}/><circle cx="80" cy="46" r="18" fill="${INK}" ${OUT}/><path d="M80 52 V130 M46 76 H22 M114 76 H138 M48 100 L26 110 M112 100 L134 110 M52 60 L34 48 M108 60 L126 48" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><circle cx="66" cy="84" r="6" fill="${INK}"/><circle cx="94" cy="84" r="6" fill="${INK}"/><circle cx="72" cy="108" r="6" fill="${INK}"/><circle cx="88" cy="108" r="6" fill="${INK}"/>`),
        },
        {
          name: 'Idea',
          keywords: ['idea', 'lightbulb', 'insight', 'proposal'],
          url: wrap(`<path d="M80 22 C52 22 40 46 48 68 C54 84 62 88 62 104 H98 C98 88 106 84 112 68 C120 46 108 22 80 22 Z" fill="#ffd23f" ${OUT}/><rect x="62" y="108" width="36" height="12" rx="5" fill="#9aa0a6" ${OUT}/><rect x="68" y="122" width="24" height="10" rx="5" fill="#6c757d"/><path d="M80 30 L80 8 M30 40 L18 30 M130 40 L142 30" stroke="#ffb703" stroke-width="7" stroke-linecap="round"/>`),
        },
        {
          name: 'Trophy',
          keywords: ['trophy', 'win', 'champion', 'success'],
          url: wrap(`<path d="M48 26 H112 V64 C112 86 98 98 80 98 C62 98 48 86 48 64 Z" fill="#ffb703" ${OUT}/><path d="M48 36 H28 C28 62 38 70 52 72 M112 36 H132 C132 62 122 70 108 72" fill="none" stroke="#ffb703" stroke-width="9" stroke-linecap="round"/><rect x="72" y="98" width="16" height="22" fill="#ffb703"/><rect x="52" y="120" width="56" height="14" rx="5" fill="#e07a00" ${OUT}/>`),
        },
        {
          name: 'On fire',
          keywords: ['fire', 'hot', 'urgent', 'incident', 'lit'],
          url: wrap(`<path d="M80 18 C84 44 118 58 118 96 C118 124 100 142 80 142 C60 142 42 124 42 96 C42 78 54 66 62 56 C64 70 70 76 76 76 C70 56 72 36 80 18 Z" fill="#f77f00" ${OUT}/><path d="M80 80 C90 96 100 100 100 116 C100 128 92 136 80 136 C68 136 60 128 60 116 C60 104 74 98 80 80 Z" fill="#ffd23f"/>`),
        },
        { name: 'Shipped', keywords: ['shipped', 'live', 'released', 'launched'], url: badge('SHIPPED!', '#7209b7', '#fff', 27, -5) },
        { name: 'On it', keywords: ['on it', 'looking', 'working', 'ack'], url: badge('ON IT', '#0077b6', '#fff', 38, 4) },
        { name: 'Blocked', keywords: ['blocked', 'stuck', 'waiting', 'help'], url: badge('BLOCKED', '#d62828', '#fff', 28, -4) },
        { name: 'Plus one', keywords: ['+1', 'agree', 'same', 'seconded'], url: badge('+1', '#2a9d8f', '#fff', 54, 5) },
      ],
    },
    {
      name: 'Office Life',
      description: 'Coffee, cake and out-of-office energy.',
      stickers: [
        {
          name: 'Coffee',
          keywords: ['coffee', 'break', 'morning', 'caffeine'],
          url: wrap(`<path d="M40 54 H112 V96 C112 118 98 130 76 130 C54 130 40 118 40 96 Z" fill="#fff" ${OUT}/><path d="M112 66 H124 C134 66 134 92 112 92" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/><path d="M44 64 H108 V92 C108 110 96 124 76 124 C56 124 44 110 44 92 Z" fill="#c97b3d"/><path d="M62 44 q-8 -12 0 -22 M82 44 q-8 -12 0 -22 M102 44 q-8 -12 0 -22" fill="none" stroke="#9aa0a6" stroke-width="6" stroke-linecap="round"/>`),
        },
        {
          name: 'Cake',
          keywords: ['cake', 'birthday', 'celebrate', 'dessert'],
          url: wrap(`<rect x="34" y="78" width="92" height="52" rx="10" fill="#f48fb1" ${OUT}/><path d="M34 96 q12 14 23 0 q12 14 23 0 q12 14 23 0 q12 14 23 0" fill="#fff"/><rect x="74" y="50" width="12" height="28" fill="#4cc9f0" ${OUT}/><path d="M80 24 q10 12 0 22 q-10 -10 0 -22" fill="#ffb703"/>`),
        },
        { name: 'Heart', keywords: ['heart', 'love', 'care', 'kudos'], url: wrap(`<path d="M80 134 C20 94 26 42 58 38 C70 36 78 44 80 52 C82 44 90 36 102 38 C134 42 140 94 80 134 Z" fill="#e63946" ${OUT}/><path d="M52 58 q6 -10 16 -6" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".7"/>`) },
        { name: 'Star', keywords: ['star', 'great', 'kudos', 'gold'], url: wrap(`<path d="M80 18 L98 60 L144 64 L109 94 L120 138 L80 114 L40 138 L51 94 L16 64 L62 60 Z" fill="#ffd23f" ${OUT}/>`) },
        { name: 'Plant', keywords: ['plant', 'office', 'green', 'desk'], url: wrap(`<path d="M52 98 H108 L100 140 H60 Z" fill="#c97b3d" ${OUT}/><path d="M80 98 C80 60 56 56 44 40 C70 38 84 60 80 98 Z M80 98 C80 64 104 56 118 38 C92 36 76 62 80 98 Z" fill="#2a9d8f" ${OUT}/>`) },
        { name: 'Coffee?', keywords: ['coffee', 'break', 'join', 'walk'], url: badge('COFFEE?', '#8d5524', '#fff', 30, -5) },
        { name: 'Friday!', keywords: ['friday', 'weekend', 'finally', 'tgif'], url: badge('FRIDAY!', '#f72585', '#fff', 30, 5) },
        { name: 'Back soon', keywords: ['brb', 'back soon', 'away', 'lunch'], url: badge('BRB', '#4361ee', '#fff', 46, -4) },
        { name: 'Out of office', keywords: ['ooo', 'vacation', 'holiday', 'away'], url: badge('OOO', '#2a9d8f', '#fff', 46, 4) },
        { name: 'Monday', keywords: ['monday', 'ugh', 'week', 'start'], url: badge('MONDAY', '#6c757d', '#fff', 30, -5) },
      ],
    },
  ];
}
