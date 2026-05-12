export function ThemeScript() {
  const script = `
(function() {
  try {
    var theme  = localStorage.getItem('plottr-theme')  || 'system';
    var accent = localStorage.getItem('plottr-accent') || 'blue';
    var root   = document.documentElement;
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    if (isDark) root.classList.add('dark');
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    var accents = {
      blue:    { l: '217 91% 60%', h: '217 91% 53%', m: '217 91% 95%', b: '217 91% 80%',
                 ld: '217 91% 65%', hd: '217 91% 72%', md: '217 40% 15%', bd: '217 60% 30%' },
      purple:  { l: '262 83% 63%', h: '262 83% 56%', m: '262 83% 96%', b: '262 83% 80%',
                 ld: '262 83% 68%', hd: '262 83% 75%', md: '262 40% 15%', bd: '262 60% 30%' },
      emerald: { l: '158 64% 46%', h: '158 64% 39%', m: '158 64% 95%', b: '158 64% 75%',
                 ld: '158 64% 52%', hd: '158 64% 60%', md: '158 40% 12%', bd: '158 55% 28%' },
    };
    var a = accents[accent] || accents.blue;
    if (isDark) {
      root.style.setProperty('--accent',        a.ld);
      root.style.setProperty('--accent-hover',  a.hd);
      root.style.setProperty('--accent-muted',  a.md);
      root.style.setProperty('--accent-border', a.bd);
    } else {
      root.style.setProperty('--accent',        a.l);
      root.style.setProperty('--accent-hover',  a.h);
      root.style.setProperty('--accent-muted',  a.m);
      root.style.setProperty('--accent-border', a.b);
    }
    root.setAttribute('data-accent', accent);
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