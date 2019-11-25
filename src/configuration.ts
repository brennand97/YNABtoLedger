import cosmiconfig from 'cosmiconfig';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import util from 'util';

import ynabBuildConfig from './sources/ynab/config';
import { IConfiguration, IYNABConfiguration } from './types';

const moduleName = 'ynabtoledger';
const home = process.env.HOME;
const defaultConfigPath = path.join(home || '.', `.${moduleName}rc`);
let cfg: IConfiguration;
let cfgFilepath: string;

async function initializeConfiguration() {
    const result = await loadOrBuildConfig();
    cfg = (result.cfg as IConfiguration);
    cfgFilepath = result.cfgFilepath;
}

async function loadOrBuildConfig(): Promise<{cfg: cosmiconfig.Config, cfgFilepath: string }> {
    const explorer = cosmiconfig(moduleName);
    try {
        const searchResult = await explorer.search();
        if (!searchResult) {
            return buildConfig();
        } else if (!searchResult.config) {
            return buildConfig(searchResult.filepath);
        } else {
            return {
                cfg: searchResult.config,
                cfgFilepath: searchResult.filepath,
            };
        }
    } catch (e) {
        console.error('Exeception when searching for configuration', e);
    }
}

async function buildConfig(filepath: string = defaultConfigPath)
    : Promise<{cfg: cosmiconfig.Config, cfgFilepath: string }> {

    const onCancel = () => {
        console.log('Failed to gather nessacary information, exiting...');
        process.exit(0);
    };

    let ynabConfig = {} as IYNABConfiguration;
    try {
        ynabConfig = await ynabBuildConfig();
    } catch (e) {
        console.error('Failed to gather ynab configuration information', e);
        process.exit(0);
    }

    const config: IConfiguration = {
        ynab: ynabConfig,
    };

    await saveConfig(config, filepath);

    return {
        cfg: config,
        cfgFilepath: filepath,
    };
}

async function saveConfig(config: cosmiconfig.Config, filepath: string) {
    const writeFile = util.promisify(fs.writeFile);

    try {
        writeFile(filepath, JSON.stringify(config, null, 4));
    } catch (e) {
        console.error('Error when attempting to save config', config, filepath, e);
    }
}

export async function getConfig(): Promise<IConfiguration> {
    if (!cfg) {
        await initializeConfiguration();
    }
    return cfg;
}
