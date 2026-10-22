// @types/react-dom в reels-studio не установлен — достаточно createRoot
declare module "react-dom/client" {
  export function createRoot(el: Element): {render(node: unknown): void};
}
