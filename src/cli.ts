#!/usr/bin/env node

import meow = require('meow');
import { ListAccountsSubCommand } from './commands/list-accounts';
import { ToBeancountSubCommand } from './commands/to-beancount';
import { ToLedgerSubCommand } from './commands/to-ledger';
import { getConfig, initializeConfiguration, setInstanceConfig } from './configuration';
import { EntriesProvider } from './entiresProvider';
import { DedupLogger } from './logging';
import { IConfiguration, IEntry } from './types';

async function configureCommonConfig(cli: meow.Result): Promise<void> {
    await initializeConfiguration(cli.flags.config);
    const config: IConfiguration = await getConfig();

    let instanceConfig: Partial<IConfiguration> = {};

    if (cli.flags.filter) {
        if (cli.flags.override || !config.account_filter) {
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
        };
    }

    setInstanceConfig(instanceConfig);
}

(async () => {
    const logger: DedupLogger = new DedupLogger('CliManager');

    const cliFlags: { [name: string]: any } = {
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
    };
    const cli: meow.Result = meow(`
        Usage
          $ ynab-translator [options] <command>

        Options
          --config (-c)            config file to be used
          --filter (-f) <regex>    regex filter on accounts of transactions
          --override (-o)          override configuration file by flags
          --start-date (-s)        date to start YNAB transactions from

        Commands
          list-accounts            lists the mapped accounts from YNAB
          to-beancount             handles the translation from YNAB to beancount files
          to-ledger                handles the translation from YNAB to a ledger file

        Examples
          $ ynab-translator --filter '^Expenses.*' list-account
          $ ynab-translator --config config/.ynabtoledgerrc to-beancount
    `, {
        autoHelp: false,
        flags: cliFlags,
    });

    const subCommandMap: {[key: string]: (provider: EntriesProvider) => ISubCommand} = {
        'list-accounts': p => new ListAccountsSubCommand(p),
        'to-beancount':  p => new ToBeancountSubCommand(p, cliFlags),
        'to-ledger':     p => new ToLedgerSubCommand(p),
    };

    if (cli.input.length === 0 || !(cli.input[0] in subCommandMap)) {
        cli.showHelp();
    }

    await configureCommonConfig(cli);

    const provider: EntriesProvider = new EntriesProvider();
    const command: ISubCommand = subCommandMap[cli.input[0]](provider);

    await command.execute();
})();
