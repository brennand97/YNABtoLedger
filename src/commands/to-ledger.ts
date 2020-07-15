import meow from 'meow';
import { getConfig } from '../configuration';
import { EntriesProvider } from '../entiresProvider';
import { DedupLogger } from '../logging';
import * as ledger from '../outputs/ledger';
import { IConfiguration, IEntry } from '../types';

export class ToLedgerSubCommand implements ISubCommand {

    private logger: DedupLogger;
    private provider: EntriesProvider;

    constructor(provider: EntriesProvider) {
        this.logger = new DedupLogger('ToLedgerSubCommand');
        this.provider = provider;
    }

    public async execute(): Promise<void> {
        const cli: meow.Result = await this.getCli();
        const config: IConfiguration = await getConfig();

        const entries: IEntry[] = await this.provider.getEntries(cli.flags.budget);

        console.log(await ledger.compile(entries));
    }

    private async getCli(): Promise<meow.Result> {
        const cli: meow.Result = meow(`
            Subcommand: to-ledger

              Pulls transactions from YNAB and outputs them in the
              ledger format.

            Usage
              $ ynab-translator to-ledger [options]

            Options
              --budget     include budget entries

            Examples
              $ ynab-translator to-ledger
        `, {
            flags: {
                budget: {
                    default: false,
                    type: 'boolean',
                },
            },
        });

        return cli;
    }

}
