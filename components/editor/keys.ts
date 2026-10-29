/** Query keys + the set invalidated after any editorial action on an article. */
export const articleKey = (id: string) => ['editor', 'article', id];
export const historyKey = (id: string) => ['editor', 'article', id, 'history'];
export const refreshArticle = (id: string) => [articleKey(id), ['editor', 'articles'], ['editor', 'dashboard'], ['editor', 'major-changes']];
