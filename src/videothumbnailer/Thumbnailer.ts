import {ChildProcess, spawn} from "child_process"
import parsePath = require("parse-filepath")

async function run(command: string): Promise<void> {
    console.log(`Executing command=${command}`)
    try {
        await new Promise<void>( (resolve) => {
            const shell: ChildProcess = spawn(command, [], {stdio: "inherit", shell: true})
            shell.on("close", (code: number, signal: NodeJS.Signals) => {
                if (code || signal) throw new Error(`Command failed with ${code || signal}`)
                resolve()
            })
            shell.on("error", (err) => {
                throw new Error(`Command failed with error=${err.message}`)
            })
        })
        console.log("Command successfully executed!")
    } catch (err: any) {
        throw new Error(`Utils.run(${command}) error: ${err.message}`)
    }
}

export async function createThumbnail(filePath: string): Promise<string> {
    console.log(`=> createThumbnail(${filePath})`)
    const {name} : parsePath.ParsedPath = parsePath(filePath)
    const outputPath: string = `/tmp/${name}.png`
    let ffmpegPath: string = "/opt/bin"
    const command: string = `${ffmpegPath}/ffmpeg -i ${filePath} -ss 1 -frames:v 1 ${outputPath}`
    await run(command)
    console.log(`<= createThumbnail(${filePath}) = ${outputPath}`)
    return outputPath
}

