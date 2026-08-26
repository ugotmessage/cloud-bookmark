// 搜尋功能相關代碼
document.addEventListener("DOMContentLoaded", () => {
    let searchTimeout = null;
    const searchInput = document.getElementById("searchInput");
    const searchBox = document.querySelector(".search-box");

    // 添加搜尋建議容器
    const suggestionsContainer = document.createElement("div");
    suggestionsContainer.classList.add("search-suggestions");
    searchBox.appendChild(suggestionsContainer);

    // 添加搜尋功能
    searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        // 清除之前的計時器
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // 設置新的計時器來延遲搜尋（防抖）
        searchTimeout = setTimeout(() => {
            if (searchTerm.length > 0) {
                const suggestions = searchBookmarks(searchTerm);
                showSuggestions(suggestions);
            } else {
                hideSuggestions();
            }
        }, 300);
    });

    // 點擊外部時隱藏建議
    document.addEventListener("click", (e) => {
        if (!searchBox.contains(e.target)) {
            hideSuggestions();
        }
    });

    // 搜尋書籤函數
    // 修改 searchBookmarks 函數，添加錯誤處理
    function searchBookmarks(term) {
        const results = [];
        // 確保 window.bookmarks 存在且是陣列
        if (Array.isArray(window.bookmarks)) {
        window.bookmarks.forEach(bookmark => {
            if (bookmark.name && bookmark.url) {
                const nameMatch = bookmark.name.toLowerCase().includes(term);
                const urlMatch = bookmark.url.toLowerCase().includes(term);
                if (nameMatch || urlMatch) {
                    results.push(bookmark);
                }
            }
        });
        return results;
    }
        return results;
    }

    // 顯示搜尋建議
    function showSuggestions(suggestions) {
        suggestionsContainer.innerHTML = "";
        
        if (suggestions.length === 0) {
            suggestionsContainer.innerHTML = `
                <div class="suggestion-item">
                    <span class="material-icons">info</span>
                    <span class="suggestion-text">沒有找到相符的書籤</span>
                </div>`;
        } else {
            suggestions.forEach(bookmark => {
                const item = document.createElement("div");
                item.classList.add("suggestion-item");
                item.innerHTML = `
                    <span class="material-icons">bookmark</span>
                    <div class="suggestion-text">
                        <div>${bookmark.name}</div>
                        <div class="suggestion-folder">${bookmark.folder || "未分類"}</div>
                    </div>`;
                
                item.addEventListener("click", () => {
                    window.open(bookmark.url, "_blank");
                    hideSuggestions();
                    searchInput.value = "";
                });
                
                suggestionsContainer.appendChild(item);
            });
        }
        
        suggestionsContainer.classList.add("active");
    }

    // 隱藏搜尋建議
    function hideSuggestions() {
        suggestionsContainer.classList.remove("active");
    }
});