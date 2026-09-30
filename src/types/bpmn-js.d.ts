declare module 'bpmn-js/lib/NavigatedViewer' {
  export default class NavigatedViewer {
    constructor(options?: { container?: HTMLElement | string });
    importXML(xml: string): Promise<{ warnings: string[] }>;
    get(name: string): unknown;
    destroy(): void;
  }
}
