#!/usr/bin/env node

import meow = require('meow');
import { getConfig, initializeConfiguration, setInstanceConfig } from './configuration';
import { DedupLogger } from './logging';
import * as beancount from './outputs/beancount';
import * as ledger from './outputs/ledger';
import * as ynab from './sources/ynab/index';
import { transform } from './transformation/index';
import { IConfiguration, IEntry } from './types';

async function readCli(): Promise<meow.Result> {
    const cli: meow.Result = meow(`
        Usage
        $ ynab-to-ledger

        Options
        --beancount              Output in beancount style
        --budget (-b)            Include the budget entries for ledger
        --config (-c)            Config file to be used
        --filter (-f) <regex>    Filter by accounts
        --override (-o)          Override configuration file by flags
        --start-date (-s)        Date to start transactions from

        Examples
        $ ynab-to-ledger --filter '^Expenses.*'
        $ ynab-to-ledger --config config/.ynabtoledgerrc
    `, {
        flags: {
            beancount: {
                default: false,
                type: 'boolean',
            },
            budget: {
                alias: 'b',
                default: false,
                type: 'boolean',
            },
            config: {
                alias: 'c',
                type: 'string',
            },
            filter: {
                alias: 'f',
                type: 'string',
            },
            override: {
                alias: 'o',
                default: false,
                tyep: 'boolean',
            },
            startDate: {
                alias: 's',
                type: 'string',
            },
        },
    });

    await initializeConfiguration(cli.flags.config);
    const config: IConfiguration = await getConfig();

    let instanceConfig: Partial<IConfiguration> = {};

    if (cli.flags.filter) {
        if (cli.flags.override) {
            instanceConfig = {
                ...instanceConfig,
                account_filter: [
                    cli.flags.filter,
                ],
            };
        } else {
            instanceConfig = {
                ...instanceConfig,
                account_filter: [
                    ...config.account_filter,
                    cli.flags.filter,
                ],
            };
        }
    }

    if (cli.flags.startDate) {
        instanceConfig = {
            ...instanceConfig,
            start_date: cli.flags.startDate,
        }
    }

    setInstanceConfig(instanceConfig);

    return cli;
}

(async () => {
    const logger: DedupLogger = new DedupLogger('CLI');
    const cli: meow.Result = await readCli();

    const ynabEntries: IEntry[] = await ynab.getEntries({
        budget: cli.flags.budget,
    });

    const transformedEntries: IEntry[] = await transform(ynabEntries);

    const output: string = cli.flags.beancount
        ? await beancount.compile(transformedEntries)
        : await ledger.compile(transformedEntries);

    console.log(output);
})();
