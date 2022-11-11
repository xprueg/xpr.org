import { Filetype } from "./datastore.mjs";

function* splitArray(array) {
    for (let i = 0; i < array.length; i += 2) {
        yield array.slice(i, i + 2);
    }
}

export default class VocabController {
    #activeController = null;
    #editController;

    dataStore;
    state;

    async save() {
        const new_filename = document.querySelector(".vocabHeaderEntry").textContent;
        const new_content = Array.from(
            document.querySelectorAll(".vocabEntryRow"),
            node => Array.from(
                [...node.querySelectorAll(".vocabEntry")].map(entry => ({
                    vocab: entry.textContent.trim(),
                    tries: entry.dataset.tries,
                    mistakes: entry.dataset.mistakes,
                }))
            )
        );

        this.dataStore.save({ new_filename, new_content });
    }

    constructor(dataStore, state) {
        this.dataStore = dataStore;
        this.state = state;

        this.#editController = new vocabEditController(state);

        this.dataStore.on("fileOpened", ({ filename }) => {
            if (filename === Filetype.NEW_FILE) {
                const header_template = document.getElementById("T<vocabListHeader>");
                const header_frag = header_template.content.cloneNode(true);
                vocabListHeader.replaceChildren(header_frag);

                const row_template = document.getElementById("T<vocabListEntryRow>");
                const row_frag = row_template.content.cloneNode(true);
                for (let i = 0; i < 2; ++i) {
                    const template = document.getElementById("T<vocabListEntry>");
                    const frag = template.content.cloneNode(true);
                    const vocab = frag.querySelector(".vocabEntry");

                    row_frag.querySelector(".vocabEntryRow").append(vocab);
                }
                vocabListEntries.replaceChildren(row_frag);

                this.#editController.activate();
                this.#activeController = this.#editController;
            } else {
                this.loadListWithFilename(filename);
            }
        });

        this.dataStore.on("fileClosed", ({ filename }) => {
            if (this.#activeController === this.#editController) {
                // TODO
            } else if (this.#activeController === null) {
                this.clearContent();
                this.state.setState("vocablist", this.state.vocablist.HIDDEN);
            }
        });

        document.querySelector("[data-action='DELETE']")
                .addEventListener("click", _ => {
                    this.dataStore.deleteCurrentlyOpenFile();

                    this.clearContent();

                    this.state.setState("vocablist", this.state.vocablist.HIDDEN);
                });

        document.querySelector("[data-action='EDIT']")
                .addEventListener("click", _ => {
                    this.#editController.activate();
                    this.#activeController = this.#editController;
                });

        document.querySelector("[data-action='CANCEL']")
                .addEventListener("click", _ => {
                    console.assert(this.#activeController === this.#editController);

                    this.#editController.deactivate("CANCEL");
                    this.#activeController = null;

                    if (this.dataStore.loaded_file === Filetype.NEW_FILE) {
                        this.clearContent();
                        this.state.setState("vocablist", this.state.vocablist.HIDDEN);
                        this.dataStore.closeFile();
                    } else {
                        this.state.setState("vocablist", this.state.vocablist.LIST);
                    }
                });

        document.querySelector("[data-action='CLOSE']")
                .addEventListener("click", _ => this.dataStore.closeFile());

        document.querySelector("[data-action='SAVE']")
                .addEventListener("click", async _ => {
                    console.assert(this.#activeController === this.#editController);

                    this.#editController.deactivate("SAVE");
                    await this.save();
                    this.#activeController = null;
                    this.state.setState("vocablist", this.state.vocablist.LIST);
                });

        document.querySelector("[data-action='NEWFILE']")
                .addEventListener("click", _ => this.dataStore.openFile(Filetype.NEW_FILE));
    }

    loadListWithFilename(filename) {
        this.state.setState("vocablist", this.state.vocablist.LOADING);
        this.dataStore.getFileContentsForOpenFile().then(contents => {
            this.state.setState("vocablist", this.state.vocablist.LIST);
            this.renderContent(filename, contents);
        });
    }

    clearContent(header = null, entries = Array()) {
        vocabListHeader.replaceChildren(header);
        vocabListEntries.replaceChildren(...entries);
    }

    renderContent(filename, contents) {
        const header_template = document.getElementById("T<vocabListHeader>");
        const header = header_template.content.cloneNode(true);
        header.querySelector(".vocabHeaderEntry").textContent = filename;

        const entries = contents.map(row => {
            const template = document.getElementById("T<vocabListEntryRow>");
            const entry_row = template.content.cloneNode(true);

            const vocabs = row.map(entry => {
                const template = document.getElementById("T<vocabListEntry>");
                const frag = template.content.cloneNode(true);
                const vocab = frag.querySelector(".vocabEntry");

                vocab.textContent = entry.vocab;
                vocab.dataset.tries = entry.tries;
                vocab.dataset.mistakes = entry.mistakes;

                return vocab;
            });

            entry_row.querySelector(".vocabEntryRow").append(...vocabs);
            return entry_row;
        });

        this.clearContent(header, entries);
    }

    static spawnEmptyRow() {
        const template = document.getElementById("T<vocabListEntryRow>");
        const frag = template.content.cloneNode(true);
        const row = frag.querySelector("li");

        const vocabs = [undefined, undefined].map(entry => {
            const template = document.getElementById("T<vocabListEntry>");
            const frag = template.content.cloneNode(true);
            const vocab = frag.querySelector(".vocabEntry");

            return vocab;
        });
        row.append(...vocabs);

        vocabListEntries.append(frag);

        return row;
    }
}

class vocabEditController {
    #abortControllerForEventListener;
    #scope = {
        header: vocabListHeader,
        list: vocabListEntries,
    };

    constructor(state) {
        this.state = state;
    }

    activate() {
        this.state.setState("vocablist", this.state.vocablist.EDIT);

        this.makeCellsEditable(this.#scope.header);
        this.makeCellsEditable(this.#scope.list);

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
        const row = VocabController.spawnEmptyRow();
        this.makeCellsEditable(row);
        row.dataset.untrackedRow = true;
        return row;
    }
}