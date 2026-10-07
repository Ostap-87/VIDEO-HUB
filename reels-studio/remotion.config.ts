import {existsSync} from "node:fs";
import {Config} from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setOverwriteOutput(true);

// Исходники (видео, фото, музыка) лежат в общей папке репозитория source-videos/
Config.setPublicDir("../source-videos");

// В облачной среде Claude Remotion не может сам скачать свой браузер,
// поэтому берём уже установленный там headless shell. На вашем компьютере этого пути нет, и всё работает как обычно.
const CLOUD_BROWSER = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (existsSync(CLOUD_BROWSER)) {
  Config.setBrowserExecutable(CLOUD_BROWSER);
}
