import * as State from "./state.mjs";
import User from "./user.mjs";
import CreateDataStore from "./datastore.mjs";
import FileList from "./filelist.mjs";
import VocabController from "./vocabcontroller.mjs";

const user = new User(State);
const dataStore = CreateDataStore(user);
const vocabController = new VocabController(dataStore, State);
const fileList = new FileList(dataStore, vocabController, State);

// customElements.define("dict-view", class extends HTMLElement {
//     constructor() {
//         super();
//         window.addEventListener("message", evt => {
//             console.info(evt.data.type);
//             console.info(evt.data.item);
//         })
//     }
//
//     connectedCallback() {
//         const t = document.getElementById("t<dictView>").content.cloneNode(true);
//         this.append(t);
//     }
// });
//
// function* splitArray(array) {
//   for (let i = 0; i < array.length; i += 2) {
//     yield array.slice(i, i + 2);
//   }
// }
//
// userLists.addEventListener("click", evt => {
//     const { target } = evt;
//
//     if (!target.dataset.rawGitFileUrl)
//         return
//
//     State.view = "default";
//     entries.querySelectorAll("li").forEach(li => li.remove());
//
//     fetch(target.dataset.rawGitFileUrl).then(res => res.json()).then(dict => {
//         const [titleA, titleB] = target.textContent.split(" · ");
//
//         document.querySelector("#title .A").textContent = titleA;
//         document.querySelector("#title .B").textContent = titleB;
//
//         for (const [A, B] of splitArray(dict)) {
//             const template = document.getElementById("li<entries>").content.cloneNode(true);
//             template.querySelector(".A").textContent = A;
//             template.querySelector(".B").textContent = B;
//
//             entries.append(template);
//         }
//     });
// });
//
// document.querySelector("[data-action='EDIT']").addEventListener("click", () => {
//     State.view = ViewEnum.Edit;
//
//     document.querySelectorAll("#entries span").forEach(entry => {
//         entry.setAttribute("contenteditable", "true");
//         entry.dataset.undo = entry.textContent;
//     });
// });
//
// document.querySelector("[data-action='CANCEL']").addEventListener("click", () => {
//     State.view = ViewEnum.Default;
//
//     document.querySelectorAll("#entries span").forEach(entry => {
//         entry.removeAttribute("contenteditable");
//         entry.textContent = entry.dataset.undo;
//     });
// });
//
// document.querySelector("[data-action=SAVE]").addEventListener("click", () => {
//     State.view = ViewEnum.Default;
//
//     document.querySelectorAll("#entries span")
//         .forEach(entry => entry.removeAttribute("contenteditable"));
//
//     const savestate = Array.from(document.querySelectorAll("#entries span")).map(span => span.textContent);
//     fetch("/repeat/api/save", {
//         method: "POST",
//         headers: {
//             "Accept": "application/json",
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//             "Küche · Кухня": {
//                 content: JSON.stringify(savestate),
//             }
//         }),
//     });
// });
