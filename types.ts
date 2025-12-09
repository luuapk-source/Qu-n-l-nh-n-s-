
export enum Role {
  BOD = 'Ban Tổng giám đốc', // Board of Directors (Quyền cao nhất)
  MANAGER = 'Quản lý',       // Trưởng/Phó ban (Duyệt đơn nhân viên)
  STAFF = 'Nhân viên'        // Chỉ xem đơn của mình
}

export enum LeaveStatus {
  PENDING = 'Chờ duyệt',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Từ chối'
}

export enum LeaveType {
  SICK = 'Nghỉ ốm',
  VACATION = 'Nghỉ phép năm',
  PERSONAL = 'Việc riêng',
  UNPAID = 'Nghỉ không lương'
}

export interface Employee {
  id: string;
  name: string;
  department: string; 
  avatar: string;
  role: Role;        // Dùng để phân quyền (System Role)
  jobTitle?: string; // Dùng để hiển thị chức danh thực tế (Display Title)
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
  type: LeaveType;
  reason: string;
  status: LeaveStatus;
  daysCount: number;
  createdAt: string;
  approvedBy?: string; // Tên người duyệt đơn
}

export interface MonthlyStats {
  employeeId: string;
  employeeName: string;
  department: string;
  totalDays: number;
  leaveCount: number;
}

export interface PublicHoliday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}
