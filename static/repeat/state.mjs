export const filelist = {
    LOADING: "loading",
    LOADED: "loaded",
};

export const user = {
    LOGGED_IN: "loggedIn",
    LOGGED_OUT: "loggedOut",
};

export const vocablist = {
    LOADING: "loading",
    HIDDEN: "none",
    LIST: "list",
    EDIT: "edit",
    TEST: "test",
};

const states = {
    filelist: Object.values(filelist),
    user: Object.values(user),
    vocablist: Object.values(vocablist),
};

export function setState(type, state) {
    if (!states[type].includes(state))
        throw Error(`The ${type} states do not include the state "${state}".`);

    root.dataset[`${type}Mode`] = state;
}

for (const type of Object.keys(states)) {
    // Create stylesheets
    let rules = Array();
    for (const state of states[type]) {
        rules.push(`:root[data-${type}-mode="${state}"] [data-${type}-show]:not([data-${type}-show~="on${state.replace(/^./, c => c.toUpperCase())}"])`);
    }
    const style = document.createElement("style");
    style.textContent = `${rules.join(",")} { display: none; }`;
    document.head.append(style);
}