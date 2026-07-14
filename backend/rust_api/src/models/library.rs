use serde::{Deserialize, Serialize};

/// 文档:图书馆一等公民,document_id = sha256(文件字节)。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DocumentRecord {
    pub document_id: String,
    pub title: String,
    pub authors_json: String,
    pub year: Option<i64>,
    pub doi: String,
    pub source_filename: String,
    pub page_count: u32,
    pub bytes: u64,
    pub active_job_id: Option<String>,
    pub reading_status: String,
    pub added_at: String,
    pub last_opened_at: Option<String>,
    pub updated_at: String,
    pub tags: Vec<String>,
}

/// 收藏:锚点 = (document_id, job_id, page_idx, block_id[, 选区]) + 引文快照。
/// job_id 标记锚点所在的块空间版本;被引用的 job 不允许单独删除。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FavoriteRecord {
    pub favorite_id: String,
    pub document_id: String,
    pub job_id: String,
    pub page_idx: i64,
    pub block_id: String,
    pub char_start: Option<i64>,
    pub char_end: Option<i64>,
    pub kind: String,
    pub quote_text: String,
    pub translated_quote_text: String,
    pub note: String,
    /// 图片附件(assets.asset_id,内容寻址);空串 = 纯文字收藏
    #[serde(default)]
    pub asset_id: String,
    /// 截图剪裁矩形几何(前端坐标系,整存整取)
    #[serde(default)]
    pub rect_json: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 内容寻址的二进制资产(收藏截图等);文件本体在 data/assets/<2>/<hash>。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AssetRecord {
    pub asset_id: String,
    pub mime: String,
    pub bytes: u64,
    pub width: Option<i64>,
    pub height: Option<i64>,
    pub created_at: String,
}

/// AI 问答会话。document_id 为空 = 全库问答。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ConversationRecord {
    pub conversation_id: String,
    pub title: String,
    pub document_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub message_count: i64,
}

/// 会话消息。citations_json 是软锚点快照:job 删除后跳转失效但内容不丢。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageRecord {
    pub message_id: String,
    pub conversation_id: String,
    pub seq: i64,
    pub role: String,
    pub content: String,
    pub citations_json: String,
    pub tool_trace_json: String,
    pub model: String,
    pub created_at: String,
}

/// blocks_fts 的一行(派生索引,可随时由任务产物重建)。
#[derive(Debug, Clone)]
pub struct FtsBlockRow {
    pub page_idx: i64,
    pub block_id: String,
    pub source_text: String,
    pub translated_text: String,
}

/// 全文检索命中:带完整锚点,前端可跳转阅读器原位。
#[derive(Debug, Serialize, Clone)]
pub struct BlockSearchHit {
    pub document_id: String,
    pub job_id: String,
    pub page_idx: i64,
    pub block_id: String,
    pub source_snippet: String,
    pub translated_snippet: String,
}
