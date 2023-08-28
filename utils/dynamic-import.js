/**
 * @function DynamicImport
 * @modules []
 * @envs []
 * @param {string} name
 * @return {promise} the module
 */

export async function DynamicImport(module) {

  const [name, version] = module.split("@^");

  return import(name)
    .then(async data => {

      // check version
      const json = await import(`${name}/package.json`, { assert: { type: "json" } })
        .catch(error => {})
      
      if (json?.default && parseFloat(json.default.version) < parseFloat(version)) {
        console.error(`DynamicImport \x1b[31m[module version] \x1b[36m${module} is required.\x1b[0m`, { currentVersion: json.default.version });
      }
      
      return data;
    })
    .catch(error => {
      console.error(`DynamicImport \x1b[31m[missing module] \x1b[36m${module}\x1b[0m`);
    })
};
