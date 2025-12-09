
import React, { useState, useEffect } from 'react';
import { Employee, LeaveType, PublicHoliday } from '../types';
import { polishLeaveReason } from '../services/geminiService';
import { Loader2, Sparkles, Info } from 'lucide-react';

interface LeaveFormProps {
  currentUser: Employee;
  onSubmit: (data: any) => void;
  onClose: () => void;
  holidays: PublicHoliday[];
}

export const LeaveForm: React.FC<LeaveFormProps> = ({ currentUser, onSubmit, onClose, holidays }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState<LeaveType>(LeaveType.VACATION);
  const [reason, setReason] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [daysCount, setDaysCount] = useState(0);

  // Helper to format date YYYY-MM-DD
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Logic tính toán số ngày nghỉ
  useEffect(() => {
    if (!startDate || !endDate) {
        setDaysCount(0);
        return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
        setDaysCount(0);
        return;
    }

    let total = 0;
    let current = new Date(start);

    while (current <= end) {
        const dateStr = formatDate(current);
        const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat

        // 1. Kiểm tra ngày lễ -> Tính 0
        const isHoliday = holidays.some(h => h.date === dateStr);
        
        if (isHoliday) {
            total += 0;
        } 
        // 2. Kiểm tra Chủ Nhật -> Tính 0
        else if (dayOfWeek === 0) {
            total += 0;
        }
        // 3. Kiểm tra Thứ 7 -> Tính 0.5 (Chỉ làm sáng)
        else if (dayOfWeek === 6) {
            total += 0.5;
        }
        // 4. Các ngày thường (T2-T6) -> Tính 1
        else {
            total += 1;
        }

        current.setDate(current.getDate() + 1);
    }
    
    setDaysCount(total);
  }, [startDate, endDate, holidays]);

  const handleAiPolish = async () => {
    if (!reason.trim()) return;
    setIsPolishing(true);
    const polished = await polishLeaveReason(reason, type, daysCount);
    setReason(polished);
    setIsPolishing(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysCount <= 0) {
      alert("Thời gian nghỉ không hợp lệ hoặc trùng vào ngày lễ/Chủ nhật hoàn toàn.");
      return;
    }
    onSubmit({
      employeeId: currentUser.id,
      startDate,
      endDate,
      type,
      reason,
      daysCount,
      status: 'Chờ duyệt',
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-blue-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Đăng ký nghỉ phép</h2>
          <p className="text-blue-100 text-sm">Xin chào {currentUser.name} - {currentUser.department}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <input
                type="date"
                required
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <input
                type="date"
                required
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại nghỉ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {Object.values(LeaveType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Lý do nghỉ</label>
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={isPolishing || !reason}
                className="text-xs flex items-center gap-1 text-purple-600 font-semibold hover:text-purple-800 disabled:opacity-50 transition-colors"
              >
                {isPolishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Viết hộ
              </button>
            </div>
            <textarea
              required
              rows={4}
              placeholder="Nhập lý do ngắn gọn (ví dụ: bị cảm, đi du lịch...)"
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            
            <div className="mt-2 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                    <p className="font-semibold text-gray-800">
                        Tổng cộng: <span className="text-blue-700">{daysCount} ngày</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        (Thứ 7 tính 0.5 ngày; Chủ nhật và Lễ không tính vào phép)
                    </p>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Gửi đơn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
