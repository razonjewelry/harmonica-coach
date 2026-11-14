export interface Melody { id: string; title: string; notes: string[] }

export const MELODIES: Melody[] = [
  { id: 'twinkle', title: 'כוכב קטן', notes: ['C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5', 'F5', 'F5', 'E5', 'E5', 'D5', 'D5', 'C5'] },
  { id: 'ode', title: 'אודה לשמחה (בטהובן)', notes: ['E5', 'E5', 'F5', 'G5', 'G5', 'F5', 'E5', 'D5', 'C5', 'C5', 'D5', 'E5', 'E5', 'D5', 'D5'] },
  { id: 'scale', title: 'סולם דו מז׳ור', notes: ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'] },
]
