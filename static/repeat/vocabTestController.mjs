export default class vocabTestController {
    #abortControllerForEventListener;
    scope = {
        header: vocabListHeader,
        list: vocabListEntries,
    };
    rows = null;
    row_index = null;

    constructor(baseController, state) {
        this.baseController = baseController;
        this.state = state;
    }

    activate() {
        this.state.setState("vocablist", this.state.vocablist.TEST);

        const { signal } = this.#abortControllerForEventListener = new AbortController();
        this.addListener(signal);

        this.rows = Array.from(this.scope.list.querySelectorAll(".vocabEntryRow"));
        document.querySelector(".progress").dataset.dnom = this.rows.length;
        document.querySelector(".progress").dataset.numr = 1;

        this.shuffleRows();
        this.makeOneCellPerRowEditable();
        this.activateCurrentRow();
    }

    addListener(signal) {
        this.scope.list.addEventListener("keydown", evt => {
            const { shiftKey, key, target } = evt;

            if (!target.classList.contains("vocabEntry") || key !== "Enter")
                return;

            evt.preventDefault();
            if (document.querySelector("[data-test-row='incorrect']"))
                return this.rollback();

            if (target.textContent.trim().toLowerCase() === target.dataset.originalValue.toLowerCase()) {
                this.markCurrentRowAsCorrect();

                if (this.row_index === 0)
                    return this.baseController.requestDeactivation("COMPLETE", true);

                this.selectNextRow();
                this.activateCurrentRow();
            } else {
                this.markCurrentRowAsIncorrect();
            }
        }, { signal });
    }

    shuffleRows() {
        this.rows = this.rows.sort(() => Math.random() > .5);

        for (const [i, row] of this.rows.entries()) {
            row.style.order = i;
            row.dataset.order = i;
        }

        this.row_index = this.rows.length - 1;
    }

    *getNthCellIndex() {
        const indicesThatShouldBeTested = Array
            .from(document.querySelectorAll(`[name="testRowWithIndex"]`))
            .filter(i => i.checked);

        while (true) {
            const index = indicesThatShouldBeTested.length === 1
                ? 0
                : Math.floor(Math.random() * indicesThatShouldBeTested.length);

            yield Number(indicesThatShouldBeTested[index].dataset.index);
        }
    }

    makeOneCellPerRowEditable() {
        const nth_cell = this.getNthCellIndex();

        for (const row of this.rows) {
            const cell = row.querySelector(`.vocabEntry:nth-child(${nth_cell.next().value}`);
            cell.dataset.originalValue = cell.textContent;
            cell.setAttribute("contenteditable", true);
            cell.textContent = String();
        }
    }

    rollback() {
        for (let i = this.row_index; i < this.rows.length; ++i) {
            const row = this.rows[i];
            const cell = row.querySelector("[contenteditable]");

            row.removeAttribute("data-test-row");
            cell.removeAttribute("data-user-value");
            cell.textContent = String();
        }

        this.row_index = this.rows.length - 1;
        document.querySelector(".progress").dataset.numr = 1;
        this.activateCurrentRow();
    }

    activateCurrentRow() {
        const current_row = this.rows[this.row_index];
        current_row.dataset.testRow = "active";
        setTimeout(_ => current_row.querySelector("[contenteditable]").focus());
    }

    markCurrentRowAsCorrect() {
        const current_row = this.rows[this.row_index];
        current_row.dataset.testRow = "correct";

        const cell = current_row.querySelector(".vocabEntry[contenteditable]");
        cell.dataset.tries = Number(cell.dataset.tries) + 1;
        document.querySelector(".progress").dataset.numr = Number(document.querySelector(".progress").dataset.numr) + 1;
    }

    markCurrentRowAsIncorrect() {
        const current_row = this.rows[this.row_index];
        current_row.dataset.testRow = "incorrect";

        const cell = current_row.querySelector(".vocabEntry[contenteditable]");
        cell.dataset.tries = Number(cell.dataset.tries) + 1;
        cell.dataset.mistakes = Number(cell.dataset.mistakes) + 1;
        cell.dataset.userValue = cell.textContent;
        cell.textContent = String();
    }

    selectNextRow() {
        --this.row_index;
    }

    /// [*] Restore deleted rows on CANCEL
    /// [>] action :: string CANCEL|SAVE
    /// [<] void
    deactivate(action) {
        this.#abortControllerForEventListener.abort();
        this.resetRows();
        document.querySelector("*:focus")?.blur();
    }

    resetRows() {
        for (const row of this.rows) {
            row.style.removeProperty("order");
            row.removeAttribute("data-order");
            row.removeAttribute("data-test-row");

            const cell = row.querySelector(`.vocabEntry[contenteditable]`);
            cell.textContent = cell.dataset.originalValue;
            cell.removeAttribute("contenteditable");
            cell.removeAttribute("data-original-value");
        }

        this.rows = this.row_index = null;
    }
};