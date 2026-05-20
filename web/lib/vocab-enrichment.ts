import type { Vocabulary } from "./types";
import generatedOverrides from "./vocab-enrichment.generated.json";

type VocabOverride = Partial<Pick<Vocabulary, "pinyin" | "meaning">>;

const GENERATED_OVERRIDES = generatedOverrides as Record<string, VocabOverride>;

const COMMON_OVERRIDES: Record<string, VocabOverride> = {
  个: { pinyin: "gè", meaning: "cái; lượng từ chung; cá nhân" },
  本: { pinyin: "běn", meaning: "quyển/cuốn; gốc; vốn" },
  点: { pinyin: "diǎn", meaning: "điểm; giờ; chút/ít" },
  号: { pinyin: "hào", meaning: "số; ngày; ký hiệu" },
  事: { pinyin: "shì", meaning: "việc; chuyện" },
  分: { pinyin: "fēn; fèn", meaning: "phút; điểm; chia; phần" },
  块: { pinyin: "kuài", meaning: "miếng; khối; đồng/tệ" },
  字: { pinyin: "zì", meaning: "chữ; chữ viết" },
  最: { pinyin: "zuì", meaning: "nhất; hơn cả" },
  回: { pinyin: "huí", meaning: "về; trở lại; trả lời; lần" },
  打: { pinyin: "dǎ", meaning: "đánh; gọi điện; chơi; bắt/lấy" },
  等: { pinyin: "děng", meaning: "đợi; vân vân; cấp/hạng" },
  水: { pinyin: "shuǐ", meaning: "nước" },
  热: { pinyin: "rè", meaning: "nóng; nhiệt tình; sốt" },
  白: { pinyin: "bái", meaning: "trắng; rõ ràng; vô ích" },
  花: { pinyin: "huā", meaning: "hoa; tiêu tiền; nhiều màu" },
  大: { pinyin: "dà; dài", meaning: "to/lớn; nhiều; đại; bác/cụ" },
  小: { pinyin: "xiǎo", meaning: "nhỏ; ít; trẻ" },
  少: { pinyin: "shǎo; shào", meaning: "ít; thiếu; trẻ/thiếu niên" },
  差: { pinyin: "chà; chā; chāi", meaning: "kém; sai/lệch; khác biệt; sai khiến" },
  老: { pinyin: "lǎo", meaning: "già; cũ; lâu; rất" },
  还: { pinyin: "hái; huán", meaning: "vẫn; còn; cũng; trả lại" },
  行: { pinyin: "xíng; háng", meaning: "được; đi; hàng/ngành" },
  干: { pinyin: "gān; gàn", meaning: "khô; thân/cán; làm" },
  了: { pinyin: "le; liǎo", meaning: "trợ từ hoàn thành; xong; hiểu rõ" },
  得: { pinyin: "de; dé; děi", meaning: "trợ từ bổ ngữ; được; phải" },
  地: { pinyin: "de; dì", meaning: "trợ từ trạng ngữ; đất; địa điểm" },
  着: { pinyin: "zhe; zháo; zhuó", meaning: "đang; chạm/trúng; mặc" },
  喜欢: { pinyin: "xǐhuan", meaning: "thích; yêu thích" },
  只: { pinyin: "zhī; zhǐ", meaning: "con/chiếc; chỉ" },
  没: { pinyin: "méi; mò", meaning: "không có; chưa; chìm/ngập" },
  好: { pinyin: "hǎo; hào", meaning: "tốt; khỏe; dễ; thích" },
  长: { pinyin: "cháng; zhǎng", meaning: "dài; lâu; lớn lên; trưởng" },
  重: { pinyin: "zhòng; chóng", meaning: "nặng; quan trọng; lặp lại" },
  要: { pinyin: "yào; yāo", meaning: "muốn; cần; sẽ; yêu cầu" },
  会: { pinyin: "huì", meaning: "biết; có thể; sẽ; họp/hội" },
  在: { pinyin: "zài", meaning: "ở/tại; đang" },
  对: { pinyin: "duì", meaning: "đúng; đối với; cặp/đôi" },
  是: { pinyin: "shì", meaning: "là; đúng/phải" },
  有: { pinyin: "yǒu", meaning: "có; tồn tại" },
  的: { pinyin: "de; dí; dì", meaning: "trợ từ sở hữu; thật/sự; đích" },
  给: { pinyin: "gěi; jǐ", meaning: "cho; đưa; bị/được; cung cấp" },
  过: { pinyin: "guò; guo", meaning: "qua; vượt quá; đã từng" },
  为: { pinyin: "wèi; wéi", meaning: "vì; cho; làm; trở thành" },
  中: { pinyin: "zhōng; zhòng", meaning: "giữa/trong; Trung Quốc; trúng" },
  上: { pinyin: "shàng", meaning: "trên; lên; trước; đi học/đi làm" },
  下: { pinyin: "xià", meaning: "dưới; xuống; sau/tiếp; lượng từ lần" },
  哪: { pinyin: "nǎ; něi; na", meaning: "nào; đâu; trợ từ ngữ khí" },
  这: { pinyin: "zhè; zhèi", meaning: "đây; này" },
  那: { pinyin: "nà; nèi; nā", meaning: "kia; đó; vậy thì" },
  和: { pinyin: "hé; hè; huó; huò; hú", meaning: "và; cùng; hòa; phụ họa; trộn" },
  就: { pinyin: "jiù", meaning: "thì; ngay; chỉ; đã" },
  开: { pinyin: "kāi", meaning: "mở; lái; bắt đầu; tổ chức" },
  来: { pinyin: "lái", meaning: "đến; lại; dùng sau động từ chỉ hướng" },
  去: { pinyin: "qù", meaning: "đi; rời; dùng sau động từ chỉ hướng" },
  都: { pinyin: "dōu; dū", meaning: "đều; tất cả; thủ đô" },
  见: { pinyin: "jiàn; xiàn", meaning: "thấy; gặp; xuất hiện" },
  教: { pinyin: "jiāo; jiào", meaning: "dạy; chỉ bảo; tôn giáo" },
  朝: { pinyin: "cháo; zhāo", meaning: "hướng về; triều đại; buổi sáng" },
};

export function enrichVocabulary(vocab: Vocabulary): Vocabulary {
  const override = {
    ...GENERATED_OVERRIDES[vocab.hanzi],
    ...COMMON_OVERRIDES[vocab.hanzi],
  };
  if (!override.pinyin && !override.meaning) return vocab;
  return {
    ...vocab,
    pinyin: override.pinyin ?? vocab.pinyin,
    meaning: override.meaning ?? vocab.meaning,
  };
}
