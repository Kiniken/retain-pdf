// 分类(合集)域的唯一装配面。这是一个纯 React 时代新建的域,没有旧世界
// controller.js 可复用,所以不套其余域那套 mountXFeature()/viewPort 壳子——
// 直接是一层绑好 apiPrefix 的薄函数集合,composition.js 建一次实例,
// CategoriesView.jsx/CollectionManageDialog.jsx 经 services.collections.controller
// 消费。

import {
  addDocumentsToCollection,
  createCollection,
  deleteCollection,
  listCollections,
  patchCollection,
  removeDocumentFromCollection,
} from "../../../../js/api/collections.js";
import { fetchDocumentList } from "../../../../js/api/documents.js";
import { fetchLibraryBookList } from "../../../../js/api/library-books.js";

export function createCollectionsController({ apiPrefix }) {
  return {
    listCollections: () => listCollections(apiPrefix),
    createCollection: (payload) => createCollection(apiPrefix, payload),
    patchCollection: (collectionId, payload) => patchCollection(apiPrefix, collectionId, payload),
    deleteCollection: (collectionId) => deleteCollection(apiPrefix, collectionId),
    addDocuments: (collectionId, documentIds) => addDocumentsToCollection(apiPrefix, collectionId, documentIds),
    removeDocument: (collectionId, documentId) => removeDocumentFromCollection(apiPrefix, collectionId, documentId),

    // 管理弹窗的勾选清单:全部文档(document 形状,含 title),够用不需要
    // job 卡片的视觉字段。
    listAllDocuments: async () => {
      const { documents = [] } = await fetchDocumentList(apiPrefix, { limit: 500 });
      return documents;
    },

    // 某个文件夹当前的成员 document_id 集合(管理弹窗打开已有分类时用来
    // 勾选初始状态)。
    async listCollectionDocumentIds(collectionId) {
      const { documents = [] } = await fetchDocumentList(apiPrefix, { collectionId, limit: 500 });
      return documents.map((doc) => doc.document_id);
    },

    // 文件夹展开时的桥接路径(设计决策 2):collection_id → documents(拿
    // active_job_id)→ job_ids 过滤 library/books → 复用 RecentJobCard 需要的
    // job 卡片数据。图书馆主页数据链路本身不动。
    async fetchFolderBooks(collectionId) {
      const { documents = [] } = await fetchDocumentList(apiPrefix, { collectionId, limit: 500 });
      const jobIds = documents.map((doc) => doc.active_job_id).filter(Boolean);
      if (!jobIds.length) {
        return [];
      }
      const { items = [] } = await fetchLibraryBookList(apiPrefix, { jobIds, limit: jobIds.length });
      return items;
    },
  };
}
