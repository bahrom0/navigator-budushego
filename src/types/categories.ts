export interface Category {
  id: string
  name: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  custom?: boolean
}
