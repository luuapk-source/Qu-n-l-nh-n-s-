
import React, { useState, useEffect } from 'react';
import { MOCK_EMPLOYEES, INITIAL_REQUESTS, MOCK_DEPARTMENTS, DEFAULT_COMPANY_INFO } from './constants';
import { Employee, LeaveRequest, LeaveStatus, Role } from './types';
import { LeaveForm } from './components/LeaveForm';
import { MonthlyReport } from './components/MonthlyReport';
import { AdminPanel } from './components/AdminPanel';
import { 
  Calendar, 
  PlusCircle, 
  BarChart3, 
  Users, 
  Search, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Building,
  ShieldCheck,
  Trash2
} from 'lucide-react';

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [departments, setDepartments] = useState<string[]>(MOCK_DEPARTMENTS);
  const [currentUser, setCurrentUser] = useState<Employee>(MOCK_EMPLOYEES[0]);
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [view, setView] = useState<'dashboard' | 'report' | 'admin'>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [filterDept, setFilterDept] = useState<string>('ALL');

  // Company Info State
  const [companyName, setCompanyName] = useState<string>(DEFAULT_COMPANY_INFO.name);
  const [companyLogo, setCompanyLogo] = useState<string>(DEFAULT_COMPANY_INFO.logo);

  // Load persistence
  useEffect(() => {
    const savedReqs = localStorage.getItem('leave_requests');
    if (savedReqs) setRequests(JSON.parse(savedReqs));

    const savedEmps = localStorage.getItem('employees');
    if (savedEmps) setEmployees(JSON.parse(savedEmps));

    const savedDepts = localStorage.getItem('departments');
    if (savedDepts) setDepartments(JSON.parse(savedDepts));

    const savedCompany = localStorage.getItem('company_info');
    if (savedCompany) {
        const info = JSON.parse(savedCompany);
        if (info.name) setCompanyName(info.name);
        if (info.logo) setCompanyLogo(info.logo);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('leave_requests', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('departments', JSON.stringify(departments));
  }, [departments]);

  useEffect(() => {
      localStorage.setItem('company_info', JSON.stringify({ name: companyName, logo: companyLogo }));
  }, [companyName, companyLogo]);

  const handleCreateRequest = (newRequest: any) => {
    const requestWithId = {
      ...newRequest,
      id: Math.random().toString(36).substr(2, 9)
    };
    setRequests(prev => [requestWithId, ...prev]);
  };

  const handleStatusChange = (id: string, newStatus: LeaveStatus) => {
    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        return {
           ...req, 
           status: newStatus,
           // Nếu duyệt, lưu tên người duyệt. Nếu từ chối hoặc chuyển lại chờ duyệt, xóa người duyệt
           approvedBy: newStatus === LeaveStatus.APPROVED ? currentUser.name : undefined 
        };
      }
      return req;
    }));
  };

  const handleDeleteRequest = (id: string) => {
      // Không dùng window.confirm để tránh bị chặn, xóa trực tiếp
      setRequests(prev => prev.filter(req => req.id !== id));
  };

  const handleAddEmployee = (emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
  };

  const handleImportCSV = (newEmps: Employee[], newDepts: string[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      // Thay thế hoàn toàn: Dùng danh sách phòng ban mới để đảm bảo thứ tự (Ordered List)
      setDepartments(newDepts);
      setEmployees(newEmps);
    } else {
      // Bổ sung:
      // 1. Cập nhật phòng ban (chỉ thêm những phòng chưa có)
      setDepartments(prevDepts => {
          const combined = new Set([...prevDepts, ...newDepts]);
          return Array.from(combined);
      });

      // 2. Cập nhật nhân viên (chống trùng lặp theo Name + Dept)
      setEmployees(prev => {
        const uniqueNewEmps = newEmps.filter(newE => 
           !prev.some(existing => 
             existing.name.toLowerCase() === newE.name.toLowerCase() && 
             existing.department === newE.department
           )
        );
        return [...prev, ...uniqueNewEmps];
      });
    }
  };

  const handleDeleteEmployee = (id: string) => {
    console.log("Attempting to delete employee:", id);
    // Force string comparison to handle legacy data issues
    setEmployees(prev => prev.filter(e => String(e.id) !== String(id)));
    
    // Cleanup if current user was deleted
    if (String(currentUser.id) === String(id)) {
        setTimeout(() => {
            const firstAvailable = employees.find(e => String(e.id) !== String(id));
            if (firstAvailable) setCurrentUser(firstAvailable);
        }, 100);
    }
  };

  const handleAddDepartment = (dept: string) => {
    if (!departments.includes(dept)) {
      setDepartments(prev => [...prev, dept]);
    }
  };

  const handleResetData = () => {
    localStorage.clear();
    setEmployees(MOCK_EMPLOYEES);
    setDepartments(MOCK_DEPARTMENTS);
    setRequests(INITIAL_REQUESTS);
    setCompanyName(DEFAULT_COMPANY_INFO.name);
    setCompanyLogo(DEFAULT_COMPANY_INFO.logo);
    setCurrentUser(MOCK_EMPLOYEES[0]);
    alert("Đã khôi phục dữ liệu gốc thành công!");
  };

  // --- LOGIC PHÂN QUYỀN (Permission Logic) ---
  
  // Kiểm tra chức danh Trưởng Ban (Head)
  const isDeptHead = (jobTitle?: string) => {
      if (!jobTitle) return false;
      const t = jobTitle.toLowerCase();
      // Phải là Trưởng Ban, không phải Phó
      return (t.includes('trưởng ban') || t.includes('kế toán trưởng') || t.includes('giám đốc ban')) && !t.includes('phó');
  };

  // Kiểm tra chức danh Phó Ban (Deputy)
  const isDeptDeputy = (jobTitle?: string) => {
    if (!jobTitle) return false;
    const t = jobTitle.toLowerCase();
    return t.includes('phó ban') || t.includes('phó giám đốc ban');
  };

  // Kiểm tra quyền thao tác (Duyệt hoặc Xóa)
  const hasPermissionOnRequest = (req: LeaveRequest, requester: Employee) => {
    // 1. Rule: Nghỉ quá 3 ngày liên tục -> Chỉ Ban TGĐ (BOD) được duyệt/xóa
    if (req.daysCount > 3) {
        return currentUser.role === Role.BOD;
    }

    // 2. Rule: Người xin nghỉ là Trưởng Ban -> Chỉ Ban TGĐ (BOD) được duyệt/xóa
    if (isDeptHead(requester.jobTitle)) {
        return currentUser.role === Role.BOD;
    }

    // 3. Rule: Xử lý quyền duyệt trong cùng Ban (Trưởng/Phó)
    if (currentUser.department === requester.department && currentUser.id !== requester.id) {
        
        // 3a. Nếu current user là Trưởng Ban -> Được duyệt
        if (isDeptHead(currentUser.jobTitle)) {
            return true;
        }

        // 3b. Nếu current user là Phó Ban
        if (isDeptDeputy(currentUser.jobTitle)) {
            // Kiểm tra xem Ban này có Trưởng Ban nào không?
            const deptHasHead = employees.some(e => 
                e.department === requester.department && isDeptHead(e.jobTitle)
            );

            // Nếu KHÔNG CÓ Trưởng Ban -> Phó Ban được quyền duyệt (Thay quyền trưởng ban)
            if (!deptHasHead) {
                return true;
            }
            
            // Nếu CÓ Trưởng Ban -> Phó Ban KHÔNG được duyệt (chỉ Trưởng Ban duyệt)
            // (Trừ khi người xin nghỉ là cấp dưới trực tiếp được ủy quyền - nhưng ở đây làm đơn giản theo role)
            return false;
        }
    }

    // Ban TGĐ luôn có quyền (fallback cho mọi trường hợp khác)
    if (currentUser.role === Role.BOD) return true;
    
    return false;
  };

  const canViewAdmin = currentUser.role === Role.BOD || currentUser.role === Role.MANAGER;

  const filteredRequests = requests.filter(req => {
    const requester = employees.find(e => e.id === req.employeeId);
    if (!requester) return false;

    // Filter by Dept dropdown (Visual filter only)
    if (filterDept !== 'ALL' && requester.department !== filterDept) return false;

    // Role-based visibility
    if (currentUser.role === Role.BOD) return true; // BOD sees all
    if (currentUser.role === Role.MANAGER) {
        // Manager sees their own AND their department's requests
        return requester.department === currentUser.department;
    }
    // Staff sees only their own
    return req.employeeId === currentUser.id;
  });

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED: return 'text-green-600 bg-green-100 border-green-200';
      case LeaveStatus.PENDING: return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case LeaveStatus.REJECTED: return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED: return <CheckCircle className="w-4 h-4" />;
      case LeaveStatus.PENDING: return <Clock className="w-4 h-4" />;
      case LeaveStatus.REJECTED: return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-3 overflow-hidden">
            {companyLogo ? (
                <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
                <Calendar className="w-8 h-8 text-blue-600 flex-shrink0" />
            )}
            <span className="truncate" title={companyName}>{companyName}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-2">Hệ thống quản lý nghỉ phép</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Calendar className="w-5 h-5" />
            Danh sách nghỉ phép
          </button>
          
          <button 
            onClick={() => setView('report')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'report' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart3 className="w-5 h-5" />
            Báo cáo tổng hợp
          </button>

          {canViewAdmin && (
            <button 
              onClick={() => setView('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users className="w-5 h-5" />
              Quản trị hệ thống
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{currentUser.name}</p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> {currentUser.jobTitle || currentUser.role}
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-2">Chuyển đổi người dùng (Demo):</div>
          <select 
            className="w-full text-xs p-2 border rounded bg-white outline-none"
            value={currentUser.id}
            onChange={(e) => {
                const user = employees.find(emp => String(emp.id) === String(e.target.value));
                if (user) {
                    setCurrentUser(user);
                    // Reset view if access lost
                    if (view === 'admin' && user.role === Role.STAFF) setView('dashboard');
                }
            }}
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.jobTitle || emp.role})</option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {/* Header Mobile */}
        <div className="md:hidden flex justify-between items-center mb-6">
           <div className="flex items-center gap-2">
                {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="w-8 h-8 object-contain" />
                ) : (
                    <Calendar className="w-6 h-6 text-blue-600" />
                )}
                <h1 className="text-xl font-bold text-blue-600 truncate max-w-[200px]">{companyName}</h1>
           </div>
           <button onClick={() => setShowForm(true)} className="p-2 bg-blue-600 text-white rounded-full">
             <PlusCircle className="w-6 h-6" />
           </button>
        </div>

        {/* Top Bar (Desktop) */}
        <header className="hidden md:flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {view === 'dashboard' ? 'Theo dõi nghỉ phép' : 
               view === 'report' ? 'Báo cáo chấm công' : 'Quản trị hệ thống'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {view === 'dashboard' 
                ? `Xin chào ${currentUser.name}, đây là danh sách đơn từ.`
                : view === 'report' ? 'Thống kê số liệu nghỉ phép hàng tháng.'
                : 'Thêm nhân viên mới, nhập danh sách hoặc cấu hình công ty.'}
            </p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-all transform hover:scale-105"
          >
            <PlusCircle className="w-5 h-5" />
            Tạo đơn nghỉ phép
          </button>
        </header>

        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm nhân viên..." 
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Building className="text-gray-400 w-4 h-4" />
                <select 
                  className="py-2 pl-2 pr-8 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                >
                  <option value="ALL">Tất cả bộ phận</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Request List */}
            <div className="grid grid-cols-1 gap-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-400">Không có đơn nghỉ phép nào phù hợp.</p>
                </div>
              ) : (
                filteredRequests.map(req => {
                  const requester = employees.find(e => e.id === req.employeeId);
                  if (!requester) return null;
                  
                  // Tính quyền cho từng đơn
                  const hasPerm = hasPermissionOnRequest(req, requester);

                  return (
                    <div key={req.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-2">
                      {/* Left: User Info & Date */}
                      <div className="flex items-start gap-4 min-w-[200px]">
                        <img src={requester.avatar} alt="" className="w-12 h-12 rounded-full object-cover bg-gray-100" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{requester.name}</h3>
                          <p className="text-xs text-gray-500 mb-2">{requester.jobTitle || requester.department}</p>
                          <div className="inline-flex flex-col bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
                            <span className="text-xs text-gray-500">Thời gian nghỉ ({req.daysCount} ngày)</span>
                            <span className="text-sm font-medium text-gray-800">
                              {new Date(req.startDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} 
                              {' - '}
                              {new Date(req.endDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Reason */}
                      <div className="flex-1 pt-1 md:pt-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {req.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            • Tạo ngày {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-3 rounded-lg italic border-l-4 border-blue-200">
                          "{req.reason}"
                        </p>
                      </div>

                      {/* Right: Actions/Status */}
                      <div className="flex flex-col items-end justify-between min-w-[140px] gap-4 md:gap-0">
                        <div className="flex flex-col items-end gap-1">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(req.status)}`}>
                            {getStatusIcon(req.status)}
                            {req.status}
                            </div>
                            {/* Hiển thị người duyệt */}
                            {req.status === LeaveStatus.APPROVED && req.approvedBy && (
                                <span className="text-[10px] text-gray-500 text-right">
                                    Duyệt bởi: <strong>{req.approvedBy}</strong>
                                </span>
                            )}
                        </div>
                        
                        <div className="flex gap-2 items-end">
                            {/* Approval Actions: Chỉ hiện khi Chờ duyệt VÀ Có quyền */}
                            {req.status === LeaveStatus.PENDING && hasPerm && (
                            <>
                                <button 
                                onClick={() => handleStatusChange(req.id, LeaveStatus.REJECTED)}
                                className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                                >
                                Từ chối
                                </button>
                                <button 
                                onClick={() => handleStatusChange(req.id, LeaveStatus.APPROVED)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
                                >
                                Duyệt
                                </button>
                            </>
                            )}

                            {/* Delete Button: Hiện khi có quyền (Bất kể trạng thái), hoặc chính chủ tự xóa đơn của mình (khi chưa duyệt) */}
                            { (hasPerm || (req.employeeId === currentUser.id && req.status === LeaveStatus.PENDING)) && (
                                <button 
                                    onClick={() => handleDeleteRequest(req.id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Xóa đơn này"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {view === 'report' && (
          <MonthlyReport 
            employees={employees} 
            requests={requests} 
            departments={departments}
            companyName={companyName}
          />
        )}

        {view === 'admin' && canViewAdmin && (
          <AdminPanel 
            employees={employees} 
            departments={departments}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onImportCSV={handleImportCSV}
            onDeleteEmployee={handleDeleteEmployee}
            onAddDepartment={handleAddDepartment}
            onResetData={handleResetData}
            companyInfo={{ name: companyName, logo: companyLogo }}
            onUpdateCompanyInfo={(name, logo) => {
                setCompanyName(name);
                setCompanyLogo(logo);
            }}
          />
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <LeaveForm 
          currentUser={currentUser} 
          onSubmit={handleCreateRequest} 
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
};

export default App;
