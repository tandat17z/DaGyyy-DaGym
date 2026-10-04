import type { ChangelogEntry } from '@tada/kit/brand'

/** Newest first. The first entry is the version shown in the header: add a new one on every release. */
export const changelog: ChangelogEntry[] = [
  {
    version: '0.3.1',
    date: '2026-10-04',
    changes: [
      { kind: 'changed', text: { en: 'Logo mark with a bigger icon and a smaller short name underneath; new home-screen icon to match (@tada/kit v0.3.1)', vi: 'Logo có icon to hơn, tên gọn nhỏ hơn ở dưới; icon màn hình chính mới cho khớp (@tada/kit v0.3.1)' } },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-04',
    changes: [
      { kind: 'added', text: { en: 'Account menu like DaFinance: rating and feedback, language switch, Settings; asking for server storage uses the same request form', vi: 'Menu tài khoản như DaFinance: đánh giá và góp ý, đổi ngôn ngữ, Cài đặt; xin lưu trên server dùng chung form yêu cầu' } },
      { kind: 'added', text: { en: 'Light and dark appearance in Settings; the choice and the current program are kept on the server when your data lives there', vi: 'Giao diện sáng và tối trong Cài đặt; lựa chọn này và giáo án đang dùng được lưu trên server khi dữ liệu nằm ở đó' } },
      { kind: 'added', text: { en: 'New logo mark (icon and short name on a tinted tile), home-screen icon and the shared page layout, as in DaFinance', vi: 'Logo mới (icon và tên gọn trên nền xanh), icon màn hình chính và khung giao diện dùng chung, như DaFinance' } },
      { kind: 'changed', text: { en: 'The page is as wide as DaFinance; the tab title is the short name', vi: 'Trang rộng bằng DaFinance; tiêu đề tab là tên gọn' } },
      { kind: 'changed', text: { en: 'A private app shows nothing to users without access', vi: 'App private không hiện gì với người dùng chưa được cấp quyền' } },
      { kind: 'changed', text: { en: 'Removed the back link to the Workspace and the separate language switch', vi: 'Bỏ liên kết về Workspace và nút đổi ngôn ngữ riêng' } },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-03',
    changes: [
      { kind: 'added', text: { en: 'Works without a server (standalone) and for signed-in users without server storage: data in this browser, with a request for server storage and a move to the server once approved (same as DaFinance)', vi: 'Chạy được không cần server (standalone) và cho người đăng nhập chưa được lưu trên server: dữ liệu trong trình duyệt, kèm nút xin lưu trên server và chuyển lên khi được duyệt (giống DaFinance)' } },
      { kind: 'added', text: { en: 'When every set of an exercise is done, a countdown opens the next one; after the last one the workout finishes', vi: 'Xong hết hiệp của một bài thì đếm ngược rồi tự sang bài tiếp; xong bài cuối thì tự kết thúc buổi' } },
      { kind: 'changed', text: { en: 'Workout day editor: one compact row per exercise (sets × kg × reps, rest), drag to reorder', vi: 'Sửa buổi tập: mỗi bài một dòng gọn (hiệp × kg × reps, thời gian nghỉ), kéo để đổi thứ tự' } },
      { kind: 'changed', text: { en: 'Three tabs: Home, Train (programs + exercises) and Progress (history + statistics)', vi: 'Gọn còn 3 tab: Trang chủ, Tập luyện (giáo án + bài tập) và Tiến độ (lịch sử + thống kê)' } },
      { kind: 'added', text: { en: 'Several programs, each a list of workout days; pick the current one on the dashboard', vi: 'Nhiều giáo án, mỗi giáo án là danh sách các buổi tập; chọn giáo án đang dùng ở trang tổng quan' } },
      { kind: 'added', text: { en: 'Swap an exercise for a similar one (same muscle group)', vi: 'Đổi một bài sang bài tương tự (cùng nhóm cơ)' } },
      { kind: 'added', text: { en: 'Dashboard: program with the next workout day, progress rings and a calendar of what you actually trained', vi: 'Trang tổng quan: giáo án kèm buổi tập tiếp theo, vòng tiến độ và lịch các buổi đã thực sự tập' } },
      { kind: 'added', text: { en: 'One page per exercise while training: target, rest and sets rings, quick kg × reps logging, history; swipe to the next exercise', vi: 'Mỗi bài tập một trang khi tập: vòng mục tiêu, nghỉ và số hiệp, ghi nhanh kg × reps, lịch sử; vuốt để sang bài khác' } },
      { kind: 'changed', text: { en: 'No fixed weekly schedule any more: workout days are trained in order, on any day', vi: 'Bỏ lịch tập cố định theo tuần: các buổi được tập lần lượt, vào ngày nào cũng được' } },
    ],
  },
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
