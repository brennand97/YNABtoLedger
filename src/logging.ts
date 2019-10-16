import moment from 'moment';

interface IDedupKey {
    key: string;
    value: string;
    time: number;
}

export class DedupLogger {

    private location: string;
    private timeout: number;
    private dedupMap: any;
    private cleanUpQueue: IDedupKey[];

    constructor(location: string, timeout: number = 300000) {
        this.location = location;
        this.timeout = timeout;
        this.dedupMap = {};
        this.cleanUpQueue = [];
    }

    public log(key: string, value: string, ...args: any[]): void {
        this._log(
            console.log,
            moment().valueOf(),
            'INFO',
            key,
            value,
            args
        );
    }

    public warn(key: string, value: string, ...args: any[]): void {
        this._log(
            console.warn,
            moment().valueOf(),
            'WARN',
            key,
            value,
            args
        );
    }

    public error(key: string, value: string, ...args: any[]): void {
        this._log(
            console.error,
            moment().valueOf(),
            'ERROR',
            key,
            value,
            args
        );
    }

    // tslint:disable-next-line:ban-types
    private _log(func: Function, time: number, type: string, key: string, value: string, args: any[]): void {
        if (!this.hasKeyOrPut(key, value, time)) {
            func(`[${type}] (${this.location}): ${value}`, ...args);
        }
        this.cleanUp(time);
    }

    private hasKeyOrPut(key: string, value: string, time: number) {
        this.cleanUpQueue.push({
            key,
            time,
            value,
        });

        if (!(key in this.dedupMap)) {
            this.dedupMap[key] = {};
        }
        if (!(value in this.dedupMap[key])) {
            this.dedupMap[key][value] = 1;
            return false;
        }

        this.dedupMap[key][value] += 1;
        return true;
    }

    private cleanUp(time: number): void {
        const limit: number = this.cleanUpQueue.findIndex((key: IDedupKey) => time - key.time < this.timeout);
        if (limit > 0) {
            const removeList = this.cleanUpQueue.slice(0, limit);
            this.cleanUpQueue = this.cleanUpQueue.slice(limit);

            removeList.map((key: IDedupKey) => {
                this.dedupMap[key.key][key.value] -= 1;
                if (this.dedupMap[key.key][key.value] === 0) {
                    delete this.dedupMap[key.key][key.value];

                    if (Object.keys(this.dedupMap[key.key]).length === 0) {
                        delete this.dedupMap[key.key];
                    }
                }
            });
        }
    }

}
