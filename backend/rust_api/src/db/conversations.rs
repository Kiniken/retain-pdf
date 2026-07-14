use anyhow::{Context, Result};
use rusqlite::{params, OptionalExtension};

use crate::models::domain::now_iso;
use crate::models::library::{ConversationRecord, MessageRecord};

use super::Db;

const CONVERSATION_COLUMNS: &str =
    "c.conversation_id, c.title, c.document_id, c.created_at, c.updated_at,
     (SELECT COUNT(*) FROM ai_messages m WHERE m.conversation_id = c.conversation_id)";

impl Db {
    pub fn create_conversation(
        &self,
        conversation_id: &str,
        title: &str,
        document_id: Option<&str>,
    ) -> Result<ConversationRecord> {
        let conn = self.connect()?;
        let now = now_iso();
        conn.execute(
            r#"
            INSERT INTO ai_conversations (conversation_id, title, document_id, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?4)
            "#,
            params![conversation_id, title, document_id, now],
        )?;
        self.get_conversation(conversation_id)?
            .context("conversation vanished after insert")
    }

    pub fn get_conversation(&self, conversation_id: &str) -> Result<Option<ConversationRecord>> {
        let conn = self.connect()?;
        let record = conn
            .query_row(
                &format!(
                    "SELECT {CONVERSATION_COLUMNS} FROM ai_conversations c WHERE c.conversation_id = ?1"
                ),
                params![conversation_id],
                row_to_conversation,
            )
            .optional()?;
        Ok(record)
    }

    pub fn list_conversations(&self, limit: u32, offset: u32) -> Result<Vec<ConversationRecord>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(&format!(
            "SELECT {CONVERSATION_COLUMNS} FROM ai_conversations c ORDER BY c.updated_at DESC LIMIT ?1 OFFSET ?2"
        ))?;
        let rows = stmt.query_map(params![limit as i64, offset as i64], row_to_conversation)?;
        let mut conversations = Vec::new();
        for row in rows {
            conversations.push(row?);
        }
        Ok(conversations)
    }

    pub fn delete_conversation(&self, conversation_id: &str) -> Result<bool> {
        let conn = self.connect()?;
        let changed = conn.execute(
            "DELETE FROM ai_conversations WHERE conversation_id = ?1",
            params![conversation_id],
        )?;
        Ok(changed > 0)
    }

    pub fn list_messages(&self, conversation_id: &str, limit: u32) -> Result<Vec<MessageRecord>> {
        let conn = self.connect()?;
        // 取最近 limit 条,但按时间正序返回(直接作为 LLM 上下文的顺序)
        let mut stmt = conn.prepare(
            r#"
            SELECT message_id, conversation_id, seq, role, content,
                   citations_json, tool_trace_json, model, created_at
            FROM (
                SELECT * FROM ai_messages
                WHERE conversation_id = ?1
                ORDER BY seq DESC LIMIT ?2
            ) ORDER BY seq ASC
            "#,
        )?;
        let rows = stmt.query_map(params![conversation_id, limit as i64], row_to_message)?;
        let mut messages = Vec::new();
        for row in rows {
            messages.push(row?);
        }
        Ok(messages)
    }

    /// 追加消息:seq 自增、刷新会话时间;会话标题为空时取首条 user 消息前缀。
    pub fn append_message(
        &self,
        conversation_id: &str,
        message_id: &str,
        role: &str,
        content: &str,
        citations_json: &str,
        tool_trace_json: &str,
        model: &str,
    ) -> Result<MessageRecord> {
        let mut conn = self.connect()?;
        let now = now_iso();
        let tx = conn.transaction()?;
        let next_seq: i64 = tx.query_row(
            "SELECT COALESCE(MAX(seq), 0) + 1 FROM ai_messages WHERE conversation_id = ?1",
            params![conversation_id],
            |row| row.get(0),
        )?;
        tx.execute(
            r#"
            INSERT INTO ai_messages (
                message_id, conversation_id, seq, role, content,
                citations_json, tool_trace_json, model, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            "#,
            params![
                message_id,
                conversation_id,
                next_seq,
                role,
                content,
                citations_json,
                tool_trace_json,
                model,
                now,
            ],
        )?;
        tx.execute(
            "UPDATE ai_conversations SET updated_at = ?1 WHERE conversation_id = ?2",
            params![now, conversation_id],
        )?;
        if role == "user" {
            let title: String = content.chars().take(40).collect();
            tx.execute(
                "UPDATE ai_conversations SET title = ?1 WHERE conversation_id = ?2 AND title = ''",
                params![title, conversation_id],
            )?;
        }
        tx.commit()?;
        Ok(MessageRecord {
            message_id: message_id.to_string(),
            conversation_id: conversation_id.to_string(),
            seq: next_seq,
            role: role.to_string(),
            content: content.to_string(),
            citations_json: citations_json.to_string(),
            tool_trace_json: tool_trace_json.to_string(),
            model: model.to_string(),
            created_at: now,
        })
    }
}

fn row_to_conversation(row: &rusqlite::Row<'_>) -> rusqlite::Result<ConversationRecord> {
    Ok(ConversationRecord {
        conversation_id: row.get(0)?,
        title: row.get(1)?,
        document_id: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
        message_count: row.get(5)?,
    })
}

fn row_to_message(row: &rusqlite::Row<'_>) -> rusqlite::Result<MessageRecord> {
    Ok(MessageRecord {
        message_id: row.get(0)?,
        conversation_id: row.get(1)?,
        seq: row.get(2)?,
        role: row.get(3)?,
        content: row.get(4)?,
        citations_json: row.get(5)?,
        tool_trace_json: row.get(6)?,
        model: row.get(7)?,
        created_at: row.get(8)?,
    })
}
