import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SupportedLanguage = "zh" | "en" | "vi";
export type LanguagePreference = "auto" | SupportedLanguage;

const LANGUAGE_STORAGE_KEY = "sag:language-preference:v2";

type I18nContextValue = {
  language: SupportedLanguage;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: (zh: string, en: string, vi?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useLanguageController(): I18nContextValue {
  const [preference, setPreferenceState] = useState<LanguagePreference>(() => loadStoredLanguagePreference());
  const [browserLanguage, setBrowserLanguage] = useState<SupportedLanguage>(() => detectBrowserLanguage());
  const language = preference === "auto" ? browserLanguage : preference;

  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  }, [language]);

  useEffect(() => {
    const refreshBrowserLanguage = () => setBrowserLanguage(detectBrowserLanguage());
    window.addEventListener("languagechange", refreshBrowserLanguage);
    return () => window.removeEventListener("languagechange", refreshBrowserLanguage);
  }, []);

  const setPreference = (nextPreference: LanguagePreference) => {
    setPreferenceState(nextPreference);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextPreference);
  };

  return useMemo(() => ({
    language,
    preference,
    setPreference,
    t: (zh: string, en: string, vi?: string) => translate(language, zh, en, vi)
  }), [language, preference]);
}

export function I18nProvider({ value, children }: { value: I18nContextValue; children: ReactNode }) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function translate(language: SupportedLanguage, zh: string, en: string, vi?: string) {
  if (language === "vi") {
    return vi ?? VI_TRANSLATIONS[en] ?? en;
  }
  return language === "en" ? en : zh;
}

export function detectBrowserLanguage(): SupportedLanguage {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  if (languages.some((language) => language.toLowerCase().startsWith("vi"))) {
    return "vi";
  }
  return languages.some((language) => language.toLowerCase().startsWith("zh")) ? "zh" : "en";
}

function loadStoredLanguagePreference(): LanguagePreference {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "zh" || stored === "en" || stored === "vi" || stored === "auto" ? stored : "vi";
}

const VI_TRANSLATIONS: Record<string, string> = {
  "Loading SAG...": "Đang tải SAG...",
  "Search current project documents": "Tìm trong tài liệu của project hiện tại",
  "Create a project first": "Hãy tạo project trước",
  "Failed to load": "Tải thất bại",
  "Ready": "Sẵn sàng",
  "Raw logs in browser cache have been cleared": "Đã xóa raw logs trong cache trình duyệt",
  "Project renamed to \"{name}\".": "Đã đổi tên project.",
  "Permanent project deletion canceled.": "Đã hủy xóa vĩnh viễn project.",
  "Permanent document deletion canceled.": "Đã hủy xóa vĩnh viễn tài liệu.",
  "Create or select a project before adding documents.": "Hãy tạo hoặc chọn project trước khi thêm tài liệu.",
  "Documents are being processed": "Tài liệu đang được xử lý",
  "Conversation complete": "Đã hoàn tất hội thoại",
  "Execution failed": "Thực thi thất bại",
  "Search complete": "Tìm kiếm hoàn tất",
  "Search failed": "Tìm kiếm thất bại",
  "Select a project first.": "Hãy chọn project trước.",
  "Enter a search question.": "Nhập câu hỏi tìm kiếm.",
  "Select a conversation first.": "Hãy chọn hội thoại trước.",
  "Conversation history cleared": "Đã xóa lịch sử hội thoại",
  "Conversation deleted": "Đã xóa hội thoại",
  "Generation stopped": "Đã dừng sinh nội dung",
  "Stopping generation...": "Đang dừng sinh nội dung...",
  "Settings saved": "Đã lưu cài đặt",
  "Conversational retrieval workbench": "Workbench truy hồi hội thoại",
  "Global settings": "Cài đặt chung",
  "Projects": "Project",
  "Project": "Project",
  "Archived": "Đã lưu trữ",
  "New project": "Project mới",
  "No projects yet. Create a project first.": "Chưa có project. Hãy tạo project trước.",
  "Collapse project conversations": "Thu gọn hội thoại project",
  "Expand project conversations": "Mở rộng hội thoại project",
  "Project actions": "Thao tác project",
  "Rename": "Đổi tên",
  "Restore": "Khôi phục",
  "Archive": "Lưu trữ",
  "Delete forever": "Xóa vĩnh viễn",
  "New chat": "Hội thoại mới",
  "No chats": "Chưa có hội thoại",
  "Enter a project name. Documents and chats will belong to this project.": "Nhập tên project. Tài liệu và hội thoại sẽ thuộc project này.",
  "Project name": "Tên project",
  "Cancel": "Hủy",
  "Confirm": "Xác nhận",
  "Rename project": "Đổi tên project",
  "Enter a new project name.": "Nhập tên project mới.",
  "Chat": "Chat",
  "Documents": "Tài liệu",
  "Graph": "Graph",
  "MCP": "MCP",
  "A project contains documents, chunks, events, entities, and MCP chats.": "Project chứa tài liệu, chunks, events, entities và hội thoại MCP.",
  "Create a chat to test MCP tools": "Tạo hội thoại để thử MCP tools",
  "Clear history": "Xóa lịch sử",
  "Delete chat": "Xóa hội thoại",
  "No conversation yet": "Chưa có hội thoại",
  "Ask a question and the system will retrieve current project documents through MCP tools.": "Nhập câu hỏi, hệ thống sẽ truy hồi tài liệu project hiện tại qua MCP tools.",
  "User": "Người dùng",
  "Assistant": "Trợ lý",
  "Ask about the current project documents...": "Hỏi về tài liệu của project hiện tại...",
  "Stop": "Dừng",
  "Send": "Gửi",
  "Using MCP retrieval": "Đang dùng MCP để truy hồi",
  "Source citations": "Trích dẫn nguồn",
  "Untitled chunk": "Chunk chưa đặt tên",
  "Project documents": "Tài liệu project",
  "Select a project": "Chọn project",
  "Add document": "Thêm tài liệu",
  "No project": "Chưa có project",
  "Create a project before uploading documents and viewing processing results.": "Tạo project trước khi tải tài liệu và xem kết quả xử lý.",
  "Chunks": "Chunks",
  "Events": "Events",
  "Entities": "Entities",
  "The current project has no documents yet.": "Project hiện tại chưa có tài liệu.",
  "The graph appears after the project has documents, events, and entities.": "Graph sẽ hiển thị sau khi project có tài liệu, events và entities.",
  "No graph data yet": "Chưa có dữ liệu graph",
  "Upload documents and finish extraction to view entities, events, and relations.": "Tải tài liệu và hoàn tất trích xuất để xem entities, events và quan hệ.",
  "Search trace and raw model calls": "Trace tìm kiếm và log gọi model",
  "Search trace": "Trace tìm kiếm",
  "Raw logs": "Log thô",
  "No search trace yet": "Chưa có trace tìm kiếm",
  "Each chat or search clears this panel and shows the latest execution trace.": "Mỗi lần chat hoặc search sẽ làm mới panel này và hiển thị trace mới nhất.",
  "Data": "Dữ liệu",
  "Sync logs": "Đồng bộ logs",
  "Delete logs": "Xóa logs",
  "No raw logs yet": "Chưa có raw logs",
  "Raw requests and responses appear after upload, search, or chat triggers LLM / Embedding calls.": "Raw request/response sẽ xuất hiện sau khi upload, search hoặc chat gọi LLM / Embedding.",
  "Failed": "Thất bại",
  "Succeeded": "Thành công",
  "Request": "Request",
  "Response": "Response",
  "Processing queue": "Hàng đợi xử lý",
  "Collapse": "Thu gọn",
  "Expand": "Mở rộng",
  "No document selected": "Chưa chọn tài liệu",
  "Select a document to view processing results.": "Chọn tài liệu để xem kết quả xử lý.",
  "Processing status": "Trạng thái xử lý",
  "Created at": "Tạo lúc",
  "Embedding status": "Trạng thái embedding",
  "Chunk vectors": "Vector chunk",
  "Event vectors": "Vector event",
  "Entity vectors": "Vector entity",
  "List cards show dimensions and the first 8 sample values to confirm vectors were written to the database.": "Card danh sách hiển thị số chiều và 8 giá trị mẫu đầu để xác nhận vector đã ghi vào database.",
  "Clear": "Xóa",
  "Previous": "Trước",
  "Next": "Sau",
  "No matching chunks": "Không có chunk khớp",
  "No chunks yet": "Chưa có chunk",
  "Chunks appear here after document processing.": "Chunks sẽ xuất hiện sau khi xử lý tài liệu.",
  "No matching events": "Không có event khớp",
  "No events yet": "Chưa có event",
  "Events and related entities appear after extraction is enabled.": "Events và entities liên quan sẽ xuất hiện sau khi bật trích xuất.",
  "No matching entities": "Không có entity khớp",
  "No entities yet": "Chưa có entity",
  "Entities are aggregated here after event extraction.": "Entities được gom tại đây sau khi trích xuất event.",
  "Search mode": "Chế độ tìm kiếm",
  "Fast": "Nhanh",
  "Standard": "Chuẩn",
  "Entity full-text matching + qwen3-rerank, without LLM filtering.": "Match entity bằng full-text + qwen3-rerank, không dùng LLM để lọc.",
  "LLM extracts query entities + LLM reranking, useful for quality comparison.": "LLM trích xuất entity từ query + LLM rerank, phù hợp để so sánh chất lượng.",
  "Enter a search question": "Nhập câu hỏi tìm kiếm",
  "Result chunk": "Chunk kết quả",
  "No search results yet": "Chưa có kết quả tìm kiếm",
  "The search scope is fixed to the current project.": "Phạm vi tìm kiếm cố định trong project hiện tại.",
  "Loading settings": "Đang tải cài đặt",
  "Please wait.": "Vui lòng chờ.",
  "Keys only show configuration status and are never echoed in plaintext.": "Key chỉ hiển thị trạng thái cấu hình, không bao giờ hiện plaintext.",
  "Updated": "Cập nhật lúc",
  "Interface": "Giao diện",
  "Interface language": "Ngôn ngữ giao diện",
  "Auto": "Tự động",
  "Current display language: Chinese. Auto mode follows the browser language.": "Ngôn ngữ hiển thị hiện tại: Tiếng Trung. Chế độ tự động theo ngôn ngữ trình duyệt.",
  "Current display language: English. Auto mode follows the browser language.": "Ngôn ngữ hiển thị hiện tại: Tiếng Anh. Chế độ tự động theo ngôn ngữ trình duyệt.",
  "Embedding API base URL": "Base URL Embedding API",
  "Embedding model": "Embedding model",
  "Vector dimensions (database fixed)": "Số chiều vector (database cố định)",
  "Leave blank to keep unchanged": "Để trống nếu không đổi",
  "LLM API base URL": "Base URL LLM API",
  "LLM model": "LLM model",
  "Timeout in ms": "Timeout theo ms",
  "Retry count": "Số lần retry",
  "Search": "Tìm kiếm",
  "Default search mode": "Chế độ tìm kiếm mặc định",
  "Fast mode": "Chế độ nhanh",
  "Standard mode": "Chế độ chuẩn",
  "Default top-k": "Top-K mặc định",
  "Default chunking mode": "Chế độ chunking mặc định",
  "Heading strict": "Theo heading",
  "Token window": "Cửa sổ token",
  "Token limit": "Giới hạn token",
  "Overlap tokens": "Token overlap",
  "Danger zone": "Khu vực nguy hiểm",
  "Careful": "Cẩn thận",
  "Clear Embedding key": "Xóa Embedding key",
  "Clear LLM key": "Xóa LLM key",
  "Save settings": "Lưu cài đặt",
  "Select a project first": "Hãy chọn project trước",
  "Project MCP": "MCP của project",
  "Current project": "Project hiện tại",
  "Project binding": "Ràng buộc project",
  "Tool timeout": "Timeout tool",
  "JSON config": "Cấu hình JSON",
  "Available tools": "Tools có sẵn",
  "Input schema": "Schema input",
  "Call example": "Ví dụ gọi",
  "Copied": "Đã copy",
  "Copy": "Copy",
  "Citation": "Trích dẫn",
  "Event details": "Chi tiết event",
  "Entity details": "Chi tiết entity",
  "Source citation": "Trích dẫn nguồn",
  "Close": "Đóng",
  "Source document": "Tài liệu nguồn",
  "Unknown document": "Không rõ tài liệu",
  "Event content": "Nội dung event",
  "Related entities": "Entities liên quan",
  "No related entities.": "Không có entity liên quan.",
  "Related chunk": "Chunk liên quan",
  "No related chunk.": "Không có chunk liên quan.",
  "Type": "Loại",
  "Description": "Mô tả",
  "Original chunk": "Chunk gốc",
  "Not generated": "Chưa sinh",
  "This vector is not in the database yet.": "Vector này chưa có trong database.",
  "Queued": "Đang chờ",
  "Processing": "Đang xử lý",
  "Completed": "Hoàn tất",
  "Reading file": "Đọc file",
  "Parsing document": "Parse tài liệu",
  "Generating chunks": "Sinh chunks",
  "Embedding chunks": "Embedding chunks",
  "Extracting events": "Trích xuất events",
  "Embedding events and entities": "Embedding events và entities",
  "Writing graph": "Ghi graph",
  "Running": "Đang chạy",
  "Done": "Xong",
  "Start search": "Bắt đầu tìm kiếm",
  "Generate results": "Sinh kết quả",
  "Query embedding": "Embedding query",
  "BM25 match query entities": "BM25 match query entities",
  "Extract query entities": "Trích xuất query entities",
  "Retrieve related entities": "Recall entities liên quan",
  "Entity-linked events": "Events liên kết entity",
  "Title-vector event recall": "Recall event bằng vector title",
  "Fetch candidate event details": "Lấy chi tiết event ứng viên",
  "Event expansion": "Mở rộng event",
  "Coarse-rank events": "Coarse-rank events",
  "LLM rerank": "LLM rerank",
  "Rerank model rerank": "Rerank bằng model rerank",
  "Fetch related chunks": "Lấy chunks liên quan",
  "Fallback path": "Luồng fallback",
  "Unknown model": "Không rõ model",
  "Local rule fallback": "Fallback bằng luật nội bộ",
  "Tool": "Tool",
  "System": "System",
  "Pending": "Đang chờ"
};
