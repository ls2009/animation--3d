declare module "gl" {
  function createContext(
    width: number,
    height: number,
    options?: Record<string, unknown>,
  ): WebGLRenderingContext | null;
  export default createContext;
}
