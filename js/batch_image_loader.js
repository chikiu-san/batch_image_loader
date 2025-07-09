import { app } from "/scripts/app.js";

async function updateImageList(widget, imageDir) {
    let files = [];
    if (imageDir && imageDir.trim() !== "") {
        try {
            const response = await fetch('/batch-loader/get-image-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_dir: imageDir })
            });
            if (response.ok) files = await response.json();
        } catch (e) { console.error("[BatchImageLoader] API Error:", e); }
    }
    const currentValue = widget.value;
    widget.options.values = files.length > 0 ? files : ["(Vide)"];
    if (files.includes(currentValue)) {
        widget.value = currentValue;
    } else {
        widget.value = files.length > 0 ? files[0] : "(Vide)";
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
                selectedImageInput[1].values = ["(Vide)"];
            }
        }
    },

    async nodeCreated(node) {
        if (node.constructor.type !== "BatchImageLoader") return;

        const imageDirWidget = node.widgets.find(w => w.name === "image_dir");
        const imageListWidget = node.widgets.find(w => w.name === "selected_image");
        const modeWidget = node.widgets.find(w => w.name === "mode");
        const indexWidget = node.widgets.find(w => w.name === "image_index");
        // NEW: Find the control_after_generate widget
        const controlWidget = node.widgets.find(w => w.name === "control_after_generate");

        const toggleWidgetVisibility = () => {
            const isSelectionMode = modeWidget.value === 'selection (fixed)';
            imageListWidget.hidden = !isSelectionMode;
            indexWidget.hidden = isSelectionMode;
            // NEW: Hide control widget in selection mode
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
        
        const originalOnClick = imageListWidget.onClick;

        imageListWidget.onClick = function(e) {
            if (originalOnClick) {
                originalOnClick.apply(this, arguments);
            }
            const dir = imageDirWidget.value;
            if (!dir) return;

            setTimeout(() => {
                const menu = document.querySelector(".litecontextmenu.litemenubar-panel");
                if (!menu) return;
                
                const onMouseOver = (evt) => {
                    const targetRow = evt.target.closest(".litemenu-entry");
                    if (!targetRow) return;

                    const filename = targetRow.textContent;
                    if (imageListWidget.options.values.includes(filename)) {
                        const url = new URL(`${window.location.origin}/batch-loader/view-preview`);
                        url.searchParams.append("image_dir", dir);
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