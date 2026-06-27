import { app } from "/scripts/app.js";

const EMPTY_LABEL = "(no images)";

async function fetchFolderList() {
    try {
        const response = await fetch('/batch-loader/get-folder-list');
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("[BatchImageLoader] API Error (folder list):", e);
    }
    return null;
}

async function updateImageList(widget, folder) {
    let files = [];
    if (folder && folder.trim() !== "") {
        try {
            const response = await fetch('/batch-loader/get-image-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: folder })
            });
            if (response.ok) files = await response.json();
        } catch (e) { console.error("[BatchImageLoader] API Error:", e); }
    }
    const currentValue = widget.value;
    widget.options.values = files.length > 0 ? files : [EMPTY_LABEL];
    if (files.includes(currentValue)) {
        widget.value = currentValue;
    } else {
        widget.value = files.length > 0 ? files[0] : EMPTY_LABEL;
    }
}

const previewEl = document.createElement("div");
previewEl.id = "batchloader-preview";
previewEl.style.cssText = "position: fixed; display: none; z-index: 1001; border: 1px solid #ccc; background: #222; box-shadow: 0 0 10px rgba(0,0,0,0.5);";
previewEl.innerHTML = `<img src="" style="max-width: 384px; max-height: 384px; object-fit: contain; display: block;">`;
document.body.appendChild(previewEl);
const previewImg = previewEl.querySelector("img");

app.registerExtension({
    name: "Comfy.BatchImageLoader.Final.Working",

    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "BatchImageLoader") {
            const selectedImageInput = nodeData.input.required.selected_image;
            if (selectedImageInput) {
                selectedImageInput[0] = "COMBO";
                if (!selectedImageInput[1]) selectedImageInput[1] = {};
                selectedImageInput[1].values = [EMPTY_LABEL];
            }
        }
    },

    async nodeCreated(node) {
        if (node.constructor.type !== "BatchImageLoader") return;

        // image_dir is now a native COMBO of folders discovered server-side.
        const imageDirWidget = node.widgets.find(w => w.name === "image_dir");
        const imageListWidget = node.widgets.find(w => w.name === "selected_image");
        const modeWidget = node.widgets.find(w => w.name === "mode");
        const indexWidget = node.widgets.find(w => w.name === "image_index");
        // Find the control_after_generate widget
        const controlWidget = node.widgets.find(w => w.name === "control_after_generate");

        const toggleWidgetVisibility = () => {
            const isSelectionMode = modeWidget.value === 'selection (fixed)';
            imageListWidget.hidden = !isSelectionMode;
            indexWidget.hidden = isSelectionMode;
            // Hide control widget in selection mode
            if (controlWidget) {
                controlWidget.hidden = isSelectionMode;
            }
            node.computeSize();
        };

        modeWidget.callback = toggleWidgetVisibility;

        const originalDirCallback = imageDirWidget.callback;
        imageDirWidget.callback = (value) => {
            if (originalDirCallback) originalDirCallback.call(imageDirWidget, value);
            updateImageList(imageListWidget, value);
        };

        // 🔄 Refresh button: re-scan the input directory so newly uploaded folders
        // (e.g. added through MimicPC's file manager) appear without reloading ComfyUI.
        const refreshFolders = async () => {
            const folders = await fetchFolderList();
            if (folders && folders.length > 0) {
                imageDirWidget.options.values = folders;
                if (!folders.includes(imageDirWidget.value)) {
                    imageDirWidget.value = folders[0];
                }
            }
            await updateImageList(imageListWidget, imageDirWidget.value);
            node.setDirtyCanvas(true, true);
        };

        const refreshButton = node.addWidget("button", "🔄 Refresh folders", null, refreshFolders);
        refreshButton.serialize = false;
        // Place the button right below the folder dropdown.
        const dirIdx = node.widgets.indexOf(imageDirWidget);
        const btnIdx = node.widgets.indexOf(refreshButton);
        if (btnIdx > -1 && dirIdx > -1) {
            node.widgets.splice(btnIdx, 1);
            node.widgets.splice(dirIdx + 1, 0, refreshButton);
        }

        const originalOnClick = imageListWidget.onClick;

        imageListWidget.onClick = function(e) {
            if (originalOnClick) {
                originalOnClick.apply(this, arguments);
            }
            const folder = imageDirWidget.value;
            if (!folder) return;

            setTimeout(() => {
                const menu = document.querySelector(".litecontextmenu.litemenubar-panel");
                if (!menu) return;

                const onMouseOver = (evt) => {
                    const targetRow = evt.target.closest(".litemenu-entry");
                    if (!targetRow) return;

                    const filename = targetRow.textContent;
                    if (imageListWidget.options.values.includes(filename)) {
                        const url = new URL(`${window.location.origin}/batch-loader/view-preview`);
                        url.searchParams.append("folder", folder);
                        url.searchParams.append("filename", filename);

                        const positionPreview = () => {
                            previewEl.style.display = 'block';
                            const menuRect = menu.getBoundingClientRect();
                            const previewRect = previewEl.getBoundingClientRect();

                            let newLeft = menuRect.left - previewRect.width - 5;
                            if (newLeft < 0) newLeft = menuRect.right + 5;

                            let newTop = targetRow.getBoundingClientRect().top;
                            if (newTop + previewRect.height > window.innerHeight) {
                                newTop = window.innerHeight - previewRect.height - 5;
                            }

                            previewEl.style.left = `${newLeft}px`;
                            previewEl.style.top = `${newTop}px`;
                        };

                        previewImg.src = url.href;
                        if (previewImg.complete) positionPreview();
                        else previewImg.onload = positionPreview;
                    }
                };

                const onMouseOut = () => { previewEl.style.display = 'none'; };

                const cleanupListeners = () => {
                    onMouseOut();
                    menu.removeEventListener("mouseover", onMouseOver);
                    window.removeEventListener('mousedown', cleanupListeners, true);
                };

                menu.addEventListener("mouseover", onMouseOver);
                window.addEventListener('mousedown', cleanupListeners, true);

            }, 10);
        };

        setTimeout(() => {
            updateImageList(imageListWidget, imageDirWidget.value);
            toggleWidgetVisibility();
        }, 100);
    }
});
