/**
 * TypeScript declarations for Google's <model-viewer> web component.
 * Loaded via CDN — no npm dependency needed.
 * @see https://modelviewer.dev/
 */

declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string
        alt?: string
        'camera-orbit'?: string
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'shadow-intensity'?: string
        'environment-image'?: string
        'exposure'?: string
        'interaction-prompt'?: string
        loading?: 'auto' | 'lazy' | 'eager'
      },
      HTMLElement
    >
  }
}
