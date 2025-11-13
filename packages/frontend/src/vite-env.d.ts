/// <reference types="vite/client" />

/**
 * 扩展 Window 接口以支持 AppKit web components
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'appkit-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
  }
}

export {}

