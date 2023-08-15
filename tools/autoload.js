import fs from 'fs';
import path from 'path';

/**
 * AutoLoad es6 modules from a dirs list
 * @function AutoLoad
 * @modules []
 * @envs []
 * @param {array} dirs - ["typeDefs", "directives", "resolvers"]
 * @param {string} baseUrl - "src"
 * @return {object} the modules
 * @example const { typeDefs, directives, resolvers } = await AutoLoad(["typeDefs", "directives", "resolvers"]);
 */
export async function AutoLoad(dirs = ["typeDefs", "directives", "resolvers"], baseUrl = 'src') {

  // create resolve paths
  const dirsPaths = dirs.map(dir => path.resolve(`${baseUrl}/${dir}`));

  // load all dirs
  const allModules = await Promise.all(dirsPaths.map(dir => {

    try {

      // load all dir files
      return Promise.all(fs.readdirSync(dir)?.map(async file => {

        // get default
        return (await import(`${dir}/${file}`)).default

      }))

    } catch (error) {
      return;
    }

  }));

  // create modules object by dir name
  const modules = {};

  dirs.forEach((dir, index) => {
    modules[dir] = allModules[index];
  });

  return modules

};
