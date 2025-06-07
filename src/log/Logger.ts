
type LogLevel = "info" | "warning" | "error";
type LogType = "db";

export class Logger {
    public log(level: LogLevel, type: LogType | string, message: any): void {
        switch (type) {
            case "db":
                console.log(message);
                break;
            default:
                console.log(`${type}: `, message);
        }
    }
}
