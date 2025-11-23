interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  fullScreen?: boolean
}

function getSizeClass(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm':
      return 'h-4 w-4'
    case 'md':
      return 'h-8 w-8'
    case 'lg':
      return 'h-12 w-12'
    default:
      return 'h-8 w-8'
  }
}

export default function Loading({ size = 'md', text, fullScreen = false }: LoadingProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center p-4'

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div
          className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto ${getSizeClass(size)}`}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
        {text && <p className="mt-2 text-gray-600">{text}</p>}
      </div>
    </div>
  )
}

