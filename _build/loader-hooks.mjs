// Resolve hooks so Node can import the app's RN-style quest modules as-is:
//  - extensionless relative imports get ".js"
//  - quests.js's "./i18n" (i18next + RN) is replaced by an identity stub
export async function resolve(specifier, context, next) {
  if (specifier === './i18n' && context.parentURL && context.parentURL.endsWith('/src/data/quests.js')) {
    return { url: 'data:text/javascript,export const getLocalizedQuest=(q)=>q;', shortCircuit: true };
  }
  if (specifier.startsWith('.') && !/\.(m?js|json)$/.test(specifier)) {
    try { return await next(specifier + '.js', context); } catch (e) { /* fall through */ }
  }
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url.includes('/src/data/') && url.endsWith('.js')) {
    return { ...(await next(url, { ...context, format: 'module' })), format: 'module' };
  }
  if (url.endsWith('.json')) return next(url, { ...context, importAttributes: { type: 'json' } });
  return next(url, context);
}
