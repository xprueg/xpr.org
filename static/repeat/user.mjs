export default class User {
    login = null;
    avatar_url = null;

    constructor(state) {
        this.login = document.cookie.match(/login=(?<login>[^;]*)/)?.groups.login;
        this.avatar = document.cookie.match(/avatar=(?<avatar>[^;]*)/)?.groups.avatar;

        if (this.login) {
            this.login = decodeURIComponent(this.login);
            this.avatar = decodeURIComponent(this.avatar);

            state.setState("user", state.user.LOGGED_IN);
            document.querySelector(".avatar").style.backgroundImage = `url(${this.avatar})`;
        }
    }

    isLoggedIn() {
        return !!this.login;
    }

    get login() {
        return this.login;
    }

    get avatar_url() {
        return this.avatar;
    }
}