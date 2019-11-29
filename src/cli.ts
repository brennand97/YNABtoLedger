#!/usr/bin/env node

import * as beancount from './outputs/beancount';
import * as ledger from './outputs/ledger';
import * as ynab from './sources/ynab/index';
import { IEntry } from './types';

(async () => {
    const ynabEntries: IEntry[] = await ynab.getEntries({
        budget: false,
    });

    const ledgerOutput = await ledger.compile(ynabEntries);
    const beancountOutput = await beancount.compile(ynabEntries);

    console.log(beancountOutput);
})();
