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
            console.info("fileClosed", filename);
            this.#scope.querySelector("#currentlyLoadedList")?.removeAttribute("id");
        });

        dataStore.on("filenameChanged", ({ from, to }) => {
            console.info("filenameChanged", from, to);
            const entry = this.#scope.querySelector(`li[data-filename="${from}"]`);

            entry.dataset.filename = to;
            entry.querySelector("span").textContent = to;
        });

        dataStore.on("fileDeleted", ({ filename }) => {
            console.info(filename);
            const entry = this.#scope.querySelector(`li[data-filename="${filename}"]`);

            entry.remove();
        });

        dataStore.on("newFileCreated", ({ filename }) => {
            const template = document.getElementById("T<fileListEntry>");
            const frag = template.content.cloneNode(true);

            frag.querySelector("li").dataset.filename = filename;
            frag.querySelector("span").textContent = filename;
            frag.querySelector("li").setAttribute("id", "currentlyLoadedList");

            this.#scope.append(frag);
        });

        dataStore.getFileListing().then(filenames => {
            for (const filename of filenames) {
                const template = document.getElementById("T<fileListEntry>");
                const frag = template.content.cloneNode(true);

                frag.querySelector("li").dataset.filename = filename;
                frag.querySelector("span").textContent = filename;

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