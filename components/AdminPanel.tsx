
import React, { useState } from 'react';
import { Employee, Role, PublicHoliday, LeaveRequest } from '../types';
import { Upload, Plus, Users, AlertCircle, Download, Trash2, RotateCcw, CopyPlus, Settings, Image as ImageIcon, Loader2, RefreshCw, Edit, X, CalendarCheck, Save, FolderUp } from 'lucide-react';

const getXLSX = () => (window as any).XLSX;

interface AdminPanelProps {
  currentUser: Employee;
  employees: Employee[];
  departments: string[];
  holidays: PublicHoliday[];
  requests: LeaveRequest[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onImportCSV: (emps: Employee[], depts: string[], mode: 'replace' | 'append') => void;
  onDeleteEmployee: (id: string) => void;
  onAddDepartment: (dept: string) => void;
  onAddHoliday: (holiday: PublicHoliday) => void;
  onDeleteHoliday: (id: string) => void;
  companyInfo: { name: string; logo: string };
  onUpdateCompanyInfo: (name: string, logo: string) => void;
  onResetData: () => void;
  onRestoreSystem: (data: any) => void;
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

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  currentUser,
  employees, 
  departments, 
  holidays,
  requests,
  onAddEmployee, 
  onUpdateEmployee,
  onImportCSV,
  onDeleteEmployee,
  onAddDepartment,
  onAddHoliday,
  onDeleteHoliday,
  companyInfo,
  onUpdateCompanyInfo,
  onResetData,
  onRestoreSystem
}) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'import' | 'settings' | 'holidays'>('manual');
  
  // Manual Add State
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState(departments[0] || '');
  const [newRole, setNewRole] = useState<Role>(Role.STAFF);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [isNewDeptMode, setIsNewDeptMode] = useState(false);
  const [customDept, setCustomDept] = useState('');

  // Edit State
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.STAFF);
  const [editIsNewDept, setEditIsNewDept] = useState(false);
  const [editCustomDept, setEditCustomDept] = useState('');

  // Holiday State
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // CSV/Excel Import State
  const [importError, setImportError] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings State
  const [editCompanyName, setEditCompanyName] = useState(companyInfo.name);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDept = isNewDeptMode ? customDept.trim() : newDept;
    
    if (!finalDept) {
      alert("Vui lòng nhập tên phòng ban");
      return;
    }

    if (isNewDeptMode && !departments.includes(finalDept)) {
      onAddDepartment(finalDept);
    }

    const newEmp: Employee = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName,
      department: finalDept,
      role: newRole,
      jobTitle: newJobTitle || (newRole === Role.BOD ? 'Lãnh đạo' : newRole === Role.MANAGER ? 'Quản lý' : 'Nhân viên'),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
    };

    onAddEmployee(newEmp);
    setNewName('');
    setNewJobTitle('');
    alert('Đã thêm nhân viên thành công!');
  };

  const handleHolidaySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newHolidayDate || !newHolidayName) return;
      onAddHoliday({
          id: Math.random().toString(36).substr(2, 9),
          date: newHolidayDate,
          name: newHolidayName
      });
      setNewHolidayName('');
      setNewHolidayDate('');
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditDept(emp.department);
    setEditJobTitle(emp.jobTitle || '');
    setEditRole(emp.role);
    setEditIsNewDept(false);
    setEditCustomDept('');
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingEmp) return;

      const finalDept = editIsNewDept ? editCustomDept.trim() : editDept;
      if (!finalDept) {
          alert("Vui lòng nhập phòng ban");
          return;
      }

      if (editIsNewDept && !departments.includes(finalDept)) {
          onAddDepartment(finalDept);
      }

      const updatedEmp: Employee = {
          ...editingEmp,
          name: editName,
          department: finalDept,
          jobTitle: editJobTitle,
          role: editRole
      };

      onUpdateEmployee(updatedEmp);
      setEditingEmp(null); // Close modal
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setIsProcessing(true);

    setTimeout(() => {
        if (importMode === 'replace') {
            if (!window.confirm("CẢNH BÁO: Chế độ 'Thay thế' sẽ XÓA TOÀN BỘ dữ liệu cũ (nhân viên & phòng ban) để nhập theo file mới. Bạn có chắc chắn không?")) {
                e.target.value = ''; 
                setIsProcessing(false);
                return;
            }
        }

        const XLSX = getXLSX();
        if (!XLSX) {
            setImportError("Thư viện xử lý Excel chưa tải xong. Vui lòng tải lại trang.");
            setIsProcessing(false);
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                processExcelData(jsonData);
            } catch (error) {
                console.error(error);
                setImportError("Lỗi đọc file. Vui lòng đảm bảo file đúng định dạng Excel (.xlsx, .xls).");
            } finally {
                setIsProcessing(false);
                e.target.value = ''; 
            }
        };
        
        reader.readAsArrayBuffer(file);
    }, 100);
  };

  const processExcelData = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      setImportError("File trống hoặc không có dữ liệu.");
      return;
    }

    const newEmployees: Employee[] = [];
    const orderedDepartments: string[] = []; 
    const seenDepartments = new Set<string>();
    let currentContextDept = "";
    
    let colMap = { stt: 0, dept: 1, name: 2, role: 3 };
    let headerRowIndex = -1;

    for (let i = 0; i < Math.min(rows.length, 30); i++) {
        const row = rows[i];
        if (!Array.isArray(row)) continue;
        const rowStr = row.map(c => String(c).toLowerCase().trim());
        const nameIdx = rowStr.findIndex(c => c.includes('họ và tên') || c.includes('họ tên') || c === 'name');
        
        if (nameIdx !== -1) {
            headerRowIndex = i;
            colMap.name = nameIdx;
            const deptIdx = rowStr.findIndex(c => c.includes('phòng') || c.includes('ban') || c.includes('đơn vị') || c === 'dept');
            if (deptIdx !== -1) colMap.dept = deptIdx;
            const roleIdx = rowStr.findIndex(c => c.includes('chức') || c.includes('vụ') || c === 'role');
            if (roleIdx !== -1) colMap.role = roleIdx;
            const sttIdx = rowStr.findIndex(c => c === 'stt' || c === 'no' || c === '#');
            if (sttIdx !== -1) colMap.stt = sttIdx;
            break;
        }
    }

    const addDepartment = (deptName: string) => {
        const cleanName = deptName.trim();
        if (cleanName && !seenDepartments.has(cleanName)) {
            seenDepartments.add(cleanName);
            orderedDepartments.push(cleanName);
        }
        return cleanName;
    };

    for (let i = 0; i < rows.length; i++) {
        if (headerRowIndex !== -1 && i <= headerRowIndex) continue;
        const row = rows[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const rawStt = String(row[colMap.stt] || '').trim();
        const rawDept = String(row[colMap.dept] || '').trim();
        const rawName = String(row[colMap.name] || '').trim();
        const rawRole = String(row[colMap.role] || '').trim(); 

        if (!rawStt && !rawDept && !rawName && !rawRole) continue;
        if (rawName.toLowerCase().includes('họ và tên')) continue;

        const isRoman = /^[IVXLCDM]+\.?\s*$/i.test(rawStt);
        const hasDeptText = (rawDept.length > 0 || rawStt.length > 2) && !rawName;

        if (isRoman || hasDeptText) {
            let deptName = rawDept || rawStt;
            deptName = deptName.replace(/^([IVX0-9A-Z]+)(\.|\:|\))\s*/i, '').trim();
            const ignoreKeywords = ['tổng cộng', 'danh sách', 'ngày', 'ký tên', 'xác nhận'];
            if (deptName.length > 2 && !ignoreKeywords.some(k => deptName.toLowerCase().includes(k))) {
                currentContextDept = addDepartment(deptName);
            }
            continue; 
        }

        if (rawName) {
            let finalDept = rawDept.trim();
            if (!finalDept || finalDept === currentContextDept) {
                finalDept = currentContextDept;
            }
            if (!finalDept) finalDept = "Chưa phân loại";
            finalDept = addDepartment(finalDept);

            let sysRole = Role.STAFF;
            const rLower = rawRole.toLowerCase();
            if (rLower.includes('tổng giám đốc') || rLower.includes('chủ tịch') || rLower.includes('hội đồng quản trị')) {
                sysRole = Role.BOD;
            } else if (
                rLower.includes('trưởng') || rLower.includes('phó') || rLower.includes('giám đốc') || rLower.includes('quản lý') || rLower.includes('kế toán trưởng')
            ) {
                sysRole = Role.MANAGER;
            }

            const isDuplicateInFile = newEmployees.some(e => e.name === rawName && e.department === finalDept);
            
            if (!isDuplicateInFile) {
                newEmployees.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: rawName,
                    department: finalDept,
                    role: sysRole,
                    jobTitle: rawRole || (sysRole === Role.BOD ? 'Lãnh đạo' : sysRole === Role.MANAGER ? 'Quản lý' : 'Nhân viên'),
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rawName)}`
                });
            }
        }
    }

    if (newEmployees.length > 0) {
        onImportCSV(newEmployees, orderedDepartments, importMode);
        setImportError('');
        const msg = importMode === 'replace' 
           ? `Thành công! Đã thay thế bằng ${newEmployees.length} nhân viên thuộc ${orderedDepartments.length} phòng ban.` 
           : `Thành công! Đã bổ sung ${newEmployees.length} nhân viên.`;
        alert(msg);
    } else {
        setImportError("Không tìm thấy dữ liệu nhân viên hợp lệ.");
    }
  };

  const handleExportExcel = () => {
    const XLSX = getXLSX();
    if (!XLSX) {
      alert("Thư viện Excel chưa tải xong. Vui lòng tải lại trang.");
      return;
    }
    const header = ["STT", "Phòng/Ban", "Họ và Tên", "Chức danh"];
    const dataRows: any[] = [];
    departments.forEach((dept, index) => {
        const deptEmps = employees.filter(e => e.department === dept);
        if (deptEmps.length === 0) return;
        dataRows.push([`${toRoman(index + 1)}. ${dept.toUpperCase()}`, "", "", ""]);
        deptEmps.forEach((emp, idx) => {
            dataRows.push([
                idx + 1,
                emp.department, 
                emp.name,       
                emp.jobTitle || emp.role
            ]);
        });
    });
    const ws = XLSX.utils.aoa_to_sheet([[`DANH SÁCH NHÂN SỰ - ${companyInfo.name.toUpperCase()}`], [], header, ...dataRows]);
    ws['!cols'] = [{ wch: 8 }, { wch: 25 }, { wch: 25 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhanSu");
    XLSX.writeFile(wb, "DanhSachNhanSu.xlsx");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 1024 * 1024 * 2) { 
            alert("File ảnh quá lớn! Vui lòng chọn ảnh dưới 2MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            onUpdateCompanyInfo(editCompanyName, reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = () => {
      onUpdateCompanyInfo(editCompanyName, companyInfo.logo);
      alert("Đã lưu thông tin công ty!");
  };

  const handleBackupData = () => {
      const data = {
          employees,
          departments,
          requests,
          holidays,
          companyInfo,
          version: '1.0',
          exportedAt: new Date().toISOString()
      };
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `backup_hethong_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!window.confirm("CẢNH BÁO: Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại bằng dữ liệu từ file backup. Bạn có chắc chắn không?")) {
          e.target.value = '';
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              onRestoreSystem(json);
          } catch (err) {
              alert("File backup không hợp lệ!");
              console.error(err);
          } finally {
              e.target.value = '';
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" />
          Quản trị Hệ thống
        </h2>
        {activeTab === 'manual' || activeTab === 'import' ? (
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Xuất danh sách Excel
            </button>
        ) : null}
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-100 overflow-x-auto">
        <button
          onClick={() => setActiveTab('manual')}
          className={`pb-2 px-1 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Nhập liệu trực tiếp
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-2 px-1 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'import' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Nhập từ Excel/CSV
        </button>
        {/* Chỉ hiện tab Quản lý Ngày lễ cho Ban TGĐ */}
        {currentUser.role === Role.BOD && (
            <button
            onClick={() => setActiveTab('holidays')}
            className={`pb-2 px-1 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'holidays' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
            Quản lý Ngày lễ
            </button>
        )}
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-2 px-1 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Cấu hình chung
        </button>
      </div>

      {activeTab === 'manual' && (
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 animate-in fade-in">
           <h3 className="text-sm font-semibold text-blue-800 mb-3">Thêm mới nhân viên</h3>
           <form onSubmit={handleManualSubmit} className="flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">Phòng/Ban</label>
                <div className="flex gap-1">
                  {!isNewDeptMode ? (
                    <select
                      value={newDept}
                      onChange={e => setNewDept(e.target.value)}
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customDept}
                      onChange={e => setCustomDept(e.target.value)}
                      placeholder="Tên phòng mới..."
                      className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsNewDeptMode(!isNewDeptMode)}
                    className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded text-gray-600 whitespace-nowrap"
                  >
                    {isNewDeptMode ? 'Chọn' : '+Mới'}
                  </button>
                </div>
              </div>

              <div className="flex-[1.5] w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Nhập họ tên..."
                />
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">Chức danh</label>
                <input
                  type="text"
                  required
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="VD: Trưởng ban..."
                />
              </div>
              <button
                type="submit"
                className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-1 shadow-sm h-[38px]"
              >
                <Plus className="w-4 h-4" />
                Thêm
              </button>
           </form>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="space-y-4 mb-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Chế độ nhập:</span>
                <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${importMode === 'append' ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-transparent hover:bg-gray-100'}`}>
                    <input 
                        type="radio" 
                        name="importMode" 
                        checked={importMode === 'append'} 
                        onChange={() => setImportMode('append')}
                        className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                         <CopyPlus className="w-4 h-4 text-blue-600" />
                         <span className="text-sm font-medium text-gray-800">Bổ sung (Giữ cũ, thêm mới)</span>
                    </div>
                </label>
                <label className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-all ${importMode === 'replace' ? 'bg-red-50 border-red-300 shadow-sm' : 'bg-white border-transparent hover:bg-gray-100'}`}>
                    <input 
                        type="radio" 
                        name="importMode" 
                        checked={importMode === 'replace'} 
                        onChange={() => setImportMode('replace')}
                        className="w-4 h-4 text-red-600"
                    />
                    <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-red-600" />
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-800">Thay thế (Xóa cũ, nhập mới)</span>
                        </div>
                    </div>
                </label>
            </div>
            
            <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:bg-gray-50 transition-colors relative">
                {isProcessing ? (
                   <div className="flex flex-col items-center justify-center py-4">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                      <p className="text-sm text-gray-600">Đang xử lý dữ liệu...</p>
                   </div>
                ) : (
                  <>
                    <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">
                        {importMode === 'replace' ? 'Chọn file để THAY THẾ toàn bộ danh sách' : 'Chọn file để BỔ SUNG vào danh sách'}
                    </p>
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                        <p>Hỗ trợ file Excel (.xlsx, .xls) hoặc CSV.</p>
                        <p className="font-medium text-blue-600">Form bắt buộc: Cột A (STT) | Cột B (Phòng) | Cột C (Họ tên) | Cột D (Chức vụ)</p>
                    </div>
                  </>
                )}
            </div>
            {importError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="whitespace-pre-wrap">{importError}</span>
                </div>
            )}
        </div>
      )}
      
      {activeTab === 'holidays' && (
          <div className="animate-in fade-in space-y-6">
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                      <CalendarCheck className="w-5 h-5" />
                      Danh sách Ngày Lễ trong năm
                  </h3>
                  <p className="text-sm text-orange-700 mb-4 italic">
                      Lưu ý: Các ngày lễ trong danh sách này sẽ KHÔNG được tính là ngày nghỉ phép khi nhân viên gửi đơn.
                  </p>
                  
                  <form onSubmit={handleHolidaySubmit} className="flex gap-4 items-end mb-6">
                      <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Ngày lễ</label>
                          <input 
                             type="date" 
                             required
                             className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                             value={newHolidayDate}
                             onChange={(e) => setNewHolidayDate(e.target.value)}
                          />
                      </div>
                      <div className="flex-[2]">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tên ngày lễ</label>
                          <input 
                             type="text" 
                             required
                             placeholder="Ví dụ: Giỗ tổ Hùng Vương..."
                             className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                             value={newHolidayName}
                             onChange={(e) => setNewHolidayName(e.target.value)}
                          />
                      </div>
                      <button 
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium h-[38px] flex items-center gap-1"
                      >
                          <Plus className="w-4 h-4" /> Thêm
                      </button>
                  </form>

                  <div className="bg-white border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b">
                              <tr>
                                  <th className="px-4 py-2 text-left w-32">Ngày</th>
                                  <th className="px-4 py-2 text-left">Tên ngày lễ</th>
                                  <th className="px-4 py-2 text-right w-20">Xóa</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {holidays.map(h => (
                                  <tr key={h.id}>
                                      <td className="px-4 py-2 font-medium">
                                          {new Date(h.date).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'})}
                                      </td>
                                      <td className="px-4 py-2">{h.name}</td>
                                      <td className="px-4 py-2 text-right">
                                          <button 
                                            onClick={() => onDeleteHoliday(h.id)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {holidays.length === 0 && (
                                  <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400">Chưa có ngày lễ nào.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'settings' && (
          <div className="animate-in fade-in space-y-6 max-w-2xl mx-auto py-4">
              {/* Sao lưu & Phục hồi */}
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4 flex items-center gap-2">
                      <Save className="w-5 h-5" />
                      Sao lưu & Khôi phục
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                          <p className="text-sm text-indigo-700 mb-2">Tải toàn bộ dữ liệu hiện tại về máy tính để dự phòng.</p>
                          <button 
                            onClick={handleBackupData}
                            className="w-full px-4 py-2 bg-white border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                          >
                              <Download className="w-4 h-4" /> Tải file Backup (.json)
                          </button>
                      </div>
                      <div>
                          <p className="text-sm text-indigo-700 mb-2">Khôi phục dữ liệu từ file đã sao lưu trước đó.</p>
                          <label className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                              <FolderUp className="w-4 h-4" /> 
                              <span>Chọn file Khôi phục</span>
                              <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
                          </label>
                      </div>
                  </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Thông tin Công ty
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tên công ty (Hiển thị trên tiêu đề)</label>
                          <input 
                             type="text" 
                             className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                             value={editCompanyName}
                             onChange={(e) => setEditCompanyName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Logo công ty</label>
                          <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-white border border-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                  {companyInfo.logo ? (
                                      <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain" />
                                  ) : (
                                      <ImageIcon className="w-8 h-8 text-gray-300" />
                                  )}
                              </div>
                              <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                                  Thay đổi Logo
                                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                              </label>
                              {companyInfo.logo && (
                                  <button onClick={() => onUpdateCompanyInfo(editCompanyName, '')} className="text-red-600 text-sm hover:underline">Xóa</button>
                              )}
                          </div>
                      </div>
                      <div className="pt-4 border-t border-gray-200 flex justify-end">
                          <button onClick={handleSaveSettings} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Lưu cấu hình</button>
                      </div>
                  </div>
              </div>
              <div className="bg-red-50 p-6 rounded-xl border border-red-200 mt-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Quản lý Dữ liệu
                  </h3>
                  <button onClick={onResetData} className="px-6 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm flex items-center gap-2 shadow-sm">
                      <Trash2 className="w-4 h-4" /> Khôi phục dữ liệu gốc
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'manual' || activeTab === 'import' ? (
        <div className="border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider w-16">STT</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider w-1/4">Phòng/Ban</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider w-1/3">Họ và tên</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Chức danh</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center w-24">Thao tác</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {departments.map((dept, index) => {
                    const deptEmps = employees.filter(e => e.department === dept);
                    if (deptEmps.length === 0) return null;
                    return (
                        <React.Fragment key={dept}>
                        <tr className="bg-gray-50">
                            <td colSpan={5} className="px-4 py-2 text-xs font-bold text-blue-800 bg-blue-50/50">
                                {toRoman(index + 1)}. {dept.toUpperCase()}
                            </td>
                        </tr>
                        {deptEmps.map((emp, idx) => (
                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-gray-500 font-medium text-center">{idx + 1}</td>
                            <td className="px-4 py-3 text-gray-700">{emp.department}</td>
                            <td className="px-4 py-3 text-gray-900 font-medium">{emp.name}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                emp.role === Role.BOD ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                emp.role === Role.MANAGER ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                'bg-gray-50 text-gray-600 border-gray-100'
                                }`}>
                                {emp.jobTitle || emp.role}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(emp); }}
                                        className="text-blue-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteEmployee(emp.id); }}
                                        className="text-red-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                            </tr>
                        ))}
                        </React.Fragment>
                    )
                })}
                </tbody>
            </table>
        </div>
      ) : null}

      {editingEmp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-4 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Edit className="w-5 h-5 text-blue-600" />
                          Sửa thông tin nhân viên
                      </h3>
                      <button onClick={() => setEditingEmp(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                          <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phòng/Ban</label>
                          <div className="flex gap-2">
                              {editIsNewDept ? (
                                  <input type="text" placeholder="Tên phòng mới..." value={editCustomDept} onChange={(e) => setEditCustomDept(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                              ) : (
                                  <select value={editDept} onChange={(e) => setEditDept(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                      {departments.map(d => (<option key={d} value={d}>{d}</option>))}
                                  </select>
                              )}
                              <button type="button" onClick={() => setEditIsNewDept(!editIsNewDept)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs rounded text-gray-600 whitespace-nowrap">{editIsNewDept ? 'Chọn' : '+Mới'}</button>
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chức danh hiển thị</label>
                          <input type="text" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: Trưởng ban..." />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Phân quyền Hệ thống</label>
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                              <option value={Role.STAFF}>Nhân viên</option>
                              <option value={Role.MANAGER}>Quản lý</option>
                              <option value={Role.BOD}>Ban TGĐ</option>
                          </select>
                      </div>
                      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                          <button type="button" onClick={() => setEditingEmp(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Hủy</button>
                          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">Lưu thay đổi</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
