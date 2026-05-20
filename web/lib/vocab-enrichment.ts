import type { Vocabulary } from "./types";

const COMMON_OVERRIDES: Record<string, Pick<Vocabulary, "pinyin" | "meaning">> = {
  个: { pinyin: "gè", meaning: "cái; lượng từ chung; cá nhân" },
  事: { pinyin: "shì", meaning: "việc; chuyện" },
  分: { pinyin: "fēn; fèn", meaning: "phút; điểm; chia; phần" },
  块: { pinyin: "kuài", meaning: "miếng; khối; đồng/tệ" },
  字: { pinyin: "zì", meaning: "chữ; chữ viết" },
  最: { pinyin: "zuì", meaning: "nhất; hơn cả" },
  还: { pinyin: "hái; huán", meaning: "vẫn; còn; cũng; trả lại" },
  行: { pinyin: "xíng; háng", meaning: "được; đi; hàng/ngành" },
  了: { pinyin: "le; liǎo", meaning: "trợ từ hoàn thành; xong; hiểu rõ" },
  得: { pinyin: "de; dé; děi", meaning: "trợ từ bổ ngữ; được; phải" },
  地: { pinyin: "de; dì", meaning: "trợ từ trạng ngữ; đất; địa điểm" },
  着: { pinyin: "zhe; zháo; zhuó", meaning: "đang; chạm/trúng; mặc" },
  只: { pinyin: "zhī; zhǐ", meaning: "con/chiếc; chỉ" },
  没: { pinyin: "méi; mò", meaning: "không có; chưa; chìm/ngập" },
  好: { pinyin: "hǎo; hào", meaning: "tốt; khỏe; dễ; thích" },
  长: { pinyin: "cháng; zhǎng", meaning: "dài; lâu; lớn lên; trưởng" },
  重: { pinyin: "zhòng; chóng", meaning: "nặng; quan trọng; lặp lại" },
  要: { pinyin: "yào; yāo", meaning: "muốn; cần; sẽ; yêu cầu" },
  会: { pinyin: "huì", meaning: "biết; có thể; sẽ; cuộc họp" },
  给: { pinyin: "gěi", meaning: "cho; đưa; bị/được" },
  过: { pinyin: "guò", meaning: "đã từng; qua; vượt quá" },
  为: { pinyin: "wèi; wéi", meaning: "vì; cho; làm; trở thành" },
  朝: { pinyin: "cháo; zhāo", meaning: "hướng về; triều đại; buổi sáng" },
};

export function enrichVocabulary(vocab: Vocabulary): Vocabulary {
  const override = COMMON_OVERRIDES[vocab.hanzi];
  if (!override) return vocab;
  return {
    ...vocab,
    pinyin: override.pinyin,
    meaning: override.meaning,
  };
}
