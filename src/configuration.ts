import prompts from 'prompts';
import fs from 'fs';
import path from 'path';
import util from 'util';
import cosmiconfig from 'cosmiconfig';

import { initializeApi } from './api';

const moduleName = 'ynabtoledger';
const defaultConfigPath = path.join(process.env.HOME, `.${moduleName}rc`);
let cfg: Configuration, cfgFilepath: string;

interface Configuration {
    ynab: YNABConfiguration;
}

interface YNABConfiguration {
    api_access_token: string;
    primary_budget_id: string;
}

export async function getConfig() : Promise<Configuration> {
    if (!cfg) {
        await initializeConfiguration();
    }
    return cfg;
}

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

    console.log('You have no config file or an empty one, we need some data to move forward...');

    const onCancel = () => {
        console.log("Failed to gather nessacary information, exiting...");
        process.exit(1);
    }

    const ynabKeyResponse = await prompts([
        {
            type: 'text',
            name: 'api_access_token',
            message: 'YNAB api access token ( https://api.youneedabudget.com/#quick-start )',
            validate: key => key.match(/^[A-Z0-9]/i) ? true : 'Invalid key, must only be alphanumeric'
        }
    ], { onCancel });
    
    const api = await initializeApi(ynabKeyResponse.api_access_token);

    const budgetResponse = await api.budgets.getBudgets();
    const budgets = budgetResponse.data.budgets;
    const ynabBudgetResponse = await prompts([
        {
            type: 'select',
            name: 'primary_budget_id',
            message: 'Pick a primary budget',
            choices: budgets.map(b => {
                return {
                    title: b.name,
                    value: b.id,
                    description: budgetResponse.data.default_budget
                                 && b.id === budgetResponse.data.default_budget.id
                                    ? 'Default budget in YNAB'
                                    : ''
                };
            }),
            initial: budgetResponse.data.default_budget
                        ? budgets.findIndex(b => b.id === budgetResponse.data.default_budget.id)
                        : 0
        }
    ]);

    const config : Configuration = {
        ynab: {
            api_access_token: ynabKeyResponse.api_access_token,
            primary_budget_id: ynabBudgetResponse.primary_budget_id
        }
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