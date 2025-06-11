

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
}
