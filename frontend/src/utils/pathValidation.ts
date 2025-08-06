/**
 * Validates a directory path using both client-side and server-side checks
 * @param path - The path to validate
 * @returns Promise that resolves to an error message or null if valid
 */
export const validatePath = async (path: string): Promise<string | null> => {
  if (!path.trim()) return 'Path cannot be empty'
  if (!path.startsWith('/')) return 'Path must be absolute (start with /)'
  
  // Additional client-side checks
  const trimmedPath = path.trim()
  if (trimmedPath.includes('//')) return 'Path cannot contain double slashes'
  if (trimmedPath.endsWith('/') && trimmedPath !== '/') return 'Path should not end with a slash'
  if (trimmedPath.includes('..')) return 'Path cannot contain relative references (..)'
  
  // Server-side validation by trying to browse the directory
  try {
    console.log('Validating path by checking if directory exists:', trimmedPath)
    
    // Try to browse the directory to see if it exists
    const response = await fetch(`/api/filesystem/browse?path=${encodeURIComponent(trimmedPath)}`)
    
    console.log('Browse response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Browse response data:', data)
      
      // If we can browse the directory, it exists
      if (data && (data.current_path || data.items)) {
        console.log('Path validation passed - directory exists and is browsable')
        return null
      }
    }
    
    // If browsing failed, the directory probably doesn't exist
    if (response.status === 404 || response.status === 400) {
      console.log('Path validation failed - directory does not exist or is not accessible')
      return 'Directory does not exist or is not accessible'
    }
    
    // For other status codes, try to get the error message
    try {
      const errorData = await response.json()
      console.log('Browse error data:', errorData)
      return errorData.detail || errorData.error || `Directory validation failed (${response.status})`
    } catch {
      return `Directory validation failed (${response.status})`
    }
    
  } catch (error: any) {
    console.error('Path validation error:', error)
    
    // If validation completely fails, allow the path but warn the user
    console.log('Unable to validate path, allowing it through')
    return null // Don't block saving if validation fails
  }
}
