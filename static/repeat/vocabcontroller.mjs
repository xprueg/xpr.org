import { Filetype } from "./datastore.mjs";
import vocabEditController from "./vocabEditController.mjs";
import vocabTestController from "./vocabTestController.mjs";

function* splitArray(array) {
    for (let i = 0; i < array.length; i += 2) {
        yield array.slice(i, i + 2);
    }
}

export default class VocabController {
    #activeController = null;
    #editController;
    #testController;

    dataStore;
    state;

    async save() {
        const new_filename = document.getElementById("vocabListHeaderText").textContent;
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

        const entries = Array.from(document.querySelectorAll(".vocabEntry"));
        const entry_count = entries.length;
        const tries = entries.reduce((count, entry) => count += +entry.dataset.tries, 0);
        const mistakes = entries.reduce((count, entry) => {
            if (entry.dataset.tries === 0)
                count += 1;
            else count += Number(entry.dataset.mistakes);

            return count;
        }, 0);

        const new_score = tries === 0
            ? 0
            : (100 / tries * (tries - mistakes)).toFixed();
        this.dataStore.save({ new_filename, new_content, new_score });
    }

    constructor(dataStore, state) {
        this.dataStore = dataStore;
        this.state = state;

        this.#editController = new vocabEditController(this, state);
        this.#testController = new vocabTestController(this, state);

        this.dataStore.on("fileOpened", ({ filename }) => {
            if (filename === Filetype.NEW_FILE) {
                vocabListHeaderText.replaceChildren();

                const row_template = document.getElementById("T<vocabEntryRow>");
                const row_frag = row_template.content.cloneNode(true);
                for (let i = 0; i < 2; ++i) {
                    const template = document.getElementById("T<vocabEntry>");
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
            if (this.#activeController !== null) {
                this.#activeController.deactivate("CANCEL");
                this.#activeController = null;
            } else this.clearContent();

            this.state.setState("vocablist", this.state.vocablist.HIDDEN);
        });

        document.querySelector("[data-action='DELETE']")
                .addEventListener("click", _ => {
                    this.dataStore.deleteCurrentlyOpenFile();

                    this.clearContent();

                    this.state.setState("vocablist", this.state.vocablist.HIDDEN);
                });

        document.querySelector("[data-action='EDIT']")
                .addEventListener("click", _ => {
                    iosFocusFix.focus();
                    this.#editController.activate();
                    this.#activeController = this.#editController;
                });

        for (const button of document.querySelectorAll("[data-action='CANCEL']"))
                button.addEventListener("click", _ => {
                    this.#activeController.deactivate("CANCEL");
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
                .addEventListener("click", _ => {
                    iosFocusFix.focus();
                    this.dataStore.openFile(Filetype.NEW_FILE);
                });

        document.querySelector(`[data-action="TEST"]`)
                .addEventListener("click", _ => {
                    iosFocusFix.focus();
                    this.#testController.activate();
                    this.#activeController = this.#testController;
                });
    }

    async requestDeactivation(action, do_save) {
        this.#activeController.deactivate(action);
        if (do_save)
            await this.save();
        this.#activeController = null;
        this.state.setState("vocablist", this.state.vocablist.LIST);
    }

    loadListWithFilename(filename) {
        this.state.setState("vocablist", this.state.vocablist.LOADING);
        this.dataStore.getFileContentsForOpenFile().then(contents => {
            this.state.setState("vocablist", this.state.vocablist.LIST);
            this.renderContent(filename, contents);
        });
    }

    clearContent(header = null, entries = Array()) {
        vocabListHeaderText.replaceChildren(header);
        vocabListEntries.replaceChildren(...entries);
    }

    renderContent(filename, contents) {
        const header = filename;
        const entries = contents.map(row => {
            const template = document.getElementById("T<vocabEntryRow>");
            const entry_row = template.content.cloneNode(true);

            const vocabs = row.map(entry => {
                const template = document.getElementById("T<vocabEntry>");
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

    spawnEmptyRow() {
        const template = document.getElementById("T<vocabEntryRow>");
        const frag = template.content.cloneNode(true);
        const row = frag.querySelector("li");

        const vocabs = [undefined, undefined].map(entry => {
            const template = document.getElementById("T<vocabEntry>");
            const frag = template.content.cloneNode(true);
            const vocab = frag.querySelector(".vocabEntry");

            return vocab;
        });
        row.append(...vocabs);

        vocabListEntries.append(frag);

        return row;
    }
}