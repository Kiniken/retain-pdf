//! AI conversation history (soft-anchor citations).

use crate::error::AppError;
use crate::models::api::{
    AppendMessageInput, ConversationDetailView, ConversationListView, ConversationMutationResult,
    ConversationRecord, CreateConversationInput, ListConversationsQuery, MessageRecord,
};
use crate::models::domain::build_job_id;

use super::LibraryDeps;

pub fn create_conversation(
    deps: &LibraryDeps<'_>,
    payload: &CreateConversationInput,
) -> Result<ConversationRecord, AppError> {
    let document_id = payload.document_id.trim();
    let document_id = if document_id.is_empty() {
        None
    } else {
        deps.db
            .get_document(document_id)
            .map_err(|_| AppError::not_found(format!("document not found: {document_id}")))?;
        Some(document_id)
    };
    Ok(deps.db.create_conversation(
        &format!("conv-{}", build_job_id()),
        payload.title.trim(),
        document_id,
    )?)
}

pub fn list_conversations(
    deps: &LibraryDeps<'_>,
    query: &ListConversationsQuery,
) -> Result<ConversationListView, AppError> {
    let conversations = deps
        .db
        .list_conversations(query.limit.clamp(1, 200), query.offset)?;
    Ok(ConversationListView { conversations })
}

pub fn get_conversation(
    deps: &LibraryDeps<'_>,
    conversation_id: &str,
) -> Result<ConversationDetailView, AppError> {
    let conversation = deps
        .db
        .get_conversation(conversation_id)?
        .ok_or_else(|| AppError::not_found(format!("conversation not found: {conversation_id}")))?;
    let messages = deps.db.list_messages(conversation_id, 500)?;
    Ok(ConversationDetailView {
        conversation,
        messages,
    })
}

pub fn delete_conversation(
    deps: &LibraryDeps<'_>,
    conversation_id: &str,
) -> Result<ConversationMutationResult, AppError> {
    if !deps.db.delete_conversation(conversation_id)? {
        return Err(AppError::not_found(format!(
            "conversation not found: {conversation_id}"
        )));
    }
    Ok(ConversationMutationResult { deleted: true })
}

pub fn append_message(
    deps: &LibraryDeps<'_>,
    conversation_id: &str,
    payload: AppendMessageInput,
) -> Result<MessageRecord, AppError> {
    if !matches!(payload.role.as_str(), "user" | "assistant") {
        return Err(AppError::bad_request("role must be user or assistant"));
    }
    if payload.content.trim().is_empty() {
        return Err(AppError::bad_request("content must not be empty"));
    }
    if deps.db.get_conversation(conversation_id)?.is_none() {
        return Err(AppError::not_found(format!(
            "conversation not found: {conversation_id}"
        )));
    }
    let citations = if payload.citations_json.trim().is_empty() {
        "[]".to_string()
    } else {
        payload.citations_json
    };
    let trace = if payload.tool_trace_json.trim().is_empty() {
        "[]".to_string()
    } else {
        payload.tool_trace_json
    };
    Ok(deps.db.append_message(
        conversation_id,
        &format!("msg-{}", build_job_id()),
        &payload.role,
        &payload.content,
        &citations,
        &trace,
        &payload.model,
    )?)
}
