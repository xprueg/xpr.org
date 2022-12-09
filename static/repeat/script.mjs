import * as State from "./state.mjs";
import User from "./user.mjs";
import CreateDataStore from "./datastore.mjs";
import FileList from "./filelist.mjs";
import VocabController from "./vocabcontroller.mjs";

const user = new User(State);
const dataStore = CreateDataStore(user);
const vocabController = new VocabController(dataStore, State);
const fileList = new FileList(dataStore, vocabController, State);