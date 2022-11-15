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

        this.#editController = new vocabEditController(this, state);
        this.#testController = new vocabTestController(this, state);

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
                this.#activeController.deactivate("CANCEL");
                this.#activeController = null;
            } else if (this.#activeController === null) {
                this.clearContent();
            }
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
                    this.#editController.activate();
                    this.#activeController = this.#editController;
                });

        document.querySelector("[data-action='CANCEL']")
                .addEventListener("click", _ => {
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
                .addEventListener("click", _ => this.dataStore.openFile(Filetype.NEW_FILE));

        document.querySelector(`[data-action="TEST"]`)
                .addEventListener("click", _ => {
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

    spawnEmptyRow() {
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