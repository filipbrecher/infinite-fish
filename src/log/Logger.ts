
type LogLevel = "info" | "warning" | "error";
type LogType = "db" | string;

export class Logger {
    public log(level: LogLevel, type: LogType, message: any): void {

        switch (type) {
            case "db":
                const color = Logger.getColor(level);
                const time = new Date().toLocaleString("ja-JP");
                const prefix = `${time} %c[${level.toUpperCase()}] ${type.toUpperCase()}:`;
                console.log(prefix, `color: ${color}; font-weight: bold;`, message);
                break;

            default:
                console.log(`${type}:`, message);
        }
    }

    private static getColor(level: LogLevel): string {
        switch (level) {
            case "info": return "dodgerblue";
            case "warning": return "orange";
            case "error": return "crimson";
        }
    }
}
