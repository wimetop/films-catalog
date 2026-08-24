/* eslint-disable @typescript-eslint/no-require-imports */
const os = require("node:os");

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({
    gid: -1,
    homedir: process.env.USERPROFILE ?? process.cwd(),
    shell: null,
    uid: -1,
    username: process.env.USERNAME ?? "developer",
  });
}
