export default function create(user) {
    return user.isLoggedIn()
        ? new GithubDataStore(user)
        : new LocalDataStore();
};

export const Filetype = {
    NEW_FILE: Symbol("NEW_FILE"),
    NO_FILE: Symbol("NO_FILE"),
};

async function post(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
    });

    return await response.json();
}

class DataStore {
    loaded_file = Filetype.NO_FILE;
    listener = new Map();

    openFile(filename) {
        if (this.loaded_file === filename)
            return;

        if (this.loaded_file !== Filetype.NO_FILE)
            this.emit("fileClosed", { filename: this.loaded_file });

        this.loaded_file = filename;
        this.emit("fileOpened", { filename });
    }

    closeFile() {
        this.emit("fileClosed", ({ filename: this.loaded_file }));
        this.loaded_file = Filetype.NO_FILE;
    }

    on(type, callback) {
        if (!this.listener.has(type))
            this.listener.set(type, Array());

        this.listener.get(type).push(callback);
    }

    emit(type, payload) {
        for(const callback of this.listener.get(type).values())
            callback(payload);
    }
}

class GithubDataStore extends DataStore {
    index = null;
    githubIndex = null;

    constructor(user) {
        super();
        this.user = user;
    }

    async getIndex() {
        if (this.index === null || this.githubIndex === null) {
            const response = await fetch("/repeat/api/get_gist");
            const { files } = await response.json();

            const { [".xpr.org.repetition"]: index, ...github_files } = files;
            this.index = new Map(JSON.parse(index.content));
            this.githubIndex = new Map(Object.entries(github_files));
        }

        return {
            index: this.index,
            githubIndex: this.githubIndex,
        };
    }

    async getFiles()??{
        const { index } = await this.getIndex();
        return index;
    }

    async getFileContentsForOpenFile() {
        if (this.loaded_file === Filetype.NO_FILE)
            throw Error("No open file");

        const { index, githubIndex } = await this.getIndex();
        const { id } = index.get(this.loaded_file);
        const { raw_url } = githubIndex.get(id);

        const response = await fetch(raw_url);
        const content = response.json();

        return content;
    }

    async deleteCurrentlyOpenFile() {
        const filename = this.loaded_file;
        const { index, githubIndex??} = await this.getIndex();
        const { id } = index.get(filename);

        index.delete(filename);
        githubIndex.delete(id);

        this.emit("fileDeleted", { filename });
        this.loaded_file = Filetype.NO_FILE;

        const gist = await post("/repeat/api/save", {
            [".xpr.org.repetition"]: { content: JSON.stringify(Array.from(index)) },
            [id]: { content: String() },
        });
    }

    async save({ new_filename, new_content, new_score }) {
        const filename = this.loaded_file;
        const { index, githubIndex } = await this.getIndex();

        if (filename === Filetype.NEW_FILE) {
            const ids = Array.from(githubIndex.keys()).sort();
            let id = 0;
            while (ids.includes(String(id))) ++id;
            id = String(id);

            this.loaded_file = new_filename;
            this.emit("newFileCreated", { filename: new_filename, score: new_score });

            index.set(new_filename, { id, score: new_score });
            githubIndex.set(id, undefined);

            const gist = await post("/repeat/api/save", {
                [".xpr.org.repetition"]: { content: JSON.stringify(Array.from(index)) },
                [id]: { content: JSON.stringify(new_content) },
            });

            githubIndex.set(id, gist.files[id]);
        } else {
            const file = index.get(filename);
            const { id, score } = file;

            if (filename !== new_filename) {
                index.delete(filename);
                index.set(new_filename, file);

                this.loaded_file = new_filename;
                this.emit("filenameChanged", {
                    from: filename,
                    to: new_filename,
                });
            }

            if (score !== new_score) {
                file.score = new_score;
                index.set(this.loaded_file, file);

                this.emit("fileScoreChanged", {
                    filename: this.loaded_file,
                    from: score,
                    to: new_score,
                });
            }

            const gist = await post("/repeat/api/save", {
                [".xpr.org.repetition"]: { content: JSON.stringify(Array.from(index)) },
                // TODO Only update content if content !== new_content
                [id]: { content: JSON.stringify(new_content) },
            });

            githubIndex.set(id, gist.files[id]);
        }
    }
}

class LocalDataStore extends DataStore {
    #filenames = new Set();
    index = null;

    async getIndex() {
        if (this.index === null) {
            const index = JSON.parse(localStorage.getItem(".xpr.org.repetition")) ?? [];
            this.index = new Map(index);
        }

        return { index: this.index };
    }

    async getFiles()??{
        const { index } = await this.getIndex();
        return index;
    }

    async getFileContentsForOpenFile() {
        if (this.loaded_file === Filetype.NO_FILE)
            throw Error("No open file");

        const { index } = await this.getIndex();
        const { id } = index.get(this.loaded_file);

        const content = JSON.parse(localStorage.getItem(id)) ?? Array();
        return content;
    }

    async deleteCurrentlyOpenFile() {
        const filename = this.loaded_file;
        const { index??} = await this.getIndex();
        const { id } = index.get(filename);

        index.delete(filename);

        this.emit("fileDeleted", { filename });
        this.loaded_file = Filetype.NO_FILE;

        localStorage.setItem(".xpr.org.repetition", JSON.stringify(Array.from(index)));
        localStorage.removeItem(id);
    }

    async save({ new_filename, new_content, new_score }) {
        const filename = this.loaded_file;
        const { index } = await this.getIndex();

        if (filename === Filetype.NEW_FILE) {
            const ids = Array.from(index.values()).map(({ id }) => id);
            let id = 0;
            while (ids.includes(String(id))) ++id;
            id = String(id);

            this.loaded_file = new_filename;
            this.emit("newFileCreated", { filename: new_filename, score: new_score });

            index.set(new_filename, { id, score: new_score });

            localStorage.setItem(id, JSON.stringify(new_content));
            localStorage.setItem(".xpr.org.repetition", JSON.stringify(Array.from(index)));
        } else {
            const file = index.get(filename);
            const { id, score } = file;

            if (filename !== new_filename) {
                index.delete(filename);
                index.set(new_filename, file);

                this.loaded_file = new_filename;
                this.emit("filenameChanged", {
                    from: filename,
                    to: new_filename,
                });
            }

            if (score !== new_score) {
                file.score = new_score;
                index.set(this.loaded_file, file);

                this.emit("fileScoreChanged", {
                    filename: this.loaded_file,
                    from: score,
                    to: new_score,
                });
            }

            localStorage.setItem(id, JSON.stringify(new_content));
            localStorage.setItem(".xpr.org.repetition", JSON.stringify(Array.from(index)));
        }
    }
}