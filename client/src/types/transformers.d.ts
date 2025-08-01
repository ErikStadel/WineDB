declare global {
  interface Window {
    Xenova: {
      pipeline: (task: string, model: string) => Promise<any>;
    };
  }
}
export {};