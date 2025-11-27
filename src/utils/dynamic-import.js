/**
 * DynamicImport.
 * @function DynamicImport
 * @description Asynchronously imports a specified module using the native 'import()' function.
 * It also includes an optional version check to warn if the installed module's version
 * is lower than a specified required version.
 * @modules []
 * @envs []
 * @param {string} module - The name of the module to import, optionally followed by '@' and a version number (e.g., 'packageName' or 'packageName@1.2.3').
 * @returns {Promise<any | undefined>} A Promise that resolves to the module object if successful, or 'undefined' if the module cannot be imported.
 */
export async function DynamicImport(module) {
  const [name, version] = module.split(/@[\^~]?([\d.a-zA-Z-]+)$/);

  return import(name)
    .then(async data => {

      // check version
      if (version) {
        const json = await import(`${name}/package.json`, { with: { type: "json" } })
          .catch(() => { })

        if (json?.default && parseFloat(json.default.version) < parseFloat(version)) {
          console.warn(`DynamicImport \x1b[31m[module version] \x1b[36m${module} is required.\x1b[0m`, { currentVersion: json.default.version });
        }
      }

      return data;
    })
    .catch(error => {
      console.error(`DynamicImport \x1b[31m[missing module] \x1b[36m${module}\x1b[0m`, { error });
    })
};
