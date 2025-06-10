import {Utils} from "./Utils";

type LogLevel = "info" | "warning" | "error";
type LogType = "db" | string;

// todo - make an array of structured log messages, which isn't displayed, but can be copies (for example in settings)
//        that contains all logs, for debugging purposes (upon error, user can copy (or download a file?) and paste to discord)
//        this could also be optional (if someone doesn't want it to take additional memory)
export class Logger {
    public log(level: LogLevel, type: LogType, message: any): void {

        switch (type) {
            case "db":
                const color = Logger.getColor(level);
                const time = Utils.getFormattedDatetime();
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
