import { PREFERENCE_REGISTRY } from "@/lib/preferences/preferences-config"
import { COLOR_THEME_PRESET_VALUES } from "@/lib/preferences/theme"

export function ThemeBootScript() {
  const registry = JSON.stringify(PREFERENCE_REGISTRY)
  const colorThemePresets = JSON.stringify(COLOR_THEME_PRESET_VALUES)

  const code = `
    (function () {
      try {
        var root = document.documentElement;
        var REGISTRY = ${registry};
        var COLOR_THEME_PRESETS = ${colorThemePresets};

        function readCookie(name) {
          var match = document.cookie.split("; ").find(function(c) {
            return c.startsWith(name + "=");
          });
          return match ? decodeURIComponent(match.split("=")[1]) : null;
        }

        function readLocal(name) {
          try {
            return window.localStorage.getItem(name);
          } catch (e) {
            return null;
          }
        }

        function readPreference(key, definition) {
          var mode = definition.persistence;
          var value = null;

          if (mode === "localStorage") {
            value = readLocal(key);
          }

          if (!value && (mode === "client-cookie" || mode === "server-cookie")) {
            value = readCookie(key);
          }

          return definition.values.indexOf(value) >= 0 ? value : definition.defaultValue;
        }

        function applyThemePreset(value) {
          if (COLOR_THEME_PRESETS.indexOf(value) >= 0) {
            root.setAttribute("data-theme", value);
            root.removeAttribute("data-theme-preset");
            return;
          }

          root.setAttribute("data-theme-preset", value);
          root.removeAttribute("data-theme");
        }

        var preferences = {};

        Object.keys(REGISTRY).forEach(function(key) {
          var definition = REGISTRY[key];
          var value = readPreference(key, definition);

          preferences[key] = value;

          if (key === "theme_preset") {
            applyThemePreset(value);
            return;
          }

          root.setAttribute(definition.attribute, value);
        });

        var mode = preferences.theme_mode;
        var resolvedMode =
          mode === "system" && window.matchMedia
            ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
            : mode === "dark"
              ? "dark"
              : "light";

        root.classList.toggle("dark", resolvedMode === "dark");
        root.style.colorScheme = resolvedMode;

      } catch (e) {
        console.warn("ThemeBootScript error:", e);
      }
    })();
  `

  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
