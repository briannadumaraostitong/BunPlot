import { THEMES, DEFAULT_THEME_SETTING } from '@/lib/themes'

export function ThemeScript() {
  const script = `
(function() {
  try {
    var setting = localStorage.getItem('plottr-theme') || ${JSON.stringify(DEFAULT_THEME_SETTING)};
    var themes = ${JSON.stringify(THEMES)};
    var root = document.documentElement;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var id = setting === 'sync' ? (prefersDark ? 'classic-dark' : 'classic-light') : setting;
    var theme = themes.find(function(t) { return t.id === id; }) || themes[0];
    Object.keys(theme.tokens).forEach(function(key) {
      root.style.setProperty(key, theme.tokens[key]);
    });
    root.setAttribute('data-theme', theme.id);
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
