import prompts from 'prompts';
import fs from 'fs';
import path from 'path';
import util from 'util';
import cosmiconfig from 'cosmiconfig';

import ynabBuildConfig from './sources/ynab/config';
import { Configuration, YNABConfiguration } from './types';

const moduleName = 'ynabtoledger';
const defaultConfigPath = path.join(process.env.HOME, `.${moduleName}rc`);
let cfg: Configuration, cfgFilepath: string;

async function initializeConfiguration() {
    const result = await loadOrBuildConfig();
    cfg = <Configuration> result.cfg;
    cfgFilepath = result.cfgFilepath;
}

async function loadOrBuildConfig() : Promise<{cfg: cosmiconfig.Config, cfgFilepath: string }> {
    const explorer = cosmiconfig(moduleName);
    try {
        const searchResult = await explorer.search();
        if (!searchResult) {
            return buildConfig()
        } else if (!searchResult.config) {
            return buildConfig(searchResult.filepath);
        } else {
            return { 
                cfg: searchResult.config,
                cfgFilepath: searchResult.filepath
            };
        }
    } catch (e) {
        console.error("Exeception when searching for configuration", e);
    }
}

async function buildConfig(filepath: string = defaultConfigPath) : Promise<{cfg: cosmiconfig.Config, cfgFilepath: string }> {

    const onCancel = () => {
        console.log("Failed to gather nessacary information, exiting...");
        process.exit(0);
    }

    let ynabConfig = <YNABConfiguration>{};
    try {
        ynabConfig = await ynabBuildConfig();
    } catch (e) {
        console.error("Failed to gather ynab configuration information", e);
        process.exit(0);
    }

    const config: Configuration = {
        ynab: ynabConfig
    };

    await saveConfig(config, filepath);

    return {
        cfg: config,
        cfgFilepath: filepath
    }
}

async function saveConfig(config: cosmiconfig.Config, filepath: string) {
    const writeFile = util.promisify(fs.writeFile);

    try {
        writeFile(filepath, JSON.stringify(config, null, 4));
    } catch (e) {
        console.error('Error when attempting to save config', config, filepath, e);
    }
}

export async function getConfig() : Promise<Configuration> {
    if (!cfg) {
        await initializeConfiguration();
    }
    return cfg;
}