import {Utils} from "./Utils";

type LogLevel = "info" | "warning" | "error";
type LogType = "db" | "settings" | "state_service" | "board" | "sidebar" | "workspace" | "instance" | "view" | string;

// todo - make an array of structured log messages, which isn't displayed, but can be copies (for example in settings)
//        that contains all logs, for debugging purposes (upon error, user can copy (or download a file?) and paste to discord)
//        this could also be optional (if someone doesn't want it to take additional memory)
export class Logger {
    private readonly emojiByType: Map<LogType, string> = new Map([
        ["db", "🛢️"],
        ["setting", "⚙️"],
        ["state_service", "🧠"],
        ["board", "🧭"],
        ["sidebar", "🧾"],
        ["workspace", "🗂️"],
        ["instance", "📦"],
        ["view", "🖼️"],
    ]);

    public log(level: LogLevel, type: LogType, message: any): void {
        const emoji = this.emojiByType.get(type);
        const emojiPrefix = emoji ? `${emoji} ` : "";

        const color = Logger.getColor(level);
        const time = Utils.getFormattedDatetime();
        const prefix = `${emojiPrefix}${time} %c[${level.toUpperCase()}] ${type.toUpperCase()}:`;
        console.log(prefix, `color: ${color}; font-weight: bold;`, message);
    }

    private static getColor(level: LogLevel): string {
        switch (level) {
            case "info": return "dodgerblue";
            case "warning": return "orange";
            case "error": return "crimson";
        }
    }
}
