import React, { useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, PublicHoliday } from '../types';
import { ChevronLeft, ChevronRight, Download, Building, Printer } from 'lucide-react';

declare const XLSX: any;

interface MonthlyReportProps {
  employees: Employee[];
  requests: LeaveRequest[];
  departments: string[];
  companyName: string;
  holidays: PublicHoliday[];
}

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

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ employees, requests, departments, companyName, holidays }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper: Format cell date string YYYY-MM-DD
  const getDateStr = (day: number) => {
      const dateObj = new Date(year, month, day);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
  };

  const isHoliday = (day: number) => {
      const dateStr = getDateStr(day);
      return holidays.some(h => h.date === dateStr);
  };

  const getLeaveStatusForDay = (employeeId: string, day: number) => {
    const targetDateStr = getDateStr(day);
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

  const getDayOfWeekStr = (day: number) => {
      const date = new Date(year, month, day);
      const days = ['CN', 'T.Hai', 'T.Ba', 'T.Tu', 'T.Nam', 'T.Sau', 'T.Bay'];
      return days[date.getDay()];
  };
  
  const isSunday = (day: number) => new Date(year, month, day).getDay() === 0;
  const isSaturday = (day: number) => new Date(year, month, day).getDay() === 6;
  const isWeekend = (day: number) => {
    const d = new Date(year, month, day).getDay();
    return d === 0 || d === 6;
  };

  // Logic ký hiệu chấm công
  const getDayCellData = (employeeId: string, day: number) => {
      // 1. Kiểm tra ngày Lễ (Ưu tiên cao nhất)
      if (isHoliday(day)) return { text: 'L', class: 'bg-red-50 text-red-600 font-bold', val: 0, type: 'L' };
      
      // 2. Kiểm tra Nghỉ phép/Ốm
      const leaveType = getLeaveStatusForDay(employeeId, day);
      if (leaveType) {
          switch (leaveType) {
            case LeaveType.VACATION: return { text: 'P', class: 'bg-blue-50 text-blue-600 font-bold', val: 0, type: 'P' };
            case LeaveType.SICK: return { text: 'O', class: 'bg-orange-50 text-orange-600 font-bold', val: 0, type: 'O' };
            case LeaveType.UNPAID: return { text: 'KL', class: 'bg-gray-100 text-gray-600 font-bold', val: 0, type: 'KL' };
            default: return { text: 'R', class: 'bg-purple-50 text-purple-600', val: 0, type: 'R' };
          }
      }

      // 3. Cuối tuần
      if (isSunday(day)) return { text: '', class: 'bg-gray-200', val: 0, type: 'SUN' };
      if (isSaturday(day)) return { text: 'H/2', class: '', val: 0.5, type: 'H/2' }; // Sáng T7
      
      // 4. Ngày thường đi làm
      return { text: 'H', class: '', val: 1, type: 'H' };
  };

  const changeMonth = (delta: number) => setCurrentDate(new Date(year, month + delta, 1));
  const filteredDepartments = selectedDept === 'ALL' ? departments : [selectedDept];

  const exportData = () => {
    if (typeof XLSX === 'undefined') {
      alert("Thư viện Excel chưa tải xong. Vui lòng tải lại trang.");
      return;
    }

    const wsData: any[][] = [];
    
    // --- HEADER SECTION ---
    // Row 1: Company Name
    wsData.push([companyName.toUpperCase()]);
    // Row 2: Department Unit
    wsData.push([`ĐƠN VỊ: ${selectedDept === 'ALL' ? 'TOÀN CÔNG TY' : selectedDept.toUpperCase()}`]);
    // Row 3: Title
    const titleRow = Array(15).fill(""); 
    titleRow[6] = "BẢNG CHẤM CÔNG"; // Center visually later via merge
    wsData.push(titleRow);
    // Row 4: Month
    const monthRow = Array(15).fill("");
    monthRow[6] = `Tháng ${month + 1} năm ${year}`;
    wsData.push(monthRow);
    wsData.push([]); // Empty row for spacing

    // --- TABLE HEADERS ---
    // Complex header structure matching the image
    // Row 6: Main Headers
    const h1 = ["STT", "Họ và tên", "Chức danh"];
    daysArray.forEach(() => h1.push("NGÀY TRONG THÁNG")); // Will merge
    // Summary Headers
    h1.push("Số công làm việc", "", "Số công học, phép, nghỉ hưởng lương", "", "Số công nghỉ hưởng BHXH", "Số giờ làm thêm", "", "");
    wsData.push(h1);

    // Row 7: Detail Headers (Day numbers & Sub-columns)
    const h2 = ["", "", ""]; // Placeholder for merge
    daysArray.forEach(d => h2.push(String(d).padStart(2, '0'))); // 01, 02...
    // Sub-columns
    h2.push("Tổng số ngày công");
    h2.push("Trong đó làm ngày lễ");
    h2.push("NL"); // Nghỉ lễ
    h2.push("P");  // Phép
    h2.push("Hưởng BHXH");
    h2.push("Làm thêm NT");
    h2.push("Làm thêm T7 & CN");
    h2.push("Làm thêm NL");
    wsData.push(h2);

    // Row 8: Day of Week
    const h3 = ["", "", ""];
    daysArray.forEach(d => h3.push(getDayOfWeekStr(d)));
    // Empty cells for summary columns (they span 2 rows usually, but we keep it simple or fill blank)
    h3.push("", "", "", "", "", "", "", ""); 
    wsData.push(h3);

    // --- DATA ROWS ---
    let sttCounter = 1;
    filteredDepartments.forEach((dept, index) => {
        const deptEmployees = employees.filter(e => e.department === dept);
        if (deptEmployees.length === 0) return;

        // Department Title Row
        const deptRow = [`${toRoman(index + 1)}. ${dept.toUpperCase()}`];
        wsData.push(deptRow);

        deptEmployees.forEach((emp) => {
            const row = [
                sttCounter++,
                emp.name,
                emp.jobTitle || emp.role
            ];

            let totalWork = 0;
            let totalHolidayWork = 0;
            let totalNL = 0; // Nghỉ lễ
            let totalP = 0;  // Phép
            let totalBHXH = 0; // Ốm/Thai sản

            daysArray.forEach(day => {
                const cell = getDayCellData(emp.id, day);
                row.push(cell.text);

                // Calculations
                if (cell.type === 'H') totalWork += 1;
                if (cell.type === 'H/2') totalWork += 0.5;
                if (cell.type === 'L') totalNL += 1; // Nghỉ lễ tính vào cột NL
                if (cell.type === 'P') totalP += 1;
                if (cell.type === 'O') totalBHXH += 1;
            });

            // Summary Data
            row.push(totalWork);       // Tổng số ngày công
            row.push(totalHolidayWork); // Trong đó làm lễ (Chưa có logic tracking, để 0)
            row.push(totalNL);         // NL
            row.push(totalP);          // P
            row.push(totalBHXH);       // BHXH
            row.push(0);               // Làm thêm NT (Placeholder)
            row.push(0);               // Làm thêm T7/CN
            row.push(0);               // Làm thêm NL

            wsData.push(row);
        });
    });

    // --- FOOTER ---
    wsData.push([]);
    wsData.push(["***Ghi chú:"]);
    wsData.push(["- Công làm việc giờ hành chính", "H", "", "- Nghỉ phép", "P", "", "- Nghỉ ốm", "O", "", "- Nghỉ không lương", "KL"]);
    wsData.push(["- Công làm việc sáng T7", "H/2", "", "- Nghỉ 1/2 phép", "1/2", "", "- Nghỉ lễ", "NL/L"]);
    wsData.push([]);
    wsData.push([]);
    
    // Signatures
    const sigRow = ["NGƯỜI CHẤM CÔNG", "", "", "", "", "", "", "", "", "", "PHỤ TRÁCH BỘ PHẬN", "", "", "", "", "", "", "TRƯỞNG ĐƠN VỊ"];
    // Adjust signature spacing roughly based on month days
    wsData.push(sigRow);
    wsData.push([]);
    wsData.push([]);
    wsData.push([]); 
    const dateRow = Array(daysInMonth + 3 + 8).fill("");
    dateRow[dateRow.length - 4] = `Ngày ${daysInMonth} tháng ${month + 1} năm ${year}`;
    wsData.push(dateRow);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // --- STYLING (MERGES) ---
    // !merges expects { s: {r, c}, e: {r, c} } (Start/End Row/Col, 0-indexed)
    const merges = [
        // Title
        { s: { r: 2, c: 6 }, e: { r: 2, c: 15 } }, 
        { s: { r: 3, c: 6 }, e: { r: 3, c: 15 } },
        
        // Main Headers (Row 6)
        { s: { r: 5, c: 0 }, e: { r: 7, c: 0 } }, // STT (Row 6,7,8)
        { s: { r: 5, c: 1 }, e: { r: 7, c: 1 } }, // Name
        { s: { r: 5, c: 2 }, e: { r: 7, c: 2 } }, // Title
        
        { s: { r: 5, c: 3 }, e: { r: 5, c: 3 + daysInMonth - 1 } }, // NGÀY TRONG THÁNG (Span all days)
        
        // Summary Headers (Row 6 group headers)
        { s: { r: 5, c: 3 + daysInMonth }, e: { r: 5, c: 3 + daysInMonth + 1 } }, // Số công làm việc (Span 2)
        { s: { r: 5, c: 3 + daysInMonth + 2 }, e: { r: 5, c: 3 + daysInMonth + 3 } }, // Số công học, phép... (Span 2)
        { s: { r: 5, c: 3 + daysInMonth + 4 }, e: { r: 7, c: 3 + daysInMonth + 4 } }, // BHXH (Span down 3 rows for simplicity or 2?) Let's span down
        { s: { r: 5, c: 3 + daysInMonth + 5 }, e: { r: 5, c: 3 + daysInMonth + 7 } }, // Làm thêm (Span 3)

        // Sub Headers (Row 7 spans down to 8 for simple cols)
        { s: { r: 6, c: 3 + daysInMonth }, e: { r: 7, c: 3 + daysInMonth } }, // Tổng số ngày công
        { s: { r: 6, c: 3 + daysInMonth + 1 }, e: { r: 7, c: 3 + daysInMonth + 1 } }, // Làm lễ
        { s: { r: 6, c: 3 + daysInMonth + 2 }, e: { r: 7, c: 3 + daysInMonth + 2 } }, // NL
        { s: { r: 6, c: 3 + daysInMonth + 3 }, e: { r: 7, c: 3 + daysInMonth + 3 } }, // P
        
        // OT Sub Headers
        { s: { r: 6, c: 3 + daysInMonth + 5 }, e: { r: 7, c: 3 + daysInMonth + 5 } }, // NT
        { s: { r: 6, c: 3 + daysInMonth + 6 }, e: { r: 7, c: 3 + daysInMonth + 6 } }, // T7/CN
        { s: { r: 6, c: 3 + daysInMonth + 7 }, e: { r: 7, c: 3 + daysInMonth + 7 } }, // NL
    ];

    ws['!merges'] = merges;
    // Column Widths
    ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 20 }, // STT, Name, Title
        ...Array(daysInMonth).fill({ wch: 4 }), // Days
        { wch: 8 }, { wch: 8 }, { wch: 5 }, { wch: 5 }, { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 6 } // Summaries
    ];

    XLSX.utils.book_append_sheet(wb, ws, "BangChamCong");
    XLSX.writeFile(wb, `BangChamCong_Thang${month + 1}_${year}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
             <h2 className="text-xl font-bold text-gray-800">
                Tháng {month + 1} / {year}
             </h2>
             <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Bảng chấm công</p>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
           {/* Dept Filter */}
           <div className="flex items-center gap-2 w-full md:w-auto bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                <Building className="w-4 h-4 text-gray-500 ml-2" />
                <select 
                    className="bg-transparent text-sm outline-none w-full md:w-48 text-gray-700 font-medium"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                >
                    <option value="ALL">Toàn công ty</option>
                    {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
           </div>

           <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Row 1: Main Headers */}
              <tr className="bg-gray-100 text-gray-700 text-center">
                <th rowSpan={3} className="sticky left-0 z-30 bg-gray-100 p-2 border border-gray-300 min-w-[40px]">STT</th>
                <th rowSpan={3} className="sticky left-[40px] z-30 bg-gray-100 p-2 border border-gray-300 min-w-[150px] text-left">Họ và tên</th>
                <th rowSpan={3} className="sticky left-[190px] z-30 bg-gray-100 p-2 border border-gray-300 min-w-[120px] text-left">Chức danh</th>
                <th colSpan={daysInMonth} className="border border-gray-300 py-1">NGÀY TRONG THÁNG</th>
                <th colSpan={2} className="border border-gray-300 py-1 bg-blue-50">Số công làm việc</th>
                <th colSpan={2} className="border border-gray-300 py-1 bg-green-50">Nghỉ hưởng lương</th>
                <th rowSpan={3} className="border border-gray-300 py-1 bg-orange-50 w-[60px]">Hưởng BHXH</th>
                <th colSpan={3} className="border border-gray-300 py-1 bg-gray-50">Làm thêm giờ</th>
              </tr>
              
              {/* Row 2: Sub Headers (Date Numbers & Summary Categories) */}
              <tr className="bg-gray-50 text-gray-600 text-center">
                  {daysArray.map(day => (
                    <th key={day} className={`border border-gray-300 min-w-[28px] font-medium ${isWeekend(day) ? 'text-red-500' : ''}`}>
                        {day}
                    </th>
                  ))}
                  <th rowSpan={2} className="border border-gray-300 bg-blue-50 min-w-[50px] font-medium">Tổng số</th>
                  <th rowSpan={2} className="border border-gray-300 bg-blue-50 min-w-[50px] font-medium">Làm lễ</th>
                  <th rowSpan={2} className="border border-gray-300 bg-green-50 min-w-[40px] font-medium">NL</th>
                  <th rowSpan={2} className="border border-gray-300 bg-green-50 min-w-[40px] font-medium">P</th>
                  <th rowSpan={2} className="border border-gray-300 min-w-[40px] font-medium">NT</th>
                  <th rowSpan={2} className="border border-gray-300 min-w-[40px] font-medium">T7/CN</th>
                  <th rowSpan={2} className="border border-gray-300 min-w-[40px] font-medium">Lễ</th>
              </tr>

              {/* Row 3: Day of Week */}
              <tr className="bg-gray-50 text-[9px] text-gray-500 text-center">
                  {daysArray.map(day => (
                    <th key={day} className={`border border-gray-300 p-0.5 ${isWeekend(day) ? 'bg-orange-50 text-red-500' : ''}`}>
                        {getDayOfWeekStr(day)}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {filteredDepartments.map((dept, index) => {
                const deptEmployees = employees.filter(e => e.department === dept);
                if (deptEmployees.length === 0) return null;

                return (
                  <React.Fragment key={dept}>
                    <tr className="bg-blue-50/50">
                      <td colSpan={3 + daysInMonth + 8} className="p-2 border border-gray-300 font-bold text-blue-800 uppercase text-xs sticky left-0 z-20 bg-blue-100">
                        {toRoman(index + 1)}. {dept}
                      </td>
                    </tr>
                    
                    {deptEmployees.map((emp, empIdx) => {
                      let totalWork = 0;
                      let totalP = 0;
                      let totalNL = 0;
                      let totalBHXH = 0;
                      
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-white p-2 border border-gray-300 text-center">{empIdx + 1}</td>
                          <td className="sticky left-[40px] z-10 bg-white p-2 border border-gray-300 font-medium text-gray-900 truncate max-w-[150px]">{emp.name}</td>
                          <td className="sticky left-[190px] z-10 bg-white p-2 border border-gray-300 text-gray-600 truncate max-w-[120px]">{emp.jobTitle || emp.role}</td>
                          
                          {daysArray.map(day => {
                            const cell = getDayCellData(emp.id, day);
                            
                            // Calculate Display Totals
                            if (cell.type === 'H') totalWork += 1;
                            if (cell.type === 'H/2') totalWork += 0.5;
                            if (cell.type === 'P') totalP += 1;
                            if (cell.type === 'L') totalNL += 1;
                            if (cell.type === 'O') totalBHXH += 1;
                            
                            return (
                              <td 
                                key={day} 
                                className={`border border-gray-300 text-center h-8 w-7 text-[10px]
                                  ${cell.class}
                                  ${isWeekend(day) && !cell.text ? 'bg-orange-50/30' : ''}
                                `}
                              >
                                {cell.text}
                              </td>
                            );
                          })}
                          
                          {/* Summary Cells */}
                          <td className="border border-gray-300 text-center font-bold bg-blue-50 text-gray-800">{totalWork}</td>
                          <td className="border border-gray-300 text-center bg-blue-50 text-gray-400">0</td>
                          <td className="border border-gray-300 text-center bg-green-50 text-gray-600">{totalNL || ''}</td>
                          <td className="border border-gray-300 text-center bg-green-50 text-gray-600">{totalP || ''}</td>
                          <td className="border border-gray-300 text-center bg-orange-50 text-gray-600">{totalBHXH || ''}</td>
                          <td className="border border-gray-300 text-center text-gray-400"></td>
                          <td className="border border-gray-300 text-center text-gray-400"></td>
                          <td className="border border-gray-300 text-center text-gray-400"></td>
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
      
      {/* Footer Legend */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-600 mt-4">
         <h3 className="font-bold mb-2 uppercase text-gray-700">Ghi chú ký hiệu chấm công:</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-gray-800 bg-gray-100 rounded">H</span> Làm hành chính (1 công)</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-gray-800 bg-gray-100 rounded">H/2</span> Làm sáng T7 (0.5 công)</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-blue-700 bg-blue-100 rounded">P</span> Nghỉ Phép năm</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-orange-700 bg-orange-100 rounded">O</span> Nghỉ Ốm / Thai sản</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-red-600 bg-red-50 rounded">L</span> Nghỉ Lễ</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-gray-700 bg-gray-200 rounded">KL</span> Nghỉ Không lương</div>
         </div>
      </div>
    </div>
  );
};