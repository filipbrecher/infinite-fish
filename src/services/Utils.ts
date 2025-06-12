

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

        return minItem;
    }

    public static wait(ms: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
