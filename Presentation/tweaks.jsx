// Tweaks panel for FitHealth deck — colors + typography
const { useEffect } = React;

const PALETTES = /*EDITMODE-BEGIN*/{
  "accent": "#8b8fff",
  "accentSecondary": "#ec4899",
  "bg": "#0a0f1f",
  "fontHeading": "Plus Jakarta Sans",
  "fontBody": "Plus Jakarta Sans",
  "fontSerif": "Instrument Serif"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  "#8b8fff", // indigo (default)
  "#22c55e", // green
  "#ec4899", // pink
  "#fbbf24"  // yellow
];

const ACCENT2_OPTIONS = [
  "#ec4899", // pink
  "#f97316", // orange
  "#22c55e", // green
  "#8b8fff"  // indigo
];

const BG_OPTIONS = [
  "#0a0f1f", // navy (default)
  "#000000", // pure black
  "#0e1424", // deep navy
  "#111827"  // slate
];

const HEADING_FONTS = [
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Geist",
  "Manrope"
];

const BODY_FONTS = [
  "Plus Jakarta Sans",
  "Inter",
  "Geist",
  "DM Sans"
];

const SERIF_FONTS = [
  "Instrument Serif",
  "Cormorant Garamond",
  "Fraunces",
  "Playfair Display"
];

function ensureFont(family) {
  const id = "font-" + family.replace(/\s+/g, "-");
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=" +
    encodeURIComponent(family) + ":wght@400;500;600;700;800&display=swap";
  document.head.appendChild(link);
}

function App() {
  const [tweaks, setTweak] = useTweaks(PALETTES);

  useEffect(() => {
    ensureFont(tweaks.fontHeading);
    ensureFont(tweaks.fontBody);
    ensureFont(tweaks.fontSerif);

    const root = document.documentElement;
    root.style.setProperty("--indigo", tweaks.accent);
    root.style.setProperty("--pink", tweaks.accentSecondary);
    root.style.setProperty("--bg", tweaks.bg);
    root.style.setProperty("--font-sans", `"${tweaks.fontBody}", system-ui, sans-serif`);
    root.style.setProperty("--font-serif", `"${tweaks.fontSerif}", serif`);

    // Apply heading family via inline rule
    let styleEl = document.getElementById("__tweaks-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "__tweaks-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      h1, h2, h3, .display, .title { font-family: "${tweaks.fontHeading}", system-ui, sans-serif !important; }
      h2.title em, h1 em, .s-title h1 small { font-family: "${tweaks.fontSerif}", serif !important; }
    `;
  }, [tweaks]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Colors">
        <TweakColor
          label="Primary accent"
          value={tweaks.accent}
          options={ACCENT_OPTIONS}
          onChange={(v) => setTweak("accent", v)}
        />
        <TweakColor
          label="Secondary accent"
          value={tweaks.accentSecondary}
          options={ACCENT2_OPTIONS}
          onChange={(v) => setTweak("accentSecondary", v)}
        />
        <TweakColor
          label="Background"
          value={tweaks.bg}
          options={BG_OPTIONS}
          onChange={(v) => setTweak("bg", v)}
        />
      </TweakSection>

      <TweakSection title="Typography">
        <TweakSelect
          label="Headings"
          value={tweaks.fontHeading}
          options={HEADING_FONTS}
          onChange={(v) => setTweak("fontHeading", v)}
        />
        <TweakSelect
          label="Body"
          value={tweaks.fontBody}
          options={BODY_FONTS}
          onChange={(v) => setTweak("fontBody", v)}
        />
        <TweakSelect
          label="Serif accent"
          value={tweaks.fontSerif}
          options={SERIF_FONTS}
          onChange={(v) => setTweak("fontSerif", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = document.createElement("div");
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<App />);
