/**
 * DynamicImport - Dynamically imports a module and optionally validates the installed version.
 * 
 * @async
 * @function DynamicImport
 *
 * @param {string} moduleName - The package name, optionally followed by '@' and a minimum version (e.g., 'moduleName', 'moduleName@8.0.0', '@scope/moduleName@^1.2').
 *
 * @returns {Promise<Object|null>} A Promise that resolves to the module namespace object, or `null` if the import failed.
 *
 * @example
 * import { DynamicImport } from '@linnovate/blocktree';
 * const module = await DynamicImport('express@^5');
 */
export async function DynamicImport(moduleName) {

  // Parse name and version handling scoped packages (@org/pkg@1.0.0)
  const [name, version] = moduleName.split(/@[\^~]?([\d.a-zA-Z-]+)$/);

  // Import the actual module
  return import(name)
    .then(async data => {

      // Optional: Check Version
      if (version) {
        const json = await import(`${name}/package.json`, { with: { type: 'json' } })
          .catch(error => ({ error }));

        if (json?.default && parseFloat(json.default.version) < parseFloat(version)) {
          console.warn(`DynamicImport \x1b[31m[module version] \x1b[36m${moduleName} is required.\x1b[0m`, { currentVersion: json.default.version });
        }
      }

      return data;
    })
    .catch(error => {
      console.error(`DynamicImport \x1b[31m[missing module] \x1b[36m${moduleName}\x1b[0m`, { error });
      return null;
    })
}
