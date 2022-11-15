export default class vocabEditController {
    #abortControllerForEventListener;
    #scope = {
        header: vocabListHeader,
        list: vocabListEntries,
    };

    constructor(baseController, state) {
        this.baseController = baseController;
        this.state = state;
    }

    activate() {
        this.state.setState("vocablist", this.state.vocablist.EDIT);

        this.makeCellsEditable(this.#scope.header);
        this.makeCellsEditable(this.#scope.list);

        if (Array.from(this.#scope.list.querySelectorAll(".vocabEntryRow")).length === 0)
            this.spawnEmptyEditableRow();

        const { signal } = this.#abortControllerForEventListener = new AbortController();
        this.#scope.list.addEventListener("focus", evt => {
            const { target } = evt;
// FIXME Ignore markedForDeletion rows!
            const is_vocab_entry = target.classList.contains("vocabEntry");
            const is_last_cell = target.matches("li:last-child span:last-child");

            if (is_vocab_entry && is_last_cell)
                this.spawnEmptyEditableRow();
        }, { capture: true, signal });

        this.#scope.list.addEventListener("keydown", evt => {
            const { shiftKey, key, target } = evt;

            if (shiftKey && key === "Backspace" && target.classList.contains("vocabEntry")) {
                evt.preventDefault();
                this.markRowForDeletion(target.closest(".vocabEntryRow"));
            }
        }, { signal });

        document.querySelector("[contenteditable]").focus();
    }

    ///
    /// [*] Restore deleted rows on CANCEL
    /// [>] action :: string CANCEL|SAVE
    /// [<] void
    deactivate(action) {
        this.#abortControllerForEventListener.abort();

        const restore_original_state = action === "CANCEL";
        this.restoreEditableCells(this.#scope.header, restore_original_state);

        for (const row of this.#scope.list.querySelectorAll("li")) {
            const is_untracked_row = "untrackedRow" in row.dataset;

            if (restore_original_state) {
                this.restoreMarkedForDeletionRow(row);

                if (is_untracked_row) {
                    row.remove();
                    continue;
                }
            } else {
                const empty_cells = row.querySelectorAll(".vocabEntry:empty");
                const total_cells = row.querySelectorAll(".vocabEntry");
                const row_is_empty = empty_cells.length === total_cells.length;
                if (row_is_empty) {
                    row.remove();
                    continue;
                }

                this.removeMarkedForDeletionRow(row);

                if (is_untracked_row)
                    row.removeAttribute("data-untracked-row");
            }

            this.restoreEditableCells(row, restore_original_state);
        }
    }

    markRowForDeletion(row) {
        row.dataset.markedForDeletion = true;

        let previous_sibling_row = row;
        while (previous_sibling_row = previous_sibling_row.previousElementSibling) {
            const is_marked_for_deletion = "markedForDeletion" in previous_sibling_row.dataset;

            if (is_marked_for_deletion === false)
                break;
        }

        let next_sibling_row = row;
        while (next_sibling_row = next_sibling_row.nextElementSibling) {
            const is_marked_for_deletion = "markedForDeletion" in next_sibling_row.dataset;

            if (is_marked_for_deletion === false)
                break;
        }

        const sibling = previous_sibling_row ||
                        next_sibling_row ||
                        this.spawnEmptyEditableRow();

        sibling.querySelector(".vocabEntry").focus();
    }

    restoreMarkedForDeletionRow(row) {
        if ("markedForDeletion" in row.dataset)
            row.removeAttribute("data-marked-for-deletion");
    }

    removeMarkedForDeletionRow(row) {
        if ("markedForDeletion" in row.dataset)
            row.remove();
    }

    makeCellsEditable(scope) {
        for (const cell of scope.querySelectorAll("[data-can-contenteditable]")) {
            cell.setAttribute("contenteditable", true);
            cell.dataset.backup = cell.textContent;
        }
    }

    /// [>] scope :: HTMLElement
    /// [>] restore_backup_data :: boolean
    /// [<] void
    restoreEditableCells(scope, restore_backup_data) {
        for (const cell of scope.querySelectorAll("[data-can-contenteditable]")) {
            cell.removeAttribute("contenteditable");

            if (restore_backup_data)
                cell.textContent = cell.dataset.backup;
            else
                cell.textContent = cell.textContent.trim();

            cell.removeAttribute("data-backup");
        }
    }

    spawnEmptyEditableRow() {
        const row = this.baseController.spawnEmptyRow();
        this.makeCellsEditable(row);
        row.dataset.untrackedRow = true;
        return row;
    }
};