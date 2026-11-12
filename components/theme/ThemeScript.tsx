import {
  THEMES,
  DEFAULT_THEME_SETTING,
  THEME_SETTINGS,
  LEGACY_THEME_MAP,
  THEME_STORAGE_KEY,
  THEME_UNSYNCED_KEY,
  type ThemeSetting,
} from '@/lib/themes'
import { InitialHtmlScript } from '@/components/theme/InitialHtmlScript'

// Applies the theme to <html> before paint. Without `setting` (the root
// layout) it applies this device's stored setting. With `setting` (the
// (app) layout, from profiles.theme, already normalized) the profile's
// setting wins: it's applied and stored, unless a failed save is pending on
// this device (the unsynced marker), which keeps the device's own.
export function ThemeScript({ setting }: { setting?: ThemeSetting } = {}) {
  // The setting is normalized as in normalizeThemeSetting() (lib/themes.ts),
  // which this inline script can't import, and written back so a removed
  // theme's id heals on first load.
  const script = `
(function() {
  try {
    var storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
    var profile = ${JSON.stringify(setting ?? null)};
    if (profile !== null && localStorage.getItem(${JSON.stringify(THEME_UNSYNCED_KEY)}) === null) {
      localStorage.setItem(storageKey, profile);
    }
    var stored = localStorage.getItem(storageKey);
    var legacy = ${JSON.stringify(LEGACY_THEME_MAP)};
    var settings = ${JSON.stringify(THEME_SETTINGS)};
    var setting = Object.prototype.hasOwnProperty.call(legacy, stored) ? legacy[stored]
      : settings.indexOf(stored) >= 0 ? stored : ${JSON.stringify(DEFAULT_THEME_SETTING)};
    if (stored !== null && stored !== setting) localStorage.setItem(storageKey, setting);
    var themes = ${JSON.stringify(THEMES)};
    var root = document.documentElement;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var id = setting === 'sync' ? (prefersDark ? 'classic-dark' : 'classic-light') : setting;
    var theme = themes.find(function(t) { return t.id === id; }) || themes[0];
    Object.keys(theme.tokens).forEach(function(key) {
      root.style.setProperty(key, theme.tokens[key]);
    });
    root.style.setProperty('--theme-font-sans', 'var(' + theme.fonts.sans + ')');
    root.style.setProperty('--theme-font-mono', 'var(' + theme.fonts.mono + ')');
    root.style.setProperty('--theme-font-heading', 'var(' + theme.fonts.heading + ')');
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-shape', theme.shape);
    root.setAttribute('data-texture', theme.texture);
    root.setAttribute('data-frames', theme.frames || 'none');
    // Toggle, not add: the profile's run can follow a dark device setting.
    root.classList.toggle('dark', !!theme.isDark);
  } catch(e) {}
})();
  `.trim()

  // The profile's script sits in the (app) layout, which client navigation
  // (after login) mounts on the client, so it renders only in the server HTML;
  // login and AppShell apply the theme on that path. The root layout's never
  // mounts on the client.
  if (setting) return <InitialHtmlScript html={script} />

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
