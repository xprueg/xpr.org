export default class vocabTestController {
    abortControllerForEventListener;
    rows = null;
    row_index = null;
    default_test_count = 8;
    test_count = this.default_test_count;
    default_test_col = "right";
    test_col = this.default_test_col;

    constructor(baseController, state) {
        this.baseController = baseController;
        this.state = state;

        const states = {
            left: "←",
            mixed: "↔",
            right: "→",
        };
        document.querySelector(".testColumn").textContent = states[this.default_test_col];
        document.querySelector("#testColumnSelection").addEventListener("change", evt => {
            const opt = evt.target.selectedOptions[0];
            document.querySelector(".testColumn").textContent = states[opt.value];
            this.test_col = opt.value;
        });

        document.querySelector(".testCount").textContent = this.default_test_count;
        document.querySelector(".testCount").addEventListener("click", evt => {
            let new_count = Math.floor(Number(prompt("How many items shall be tested?")));
            if (isNaN(new_count) || new_count === 0)
                new_count = this.default_test_count;
            this.test_count = evt.currentTarget.textContent = new_count;
        });
    }

    get list() {
        return document.getElementById("vocabListEntries");
    }

    get entries() {
        return Array.from(this.list.querySelectorAll(".vocabEntryRow"));
    }

    get testCount() {
        return Math.min(this.entries.length, this.test_count);
    }

    activate() {
        this.state.setState("vocablist", this.state.vocablist.TEST);

        const { signal } = this.abortControllerForEventListener = new AbortController();
        this.addListener(signal);

        this.rows = this.entries.slice(0, this.testCount);

        document.getElementById("vocabListHeader").style.setProperty("--progress", 0);
        document.getElementById("vocabListHeader").style.setProperty("--progress-enabled", 1);

        this.shuffleRows();
        this.makeOneCellPerRowEditable();
        this.activateCurrentRow();
    }

    /// [*] Restore deleted rows on CANCEL
    /// [>] action :: string CANCEL|SAVE
    /// [<] void
    deactivate(action) {
        this.abortControllerForEventListener.abort();
        document.getElementById("vocabListHeader").style.setProperty("--progress-enabled", 0);
        this.resetRows();
        document.querySelector("*:focus")?.blur();
    }

    addListener(signal) {
        this.list.addEventListener("keydown", evt => {
            const { shiftKey, key, target } = evt;

            if (!target.classList.contains("vocabEntry") || key !== "Enter")
                return;

            evt.preventDefault();
            if (document.querySelector("[data-test-row='incorrect']"))
                return this.rollback();

            if (target.textContent.trim().toLowerCase() === target.dataset.originalValue.toLowerCase()) {
                this.markCurrentRowAsCorrect();

                if (this.row_index === this.testCount - 1)
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

        this.row_index = 0;
    }

    getNthCell(cells) {
        const columnThatShouldBeTested = this.test_col;

        if (columnThatShouldBeTested === "mixed")
            return cells[Math.floor(Math.random() * cells.length)];
        return cells[columnThatShouldBeTested === "left" ? 0 : 1];
    }

    makeOneCellPerRowEditable() {
        for (const row of this.rows) {
            const cell = this.getNthCell(row.querySelectorAll(".vocabEntry"));

            cell.dataset.originalValue = cell.textContent;
            cell.setAttribute("contenteditable", true);
            cell.textContent = String(" ");
        }
    }

    rollback() {
        for (let i = this.row_index; i > 0; --i) {
            const row = this.rows[i];
            const cell = row.querySelector("[contenteditable]");

            row.removeAttribute("data-test-row");
            cell.removeAttribute("data-user-value");
            cell.textContent = String(" ");
        }

        document.getElementById("vocabListHeader").style.removeProperty("--progress");

        this.row_index = 0;
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

        const progress = 100 / this.rows.length * (this.row_index + 1);
        document.getElementById("vocabListHeader").style.setProperty("--progress", progress);
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
        ++this.row_index;
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