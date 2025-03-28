// Format date for display
export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format duration for display
export function formatDuration(minutes: number) {
  if (!minutes) return 'Minder dan 1 minuut'
  if (minutes < 1) return 'Minder dan 1 minuut'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minuut' : 'minuten'}`
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) return `${hours} ${hours === 1 ? 'uur' : 'uren'}`
  return `${hours} ${hours === 1 ? 'uur' : 'uren'} en ${remainingMinutes} ${remainingMinutes === 1 ? 'minuut' : 'minuten'}`
} 