import {Utils} from "./Utils";
import type {LogLevel, LogType, RawLogType} from "../types/services";
import {EMOJI_BY_LOG_TYPE} from "../types/services";
import {app} from "../main";


// todo - make an array of structured log messages, which isn't displayed, but can be copies (for example in settings)
//        that contains all logs, for debugging purposes (upon error, user can copy (or download a file?) and paste to discord)
//        this could also be optional (if someone doesn't want it to take additional memory)
export class Logger {
    public log(level: LogLevel, type: LogType, message: any): void {
        switch (level) {
            case "info": if ( !app.settings.settings.logger.logInfo) return; break;
            case "warning": if ( !app.settings.settings.logger.logWarning) return; break;
            case "error": if ( !app.settings.settings.logger.logError) return; break;
        }
        switch (type) {
            case "db": if ( !app.settings.settings.logger.logDb) return; break;
            case "settings": if ( !app.settings.settings.logger.logSettings) return; break;
            case "popup": if ( !app.settings.settings.logger.logPopup) return; break;
            case "state": if ( !app.settings.settings.logger.logState) return; break;
            case "board": if ( !app.settings.settings.logger.logBoard) return; break;
            case "sidebar": if ( !app.settings.settings.logger.logSidebar) return; break;
            case "workspace": if ( !app.settings.settings.logger.logWorkspace) return; break;
            case "instance": if ( !app.settings.settings.logger.logInstance) return; break;
            case "view": if ( !app.settings.settings.logger.logView) return; break;
        }

        const emoji = EMOJI_BY_LOG_TYPE.get(type);
        const emojiPrefix = emoji ? `${emoji} ` : "";

        const color = Logger.getColor(level);
        const time = Utils.getFormattedDatetime();
        const prefix = `${emojiPrefix}${time} %c[${level.toUpperCase()}] ${type.toUpperCase()}:`;
        console.log(prefix, `color: ${color}; font-weight: bold;`, message);
    }

    public logRaw(type: RawLogType, message: any): void {
        switch (type) {
            case "recipe": if ( !app.settings.settings.logger.logRecipes) return; break;
        }
        console.log(message);
    }

    private static getColor(level: LogLevel): string {
        switch (level) {
            case "info": return "dodgerblue";
            case "warning": return "orange";
            case "error": return "crimson";
        }
    }
}
