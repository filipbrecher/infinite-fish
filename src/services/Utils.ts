

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

    public static minBy<T>(arr: T[], evaluator: (item: T) => number): T | undefined {
        if (arr.length === 0) return undefined;

        let minItem = arr[0];
        let minValue = evaluator(minItem);

        for (let i = 1; i < arr.length; i++) {
            const value = evaluator(arr[i]);
            if (value < minValue) {
                minItem = arr[i];
                minValue = value;
            }
        }
        return minItem;
    }

    public static wait(ms: number): Promise<void> {
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    }
}
