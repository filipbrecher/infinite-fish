

export class Utils {
    public static getFormattedDatetime(datetimeNumber?: number): string {
        const d = datetimeNumber ? new Date(datetimeNumber) : new Date();

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");

        const hour = d.getHours();
        const minute = d.getMinutes();
        const second = d.getSeconds();

        return `${year}/${month}/${day} - ${hour}:${minute}:${second}`;
    }
}
