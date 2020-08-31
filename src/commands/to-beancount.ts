import meow from 'meow';
import { getConfig, getInstanceConfig, setInstanceConfig } from '../configuration';
import { EntriesProvider } from '../entiresProvider';
import { DedupLogger } from '../logging';
import * as beancount from '../outputs/beancount';
import { IConfiguration, IEntry, CommonFlags } from '../types';
import { ISubCommand, ToBeancountFlags } from './types';

export class ToBeancountSubCommand implements ISubCommand {

    private logger: DedupLogger;
    private provider: EntriesProvider;
    private parentFlags: CommonFlags;

    constructor(provider: EntriesProvider, parentFlags: CommonFlags) {
        this.logger = new DedupLogger('ToBeancountSubCommand');
        this.provider = provider;
        this.parentFlags = parentFlags;
    }

    public async execute(): Promise<void> {
        const cli: meow.Result<ToBeancountFlags> = await this.getCli();
        const config: IConfiguration = await getConfig();

        let instanceConfig: Partial<IConfiguration> = getInstanceConfig();
        if (cli.flags.tags) {
            instanceConfig = {
                ...instanceConfig,
                beancount_tags: cli.flags.tags,
            };
        }
        setInstanceConfig(instanceConfig);

        const entries: IEntry[] = await this.provider.getBankEntries();

        console.log(await beancount.compile(entries));
    }

    private async getCli(): Promise<meow.Result<ToBeancountFlags>> {
        const cli: meow.Result<ToBeancountFlags> = meow(`
            Subcommand: to-beancount

              Pulls transactions from YNAB and outputs them in the
              beancount format.

            Usage
              $ ynab-translator to-beancount [options]

            Options
              --tags       add an entry id as tag

            Examples
              $ ynab-translator to-beancount
        `, {
            flags: {
                ...this.parentFlags,
                tags: {
                    default: false,
                    type: 'boolean',
                },
            },
        });

        return cli;
    }

}
