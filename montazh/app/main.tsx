import React from "react";
import {createRoot} from "react-dom/client";
import {App} from "./App";

// файлы шаблона (звуки, музыка, страницы сайта для финала) лежат в сборке: assets/<путь от корня VIDEO-HUB>
(window as any).remotion_staticBase = new URL("assets", document.baseURI).pathname.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(<App />);
