import { CommonFlags } from "../types";
import { BooleanFlag } from "meow";

export interface ISubCommand {
    execute(): Promise<void>;
}

export interface ToBeancountFlags extends CommonFlags {
    tags: BooleanFlag & {type: 'boolean'};
}

export interface ToLedgerFlags extends CommonFlags {
    budget: BooleanFlag & {type: 'boolean'};
}
