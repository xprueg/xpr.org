export default class vocabEditController {
    abortControllerForEventListener;
    container_clone = null;

    constructor(baseController, state) {
        this.baseController = baseController;
        this.state = state;
    }

    get container() {
        return document.getElementById("vocabList");
    }

    get list() {
        return document.getElementById("vocabListEntries");
    }

    get rows() {
        return this.list.querySelectorAll(".vocabEntryRow");
    }

    activate() {
        this.state.setState("vocablist", this.state.vocablist.EDIT);

        this.container_clone = this.container.cloneNode(true);

        this.makeCellsEditable(this.container);
        this.spawnEmptyEditableRow();

        const { signal } = this.abortControllerForEventListener = new AbortController();

        this.list.addEventListener("focus", evt => {
            const { target } = evt;

            const is_vocab_entry = target.classList.contains("vocabEntry");
            const is_last_row = target.matches("li:last-child :scope");

            if (is_vocab_entry && is_last_row)
                this.spawnEmptyEditableRow();
        }, { capture: true, signal });

        this.list.addEventListener("keydown", evt => {
            const { ctrlKey, key, target } = evt;

            if (ctrlKey && key === "Backspace" && target.classList.contains("vocabEntry")) {
                evt.preventDefault();
                this.deleteRow(target.closest(".vocabEntryRow"));
            }
        }, { signal });

        setTimeout( _ => document.querySelector("[contenteditable]").focus());
    }

    ///
    /// [*] Restore deleted rows on CANCEL
    /// [>] action :: string CANCEL|SAVE
    /// [<] void
    deactivate(action) {
        this.abortControllerForEventListener.abort();
        const restore_original_state = action === "CANCEL";

        if (restore_original_state) {
            this.container.replaceWith(this.container_clone);
        } else {
            for (const cell of this.container.querySelectorAll("[data-can-contenteditable]")) {
                cell.removeAttribute("contenteditable");
                cell.textContent = cell.textContent.trim();
            }

            for (const row of this.list.querySelectorAll(".vocabEntryRow")) {
                const cells_with_content = Array
                    .from(row.querySelectorAll(".vocabEntry"))
                    .filter(cell => cell.matches(":not(:empty)"))
                    .length;

                if (cells_with_content === 0)
                    row.remove();
            }
        }

        this.container_clone = null;
    }

    deleteRow(row) {
        const x = row.nextElementSibling || row.previousElementSibling;

        row.remove();

        if (x)
            x.querySelector(".vocabEntry").focus();
        else
            this.spawnEmptyEditableRow();
    }

    makeCellsEditable(scope) {
        for (const cell of scope.querySelectorAll("[data-can-contenteditable]"))
            cell.setAttribute("contenteditable", true);
    }

    spawnEmptyEditableRow() {
        const row = this.baseController.spawnEmptyRow();
        this.makeCellsEditable(row);
        row.dataset.untrackedRow = true;
        return row;
    }
};