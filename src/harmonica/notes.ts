// מפוחית דיאטונית C (ריכטר), 10 חורים. A4 = 440Hz.
export type Action = 'blow' | 'draw'
export interface HoleNote { hole: number; action: Action; note: string }

export const LAYOUT: Record<number, { blow: string; draw: string }> = {
  1: { blow: 'C4', draw: 'D4' }, 2: { blow: 'E4', draw: 'G4' },
  3: { blow: 'G4', draw: 'B4' }, 4: { blow: 'C5', draw: 'D5' },
  5: { blow: 'E5', draw: 'F5' }, 6: { blow: 'G5', draw: 'A5' },
  7: { blow: 'C6', draw: 'B5' }, 8: { blow: 'E6', draw: 'D6' },
  9: { blow: 'G6', draw: 'F6' }, 10: { blow: 'C7', draw: 'A6' },
}

const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }

export function noteToMidi(n: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(n)
  if (!m) throw new Error('bad note ' + n)
  return SEMI[m[1]] + (Number(m[2]) + 1) * 12
}
export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
export const noteToFreq = (n: string) => midiToFreq(noteToMidi(n))
export const freqToMidiFloat = (f: number) => 69 + 12 * Math.log2(f / 440)

export function holeNote(hole: number, action: Action): string { return LAYOUT[hole][action] }

/** מחזיר את החורים/פעולות שמפיקים צליל נתון */
export function findHole(note: string): HoleNote[] {
  const out: HoleNote[] = []
  for (const h of Object.keys(LAYOUT).map(Number))
    for (const a of ['blow', 'draw'] as Action[])
      if (LAYOUT[h][a] === note) out.push({ hole: h, action: a, note })
  return out
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const midiToNote = (m: number) => NAMES[m % 12] + (Math.floor(m / 12) - 1)
