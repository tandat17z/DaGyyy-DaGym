import type { ChangelogEntry } from '../brand'

/** Newest first. The first entry is the version shown in the header: add a new one on every release. */
export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2026-10-02',
    changes: [
      { kind: 'added', text: { en: 'Workout templates, weekly schedule and per-day plans', vi: 'Mẫu buổi tập, lịch tập theo tuần và chỉnh riêng từng ngày' } },
      { kind: 'added', text: { en: 'Live workout logging (kg × reps, seconds, distance) with a rest timer', vi: 'Ghi buổi tập trực tiếp (kg × reps, số giây, quãng đường) kèm đồng hồ nghỉ' } },
      { kind: 'added', text: { en: 'Statistics by day, week and muscle group, personal records', vi: 'Thống kê theo ngày, tuần, nhóm cơ và kỷ lục cá nhân' } },
      { kind: 'added', text: { en: 'Exercise dictionary with 870+ illustrated exercises (free-exercise-db)', vi: 'Từ điển hơn 870 bài tập có hình minh hoạ (free-exercise-db)' } },
    ],
  },
]
