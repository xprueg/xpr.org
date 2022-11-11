import { existsSync } from "fs";
import { execSync } from "child_process";

if (!existsSync("fonts")) {
    console.info("Cloning /fonts…");
    const stdout = execSync(`git clone --depth=1 https://xprueg:${process.env.CLONE_FONTS_GITHUB_TOKEN}@github.com/xprueg/fonts.git fonts`);
    console.info(stdout.toString());
}