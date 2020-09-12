import meow from 'meow';
import { EntriesProvider } from '../entiresProvider';
import { DedupLogger } from '../logging';
import { CommonFlags, IEntry } from '../types';
import { ISubCommand } from './types';

export class ToJsonSubCommand implements ISubCommand {

    private logger: DedupLogger;
    private provider: EntriesProvider;

    constructor(provider: EntriesProvider) {
        this.logger = new DedupLogger('ToJsonSubCommand');
        this.provider = provider;
    }

    public async execute(): Promise<void> {
        const cli: meow.Result<CommonFlags> = await this.getCli();

        const entries: IEntry[] = await this.provider.getBankEntries();

        process.stdout.write(JSON.stringify(entries));
    }

    private async getCli(): Promise<meow.Result<CommonFlags>> {
        const cli: meow.Result<CommonFlags> = meow(`
            Subcommand: to-json

                Pulls transactions from YNAB and outputs them in a
                transformed and standarized double entry accounting
                model as json.

            Usage
              $ ynab-translator to-json
        `);

        return cli;
    }

}
