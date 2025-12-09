import React, { useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

// Declare XLSX from global scope (loaded via CDN in index.html)
declare const XLSX: any;

interface MonthlyReportProps {
  employees: Employee[];
  requests: LeaveRequest[];
  departments: string[];
  companyName: string;
}

// Helper: Convert number to Roman
const toRoman = (num: number): string => {
    const roman = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let str = '';
    for (let i of Object.keys(roman) as Array<keyof typeof roman>) {
        let q = Math.floor(num / roman[i]);
        num -= q * roman[i];
        str += i.repeat(q);
    }
    return str;
};

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ employees, requests, departments, companyName }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Helper: Get days in month
  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper: Check status of a specific day for an employee
  const getLeaveStatusForDay = (employeeId: string, day: number) => {
    // Format current cell date to YYYY-MM-DD
    const dateObj = new Date(year, month, day);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;

    const approvedLeave = requests.find(req => {
      return (
        req.employeeId === employeeId &&
        req.status === LeaveStatus.APPROVED &&
        targetDateStr >= req.startDate &&
        targetDateStr <= req.endDate
      );
    });

    return approvedLeave ? approvedLeave.type : null;
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 is Sunday, 6 is Saturday
  };

  const getLeaveCode = (type: LeaveType) => {
    switch (type) {
      case LeaveType.VACATION: return { code: 'P', color: 'bg-blue-100 text-blue-700 font-bold' };
      case LeaveType.SICK: return { code: 'Ô', color: 'bg-red-100 text-red-700 font-bold' };
      case LeaveType.UNPAID: return { code: 'K', color: 'bg-gray-200 text-gray-700 font-bold' };
      case LeaveType.PERSONAL: return { code: 'R', color: 'bg-purple-100 text-purple-700 font-bold' };
      default: return { code: '*', color: 'bg-gray-100' };
    }
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  const exportData = () => {
    if (typeof XLSX === 'undefined') {
      alert("Thư viện Excel chưa tải xong. Vui lòng đợi hoặc tải lại trang.");
      return;
    }

    // 1. Prepare Header
    const headerRow = ["STT", "Họ Tên", "Chức vụ", ...daysArray.map(d => String(d)), "Tổng nghỉ"];
    const dataRows = [];

    // 2. Loop through departments to build structure
    departments.forEach((dept, index) => {
      const deptEmployees = employees.filter(e => e.department === dept);
      if (deptEmployees.length === 0) return;

      // Add Department Header Row
      const deptRow = [`${toRoman(index + 1)}. ${dept.toUpperCase()}`];
      dataRows.push(deptRow);

      // Add Employee Rows
      deptEmployees.forEach((emp, empIdx) => {
        let monthlyTotal = 0;
        const leaveCells = daysArray.map(day => {
          const type = getLeaveStatusForDay(emp.id, day);
          if (type) {
             monthlyTotal++;
             return getLeaveCode(type).code;
          }
          return ""; // Empty if working
        });

        dataRows.push([
           empIdx + 1, // STT within dept (optional)
           emp.name,
           emp.jobTitle || emp.role,
           ...leaveCells,
           monthlyTotal
        ]);
      });
    });

    // 3. Create Worksheet
    const wsData = [
      [`${companyName.toUpperCase()} - BẢNG CHẤM CÔNG THÁNG ${month + 1}/${year}`], // Title
      [], // Empty row
      headerRow,
      ...dataRows
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 4. Create Workbook and Export
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ChamCong");
    XLSX.writeFile(wb, `BangChamCong_${month + 1}_${year}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Header Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-800 min-w-[200px] text-center">
            Tháng {month + 1} / {year}
          </h2>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
           {/* Legend */}
           <div className="flex gap-3 text-xs mr-4 hidden lg:flex">
              <div className="flex items-center gap-1"><span className="w-4 h-4 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded">P</span> Phép năm</div>
              <div className="flex items-center gap-1"><span className="w-4 h-4 bg-red-100 text-red-700 font-bold flex items-center justify-center rounded">Ô</span> Nghỉ ốm</div>
              <div className="flex items-center gap-1"><span className="w-4 h-4 bg-purple-100 text-purple-700 font-bold flex items-center justify-center rounded">R</span> Việc riêng</div>
           </div>
           <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Excel Grid Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 p-2 border border-gray-200 text-left min-w-[150px] font-semibold text-gray-700">Nhân viên</th>
                {daysArray.map(day => (
                  <th key={day} className={`p-1 border border-gray-200 min-w-[30px] text-center font-medium ${isWeekend(day) ? 'bg-orange-50 text-orange-800' : 'bg-gray-50 text-gray-700'}`}>
                    {day}
                  </th>
                ))}
                <th className="sticky right-0 z-20 bg-blue-50 p-2 border border-gray-200 text-center min-w-[60px] font-bold text-blue-800">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, index) => {
                const deptEmployees = employees.filter(e => e.department === dept);
                if (deptEmployees.length === 0) return null;

                return (
                  <React.Fragment key={dept}>
                    {/* Department Header Row */}
                    <tr className="bg-gray-100">
                      <td colSpan={daysInMonth + 2} className="p-2 border border-gray-200 font-bold text-gray-800 uppercase text-xs sticky left-0 z-10 bg-gray-100">
                        {toRoman(index + 1)}. {dept}
                      </td>
                    </tr>
                    
                    {/* Employee Rows */}
                    {deptEmployees.map(emp => {
                      let monthlyTotal = 0;
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-white p-2 border border-gray-200 font-medium text-gray-900 truncate max-w-[150px]">
                            <div className="flex flex-col">
                                <span>{emp.name}</span>
                                <span className="text-[10px] text-gray-500 font-normal">{emp.jobTitle || emp.role}</span>
                            </div>
                          </td>
                          
                          {daysArray.map(day => {
                            const leaveType = getLeaveStatusForDay(emp.id, day);
                            if (leaveType) monthlyTotal++;
                            const style = leaveType ? getLeaveCode(leaveType) : null;
                            
                            return (
                              <td 
                                key={day} 
                                className={`border border-gray-200 text-center h-8 w-8 
                                  ${isWeekend(day) && !leaveType ? 'bg-orange-50/50' : ''} 
                                  ${style ? style.color : ''}
                                `}
                                title={leaveType ? `${leaveType} - ${day}/${month+1}` : undefined}
                              >
                                {style ? style.code : ''}
                              </td>
                            );
                          })}
                          
                          <td className="sticky right-0 z-10 bg-blue-50 p-2 border border-gray-200 text-center font-bold text-blue-700">
                            {monthlyTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Legend for Mobile */}
      <div className="lg:hidden bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-600 mt-4">
         <h3 className="font-bold mb-2">Chú thích:</h3>
         <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold flex items-center justify-center rounded">P</span> Nghỉ phép năm</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-red-100 text-red-700 font-bold flex items-center justify-center rounded">Ô</span> Nghỉ ốm</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-purple-100 text-purple-700 font-bold flex items-center justify-center rounded">R</span> Việc riêng</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-200 text-gray-700 font-bold flex items-center justify-center rounded">K</span> Không lương</div>
            <div className="flex items-center gap-2"><span className="w-5 h-5 bg-orange-50 border border-orange-100 rounded"></span> Cuối tuần</div>
         </div>
      </div>
    </div>
  );
};