
import React, { useState } from 'react';
import { Employee, LeaveRequest, LeaveStatus, LeaveType, PublicHoliday, ManualTimeEntry, Role } from '../types';
import { ChevronLeft, ChevronRight, Download, Building, Printer, Edit2, X, Trash2 } from 'lucide-react';

declare const XLSX: any;

interface MonthlyReportProps {
  currentUser: Employee;
  employees: Employee[];
  requests: LeaveRequest[];
  departments: string[];
  companyName: string;
  holidays: PublicHoliday[];
  manualEntries: ManualTimeEntry[];
  onUpdateEntry: (entry: ManualTimeEntry) => void;
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

const isDeptHead = (jobTitle?: string) => {
    if (!jobTitle) return false;
    const t = jobTitle.toLowerCase();
    return (t.includes('trưởng ban') || t.includes('kế toán trưởng') || t.includes('giám đốc ban')) && !t.includes('phó');
};

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ 
    currentUser,
    employees, 
    requests, 
    departments, 
    companyName, 
    holidays,
    manualEntries,
    onUpdateEntry
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [editingCell, setEditingCell] = useState<{empId: string, day: number, x: number, y: number} | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
      const dateStr = getDateStr(day);
      
      // 0. Manual Entry
      const entryKey = `${employeeId}_${dateStr}`;
      const manualEntry = manualEntries.find(e => e.id === entryKey);
      if (manualEntry) {
           let cssClass = '';
           switch(manualEntry.type) {
               case 'L': cssClass = 'bg-red-50 text-red-600 font-bold'; break;
               case 'P': cssClass = 'bg-blue-50 text-blue-600 font-bold'; break; 
               case 'O': cssClass = 'bg-orange-50 text-orange-600 font-bold'; break;
               case 'KL': cssClass = 'bg-gray-100 text-gray-600 font-bold'; break;
               default: cssClass = '';
           }
           return { text: manualEntry.type, class: cssClass, val: manualEntry.value, type: manualEntry.type, isManual: true };
      }

      // 1. Holiday
      if (isHoliday(day)) return { text: 'L', class: 'bg-red-50 text-red-600 font-bold', val: 0, type: 'L', isManual: false };
      
      // 2. Request
      const leaveType = getLeaveStatusForDay(employeeId, day);
      if (leaveType) {
          switch (leaveType) {
            case LeaveType.VACATION: 
            case LeaveType.PERSONAL:
                return { text: 'P', class: 'bg-blue-50 text-blue-600 font-bold', val: 0, type: 'P', isManual: false };
            case LeaveType.SICK:
                return { text: 'O', class: 'bg-orange-50 text-orange-600 font-bold', val: 0, type: 'O', isManual: false };
            case LeaveType.UNPAID: 
                return { text: 'KL', class: 'bg-gray-100 text-gray-600 font-bold', val: 0, type: 'KL', isManual: false };
            default: 
                return { text: 'P', class: 'bg-blue-50 text-blue-600 font-bold', val: 0, type: 'P', isManual: false };
          }
      }

      // 3. Weekend
      if (isSunday(day)) return { text: '', class: 'bg-gray-200', val: 0, type: 'SUN', isManual: false };
      if (isSaturday(day)) return { text: 'H/2', class: '', val: 0.5, type: 'H/2', isManual: false };
      
      // 4. Working Day
      return { text: 'H', class: '', val: 1, type: 'H', isManual: false };
  };

  const canEditCell = (targetEmp: Employee) => {
      if (currentUser.role === Role.BOD) return true;
      if (currentUser.department === targetEmp.department && isDeptHead(currentUser.jobTitle)) return true;
      return false;
  };

  const handleCellClick = (e: React.MouseEvent, emp: Employee, day: number) => {
      if (!canEditCell(emp)) return;
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setEditingCell({
          empId: emp.id,
          day,
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY
      });
  };

  const submitManualEntry = (type: string, value: number) => {
      if (!editingCell) return;
      const dateStr = getDateStr(editingCell.day);
      const id = `${editingCell.empId}_${dateStr}`;
      
      onUpdateEntry({
          id,
          employeeId: editingCell.empId,
          date: dateStr,
          type,
          value
      });
      setEditingCell(null);
  };

  const changeMonth = (delta: number) => setCurrentDate(new Date(year, month + delta, 1));
  const filteredDepartments = selectedDept === 'ALL' ? departments : [selectedDept];

  const exportData = () => {
    if (typeof XLSX === 'undefined') {
      alert("Thư viện Excel chưa tải xong. Vui lòng tải lại trang.");
      return;
    }

    const wsData: any[][] = [];
    
    wsData.push([companyName.toUpperCase()]);
    wsData.push([`ĐƠN VỊ: ${selectedDept === 'ALL' ? 'TOÀN CÔNG TY' : selectedDept.toUpperCase()}`]);
    const titleRow = Array(15).fill(""); 
    titleRow[6] = "BẢNG CHẤM CÔNG";
    wsData.push(titleRow);
    const monthRow = Array(15).fill("");
    monthRow[6] = `Tháng ${month + 1} năm ${year}`;
    wsData.push(monthRow);
    wsData.push([]); 

    const h1 = ["STT", "Họ và tên", "Chức danh"];
    daysArray.forEach(() => h1.push("NGÀY TRONG THÁNG"));
    h1.push("Số công làm việc", "", "Số công học, phép, nghỉ hưởng lương", "", "", "Số công nghỉ hưởng BHXH", "Số giờ làm thêm", "", "");
    wsData.push(h1);

    const h2 = ["", "", ""]; 
    daysArray.forEach(d => h2.push(String(d).padStart(2, '0')));
    h2.push("Tổng số ngày công");
    h2.push("Trong đó làm ngày lễ");
    h2.push("NL"); 
    h2.push("P");  
    h2.push("KL");       
    h2.push("Hưởng BHXH");
    h2.push("NT");
    h2.push("T7/CN");
    h2.push("NL");
    wsData.push(h2);

    const h3 = ["", "", ""];
    daysArray.forEach(d => h3.push(getDayOfWeekStr(d)));
    h3.push("", "", "", "", "", "", "", "", ""); 
    wsData.push(h3);

    let sttCounter = 1;
    filteredDepartments.forEach((dept, index) => {
        const deptEmployees = employees.filter(e => e.department === dept);
        if (deptEmployees.length === 0) return;

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
            let totalNL = 0; 
            let totalP = 0;  
            let totalKL = 0;
            let totalBHXH = 0;

            daysArray.forEach(day => {
                const cell = getDayCellData(emp.id, day);
                row.push(cell.text);

                if (cell.type === 'H') totalWork += 1;
                if (cell.type === 'H/2') totalWork += 0.5;
                if (cell.type === 'L') totalNL += 1; 
                if (cell.type === 'P') totalP += 1;
                if (cell.type === 'KL') totalKL += 1;
                if (cell.type === 'O') totalBHXH += 1;
            });

            row.push(totalWork);       
            row.push(totalHolidayWork);
            row.push(totalNL);
            row.push(totalP);          
            row.push(totalKL);
            row.push(totalBHXH);       
            row.push(0);               
            row.push(0);               
            row.push(0);               

            wsData.push(row);
        });
    });

    wsData.push([]);
    wsData.push(["***Ghi chú:"]);
    wsData.push(["- Công làm việc giờ hành chính", "H", "", "- Nghỉ phép", "P", "", "- Nghỉ ốm", "O", "", "- Nghỉ không lương", "KL"]);
    wsData.push(["- Công làm việc sáng T7", "H/2", "", "- Nghỉ lễ", "L"]);
    wsData.push([]);
    wsData.push([]);
    
    const sigRow = ["NGƯỜI CHẤM CÔNG", "", "", "", "", "", "", "", "", "", "PHỤ TRÁCH BỘ PHẬN", "", "", "", "", "", "", "TRƯỞNG ĐƠN VỊ"];
    wsData.push(sigRow);
    wsData.push([]);
    wsData.push([]);
    wsData.push([]); 
    const dateRow = Array(daysInMonth + 3 + 9).fill("");
    dateRow[dateRow.length - 4] = `Ngày ${daysInMonth} tháng ${month + 1} năm ${year}`;
    wsData.push(dateRow);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const merges = [
        { s: { r: 2, c: 6 }, e: { r: 2, c: 15 } }, 
        { s: { r: 3, c: 6 }, e: { r: 3, c: 15 } },
        { s: { r: 5, c: 0 }, e: { r: 7, c: 0 } }, 
        { s: { r: 5, c: 1 }, e: { r: 7, c: 1 } }, 
        { s: { r: 5, c: 2 }, e: { r: 7, c: 2 } }, 
        { s: { r: 5, c: 3 }, e: { r: 5, c: 3 + daysInMonth - 1 } },
        { s: { r: 5, c: 3 + daysInMonth }, e: { r: 5, c: 3 + daysInMonth + 1 } }, 
        { s: { r: 5, c: 3 + daysInMonth + 2 }, e: { r: 5, c: 3 + daysInMonth + 4 } }, 
        { s: { r: 5, c: 3 + daysInMonth + 5 }, e: { r: 7, c: 3 + daysInMonth + 5 } }, 
        { s: { r: 5, c: 3 + daysInMonth + 6 }, e: { r: 5, c: 3 + daysInMonth + 8 } },
        
        { s: { r: 6, c: 3 + daysInMonth }, e: { r: 7, c: 3 + daysInMonth } }, 
        { s: { r: 6, c: 3 + daysInMonth + 1 }, e: { r: 7, c: 3 + daysInMonth + 1 } },
        { s: { r: 6, c: 3 + daysInMonth + 2 }, e: { r: 7, c: 3 + daysInMonth + 2 } },
        { s: { r: 6, c: 3 + daysInMonth + 3 }, e: { r: 7, c: 3 + daysInMonth + 3 } },
        { s: { r: 6, c: 3 + daysInMonth + 4 }, e: { r: 7, c: 3 + daysInMonth + 4 } },
        { s: { r: 6, c: 3 + daysInMonth + 6 }, e: { r: 7, c: 3 + daysInMonth + 6 } },
        { s: { r: 6, c: 3 + daysInMonth + 7 }, e: { r: 7, c: 3 + daysInMonth + 7 } },
        { s: { r: 6, c: 3 + daysInMonth + 8 }, e: { r: 7, c: 3 + daysInMonth + 8 } },
    ];

    ws['!merges'] = merges;
    ws['!cols'] = [
        { wch: 5 }, { wch: 25 }, { wch: 20 }, 
        ...Array(daysInMonth).fill({ wch: 4 }), 
        { wch: 8 }, { wch: 8 }, { wch: 5 }, { wch: 5 }, { wch: 8 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 } 
    ];

    XLSX.utils.book_append_sheet(wb, ws, "BangChamCong");
    XLSX.writeFile(wb, `BangChamCong_Thang${month + 1}_${year}.xlsx`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative" onClick={() => setEditingCell(null)}>
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
              <tr className="bg-gray-100 text-gray-700 text-center">
                <th rowSpan={3} className="sticky left-0 z-30 bg-gray-100 p-2 border border-gray-300 min-w-[40px]">STT</th>
                <th rowSpan={3} className="sticky left-[40px] z-30 bg-gray-100 p-2 border border-gray-300 min-w-[150px] text-left">Họ và tên</th>
                <th rowSpan={3} className="sticky left-[190px] z-30 bg-gray-100 p-2 border border-gray-300 min-w-[120px] text-left">Chức danh</th>
                <th colSpan={daysInMonth} className="border border-gray-300 py-1">NGÀY TRONG THÁNG</th>
                <th colSpan={2} className="border border-gray-300 py-1 bg-blue-50">Số công làm việc</th>
                <th colSpan={3} className="border border-gray-300 py-1 bg-green-50">Nghỉ</th>
                <th rowSpan={3} className="border border-gray-300 py-1 bg-orange-50 w-[60px]">Hưởng BHXH</th>
                <th colSpan={3} className="border border-gray-300 py-1 bg-gray-50">Làm thêm giờ</th>
              </tr>
              
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
                  <th rowSpan={2} className="border border-gray-300 bg-green-50 min-w-[40px] font-medium">KL</th>
                  <th rowSpan={2} className="border border-gray-300 min-w-[40px] font-medium">NT</th>
                  <th rowSpan={2} className="border border-gray-300 min-w-[40px] font-medium">T7/CN</th>
                  <th rowSpan={2} className="border border-gray-300 min-w-[40px] font-medium">NL</th>
              </tr>

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
                      <td colSpan={3 + daysInMonth + 9} className="p-2 border border-gray-300 font-bold text-blue-800 uppercase text-xs sticky left-0 z-20 bg-blue-100">
                        {toRoman(index + 1)}. {dept}
                      </td>
                    </tr>
                    
                    {deptEmployees.map((emp, empIdx) => {
                      let totalWork = 0;
                      let totalP = 0;
                      let totalNL = 0;
                      let totalKL = 0;
                      let totalBHXH = 0;
                      
                      const canEdit = canEditCell(emp);

                      return (
                        <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                          <td className="sticky left-0 z-10 bg-white p-2 border border-gray-300 text-center">{empIdx + 1}</td>
                          <td className="sticky left-[40px] z-10 bg-white p-2 border border-gray-300 font-medium text-gray-900 truncate max-w-[150px]">{emp.name}</td>
                          <td className="sticky left-[190px] z-10 bg-white p-2 border border-gray-300 text-gray-600 truncate max-w-[120px]">{emp.jobTitle || emp.role}</td>
                          
                          {daysArray.map(day => {
                            const cell = getDayCellData(emp.id, day);
                            
                            if (cell.type === 'H') totalWork += 1;
                            if (cell.type === 'H/2') totalWork += 0.5;
                            if (cell.type === 'P') totalP += 1;
                            if (cell.type === 'L') totalNL += 1;
                            if (cell.type === 'KL') totalKL += 1;
                            if (cell.type === 'O') totalBHXH += 1;
                            
                            return (
                              <td 
                                key={day} 
                                onClick={(e) => handleCellClick(e, emp, day)}
                                className={`border border-gray-300 text-center h-8 w-7 text-[10px] select-none
                                  ${cell.class}
                                  ${isWeekend(day) && !cell.text ? 'bg-orange-50/30' : ''}
                                  ${canEdit ? 'cursor-pointer hover:bg-yellow-50 hover:ring-1 hover:ring-yellow-400' : ''}
                                  ${cell.isManual ? 'ring-1 ring-purple-300 relative' : ''}
                                `}
                                title={canEdit ? 'Click để sửa' : ''}
                              >
                                {cell.text}
                                {cell.isManual && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-purple-500 rounded-bl-full"></div>}
                              </td>
                            );
                          })}
                          
                          <td className="border border-gray-300 text-center font-bold bg-blue-50 text-gray-800">{totalWork}</td>
                          <td className="border border-gray-300 text-center bg-blue-50 text-gray-400">0</td>
                          <td className="border border-gray-300 text-center bg-green-50 text-gray-600">{totalNL || ''}</td>
                          <td className="border border-gray-300 text-center bg-green-50 text-gray-600">{totalP || ''}</td>
                          <td className="border border-gray-300 text-center bg-gray-50 text-gray-600">{totalKL || ''}</td>
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
      
      {editingCell && (
          <div 
             className="fixed bg-white shadow-xl border border-gray-200 rounded-lg p-2 z-50 flex gap-1 animate-in zoom-in-95 duration-100"
             style={{ 
                 left: Math.min(editingCell.x, window.innerWidth - 300), 
                 top: editingCell.y + 5
             }}
             onClick={(e) => e.stopPropagation()}
          >
              <button onClick={() => submitManualEntry('H', 1)} className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800" title="Đi làm (H)">H</button>
              <button onClick={() => submitManualEntry('H/2', 0.5)} className="w-8 h-8 rounded bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800" title="Nửa công (H/2)">H/2</button>
              <button onClick={() => submitManualEntry('P', 0)} className="w-8 h-8 rounded bg-blue-100 hover:bg-blue-200 text-xs font-bold text-blue-700" title="Phép năm (P)">P</button>
              <button onClick={() => submitManualEntry('O', 0)} className="w-8 h-8 rounded bg-orange-100 hover:bg-orange-200 text-xs font-bold text-orange-600" title="Nghỉ Ốm (O)">O</button>
              <button onClick={() => submitManualEntry('L', 0)} className="w-8 h-8 rounded bg-red-100 hover:bg-red-200 text-xs font-bold text-red-600" title="Nghỉ Lễ (L)">L</button>
              <button onClick={() => submitManualEntry('KL', 0)} className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-600" title="Không lương (KL)">KL</button>
              <div className="w-px bg-gray-300 mx-1"></div>
              <button onClick={() => submitManualEntry('DELETE', 0)} className="w-8 h-8 rounded bg-red-50 hover:bg-red-100 text-xs font-bold text-red-500" title="Xóa thủ công (Về mặc định)">
                  <X className="w-4 h-4 mx-auto" />
              </button>
          </div>
      )}
      
      <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-600 mt-4">
         <h3 className="font-bold mb-2 uppercase text-gray-700">Ghi chú ký hiệu chấm công:</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-4">
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-gray-800 bg-gray-100 rounded">H</span> Làm hành chính (1 công)</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-gray-800 bg-gray-100 rounded">H/2</span> Làm sáng T7 (0.5 công)</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-blue-700 bg-blue-100 rounded">P</span> Nghỉ Phép (Phép năm/Việc riêng)</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-orange-600 bg-orange-100 rounded">O</span> Nghỉ Ốm / Thai sản</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-red-600 bg-red-50 rounded">L</span> Nghỉ Lễ</div>
            <div className="flex items-center gap-2"><span className="w-8 text-center font-mono font-bold text-gray-700 bg-gray-200 rounded">KL</span> Nghỉ Không lương</div>
         </div>
      </div>
    </div>
  );
};
