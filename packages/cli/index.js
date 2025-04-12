#!/usr/bin/env node

const { execSync } = require('child_process')
const pathUtil = require('path')
const fs = require('fs')
const { Command } = require('commander')
const program = new Command()
const { version } = require('./package.json')


const pluginPkgPath = (pluginRepo) => {
  const parts = pluginRepo.split('/')
  const xdata3OSroot = pathUtil.resolve(__dirname, '../..')
  const pkgPath = xdata3OSroot + '/packages/' + parts[1]
  return pkgPath
}

const isPluginInstalled = (pluginRepo) => {
  const pkgPath = pluginPkgPath(pluginRepo)
  const packageJsonPath = pkgPath + '/package.json'
  return fs.existsSync(packageJsonPath)
}

program
  .name('xdata3os')
  .description('xdata3OS CLI - Manage your plugins')
  .version(version);

const pluginsCmd = new Command()
  .name('plugins')
  .description('manage xdata3OS plugins')

async function getPlugins() {
  const resp = await fetch('https://raw.githubusercontent.com/xdata3os-plugins/registry/refs/heads/main/index.json')
  return await resp.json();
}



pluginsCmd
  .command('list')
  .alias('l')
  .alias('ls')
  .description('list available plugins')
  .option("-t, --type <type>", "filter by type (adapter, client, plugin)")
  .action(async (opts) => {
    try {
      const plugins = await getPlugins()
      const pluginNames = Object.keys(plugins)
        .filter(name => !opts.type || name.includes(opts.type))
        .sort()

      console.info("\nAvailable plugins:")
      for (const plugin of pluginNames) {
        console.info(` ${isPluginInstalled(plugins[plugin]) ? '✅' : '  '}  ${plugin} `)
      }
      console.info("")
    } catch (error) {
      console.error(error)
    }
  })

pluginsCmd
  .command('add')
  .alias('install')
  .description('add a plugin')
  .argument('<plugin>', 'plugin name')
  .action(async (plugin, opts) => {
    // ensure git is installed
    try {
      const gitVersion = execSync('git --version', { stdio: 'pipe' }).toString().trim();
      console.log('using', gitVersion)
    } catch(e) {
      console.error('Please install git to use this utility')
      return
    }

    const plugins = await getPlugins()

    // ensure prefix
    const pluginName = '@xdata3os-plugins/' + plugin.replace(/^@xdata3os-plugins\//, '')
    const namePart = pluginName.replace(/^@xdata3os-plugins\//, '')
    const xdata3OSroot = pathUtil.resolve(__dirname, '../..')

    let repo = ''
    if (namePart === 'plugin-trustdb') {
      repo = 'xdata3os-plugins/plugin-trustdb'
    } else {
      const repoData = plugins[pluginName]?.split(':')
      if (!repoData) {
        console.error('Plugin', plugin, 'not found')
        return
      }
      // repo type
      if (repoData[0] !== 'github') {
        console.error('Plugin', plugin, 'uses', repoData[0], ' but this utility only currently support github')
        return
      }
      repo = repoData[1]
    }
    const pkgPath = xdata3OSroot + '/packages/' + namePart

    // add to packages
    if (!fs.existsSync(pkgPath + '/package.json')) {
      // clone it
      console.log('cloning', namePart, 'to', pkgPath)
      const gitOutput = execSync('git clone https://github.com/' + repo + ' "' + pkgPath + '"', { stdio: 'pipe' }).toString().trim();
      // submodule init & update?
    }

    // we need to check for dependencies

    // Read the current package.json
    const packageJsonPath = pkgPath + '/package.json'
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

    const updateDependencies = (deps) => {
      if (!deps) return false
      let changed = false
      const okPackages = ['@xdata3os/xdata3-router', '@xdata3os/agentcontext', '@xdata3os/plugin-bootstrap']
      for (const dep in deps) {
        if (okPackages.indexOf(dep) !== -1) continue // skip these, they're fine
        // do we want/need to perserve local packages like core?
        if (dep.startsWith("@xdata3os/")) {
          const newDep = dep.replace("@xdata3os/", "@xdata3os-plugins/")
          deps[newDep] = deps[dep]
          delete deps[dep]
          changed = true
        }
      }
      return changed
    }

    // normalize @xdata3os => @xdata3os-plugins
    if (updateDependencies(packageJson.dependencies)) {
      console.log('updating plugin\'s package.json to not use @elizos/ for dependencies')
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n")
      // I don't think will cause the lockfile from getting out of date
    }
    //console.log('packageJson', packageJson.dependencies)
    for(const d in packageJson.dependencies) {
      if (d.match(/@xdata3os-plugins/)) {
        // do we have this plugin?
        console.log('attempting installation of dependency', d)
        try {
          const pluginAddDepOutput = execSync('npx xdata3os plugins add ' + d, { cwd: xdata3OSroot, stdio: 'pipe' }).toString().trim();
          //console.log('pluginAddDepOutput', pluginAddDepOutput)
        } catch (e) {
          console.error('pluginAddDepOutput error', e)
        }
      }
    }

    // add core to plugin
    // # pnpm add @xdata3os/agentcontext@workspace:* --filter ./packages/client-twitter

    // ok this can be an issue if it's referencing a plugin it couldn't be
    console.log('Making sure plugin has access to @xdata3os/agentcontext')
    const pluginAddCoreOutput = execSync('pnpm add @xdata3os/agentcontext@workspace:* --filter ./packages/' + namePart, { cwd: xdata3OSroot, stdio: 'pipe' }).toString().trim();

    if (packageJson.name !== '@xdata3os-plugins/' + namePart) {
      // Update the name field
      packageJson.name = '@xdata3os-plugins/' + namePart
      console.log('Updating plugins package.json name to', packageJson.name)

      // Write the updated package.json back to disk
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    }

    // add to agent
    const agentPackageJsonPath = xdata3OSroot + '/agent/package.json'
    const agentPackageJson = JSON.parse(fs.readFileSync(agentPackageJsonPath, 'utf-8'));
    //console.log('agentPackageJson', agentPackageJson.dependencies[pluginName])
    if (!agentPackageJson.dependencies[pluginName]) {
      console.log('Adding plugin', plugin, 'to agent/package.json')
      try {
        const pluginAddAgentOutput = execSync('pnpm add ' + pluginName + '@workspace:* --filter ./agent', { cwd: xdata3OSroot, stdio: 'pipe' }).toString().trim();
        //console.log('pluginAddAgentOutput', pluginAddAgentOutput)
      } catch (e) {
        console.error('error', e)
      }
    }

    console.log(plugin, 'attempted installation is complete')
    // can't add to char file because we don't know which character
    console.log('Remember to add it to your character file\'s plugin field: ["' + pluginName + '"]')
  })

pluginsCmd
  .command('remove')
  .alias('delete')
  .alias('del')
  .alias('rm')
  .description('remove a plugin')
  .argument("<plugin>", "plugin name")
  .action(async (plugin, opts) => {
    // ensure prefix
    const pluginName = '@xdata3os-plugins/' + plugin.replace(/^@xdata3os-plugins\//, '')
    const namePart = pluginName.replace(/^@xdata3os-plugins\//, '')
    const xdata3OSroot = pathUtil.resolve(__dirname, '../..')
    const pkgPath = xdata3OSroot + '/packages/' + namePart
    const plugins = await getPlugins()

    let repo = ''
    if (namePart === 'plugin-trustdb') {
      repo = 'xdata3os-plugins/plugin-trustdb'
    } else {
      //console.log('loaded', plugins.length, plugins)
      const repoData = plugins[pluginName]?.split(':')
      if (!repoData) {
        console.error('Plugin', pluginName, 'not found')
        return
      }
      const parts = repoData[1].split('/')
      repo = parts[1]
    }

    // remove from agent: pnpm remove some-plugin --filter ./agent
    try {
      console.log('Removing', pluginName, 'from agent')
      const pluginRemoveAgentOutput = execSync('pnpm remove ' + pluginName + ' --filter ./agent', { cwd: xdata3OSroot, stdio: 'pipe' }).toString().trim();
    } catch (e) {
      console.error('removal from agent, error', e)
    }

    if (fs.existsSync(pkgPath)) {
      // rm -fr packages/path
      console.log('deleting', pkgPath)
      //const gitOutput = execSync('git clone https://github.com/' + repoData[1] + ' ' + pkgPath, { stdio: 'pipe' }).toString().trim();
      try {
        fs.rmSync(pkgPath, { recursive: true, force: true });
      } catch (err) {
        console.error('Error removing package plugin directory:', err);
      }
    }
    console.log(plugin, 'attempted plugin removal is complete')
  })


program.addCommand(pluginsCmd)

program.parse(process.argv)
