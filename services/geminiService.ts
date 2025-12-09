import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Uses Gemini to polish a rough reason into a professional message.
 */
export const polishLeaveReason = async (
  rawReason: string,
  leaveType: string,
  days: number
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Using flash model for speed
    const modelId = "gemini-2.5-flash";
    
    const prompt = `
      Bạn là một trợ lý HR chuyên nghiệp. Hãy viết lại lý do xin nghỉ phép sau đây thành một đoạn văn ngắn gọn, lịch sự và chuyên nghiệp bằng tiếng Việt.
      
      Thông tin:
      - Loại nghỉ: ${leaveType}
      - Số ngày: ${days}
      - Lý do gốc (có thể sơ sài): "${rawReason}"
      
      Yêu cầu:
      - Chỉ trả về nội dung lý do đã được chỉnh sửa.
      - Giọng văn tôn trọng cấp trên và đồng nghiệp.
      - Không thêm các câu chào hỏi rườm rà (ví dụ: "Kính gửi..."), chỉ tập trung vào nội dung lý do.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text.trim();
  } catch (error) {
    console.error("Error generating content:", error);
    return rawReason; // Fallback to original text if AI fails
  }
};