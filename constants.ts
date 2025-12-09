
import { Employee, Role, LeaveRequest, LeaveType, LeaveStatus } from './types';

export const DEFAULT_COMPANY_INFO = {
  name: 'Công ty Cổ phần đầu tư đường cao tốc Nam Định - Thái Bình',
  logo: ''
};

// Danh sách phòng ban theo đúng thứ tự I -> IX
export const MOCK_DEPARTMENTS = [
  'BAN TỔNG GIÁM ĐỐC',
  'BAN KẾ TOÁN',
  'BAN TÀI CHÍNH',
  'BAN HÀNH CHÍNH - NHÂN SỰ',
  'BAN KẾ HOẠCH - TỔNG HỢP',
  'BAN THẨM ĐỊNH GIÁ',
  'BAN QUẢN LÝ THIẾT KẾ',
  'BAN QUẢN LÝ DỰ ÁN 1',
  'BAN QUẢN LÝ DỰ ÁN 2'
];

// Helper để tạo data nhanh
const createEmp = (id: string, name: string, dept: string, jobTitle: string): Employee => {
  let role = Role.STAFF;
  const titleLower = jobTitle.toLowerCase();
  
  if (titleLower.includes('tổng giám đốc') && !titleLower.includes('trợ lý')) {
    role = Role.BOD;
  } else if (
    titleLower.includes('trưởng ban') || 
    titleLower.includes('phó ban') || 
    titleLower.includes('kế toán trưởng') ||
    titleLower.includes('phó tổng')
  ) {
    role = Role.MANAGER;
  }

  return {
    id,
    name,
    department: dept,
    role,
    jobTitle,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
  };
};

export const MOCK_EMPLOYEES: Employee[] = [
  // I. BAN TỔNG GIÁM ĐỐC
  createEmp('1', 'Nguyễn Lê Anh', 'BAN TỔNG GIÁM ĐỐC', 'Tổng Giám đốc'),
  createEmp('2', 'Vũ Thị Thủy', 'BAN TỔNG GIÁM ĐỐC', 'Phó Tổng Giám đốc'),
  createEmp('3', 'Trần Thanh Sơn', 'BAN TỔNG GIÁM ĐỐC', 'Phó Tổng Giám đốc'),
  createEmp('4', 'Phan Anh', 'BAN TỔNG GIÁM ĐỐC', 'Phó Tổng Giám đốc'),

  // II. BAN KẾ TOÁN
  createEmp('5', 'Vũ Thị Hương Trà', 'BAN KẾ TOÁN', 'Kế toán trưởng'),
  createEmp('6', 'Đinh Thị Hồng Nhung', 'BAN KẾ TOÁN', 'Chuyên viên Kế toán'),
  createEmp('7', 'Lê Văn Trường', 'BAN KẾ TOÁN', 'Chuyên viên Kế toán'),

  // III. BAN TÀI CHÍNH
  createEmp('8', 'Đặng Thị Lệ Thủy', 'BAN TÀI CHÍNH', 'Chuyên viên Tài chính'),

  // IV. BAN HÀNH CHÍNH - NHÂN SỰ
  createEmp('9', 'Lê Quỳnh Anh', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Phó Ban Hành chính - Nhân sự'),
  createEmp('10', 'Vũ Thị Vi', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Chuyên viên Hành chính'),
  createEmp('11', 'Đỗ Thúy Phượng', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Nhân viên Hành chính'),
  createEmp('12', 'Nguyễn Thị Thúy', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Nhân viên Hành chính'),
  createEmp('13', 'Nghiêm Văn Dũng', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Nhân viên Lái xe'),
  createEmp('14', 'Nguyễn Văn Cường', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Nhân viên Lái xe'),
  createEmp('15', 'Tô Mạnh Công', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Nhân viên Lái xe'),
  createEmp('16', 'Vũ Văn Quân', 'BAN HÀNH CHÍNH - NHÂN SỰ', 'Nhân viên Lái xe'),

  // V. BAN KẾ HOẠCH - TỔNG HỢP
  createEmp('17', 'Phạm Hồng Thoan', 'BAN KẾ HOẠCH - TỔNG HỢP', 'Trưởng Ban Kế hoạch - Tổng hợp'),
  createEmp('18', 'Trương Hồng Phong', 'BAN KẾ HOẠCH - TỔNG HỢP', 'Phó Ban Kế hoạch - Tổng Hợp'),
  createEmp('19', 'Tạ Quỳnh Vân', 'BAN KẾ HOẠCH - TỔNG HỢP', 'Chuyên viên Kế hoạch - Tổng Hợp'),
  createEmp('20', 'Nguyễn Đỗ Duy', 'BAN KẾ HOẠCH - TỔNG HỢP', 'Chuyên viên Kế hoạch - Tổng Hợp'),
  createEmp('21', 'Phạm Thị Lương', 'BAN KẾ HOẠCH - TỔNG HỢP', 'Chuyên viên Kế hoạch - Tổng Hợp'),

  // VI. BAN THẨM ĐỊNH GIÁ
  createEmp('22', 'Lê Quốc Phong', 'BAN THẨM ĐỊNH GIÁ', 'Trưởng Ban Thẩm định giá'),
  createEmp('23', 'Nguyễn Thị Chung', 'BAN THẨM ĐỊNH GIÁ', 'Chuyên viên Thẩm định giá'),
  createEmp('24', 'Chu Hoàng Oanh', 'BAN THẨM ĐỊNH GIÁ', 'Chuyên viên Thẩm định giá'),

  // VII. BAN QUẢN LÝ THIẾT KẾ
  createEmp('25', 'Hồ Tri', 'BAN QUẢN LÝ THIẾT KẾ', 'Trưởng Ban Quản lý thiết kế'),
  createEmp('26', 'Hoàng Kim Quang', 'BAN QUẢN LÝ THIẾT KẾ', 'Phó Ban Quản lý thiết kế'),
  createEmp('27', 'Nguyễn Quốc Huy', 'BAN QUẢN LÝ THIẾT KẾ', 'Chuyên viên Quản lý thiết kế'),

  // VIII. BAN QUẢN LÝ DỰ ÁN 1
  createEmp('28', 'Hoàng Văn Hưng', 'BAN QUẢN LÝ DỰ ÁN 1', 'Trưởng Ban Quản lý dự án 1'),
  createEmp('29', 'Trần Hữu Trí', 'BAN QUẢN LÝ DỰ ÁN 1', 'Phó Ban Quản lý dự án 1'),
  createEmp('30', 'Văn Trọng Sơn', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('31', 'Nguyễn Văn Trú', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('32', 'Nguyễn Việt Dũng', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('33', 'Nguyễn Đức Lộc', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('34', 'Nguyễn Trung Trọng', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('35', 'Đoàn Minh Toàn', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('36', 'Phạm Văn Khanh', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('37', 'Nguyễn Mạnh Hùng', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('38', 'Nguyễn Thanh Tùng', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('39', 'Nguyễn Việt Anh', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),
  createEmp('40', 'Nguyễn Hữu Trung', 'BAN QUẢN LÝ DỰ ÁN 1', 'Kỹ sư Môi trường, sức khỏe và an toàn'),
  createEmp('41', 'Trần Việt Anh', 'BAN QUẢN LÝ DỰ ÁN 1', 'Chuyên viên Quản lý thi công'),

  // IX. BAN QUẢN LÝ DỰ ÁN 2
  createEmp('42', 'Nguyễn Đức Huỳnh', 'BAN QUẢN LÝ DỰ ÁN 2', 'Trưởng Ban Quản lý dự án 2'),
  createEmp('43', 'Bùi Văn Khoa', 'BAN QUẢN LÝ DỰ ÁN 2', 'Chuyên viên Quản lý thi công'),
  createEmp('44', 'Phan Thanh Hương', 'BAN QUẢN LÝ DỰ ÁN 2', 'Chuyên viên Quản lý thi công'),
  createEmp('45', 'Đoàn Duy Đăng', 'BAN QUẢN LÝ DỰ ÁN 2', 'Chuyên viên Quản lý thi công'),
  createEmp('46', 'Nguyễn Văn Hoàng', 'BAN QUẢN LÝ DỰ ÁN 2', 'Chuyên viên Quản lý thi công'),
];

// Danh sách yêu cầu nghỉ phép ban đầu để TRỐNG theo yêu cầu
export const INITIAL_REQUESTS: LeaveRequest[] = [];
