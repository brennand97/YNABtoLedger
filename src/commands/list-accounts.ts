import meow from 'meow';
import { EntriesProvider } from '../entiresProvider';
import { DedupLogger } from '../logging';
import { IEntry } from '../types';
import { flatMap } from '../utils';

export class ListAccountsSubCommand implements ISubCommand {

    private logger: DedupLogger;
    private provider: EntriesProvider;

    constructor(provider: EntriesProvider) {
        this.logger = new DedupLogger('ListAccountSubCommand');
        this.provider = provider;
    }

    public async execute(): Promise<void> {
        const cli: meow.Result = await this.getCli();

        const entries: IEntry[] = await this.provider.getBankEntries();

        const accounts: string[] = Array.from(flatMap(entries
            .map(entry => entry.splits
                .map(split => `${split.group}:${split.account}`)))
            .reduce((set: Set<string>, accountName: string) => set.add(accountName), new Set()))
            .sort();

        console.log(accounts.join('\n'));
    }

    private async getCli(): Promise<meow.Result> {
        const cli: meow.Result = meow(`
            Subcommand: list-accounts

              Lists the mapped accounts found in the transactions from YNAB.
              Effected by the configuration account name mappings, the filter,
              and the start date due to reduction of transactions pulled.

            Usage
              $ ynab-translator list-accounts

            Examples
              $ ynab-translator list-accounts
              $ ynab-translator list-accounts --filter '^Expenses.*'
        `);

        return cli;
    }

}
