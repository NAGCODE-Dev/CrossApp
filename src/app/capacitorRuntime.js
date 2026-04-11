function getWindowLike() {
  try {
    return typeof window !== 'undefined' ? window : globalThis;
  } catch {
    return globalThis;
  }
}

export function getCapacitorRuntime() {
  try {
    return getWindowLike()?.Capacitor || null;
  } catch {
    return null;
  }
}

export function getCapacitorPlugin(name) {
  const pluginName = String(name || '').trim();
  if (!pluginName) return null;

  const runtime = getCapacitorRuntime();
  if (!runtime) return null;

  const variants = [pluginName, pluginName.toLowerCase()];
  const sources = [runtime?.Plugins, runtime?.plugins, runtime];

  for (const source of sources) {
    for (const variant of variants) {
      const plugin = source?.[variant];
      if (plugin && (typeof plugin === 'object' || typeof plugin === 'function')) {
        return plugin;
      }
    }
  }

  if (typeof runtime.getPlugin === 'function') {
    try {
      const plugin = runtime.getPlugin(pluginName);
      if (plugin) return plugin;
    } catch {
      // no-op
    }
  }

  if (typeof runtime.registerPlugin === 'function') {
    try {
      const plugin = runtime.registerPlugin(pluginName);
      if (plugin) return plugin;
    } catch {
      // no-op
    }
  }

  return null;
}

export function getCapacitorAppPlugin() {
  return getCapacitorPlugin('App');
}
