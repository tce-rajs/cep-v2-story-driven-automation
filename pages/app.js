// One entry point to every page object, so a spec builds a single `App` per test instead of
// importing and constructing a dozen classes. Page objects are created lazily, on first use.

const { LoginPage } = require('./login.page');
const { HeaderPage } = require('./header.page');
const { ToolbarPage } = require('./toolbar.page');
const { WhiteboardPage } = require('./whiteboard.page');
const { UserMenuPage } = require('./user-menu.page');
const { MagnetPage } = require('./magnet.page');
const { NavigationPage } = require('./navigation.page');
const { PlaylistPage } = require('./playlist.page');
const { AddResourcePage } = require('./add-resource.page');
const { PlayerPage } = require('./player.page');
const { CompassPage } = require('./compass.page');
const { WithoutLoginPage } = require('./without-login.page');
const { WhiteboardContent } = require('./whiteboard-content.page');
const { NewUserPage } = require('./new-user.page');

const PAGES = {
  login: LoginPage,
  header: HeaderPage,
  toolbar: ToolbarPage,
  whiteboard: WhiteboardPage,
  userMenu: UserMenuPage,
  magnet: MagnetPage,
  nav: NavigationPage,
  playlist: PlaylistPage,
  addResource: AddResourcePage,
  player: PlayerPage,
  compass: CompassPage,
  guest: WithoutLoginPage,
  content: WhiteboardContent,
  newUser: NewUserPage,
};

class App {
  constructor(page) {
    this.page = page;
    for (const [name, PageClass] of Object.entries(PAGES)) {
      let instance;
      Object.defineProperty(this, name, {
        enumerable: true,
        get: () => (instance ??= new PageClass(page)),
      });
    }
  }

  /** Sign in with a PIN (defaults to the primary QA account) and wait for the app shell. */
  async signIn(pin = process.env.VALID_PIN) {
    await this.login.signInWithPin(pin);
  }
}

module.exports = { App };
