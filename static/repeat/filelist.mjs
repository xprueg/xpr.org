/// [@] Update active list icon on creating a new one!

import { Filetype } from "./datastore.mjs";

export default class FileList {
    #scope = fileList;

    constructor(dataStore, vocabController, state) {
        this.dataStore = dataStore;
        this.vocabController = vocabController;
        this.state = state;

        dataStore.on("fileOpened", ({ filename }) => {
            if (filename === Filetype.NEW_FILE)
                return;

            this.#scope.querySelector(`[data-filename="${filename}"]`)?.setAttribute(
                "id",
                "currentlyLoadedList"
            );
        });

        dataStore.on("fileClosed", ({ filename }) => {
            this.#scope.querySelector("#currentlyLoadedList")?.removeAttribute("id");
        });

        dataStore.on("filenameChanged", ({ from, to }) => {
            const entry = this.#scope.querySelector(`li[data-filename="${from}"]`);

            entry.dataset.filename = to;
            entry.textContent = to;
        });

        dataStore.on("fileScoreChanged", ({filename, from, to}) => {
            const entry = this.#scope.querySelector(`li[data-filename="${filename}"]`);

            entry.dataset.score = to;
        });

        dataStore.on("fileDeleted", ({ filename }) => {
            const entry = this.#scope.querySelector(`li[data-filename="${filename}"]`);

            entry.remove();
        });

        dataStore.on("newFileCreated", ({ filename, score }) => {
            const template = document.getElementById("T<fileListEntry>");
            const frag = template.content.cloneNode(true);
            const li = frag.querySelector("li");

            li.dataset.filename = filename;
            li.dataset.score = score;
            li.textContent = filename;
            li.setAttribute("id", "currentlyLoadedList");

            this.#scope.append(frag);
        });

        dataStore.getFiles().then(files => {
            for (const [filename, data] of files) {
                const { id, score } = data;
                const template = document.getElementById("T<fileListEntry>");
                const frag = template.content.cloneNode(true);
                const li = frag.querySelector("li");

                li.dataset.score = score;
                li.dataset.filename = filename;
                li.textContent = filename;

                this.#scope.append(frag);
            }

            this.state.setState("filelist", this.state.filelist.LOADED);
        }).catch(err => {
            console.info(err);
        });

        this.attachListener();
    }

    attachListener() {
        this.#scope.addEventListener("click", evt => {
            const { target: { dataset: { filename }}} = evt;

            if (filename !== undefined)
                this.dataStore.openFile(filename);
        });
    }
}