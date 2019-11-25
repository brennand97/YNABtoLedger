#!/usr/bin/env node

import * as ledger from './outputs/ledger';
import * as ynab from './sources/ynab/index';
import { IEntry } from './types';

(async () => {
    const ynabEntries: IEntry[] = await ynab.getEntries({
        budget: true,
    });

    const ledgerOutput = await ledger.compile(ynabEntries);

    console.log(ledgerOutput);
})();
