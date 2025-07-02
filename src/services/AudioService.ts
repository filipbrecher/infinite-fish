import {RARE_AUDIO_CHANCE, Sound} from "../types/services";
import {Utils} from "./Utils";


const PATHS: Record<Sound, [string, number][]> = {
    [Sound.OPEN_POPUP]: [["/public/audio/open_popup.wav", 0.5]],
    [Sound.FAILED_COMBINE]: [["/public/audio/failed_combine.wav", 0.15]],
    [Sound.POP]: [["/public/audio/instance_pop.ogg", 0.5]],
    [Sound.INSTANCE_OLD]: [["/public/audio/instance_old.ogg", 0.6]],
    [Sound.INSTANCE_NEW]: [["/public/audio/instance_new.mp3", 1]],
    [Sound.INSTANCE_DISCOVERY]: [["/public/audio/instance_discovery.wav", 1], ["/public/audio/fart.wav", 1], ["/public/audio/yay.wav", 0.8]],
};

export class AudioService {
    private readonly sounds: Map<Sound, HTMLAudioElement[]> = new Map();

    constructor() {
        Object.values(Sound).forEach(sound => {
            const arr: [string, number][] = PATHS[sound];
            const audios: HTMLAudioElement[] = [];
            arr.forEach(([path, volume]) => {
                const audio = new Audio(path);
                audio.preload = "auto";
                audios.push(audio);
            })
            this.sounds.set(sound as Sound, audios);
        })
    }

    public async testAudios() {
        for (const sound of Object.values(Sound)) {
            const arr = PATHS[sound];
            for (const [path, volume] of arr) {
                const audio = new Audio(path);
                audio.volume = volume;
                audio.play().catch();
                await Utils.wait(1000);
            }
        }
    }

    public play(name: Sound) {
        const original = this.sounds.get(name);
        if ( !original) return;

        let id = 0;
        if (original.length > 1) {
            if (Math.random() < RARE_AUDIO_CHANCE) {
                id = Math.floor(Math.random() * (original.length - 1)) + 1;
            }
        }

        const copy = new Audio(original[id].src);
        copy.volume = PATHS[name][id][1];
        copy.play().catch();
    }
}
