document.addEventListener("DOMContentLoaded", () => {
    window.bookmarks = []; // 設為全局變數
    let folderOrder = []; // 儲存資料夾順序
    let draggedItem = null; // 用於存儲被拖曳的項目
    let draggedItemType = null; // 'bookmark' 或 'folder'
   
    // 從 URL 獲取參數
    const urlParams = new URLSearchParams(window.location.search);
    let currentToken = urlParams.get('token') || ''; // 從 URL 獲取 token
    let currentBook = urlParams.get('book') || 'bookmarks'; // 從 URL 獲取書籤檔案名稱


    // 初始載入
    if (currentToken) {
        loadBookmarks();
    } else {
        console.log("error.");
    }

    // DOM 元素
    const bookmarkList = document.getElementById("bookmarks");
    const addBookmarkForm = document.getElementById("addBookmarkForm");
    const folderSelect = document.getElementById("folderSelect");
    const addFolderButton = document.getElementById("addFolder");
    const exportDataButton = document.getElementById("exportData");
    const importDataInput = document.getElementById("importData");
    const modal = document.getElementById("folderModal");
    const modalInput = document.getElementById("folderNameInput");
    const modalSubmitButton = document.getElementById("submitFolderButton");
    const modalCloseButton = document.getElementById("closeFolderModal");

    // 初始化：從後端載入書籤資料

    function loadBookmarks() {
        fetch(`api/load_bookmarks.php?token=${currentToken}&book=${currentBook}`)
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('載入失敗:', data.message);
                    alert(data.message);
                    return;
                }
                window.bookmarks = data.bookmarks || []; // 設為全局變數
                folderOrder = data.folderOrder || ["未分類"];
                renderBookmarks();
                updateFolderSelect();
            })
            .catch(error => {
                console.error('載入書籤時發生錯誤:', error);
                window.bookmarks = []; // 設為全局變數
                folderOrder = ["未分類"];
                renderBookmarks();
                updateFolderSelect();
            });
    }

    // 匯出書籤資料
    exportDataButton.addEventListener("click", () => {
        const dataStr = JSON.stringify({
            token: currentToken, // 新增：包含 token
            bookmarks: window.bookmarks, // 使用全局變數
            folderOrder: folderOrder
        });
        const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
        
        const exportLink = document.createElement("a");
        exportLink.setAttribute("href", dataUri);
        exportLink.setAttribute("download", `${currentBook}_backup.json`);
        document.body.appendChild(exportLink);
        exportLink.click();
        document.body.removeChild(exportLink);
    });

    // 匯入書籤資料
    importDataInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.bookmarks && Array.isArray(data.bookmarks)) {
                        window.bookmarks = data.bookmarks; // 設為全局變數
                        if (data.folderOrder && Array.isArray(data.folderOrder)) {
                            folderOrder = data.folderOrder;
                        } else {
                            folderOrder = Array.from(new Set(window.bookmarks.map(b => b.folder || "未分類"))); // 使用全局變數
                        }
                        saveBookmarks();
                        renderBookmarks();
                        updateFolderSelect();
                    }
                } catch (error) {
                    console.error("匯入失敗:", error);
                    alert("匯入失敗,請確認檔案格式是否正確");
                }
            };
            reader.readAsText(file);
        }
    });
    
    // 新增書籤
    addBookmarkForm.addEventListener("submit", (e) => {
                e.preventDefault();
        const name = document.getElementById("bookmarkName").value;
        const url = document.getElementById("bookmarkURL").value;
        const folder = folderSelect.value;

        const bookmark = { name, url, folder };
        window.bookmarks.push(bookmark); // 使用全局變數
                        saveBookmarks();
                        renderBookmarks();
        addBookmarkForm.reset();
            });

    // 打開新增資料夾的模態視窗
    addFolderButton.addEventListener("click", () => {
        modal.classList.remove("hidden");
        modalInput.value = "";
    });

    // 新增資料夾提交
    modalSubmitButton.addEventListener("click", () => {
        const folderName = modalInput.value.trim();
        if (folderName) {
            const folderExists = window.bookmarks.some(bookmark => bookmark.folder === folderName); // 使用全局變數
            if (!folderExists) {
                window.bookmarks.push({ name: null, url: null, folder: folderName }); // 使用全局變數
                folderOrder.push(folderName);
                    saveBookmarks();
                    renderBookmarks();
                    updateFolderSelect();
                }
        }
        modal.classList.add("hidden");
            });

    // 取消按鈕關閉模態視窗
    modalCloseButton.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    // 渲染書籤列表
    function renderBookmarks() {
        bookmarkList.innerHTML = "";
        const folders = {};
        // 分組書籤到資料夾
        window.bookmarks.forEach((bookmark) => { // 使用全局變數
            const folder = bookmark.folder || "未分類";
            if (!folders[folder]) {
                folders[folder] = [];
    }
            folders[folder].push(bookmark);
        });

        // 依照 folderOrder 的順序渲染資料夾
        folderOrder.forEach((folder) => {
            if (!folders[folder]) return;

            const folderNode = document.createElement("div");
            folderNode.classList.add("folder");
            folderNode.setAttribute("draggable", "true");
            folderNode.setAttribute("data-folder", folder);

            // 資料夾標題區域
            const folderHeader = document.createElement("div");
            folderHeader.classList.add("folder-header");

            const folderTitle = document.createElement("h3");
            folderTitle.textContent = folder;
            
            // 資料夾操作按鈕
            const folderActions = document.createElement("div");
            folderActions.classList.add("folder-actions");

            // 編輯資料夾按鈕
            const editFolderButton = document.createElement("button");
            editFolderButton.textContent = "編輯";
            editFolderButton.classList.add("btn", "btn-secondary", "btn-small");
            editFolderButton.addEventListener("click", () => {
                const newName = prompt("請輸入新的資料夾名稱:", folder);
                if (newName && newName !== folder) {
                    window.bookmarks.forEach(bookmark => { // 使用全局變數
                        if (bookmark.folder === folder) {
                            bookmark.folder = newName;
    }
                    });
                    const folderIndex = folderOrder.indexOf(folder);
                    if (folderIndex !== -1) {
                        folderOrder[folderIndex] = newName;
                    }
                    saveBookmarks();
                    renderBookmarks();
                    updateFolderSelect();
                }
            });

            // 刪除資料夾按鈕
            const deleteFolderButton = document.createElement("button");
            deleteFolderButton.textContent = "刪除";
            deleteFolderButton.classList.add("btn", "btn-danger", "btn-small");
            deleteFolderButton.addEventListener("click", () => {
                if (confirm(`確定要刪除 "${folder}" 資料夾嗎？`)) {
                    window.bookmarks = window.bookmarks.filter(b => b.folder !== folder); // 使用全局變數
                    folderOrder = folderOrder.filter(f => f !== folder);
                    saveBookmarks();
                    renderBookmarks();
                    updateFolderSelect();
                }
            });

            folderActions.appendChild(editFolderButton);
            folderActions.appendChild(deleteFolderButton);
            folderHeader.appendChild(folderTitle);
            folderHeader.appendChild(folderActions);

            // 添加展開/收合功能
            folderHeader.addEventListener("click", () => {
                const ul = folderNode.querySelector("ul");
                if (ul) {
                    ul.classList.toggle("hidden");
                }
            });

            folderNode.appendChild(folderHeader);
            const ul = document.createElement("ul");
            if (folder !== "未分類") ul.classList.add("hidden");
                    
            // 渲染書籤
            folders[folder].forEach((bookmark) => {
                if (bookmark.name && bookmark.url) {
                    const li = document.createElement("li");
                    
                    const bookmarkContent = document.createElement("div");
                    bookmarkContent.classList.add("bookmark-content");

                    const bookmarkName = document.createElement("a");
                    bookmarkName.classList.add("bookmark-name");
                    bookmarkName.href = bookmark.url;
                    bookmarkName.target = "_blank";
                    bookmarkName.textContent = bookmark.name;

                    const bookmarkActions = document.createElement("div");
                    bookmarkActions.classList.add("bookmark-actions");

                    // 編輯書籤按鈕
                    const editButton = document.createElement("button");
                    editButton.textContent = "編輯";
                    editButton.classList.add("btn", "btn-secondary", "btn-small");
                    editButton.addEventListener("click", () => {
                        const newName = prompt("請輸入新的書籤名稱:", bookmark.name);
                        const newUrl = prompt("請輸入新的網址:", bookmark.url);
                        if (newName && newUrl) {
                            bookmark.name = newName;
                            bookmark.url = newUrl;
                        saveBookmarks();
                        renderBookmarks();
                    }
                    });
                    // 移動書籤按鈕
                    const moveButton = document.createElement("button");
                    moveButton.textContent = "移動";
                    moveButton.classList.add("btn", "btn-move", "btn-small");
                    moveButton.addEventListener("click", (e) => {
                        e.stopPropagation();
                        // 創建移動選單
                        const moveMenu = document.createElement("div");
                        moveMenu.classList.add("move-menu");
                        // 添加所有可用的資料夾選項
                        folderOrder.forEach(targetFolder => {
                            if (targetFolder !== bookmark.folder) {
                                const option = document.createElement("button");
                                option.textContent = targetFolder === "" ? "未分類" : targetFolder;
                                option.addEventListener("click", () => {
                                    bookmark.folder = targetFolder;
                        saveBookmarks();
                        renderBookmarks();
                                    document.body.removeChild(moveMenu);
            });
                                moveMenu.appendChild(option);
    }
                        });
                        // 定位選單
                        const rect = moveButton.getBoundingClientRect();
                        moveMenu.style.position = "fixed";
                        moveMenu.style.top = `${rect.bottom + 5}px`;
                        moveMenu.style.left = `${rect.left}px`;

                        // 添加到 body 並設置點擊外部關閉
                        document.body.appendChild(moveMenu);
                        
                        const closeMenu = (e) => {
                            if (!moveMenu.contains(e.target) && e.target !== moveButton) {
                                document.body.removeChild(moveMenu);
                                document.removeEventListener("click", closeMenu);
                            }
        };
        
                        // 延遲添加事件監聽器，避免立即觸發
                        setTimeout(() => {
                            document.addEventListener("click", closeMenu);
                        }, 0);
            });

                    // 刪除書籤按鈕
                    const deleteButton = document.createElement("button");
                    deleteButton.textContent = "刪除";
                    deleteButton.classList.add("btn", "btn-danger", "btn-small");
                    deleteButton.addEventListener("click", () => {
                        if (confirm(`確定要刪除書籤 "${bookmark.name}" 嗎？`)) {
                            window.bookmarks.splice(window.bookmarks.indexOf(bookmark), 1); // 使用全局變數
                            saveBookmarks();
                            renderBookmarks();
    }
                    });

                    bookmarkActions.appendChild(editButton);
                    bookmarkActions.appendChild(moveButton);
                    bookmarkActions.appendChild(deleteButton);
                    bookmarkContent.appendChild(bookmarkName);
                    bookmarkContent.appendChild(bookmarkActions);
                    li.appendChild(bookmarkContent);
                    li.setAttribute("draggable", "true");
                    li.setAttribute("data-bookmark-id", window.bookmarks.indexOf(bookmark)); // 使用全局變數
                    // 添加書籤的拖曳事件監聽器
                    li.addEventListener("dragstart", (e) => {
                        draggedItem = li;
                        draggedItemType = "bookmark";
                        e.dataTransfer.setData("text/plain", bookmarks.indexOf(bookmark));
                        setTimeout(() => li.classList.add("dragging"), 0);
            });

                    li.addEventListener("dragend", () => {
                        li.classList.remove("dragging");
                        draggedItem = null;
                        draggedItemType = null;
        });

                    ul.appendChild(li);
    }
            });

            folderNode.appendChild(ul);

            // 在資料夾的建立部分添加拖曳事件
            folderNode.setAttribute("draggable", "true");
            folderNode.setAttribute("data-folder", folder);

            // 添加資料夾的拖曳事件監聽器
            folderNode.addEventListener("dragstart", (e) => {
                draggedItem = folderNode;
                draggedItemType = "folder";
                e.dataTransfer.setData("text/plain", folder);
                setTimeout(() => folderNode.classList.add("dragging"), 0);
            });

            folderNode.addEventListener("dragend", () => {
                folderNode.classList.remove("dragging");
                draggedItem = null;
                draggedItemType = null;
            });

            folderNode.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (!folderNode.classList.contains("drag-over")) {
                    folderNode.classList.add("drag-over");
                }
            });

            folderNode.addEventListener("dragleave", () => {
                folderNode.classList.remove("drag-over");
            });

            folderNode.addEventListener("drop", (e) => {
                e.preventDefault();
                folderNode.classList.remove("drag-over");
                
                if (draggedItemType === "folder" && draggedItem !== folderNode) {
                    // 重新排序資料夾
                    const draggingFolder = draggedItem.getAttribute("data-folder");
                    const targetFolder = folder;
                    const draggingIndex = folderOrder.indexOf(draggingFolder);
                    const targetIndex = folderOrder.indexOf(targetFolder);
                    
                    if (draggingIndex !== -1 && targetIndex !== -1) {
                        folderOrder.splice(draggingIndex, 1);
                        folderOrder.splice(targetIndex, 0, draggingFolder);
                        saveBookmarks();
                        renderBookmarks();
                    }
                } else if (draggedItemType === "bookmark") {
                    // 移動書籤到新資料夾
                    const bookmarkId = parseInt(draggedItem.getAttribute("data-bookmark-id"));
                    const bookmark = bookmarks[bookmarkId];
                    if (bookmark) {
                        bookmark.folder = folder;
                        saveBookmarks();
                        renderBookmarks();
                    }
                }
            });

            bookmarkList.appendChild(folderNode);
        });
    }

    // 更新資料夾選單
    function updateFolderSelect() {
        folderSelect.innerHTML = "<option value=''>未分類</option>";
        folderOrder.forEach((folder) => {
            if (folder !== "未分類") {
                const option = document.createElement("option");
                option.value = folder;
                option.textContent = folder;
                folderSelect.appendChild(option);
            }
        });
    }

    // 修改儲存書籤的函數
    function saveBookmarks() {
        const dataToSave = {
            bookmarks: bookmarks,
            folderOrder: folderOrder
        };
        
        fetch(`api/save_bookmarks.php?token=${currentToken}&book=${currentBook}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSave),
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('儲存書籤失敗:', data.message);
                alert(data.message);
            }
        })
        .catch(error => console.error('儲存書籤時發生錯誤:', error));
    }

    // 初始載入
    if (currentToken) {
        loadBookmarks();
    }
});
