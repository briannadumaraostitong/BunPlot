import { THEMES, DEFAULT_THEME_SETTING, THEME_SETTINGS, LEGACY_THEME_MAP } from '@/lib/themes'

export function ThemeScript() {
  // The setting is normalized as in normalizeThemeSetting() (lib/themes.ts),
  // which this inline script can't import, and written back so a removed
  // theme's id heals on first load.
  const script = `
(function() {
  try {
    var stored = localStorage.getItem('plottr-theme');
    var legacy = ${JSON.stringify(LEGACY_THEME_MAP)};
    var settings = ${JSON.stringify(THEME_SETTINGS)};
    var setting = Object.prototype.hasOwnProperty.call(legacy, stored) ? legacy[stored]
      : settings.indexOf(stored) >= 0 ? stored : ${JSON.stringify(DEFAULT_THEME_SETTING)};
    if (stored !== null && stored !== setting) localStorage.setItem('plottr-theme', setting);
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
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-shape', theme.shape);
    root.setAttribute('data-texture', theme.texture);
    if (theme.isDark) root.classList.add('dark');
  } catch(e) {}
})();
  `.trim()

  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
