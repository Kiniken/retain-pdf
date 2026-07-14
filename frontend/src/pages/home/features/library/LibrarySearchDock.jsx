// 底部悬浮搜索条——原先随方案 A 并进顶部导航栏,用户明确要求挪回底部
// (搜索是"翻书"动作,离内容更近;添加/设置留在顶部当常驻入口)。只在
// "图书馆"tab 显示("分类"下搜索语义不同,同既有决策)。

import { useLibrarySearchBinding } from "./RecentJobsLibrary.jsx";

export function LibrarySearchDock() {
  const { query, onSearchChange } = useLibrarySearchBinding();

  return (
    <div className="library-search-dock" aria-label="搜索">
      <div className="library-search-bar" role="search">
        <input
          id="library-search-input"
          type="search"
          autoComplete="off"
          placeholder="搜索书籍、任务或日期"
          aria-label="搜索书籍"
          value={query}
          onChange={onSearchChange}
        />
      </div>
    </div>
  );
}
