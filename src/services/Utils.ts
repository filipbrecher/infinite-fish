

export class Utils {
    public static getFormattedDatetime(datetimeNumber?: number): string {
        const d = datetimeNumber ? new Date(datetimeNumber) : new Date();

        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");

        const hour = d.getHours();
        const minute = d.getMinutes().toString().padStart(2, "0");
        const second = d.getSeconds().toString().padStart(2, "0");

        return `${year}/${month}/${day} - ${hour}:${minute}:${second}`;
    }

    public static minBy<T>(map: Map<number, T>, evaluator: (item: T) => number): T | undefined {
        if (map.size === 0) return undefined;

        let minItem: T;
        let minValue: number;

        map.forEach((item) => {
            const value = evaluator(item);
            if ( !minValue || value < minValue) {
                minItem = item;
                minValue = value;
            }
        });

        return minItem!;
    }

    public static binaryCompare = (a: string, b: string): number => {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
            const diff = a.charCodeAt(i) - b.charCodeAt(i);
            if (diff !== 0) return diff;
        }
        return a.length - b.length;
    }

    public static deepUpdate(target: any, source: Partial<any>): any {
        for (const key in source) {
            if ( !Object.prototype.hasOwnProperty.call(source, key)) continue;

            const targetVal = target[key];
            const sourceVal = source[key];

            if (
                sourceVal !== null &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key])
            ) {
                if (
                    targetVal === undefined ||
                    typeof targetVal !== 'object' ||
                    Array.isArray(targetVal)
                ) {
                    target[key] = {};
                }
                Utils.deepUpdate(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    public static wait(ms: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
