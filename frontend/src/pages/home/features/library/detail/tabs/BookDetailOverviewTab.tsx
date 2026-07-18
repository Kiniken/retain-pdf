// Tab「书籍简介」——标题 / 作者 / 标签 / 编辑。
// 改简介相关 UI 只动本文件（或 TitleMetaPanel）。

import { TitleMetaPanel } from "../panels/TitleMetaPanel.jsx";

/**
 * @param {object} props 透传给 TitleMetaPanel 的业务 props
 */
export function BookDetailOverviewTab(props) {
  return (
    <div
      className="book-detail-tab-overview space-y-5"
      data-book-detail-tab="overview"
    >
      <TitleMetaPanel {...props} />
    </div>
  );
}
