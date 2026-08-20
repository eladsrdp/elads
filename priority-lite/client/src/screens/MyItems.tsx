// טאב "שלי" — צ'קליסטים וטיוטות עצמאיים (לא משויכים למשימת פריוריטי).
import { ChecklistSection } from '../components/ChecklistSection'
import { DraftsSection } from '../components/DraftsSection'

export function MyItems() {
  return (
    <div className="space-y-6 pb-6">
      <ChecklistSection />
      <DraftsSection />
    </div>
  )
}
