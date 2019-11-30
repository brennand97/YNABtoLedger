#!/usr/bin/env node

import { DedupLogger } from './logging';
import * as beancount from './outputs/beancount';
import * as ledger from './outputs/ledger';
import * as ynab from './sources/ynab/index';
import { transform } from './transformation/index';
import { IEntry } from './types';

(async () => {
    const logger: DedupLogger = new DedupLogger('CLI');

    const ynabEntries: IEntry[] = await ynab.getEntries({
        budget: false,
    });

    const transformedEntries: IEntry[] = await transform(ynabEntries);

    const ledgerOutput = await ledger.compile(transformedEntries);
    const beancountOutput = await beancount.compile(transformedEntries);

    console.log(beancountOutput);
})();
