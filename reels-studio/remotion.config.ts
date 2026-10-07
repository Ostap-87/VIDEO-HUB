import {Config} from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setOverwriteOutput(true);

// Исходники (видео, фото, музыка) лежат в общей папке репозитория source-videos/
Config.setPublicDir("../source-videos");
