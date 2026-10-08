import { describe, it, expect } from 'vitest'
import {
  parseActionPlanCsv,
  generateActionPlanTemplateCsv,
} from '@/lib/csv-action-plan'

describe('lib/csv-action-plan.ts', () => {
  describe('parseActionPlanCsv()', () => {
    it('returns empty result with error for empty CSV string', () => {
      const result = parseActionPlanCsv('')
      expect(result.rows).toEqual([])
      expect(result.totalValid).toBe(0)
      expect(result.totalErrors).toBe(0)
      expect(result.generalError).toBe('File CSV kosong')
    })

    it('returns error if header does not have title/judul column', () => {
      const csv = 'priority,startDate,endDate\nHIGH,2026-03-01,2026-03-02'
      const result = parseActionPlanCsv(csv)
      expect(result.rows).toEqual([])
      expect(result.generalError).toContain('Kolom "title"')
    })

    it('parses valid comma-delimited CSV with standard headers', () => {
      const csv = [
        'title,outcomeKpi,priority,startDate,endDate,picEmail',
        'Implementasi Auth,Auth module 100% test pass,HIGH,2026-03-01,2026-03-05,dev@promap.id',
        'Setup Database,Prisma schema migrated,MEDIUM,2026-03-02,2026-03-06,ops@promap.id',
      ].join('\n')

      const result = parseActionPlanCsv(csv)
      expect(result.generalError).toBeUndefined()
      expect(result.rows.length).toBe(2)
      expect(result.totalValid).toBe(2)
      expect(result.totalErrors).toBe(0)
      expect(result.exceedsLimit).toBe(false)

      const first = result.rows[0]
      expect(first.index).toBe(1)
      expect(first.title).toBe('Implementasi Auth')
      expect(first.outcomeKpi).toBe('Auth module 100% test pass')
      expect(first.priority).toBe('HIGH')
      expect(first.startDate).toBe('2026-03-01')
      expect(first.endDate).toBe('2026-03-05')
      expect(first.picEmail).toBe('dev@promap.id')
      expect(first.isValid).toBe(true)
    })

    it('handles semicolon-delimited CSV correctly', () => {
      const csv = [
        'title;outcomeKpi;priority;startDate;endDate',
        'Task Semicolon;Hasil Semicolon;LOW;2026-03-10;2026-03-12',
      ].join('\n')

      const result = parseActionPlanCsv(csv)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].title).toBe('Task Semicolon')
      expect(result.rows[0].priority).toBe('LOW')
      expect(result.rows[0].isValid).toBe(true)
    })

    it('handles alternative Indonesian headers (judul, target, prioritas, tglmulai, deadline)', () => {
      const csv = [
        'judul,target,prioritas,tglmulai,deadline',
        'Laporan Finansial,Tuntas diaudit,TINGGI,15/03/2026,20/03/2026',
      ].join('\n')

      const result = parseActionPlanCsv(csv)
      expect(result.rows.length).toBe(1)
      expect(result.rows[0].title).toBe('Laporan Finansial')
      expect(result.rows[0].outcomeKpi).toBe('Tuntas diaudit')
      expect(result.rows[0].priority).toBe('HIGH')
      expect(result.rows[0].startDate).toBe('2026-03-15')
      expect(result.rows[0].endDate).toBe('2026-03-20')
      expect(result.rows[0].isValid).toBe(true)
    })

    it('flags rows with validation errors (missing title, invalid date, endDate < startDate)', () => {
      const csv = [
        'title,priority,startDate,endDate',
        ',HIGH,2026-03-01,2026-03-02', // missing title
        'Invalid Date Task,HIGH,invalid-date,2026-03-02', // invalid startDate
        'Inverted Dates,HIGH,2026-03-10,2026-03-05', // endDate < startDate
      ].join('\n')

      const result = parseActionPlanCsv(csv)
      expect(result.rows.length).toBe(3)
      expect(result.totalValid).toBe(0)
      expect(result.totalErrors).toBe(3)

      expect(result.rows[0].isValid).toBe(false)
      expect(result.rows[0].error).toBe('Judul action plan wajib diisi')

      expect(result.rows[1].isValid).toBe(false)
      expect(result.rows[1].error).toContain('Format tanggal')

      expect(result.rows[2].isValid).toBe(false)
      expect(result.rows[2].error).toContain('tidak boleh lebih awal')
    })

    it('flags exceedsLimit when rows > 24', () => {
      const lines = ['title,priority,startDate,endDate']
      for (let i = 1; i <= 25; i++) {
        lines.push(`Task ${i},MEDIUM,2026-03-01,2026-03-02`)
      }

      const result = parseActionPlanCsv(lines.join('\n'))
      expect(result.rows.length).toBe(25)
      expect(result.exceedsLimit).toBe(true)
    })

    it('rejects non-http evidenceLink (javascript: scheme)', () => {
      const csv = 'title,startDate,endDate,evidenceLink\nXSS,2026-03-01,2026-03-02,javascript:alert(1)'
      const result = parseActionPlanCsv(csv)
      expect(result.rows[0].isValid).toBe(false)
      expect(result.rows[0].error).toContain('http')
    })

    it('handles CSV containing only "sep=," without crashing', () => {
      const result = parseActionPlanCsv('sep=,')
      expect(result.rows).toEqual([])
      expect(result.totalValid).toBe(0)
      expect(result.generalError).toBeTruthy()
    })
  })

  describe('generateActionPlanTemplateCsv()', () => {
    it('generates a valid weekly template with exactly 24 action plans', () => {
      const template = generateActionPlanTemplateCsv()
      expect(template.startsWith('\uFEFFsep=,\r\n')).toBe(true)

      const parsed = parseActionPlanCsv(template)
      expect(parsed.generalError).toBeUndefined()
      expect(parsed.rows.length).toBe(24)
      expect(parsed.totalValid).toBe(24)
      expect(parsed.totalErrors).toBe(0)
      expect(parsed.exceedsLimit).toBe(false)
    })
  })
})
